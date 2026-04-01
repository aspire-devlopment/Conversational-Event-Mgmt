const logger = require('../utils/logger');
const {
  COMMON_TIMEZONES,
  STATUS_VALUES,
  SUPPORTED_LANGUAGES,
  SUPPORTED_ROLES,
  normalizeLanguage,
  createEmptyDraft,
  detectLanguage,
  normalizeDraft,
  parseDateTime,
  mergeDraft,
  getNextStep,
  getSuggestions,
  buildSummary,
  validateEventData,
} = require('./chatEventUtils');

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  process.env.LLM_API_KEY ||
  '';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  process.env.LLM_MODEL ||
  'openrouter/auto';
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || process.env.LLM_TIMEOUT_MS || 30000);
const OPENROUTER_API_URL =
  process.env.OPENROUTER_API_URL ||
  'https://openrouter.ai/api/v1/chat/completions';

logger.info('openaiService', 'OpenRouter chat service initialized', {
  provider: 'openrouter',
  model: OPENROUTER_MODEL,
  hasApiKey: Boolean(OPENROUTER_API_KEY),
  timeoutMs: OPENROUTER_TIMEOUT_MS,
  apiUrl: OPENROUTER_API_URL,
  timestamp: new Date().toISOString(),
});

function validateConfig() {
  if (!OPENROUTER_API_KEY) {
    const error = new Error('OpenRouter API key is not configured');
    error.providerDetails = {
      provider: 'openrouter',
      model: OPENROUTER_MODEL,
      missingConfig: 'OPENROUTER_API_KEY',
    };
    throw error;
  }
}

function decodeJsonStringFragment(fragment) {
  try {
    return JSON.parse(`"${fragment.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return fragment;
  }
}

function extractFriendlyMessage(content, fallbackMessage = 'Could you clarify that?') {
  // Strip model JSON down to the sentence the user should actually see.
  if (typeof content !== 'string') return fallbackMessage;

  const trimmed = content.trim();
  if (!trimmed) return fallbackMessage;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const nested = extractFriendlyMessage(fencedMatch[1], fallbackMessage);
    if (nested !== fencedMatch[1].trim()) {
      return nested;
    }
  }

  const structured = tryParseStructuredLlmContent(trimmed, 'en');
  if (structured?.message) {
    return structured.message;
  }

  const messageMatch = trimmed.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/s);
  if (messageMatch?.[1]) {
    return decodeJsonStringFragment(messageMatch[1]).trim();
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    const nested = tryParseStructuredLlmContent(objectMatch[0], 'en');
    if (nested?.message) {
      return nested.message;
    }
  }

  return trimmed;
}

async function localizeAssistantMessage(message, language) {
  const targetLanguage = normalizeLanguage(language);
  if (!message || targetLanguage === 'en') {
    return message;
  }

  const languageName = targetLanguage === 'de' ? 'German' : 'French';
  const prompt = `Rewrite the following assistant message in ${languageName}. Preserve the meaning, event details, dates, times, roles, URLs, and status exactly. Return JSON with keys language and message only.\n\nMessage:\n${message}`;

  try {
    const response = await callOpenRouter([{ role: 'user', content: prompt }], 220, targetLanguage);
    return response.message || message;
  } catch (error) {
    logger.warn('openaiService', 'Failed to localize assistant message; using original text', {
      language: targetLanguage,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return message;
  }
}

function getSystemPrompt(language = 'en', options = {}) {
  // The prompt defines the chat contract: what fields to collect and how to respond.
  const responseRule = {
    en: 'Respond in English.',
    de: 'Respond in German.',
    fr: 'Respond in French.',
  }[normalizeLanguage(language)];
  const lockRule = options.languageLocked
    ? `Do not switch languages even if the user writes in another language. Always reply in ${normalizeLanguage(language)} and set "language" to "${normalizeLanguage(language)}".`
    : '';

  return `You are an AI assistant that creates virtual events entirely through chat.
${responseRule}
${lockRule}

Collect and update this event metadata:
- name
- subheading
- description
- bannerUrl
- timezone
- status (Draft, Published, Pending)
- startTime
- endTime
- vanishTime
- roles (multi-select: Admin, Manager, Sales Rep, Viewer)

Rules:
- Use the full conversation and current draft.
- Understand corrections like "change start date", "set roles to Admin and Viewer", and "publish it".
- Treat roles as a required multi-select field. Preserve multiple selected roles when the user provides them.
- Understand relative dates such as "next Monday", "this Friday at 4 PM", "in 2 days", "tomorrow 3pm", "demain 14h", "dans 2 jours", or "morgen 10 uhr".
- Keep already confirmed values unless the user changes them.
- Return JSON only.

Schema:
{
  "intent": "collect|update|confirm|clarify|cancel",
  "language": "en|de|fr",
  "extractedData": {
    "name": "string or null",
    "subheading": "string or null",
    "description": "string or null",
    "bannerUrl": "string or null",
    "timezone": "string or null",
    "status": "Draft|Published|Pending|null",
    "startTime": "YYYY-MM-DD HH:mm or natural-language text or null",
    "endTime": "YYYY-MM-DD HH:mm or natural-language text or null",
    "vanishTime": "YYYY-MM-DD HH:mm or natural-language text or null",
    "roles": ["Admin","Manager","Sales Rep","Viewer"]
  },
  "changedFields": ["fieldName"],
  "nextStep": "name|subheading|description|bannerUrl|timezone|status|startTime|endTime|vanishTime|roles|confirm",
  "message": "assistant reply",
  "confidence": 0.0
}`;
}

function normalizeParsedResponse(parsed, fallbackLanguage = 'en') {
  const language = normalizeLanguage(parsed.language || fallbackLanguage);
  return {
    intent: parsed.intent || 'clarify',
    language,
    extractedData: normalizeDraft(parsed.extractedData || {}, language),
    changedFields: Array.isArray(parsed.changedFields) ? parsed.changedFields : [],
    message: parsed.message || 'Could you clarify that?',
    nextStep: parsed.nextStep || 'name',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
  };
}

function tryParseStructuredLlmContent(content, fallbackLanguage = 'en') {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('```')) {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      return tryParseStructuredLlmContent(fenceMatch[1], fallbackLanguage);
    }
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
        return normalizeParsedResponse(parsed, fallbackLanguage);
      }
    } catch (error) {
      // Continue to object extraction.
    }
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
        return normalizeParsedResponse(parsed, fallbackLanguage);
      }
    } catch (error) {
      return null;
    }
  }

  return null;
}

function extractContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  return typeof content === 'string' ? content.trim() : '';
}

async function callOpenRouter(messages, maxTokens = 500, language = 'en') {
  validateConfig();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
  const requestBody = {
    model: OPENROUTER_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    response_format: { type: 'json_object' },
  };

  try {
    logger.info('openaiService', 'Calling OpenRouter API', {
      provider: 'openrouter',
      model: OPENROUTER_MODEL,
      apiUrl: OPENROUTER_API_URL,
      messageCount: messages.length,
      maxTokens,
      timeoutMs: OPENROUTER_TIMEOUT_MS,
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsedBody = null;

    try {
      parsedBody = rawText ? JSON.parse(rawText) : null;
    } catch (error) {
      parsedBody = null;
    }

    logger.info('openaiService', 'OpenRouter HTTP response received', {
      provider: 'openrouter',
      model: OPENROUTER_MODEL,
      status: response.status,
      ok: response.ok,
      responsePreview: rawText.substring(0, 500),
      timestamp: new Date().toISOString(),
    });

    if (!response.ok) {
      const error = new Error(
        parsedBody?.error?.message ||
        parsedBody?.message ||
        `OpenRouter API request failed with status ${response.status}`
      );
      error.status = response.status;
      error.providerDetails = {
        provider: 'openrouter',
        model: OPENROUTER_MODEL,
        status: response.status,
        statusText: response.statusText,
        responseBody: parsedBody || rawText,
      };
      throw error;
    }

    const content = extractContent(parsedBody);
    if (!content) {
      const error = new Error('No response content from OpenRouter');
      error.providerDetails = {
        provider: 'openrouter',
        model: OPENROUTER_MODEL,
        status: response.status,
        responseBody: parsedBody,
      };
      throw error;
    }

    const parsed = tryParseStructuredLlmContent(content, language);
    if (parsed) {
      logger.info('openaiService', 'Structured OpenRouter response parsed', {
        intent: parsed.intent,
        confidence: parsed.confidence,
        timestamp: new Date().toISOString(),
      });
      return parsed;
    }

    logger.warn('openaiService', 'OpenRouter returned non-JSON content; using plain-text fallback', {
      contentPreview: content.substring(0, 200),
      timestamp: new Date().toISOString(),
    });

    return {
      intent: 'clarify',
      language: normalizeLanguage(language),
      extractedData: createEmptyDraft(language),
      changedFields: [],
      message: extractFriendlyMessage(content, content),
      nextStep: 'name',
      confidence: 0.5,
    };
  } catch (error) {
    const providerDetails = {
      provider: 'openrouter',
      model: OPENROUTER_MODEL,
      code: error.code,
      status: error.status,
      ...(error.name === 'AbortError' ? { timeoutMs: OPENROUTER_TIMEOUT_MS } : {}),
      ...(error.providerDetails || {}),
    };

    logger.error('openaiService', 'OpenRouter API request failed', {
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorStatus: error.status,
      providerDetails,
      timestamp: new Date().toISOString(),
    });

    error.providerDetails = providerDetails;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function processMessage(userMessage, conversationHistory = [], currentEventData = {}, language = 'en', options = {}) {
  try {
    // Merge the latest message with the current draft, then let the model fill gaps or apply corrections.
    const effectiveLanguage = options.languageLocked
      ? normalizeLanguage(language || currentEventData.language)
      : detectLanguage(userMessage, currentEventData.language || language);
    const draft = normalizeDraft(currentEventData, effectiveLanguage);
    draft.language = effectiveLanguage;
    const systemPrompt = getSystemPrompt(effectiveLanguage, options);
    const historyMessages = (conversationHistory || []).map((msg) => ({
      role: msg.role === 'assistant' || msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.content || msg.text || '',
    }));

    const contextMessage = `${options.languageLocked ? `Manual language override is active. Reply only in ${effectiveLanguage}.\n\n` : ''}Current event data:\n${buildSummary(draft)}\n\nSupported timezones: ${COMMON_TIMEZONES.join(', ')}\nSupported statuses: ${STATUS_VALUES.join(', ')}\nSupported roles: ${SUPPORTED_ROLES.join(', ')}\n\nLatest user message: "${userMessage}"`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: contextMessage },
    ];

    logger.info('openaiService', 'Processing chat message', {
      provider: 'openrouter',
      userMessageLength: userMessage.length,
      historyLength: conversationHistory.length,
      language: effectiveLanguage,
      currentEventData: draft,
      timestamp: new Date().toISOString(),
    });

    const llmResponse = await callOpenRouter(messages, 700, effectiveLanguage);
    const responseLanguage = options.languageLocked
      ? effectiveLanguage
      : (llmResponse.language || effectiveLanguage);
    const mergedDraft = mergeDraft(draft, llmResponse.extractedData, responseLanguage);
    mergedDraft.language = responseLanguage;
    const nextStep = llmResponse.nextStep || getNextStep(mergedDraft);

    const localizedMessage = await localizeAssistantMessage(llmResponse.message, responseLanguage);

    return {
      ...llmResponse,
      language: responseLanguage,
      message: localizedMessage,
      extractedData: {
        ...mergedDraft,
        language: responseLanguage,
      },
      nextStep: nextStep === 'confirm' ? getNextStep(mergedDraft) : nextStep,
      suggestions: getSuggestions(nextStep, responseLanguage),
      summary: buildSummary(mergedDraft),
    };
  } catch (error) {
    logger.error('openaiService', 'Failed while processing chat message', {
      error: error.message,
      errorName: error.name,
      providerDetails: error.providerDetails,
      userMessageLength: userMessage?.length || 0,
      historyLength: conversationHistory?.length || 0,
      language,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

async function generateGreeting(language = 'en') {
  // Build the first message the admin sees when a chat session starts.
  const detectedLanguage = normalizeLanguage(language);
  const responseLanguage = detectedLanguage === 'de' ? 'German' : detectedLanguage === 'fr' ? 'French' : 'English';
  const prompt = `Generate a concise, professional opening message for a business event creation assistant. Ask for the event name first. Briefly mention that you can also help with timezone, banner URL, scheduling, publication status, and roles. Avoid emojis, avoid overly casual wording, and keep the tone polished and helpful. Respond in ${responseLanguage} with JSON using keys intent, language, extractedData, changedFields, nextStep, message, confidence.`;

  try {
    const response = await callOpenRouter([{ role: 'user', content: prompt }], 140, detectedLanguage);
    return extractFriendlyMessage(
      response.message,
      'Welcome. I can help you create a virtual event. What would you like to name the event?'
    );
  } catch (error) {
    logger.error('openaiService', 'Failed to generate greeting; using fallback', {
      error: error.message,
      providerDetails: error.providerDetails,
      language,
      timestamp: new Date().toISOString(),
    });

    const greetings = {
      en: 'Welcome. I can help you create a virtual event. What would you like to name the event?',
      de: 'Willkommen. Ich kann Ihnen helfen, eine virtuelle Veranstaltung zu erstellen. Wie moechten Sie die Veranstaltung nennen?',
      fr: "Bienvenue. Je peux vous aider a creer un evenement virtuel. Quel nom souhaitez-vous donner a l evenement ?",
    };

    return greetings[detectedLanguage] || greetings.en;
  }
}

module.exports = {
  processMessage,
  generateGreeting,
  parseDateTime,
  validateEventData,
  createEmptyDraft,
  normalizeDraft,
  normalizeLanguage,
  detectLanguage,
  getNextStep,
  getSuggestions,
  buildSummary,
  SUPPORTED_LANGUAGES,
};

