#!/usr/bin/env node

/**
 * Chat controller for AI-assisted event creation and editing.
 * It owns the HTTP flow: create/resume chat sessions, pass messages to the LLM,
 * persist the evolving draft, and commit a valid confirmed draft into events.
 */
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const openaiService = require('../services/openaiService');
const HTTP_STATUS = require('../constants/httpStatus');
const { buildEventIdentity, hashEventIdentity } = require('../utils/eventIdentity');
const { EVENT_FIELD_INFO } = require('../services/chatEventUtils');
const MAX_MESSAGE_LENGTH = 4000;

// Load the saved chat session and its draft so we can resume after refresh.
async function getSessionData(chatSessionRepository, sessionId) {
  const session = await chatSessionRepository.getById(sessionId);
  if (!session) return null;

  const sessionData = typeof session.session_data === 'string'
    ? JSON.parse(session.session_data)
    : session.session_data;

  return { session, sessionData };
}

// Check whether the authenticated user owns the chat session.
function isSessionOwner(session, userId) {
  return Number(session?.user_id) === Number(userId);
}

// Convert the DB event row into the draft shape used by the chat assistant.
function mapEventToDraft(event) {
  return {
    id: event.id,
    name: event.name || null,
    subheading: event.subheading || null,
    description: event.description || null,
    bannerUrl: event.banner_url || null,
    timezone: event.timezone || null,
    status: event.status || null,
    startTime: event.start_time || null,
    endTime: event.end_time || null,
    vanishTime: event.vanish_time || null,
    roles: Array.isArray(event.roles) ? event.roles : [],
    language: event.language || 'en',
  };
}

// Return field metadata used by the frontend to render the event form.
function buildFieldInfo() {
  return EVENT_FIELD_INFO;
}

// Return a localized success message after event creation/update is committed.
function getCommitSuccessMessage(language = 'en', isUpdate = false) {
  const normalized = openaiService.normalizeLanguage(language);
  if (normalized === 'de') {
    return isUpdate
      ? 'Die Veranstaltung wurde erfolgreich aktualisiert.'
      : 'Die Veranstaltung wurde erfolgreich erstellt.';
  }
  if (normalized === 'fr') {
    return isUpdate
      ? "L'evenement a ete mis a jour avec succes."
      : "L'evenement a ete cree avec succes.";
  }
  return isUpdate
    ? 'The event was updated successfully.'
    : 'The event was created successfully.';
}

// Detect explicit user approval so the controller knows when it can save the event.
function isConfirmationMessage(message = '') {
  const normalized = String(message || '').trim().toLowerCase();
  if (!normalized) return false;

  const explicitApprovals = [
    'yes',
    'yeah',
    'yep',
    'ok',
    'okay',
    'sure',
    'confirm',
    'confirmed',
    'save',
    'save now',
    'saved',
    'save it',
    'save changes',
    'done',
    'finalize',
    'finalise',
    'proceed',
    'go ahead',
    'go ahead and save',
    'go ahead and update',
    'create now',
    'create it',
    'update it',
    'please update',
    'please save',
    'looks good',
    'looks fine',
    'all set',
    'all ok',
    'all good',
    'rest all ok',
    "that's fine",
    "that is fine",
    "c'est bon",
    "d'accord",
    'oui',
    'ja',
    'sí',
    'adelante',
  ];

  if (explicitApprovals.includes(normalized)) return true;

  if (/^(yes|yep|ok|okay|sure|confirm|confirm it|save|save it|save changes|update|update it|please update|please save)([.!?]*)$/i.test(normalized)) {
    return true;
  }

  const looksLikeApproval =
    normalized.length <= 30 &&
    !/\b(change|edit|fix|move|remove|add|set|update the name|update the title|update the banner|update the time|update the date)\b/i.test(normalized);

  return looksLikeApproval && /\b(ok|okay|yes|yep|sure|good|fine|done|update|save|confirm|all set|all good|looks good|looks fine)\b/i.test(normalized);
}

// Detect the explicit admin command that should send event notification emails.
function isSendEmailMessage(message = '') {
  const normalized = String(message || '').trim().toLowerCase();
  if (!normalized) return false;

  return (
    /\b(send|queue|trigger)\b/.test(normalized) &&
    /\b(email|emails|mail|notification|notifications)\b/.test(normalized)
  );
}

function isSendAllPendingEventsMessage(message = '') {
  const normalized = String(message || '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    /\b(send|queue|trigger)\b/.test(normalized) &&
    /\b(email|emails|mail|notification|notifications)\b/.test(normalized) &&
    /\b(all)\b/.test(normalized) &&
    /\b(pending)\b/.test(normalized) &&
    /\b(event|events)\b/.test(normalized)
  );
}

function hasEventCreationDetails(message = '') {
  const normalized = String(message || '').trim().toLowerCase();
  return /\b(create|event|called|named|name|subheading|description|banner|timezone|status|start|end|vanish|role|roles)\b/.test(normalized);
}

function isCancelMessage(message = '') {
  const normalized = String(message || '').trim().toLowerCase();
  return /^(no|nope|cancel|do not|don't|dont|skip|not now)([.!?]*)$/.test(normalized);
}

function isPublishedStatus(status = '') {
  return String(status || '').trim().toLowerCase() === 'published';
}

function getEmailQueuedMessage(language = 'en', result = {}) {
  const normalized = openaiService.normalizeLanguage(language);
  const queued = Number(result.queued || 0);
  const failed = Number(result.failed || 0);

  if (normalized === 'de') {
    return `E-Mail-Benachrichtigungen wurden in die Warteschlange gestellt. Erfolgreich: ${queued}, fehlgeschlagen: ${failed}.`;
  }
  if (normalized === 'fr') {
    return `Les notifications par e-mail ont ete placees dans la file d attente. Reussies : ${queued}, echouees : ${failed}.`;
  }
  return `Email notifications have been queued. Queued: ${queued}, failed: ${failed}.`;
}

function getEmailConfirmationMessage(language = 'en', event = {}) {
  const normalized = openaiService.normalizeLanguage(language);
  const status = event.status || 'not set';
  const name = event.name || 'this event';

  if (normalized === 'de') {
    return `"${name}" hat den Status "${status}". Moechten Sie die E-Mail-Benachrichtigungen trotzdem senden?`;
  }
  if (normalized === 'fr') {
    return `"${name}" a le statut "${status}". Voulez-vous quand meme envoyer les notifications par e-mail ?`;
  }
  return `"${name}" is currently "${status}", not Published. Do you still want to send the email notifications?`;
}

function extractEventNameFromMessage(message = '') {
  const raw = String(message || '').trim();
  if (!raw) return null;

  // Prefer quoted names: send email for "Tech Summit"
  const quoted = raw.match(/["'`“”](.+?)["'`“”]/);
  if (quoted?.[1]) return quoted[1].trim();

  // Fallback pattern: send email for event Tech Summit
  const forEvent = raw.match(/\b(?:for|of|about)\s+(?:the\s+)?event\s+(.+)$/i);
  if (forEvent?.[1]) return forEvent[1].trim();

  const namedEvent = raw.match(/\bevent\s+(.+)$/i);
  if (namedEvent?.[1]) return namedEvent[1].trim();

  return null;
}

function extractEventIdFromMessage(message = '') {
  const raw = String(message || '').trim();
  if (!raw) return null;
  const match = raw.match(/\b(?:event\s*id|id)\s*[:#-]?\s*(\d+)\b/i) || raw.match(/^\s*(\d+)\s*$/);
  return match?.[1] ? Number(match[1]) : null;
}

function extractEventIdsFromMessage(message = '') {
  const raw = String(message || '');
  if (!raw.trim()) return [];
  const matches = raw.match(/\b\d+\b/g) || [];
  return [...new Set(matches.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

function formatCandidateDate(value) {
  if (!value) return 'date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

async function findEventByNameForEmail(eventRepository, eventName, user) {
  const events = await eventRepository.list();
  const normalizedName = String(eventName || '').trim().toLowerCase();
  if (!normalizedName) return { match: null, candidates: [] };

  const visibleEvents = (events || []).filter((event) => (
    user?.role === 'Admin' || Number(event.created_by) === Number(user?.id)
  ));

  const exact = visibleEvents.find(
    (event) => String(event.name || '').trim().toLowerCase() === normalizedName
  );
  if (exact) return { match: exact, candidates: [exact] };

  const candidates = visibleEvents.filter((event) =>
    String(event.name || '').toLowerCase().includes(normalizedName)
  );
  if (candidates.length === 1) {
    return { match: candidates[0], candidates };
  }
  return { match: null, candidates };
}

async function queueNotificationsForEvent(eventRepository, eventId, language = 'en') {
  const notificationService = require('../services/notificationService');
  const emailNotificationRepository = notificationService.emailNotificationRepository;
  if (emailNotificationRepository?.hasSuccessfulNotificationForEvent) {
    const alreadySent = await emailNotificationRepository.hasSuccessfulNotificationForEvent(eventId);
    if (alreadySent) {
      return {
        result: { queued: 0, failed: 0, skippedAlreadySent: 1 },
        reply: `Email notifications were already sent for event ID ${eventId}. Skipping duplicate send.`,
        alreadySent: true,
      };
    }
  }

  const event = await eventRepository.getById(eventId);
  if (!event) {
    const error = new Error('Event not found for email notification');
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  const roles = Array.isArray(event.roles) ? event.roles : [];
  if (roles.length === 0) {
    const error = new Error('This event has no roles, so there are no role users to notify');
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  const result = await notificationService.notifyRoleUsersOfEvent(event, roles);

  return {
    result,
    reply: getEmailQueuedMessage(language, result),
    alreadySent: false,
  };
}

async function buildEmailSendOrConfirmation(eventRepository, eventId, language = 'en') {
  const event = await eventRepository.getById(eventId);
  if (!event) {
    const error = new Error('Event not found for email notification');
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  if (!isPublishedStatus(event.status)) {
    return {
      needsConfirmation: true,
      event,
      reply: getEmailConfirmationMessage(language, event),
    };
  }

  return queueNotificationsForEvent(eventRepository, eventId, language);
}

// Build the chat controller with injected repositories for testability and separation.
const createChatController = (
  chatSessionRepository,
  eventRepository,
  roleRepository,
  eventRoleRepository,
  idempotencyRepository
) => {
  if (!chatSessionRepository || !eventRepository || !roleRepository || !eventRoleRepository) {
    throw new Error('chat controller dependencies are required');
  }

  return {
    createSession: asyncHandler(async (req, res) => {
      // A session starts in create mode unless the user is editing an existing event.
      const userId = req.user?.id;
      const eventId = req.body.eventId ? Number(req.body.eventId) : null;
      const language = openaiService.normalizeLanguage(
        req.body.language || req.headers['accept-language'] || 'en'
      );

      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId is required' });
      }

      let eventDraft = openaiService.createEmptyDraft(language);
      let mode = 'create';

      if (eventId) {
        const existingEvent = await eventRepository.getById(eventId);
        if (!existingEvent) {
          return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (req.user?.role !== 'Admin' && Number(existingEvent.created_by) !== Number(userId)) {
          return res.status(403).json({ success: false, error: 'You cannot edit this event' });
        }

        eventDraft = openaiService.normalizeDraft(mapEventToDraft(existingEvent), existingEvent.language || language);
        mode = 'update';
      }

      const nextStep = openaiService.getNextStep(eventDraft);
      const session = await chatSessionRepository.create({
        user_id: userId,
        language,
        conversation_history: [],
        event_draft: eventDraft,
        current_step: nextStep,
        state: 'collecting',
        mode,
        event_id: eventId,
      });

      const greeting = mode === 'update'
        ? `You're editing "${eventDraft.name}". Tell me what you'd like to change, for example "change the start time to Tuesday 3 PM" or "set status to Published".`
        : await openaiService.generateGreeting(language);
      await chatSessionRepository.addMessage(session.id, 'bot', greeting);

      const suggestions = openaiService.getSuggestions(nextStep, language);
      const formattedSuggestions = suggestions.length > 0
        ? suggestions.slice(0, 3).map(s => ({ label: s, value: s }))
        : [];

      return res.status(201).json({
        success: true,
        sessionId: session.id,
        greeting,
        language,
        nextStep,
        eventDraft,
        mode,
        eventId,
        suggestions: formattedSuggestions,
        summary: openaiService.buildSummary(eventDraft),
        fieldInfo: buildFieldInfo(),
      });
    }),

    sendMessage: asyncHandler(async (req, res) => {
      // Main chat loop: save the user message, run the model, merge the draft, and commit when ready.
      const userId = req.user?.id;
      const { sessionId, message, languageLocked = false } = req.body;
      const requestLanguage = req.body.language || req.headers['accept-language'] || 'en';
      const chatCreateScope = 'chat:event:create';
      const chatCreateKey = `chat-create:${sessionId}`;

      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          error: 'sessionId and message are required',
        });
      }

      if (String(message).length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
        });
      }

      const loaded = await getSessionData(chatSessionRepository, sessionId);
      if (!loaded) {
        if (idempotencyRepository && userId) {
          const replayRecord = await idempotencyRepository.findByUserScopeAndKey(
            userId,
            chatCreateScope,
            chatCreateKey
          );

          if (replayRecord?.response_body) {
            return res
              .status(replayRecord.response_status_code || HTTP_STATUS.OK)
              .json(replayRecord.response_body);
          }
        }

        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      if (!isSessionOwner(loaded.session, userId)) {
        return res.status(403).json({ success: false, error: 'You cannot access this session' });
      }

      let { sessionData } = loaded;
      await chatSessionRepository.addMessage(sessionId, 'user', message);
      const refreshed = await getSessionData(chatSessionRepository, sessionId);
      sessionData = refreshed?.sessionData || sessionData;
      const requestedEmailSend = isSendEmailMessage(message);
      const requestedSendAllPending = isSendAllPendingEventsMessage(message);

      if (requestedSendAllPending) {
        if (req.user?.role !== 'Admin') {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: 'Only admins can send email notifications for all pending events',
          });
        }

        const allEvents = await eventRepository.list();
        const pendingEvents = (allEvents || []).filter(
          (event) => String(event.status || '').trim().toLowerCase() === 'pending'
        );

        if (pendingEvents.length === 0) {
          const reply = 'No pending events were found.';
          await chatSessionRepository.addMessage(sessionId, 'bot', reply);
          return res.status(HTTP_STATUS.OK).json({
            reply,
            sessionId,
            language: sessionData.language || requestLanguage,
            intent: 'send_email_all_pending',
            confidence: 1,
            nextStep: 'email',
            eventCreated: false,
            eventUpdated: false,
            emailQueued: false,
            emailResult: { queued: 0, failed: 0, skipped: 0 },
            eventDraft: sessionData.event_draft || null,
            suggestions: [],
            summary: sessionData.event_draft
              ? openaiService.buildSummary(sessionData.event_draft)
              : undefined,
            validation: sessionData.event_draft
              ? openaiService.validateEventData(sessionData.event_draft)
              : undefined,
            fieldInfo: buildFieldInfo(),
          });
        }

        let queued = 0;
        let failed = 0;
        let skipped = 0;

        for (const event of pendingEvents) {
          try {
            const result = await queueNotificationsForEvent(
              eventRepository,
              event.id,
              sessionData.language || requestLanguage
            );
            if (result.alreadySent) {
              skipped += 1;
            } else {
              queued += Number(result.result?.queued || 0);
              failed += Number(result.result?.failed || 0);
            }
          } catch (error) {
            failed += 1;
          }
        }

        const reply = `Processed pending events email request. Queued: ${queued}, failed: ${failed}, skipped (already sent): ${skipped}.`;
        await chatSessionRepository.addMessage(sessionId, 'bot', reply);
        return res.status(HTTP_STATUS.OK).json({
          reply,
          sessionId,
          language: sessionData.language || requestLanguage,
          intent: 'send_email_all_pending',
          confidence: 1,
          nextStep: 'email',
          eventCreated: false,
          eventUpdated: false,
          emailQueued: queued > 0,
          emailResult: { queued, failed, skipped },
          eventDraft: sessionData.event_draft || null,
          suggestions: [],
          summary: sessionData.event_draft
            ? openaiService.buildSummary(sessionData.event_draft)
            : undefined,
          validation: sessionData.event_draft
            ? openaiService.validateEventData(sessionData.event_draft)
            : undefined,
          fieldInfo: buildFieldInfo(),
        });
      }

      if (sessionData.pending_email_confirmation?.eventId) {
        if (isConfirmationMessage(message)) {
          if (req.user?.role !== 'Admin') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Only admins can send event notification emails',
            });
          }

          const emailResult = await queueNotificationsForEvent(
            eventRepository,
            sessionData.pending_email_confirmation.eventId,
            sessionData.language || requestLanguage
          );

          const nextSessionData = {
            ...sessionData,
            pending_email_confirmation: null,
            state: 'email_sent',
            current_step: 'email_sent',
          };
          await chatSessionRepository.update(sessionId, {
            session_data: nextSessionData,
            current_step: 'email_sent',
            language: sessionData.language || requestLanguage,
          });
          await chatSessionRepository.addMessage(sessionId, 'bot', emailResult.reply);

          return res.status(HTTP_STATUS.OK).json({
            reply: emailResult.reply,
            sessionId,
            language: sessionData.language || requestLanguage,
            intent: 'send_email',
            confidence: 1,
            nextStep: 'email_sent',
            eventCreated: false,
            eventUpdated: false,
            emailQueued: true,
            emailResult: emailResult.result,
            eventDraft: sessionData.event_draft || null,
            suggestions: [],
            summary: sessionData.event_draft
              ? openaiService.buildSummary(sessionData.event_draft)
              : undefined,
            validation: sessionData.event_draft
              ? openaiService.validateEventData(sessionData.event_draft)
              : undefined,
            fieldInfo: buildFieldInfo(),
          });
        }

        if (isCancelMessage(message)) {
          const reply = 'Okay, I will not send the email notifications yet.';
          await chatSessionRepository.update(sessionId, {
            session_data: {
              ...sessionData,
              pending_email_confirmation: null,
              state: 'event_created',
              current_step: 'email',
            },
            current_step: 'email',
            language: sessionData.language || requestLanguage,
          });
          await chatSessionRepository.addMessage(sessionId, 'bot', reply);

          return res.status(HTTP_STATUS.OK).json({
            reply,
            sessionId,
            language: sessionData.language || requestLanguage,
            intent: 'send_email_cancelled',
            confidence: 1,
            nextStep: 'email',
            eventCreated: false,
            eventUpdated: false,
            emailQueued: false,
            eventDraft: sessionData.event_draft || null,
            suggestions: [],
            summary: sessionData.event_draft
              ? openaiService.buildSummary(sessionData.event_draft)
              : undefined,
            validation: sessionData.event_draft
              ? openaiService.validateEventData(sessionData.event_draft)
              : undefined,
            fieldInfo: buildFieldInfo(),
          });
        }
      }

      const awaitingEmailEventName = Boolean(sessionData.awaiting_email_event_name);
      if ((requestedEmailSend || awaitingEmailEventName) && (sessionData.event_id || sessionData.event_draft?.id || !hasEventCreationDetails(message))) {
        if (req.user?.role !== 'Admin') {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: 'Only admins can send event notification emails',
          });
        }

        const targetEventId = sessionData.event_id || sessionData.event_draft?.id || null;
        let resolvedEventId = targetEventId;
        const requestedEventIds = extractEventIdsFromMessage(message);

        if (!resolvedEventId && requestedEventIds.length > 1) {
          let queued = 0;
          let failed = 0;
          let skipped = 0;
          const invalid = [];

          for (const eventId of requestedEventIds) {
            const eventById = await eventRepository.getById(eventId);
            if (!eventById || (req.user?.role !== 'Admin' && Number(eventById.created_by) !== Number(req.user?.id))) {
              invalid.push(eventId);
              continue;
            }

            try {
              const result = await buildEmailSendOrConfirmation(
                eventRepository,
                eventById.id,
                sessionData.language || requestLanguage
              );

              if (result.needsConfirmation) {
                // For multi-send, non-published items are skipped instead of interactive confirmation.
                skipped += 1;
                continue;
              }

              if (result.alreadySent) {
                skipped += 1;
                continue;
              }

              queued += Number(result.result?.queued || 0);
              failed += Number(result.result?.failed || 0);
            } catch (error) {
              failed += 1;
            }
          }

          const reply = `Processed events ${requestedEventIds.join(', ')}. Queued: ${queued}, failed: ${failed}, skipped: ${skipped}${invalid.length ? `, invalid/not accessible IDs: ${invalid.join(', ')}` : ''}.`;
          await chatSessionRepository.addMessage(sessionId, 'bot', reply);
          return res.status(HTTP_STATUS.OK).json({
            reply,
            sessionId,
            language: sessionData.language || requestLanguage,
            intent: 'send_email',
            confidence: 1,
            nextStep: 'email',
            eventCreated: false,
            eventUpdated: false,
            emailQueued: queued > 0,
            emailResult: { queued, failed, skipped, invalid },
            eventDraft: sessionData.event_draft || null,
            suggestions: [],
            summary: sessionData.event_draft
              ? openaiService.buildSummary(sessionData.event_draft)
              : undefined,
            validation: sessionData.event_draft
              ? openaiService.validateEventData(sessionData.event_draft)
              : undefined,
            fieldInfo: buildFieldInfo(),
          });
        }

        if (!resolvedEventId) {
          const requestedEventId = extractEventIdFromMessage(message);
          if (requestedEventId) {
            const eventById = await eventRepository.getById(requestedEventId);
            if (eventById && (req.user?.role === 'Admin' || Number(eventById.created_by) === Number(req.user?.id))) {
              resolvedEventId = eventById.id;
            } else {
              const reply = `I could not find an event with ID ${requestedEventId}. Please provide a valid event ID or exact event name.`;
              await chatSessionRepository.update(sessionId, {
                session_data: {
                  ...sessionData,
                  awaiting_email_event_name: true,
                  state: 'awaiting_email_event_name',
                  current_step: 'email_event_name',
                },
                current_step: 'email_event_name',
                language: sessionData.language || requestLanguage,
              });
              await chatSessionRepository.addMessage(sessionId, 'bot', reply);

              return res.status(HTTP_STATUS.OK).json({
                reply,
                sessionId,
                language: sessionData.language || requestLanguage,
                intent: 'send_email',
                confidence: 1,
                nextStep: 'email_event_name',
                eventCreated: false,
                eventUpdated: false,
                emailQueued: false,
                emailConfirmationRequired: false,
                eventDraft: sessionData.event_draft || null,
                suggestions: [],
                summary: sessionData.event_draft
                  ? openaiService.buildSummary(sessionData.event_draft)
                  : undefined,
                validation: sessionData.event_draft
                  ? openaiService.validateEventData(sessionData.event_draft)
                  : undefined,
                fieldInfo: buildFieldInfo(),
              });
            }
          }

        }

        if (!resolvedEventId) {
          const requestedEventName = extractEventNameFromMessage(message);

          if (!requestedEventName) {
            const reply = 'Please tell me the event name first, for example: send email for "Tech Summit 2026".';
            await chatSessionRepository.update(sessionId, {
              session_data: {
                ...sessionData,
                awaiting_email_event_name: true,
                state: 'awaiting_email_event_name',
                current_step: 'email_event_name',
              },
              current_step: 'email_event_name',
              language: sessionData.language || requestLanguage,
            });
            await chatSessionRepository.addMessage(sessionId, 'bot', reply);

            return res.status(HTTP_STATUS.OK).json({
              reply,
              sessionId,
              language: sessionData.language || requestLanguage,
              intent: 'send_email',
              confidence: 1,
              nextStep: 'email_event_name',
              eventCreated: false,
              eventUpdated: false,
              emailQueued: false,
              emailConfirmationRequired: false,
              eventDraft: sessionData.event_draft || null,
              suggestions: [],
              summary: sessionData.event_draft
                ? openaiService.buildSummary(sessionData.event_draft)
                : undefined,
              validation: sessionData.event_draft
                ? openaiService.validateEventData(sessionData.event_draft)
                : undefined,
              fieldInfo: buildFieldInfo(),
            });
          }

          const lookup = await findEventByNameForEmail(eventRepository, requestedEventName, req.user);
          if (!lookup.match) {
            const candidateRows = (lookup.candidates || [])
              .slice(0, 5)
              .map((e) => `- ID ${e.id}: "${e.name}" (${formatCandidateDate(e.start_time)})`)
              .join('\n');
            const reply = candidateRows
              ? `I found multiple events matching "${requestedEventName}". Reply with exact event name or event ID.\n${candidateRows}`
              : `I could not find an event named "${requestedEventName}". Please provide the exact event name.`;

            await chatSessionRepository.update(sessionId, {
              session_data: {
                ...sessionData,
                awaiting_email_event_name: true,
                state: 'awaiting_email_event_name',
                current_step: 'email_event_name',
              },
              current_step: 'email_event_name',
              language: sessionData.language || requestLanguage,
            });
            await chatSessionRepository.addMessage(sessionId, 'bot', reply);

            return res.status(HTTP_STATUS.OK).json({
              reply,
              sessionId,
              language: sessionData.language || requestLanguage,
              intent: 'send_email',
              confidence: 1,
              nextStep: 'email_event_name',
              eventCreated: false,
              eventUpdated: false,
              emailQueued: false,
              emailConfirmationRequired: false,
              eventDraft: sessionData.event_draft || null,
              suggestions: [],
              summary: sessionData.event_draft
                ? openaiService.buildSummary(sessionData.event_draft)
                : undefined,
              validation: sessionData.event_draft
                ? openaiService.validateEventData(sessionData.event_draft)
                : undefined,
              fieldInfo: buildFieldInfo(),
            });
          }

          resolvedEventId = lookup.match.id;
        }

        if (!resolvedEventId) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            error: 'Create or select an event before sending notification emails',
          });
        }

        const emailResult = await buildEmailSendOrConfirmation(
          eventRepository,
          resolvedEventId,
          sessionData.language || requestLanguage
        );

        if (emailResult.needsConfirmation) {
          await chatSessionRepository.update(sessionId, {
            session_data: {
              ...sessionData,
              pending_email_confirmation: {
                eventId: resolvedEventId,
                requestedAt: new Date().toISOString(),
              },
              awaiting_email_event_name: false,
              state: 'confirming_email_send',
              current_step: 'confirm_email_send',
            },
            current_step: 'confirm_email_send',
            language: sessionData.language || requestLanguage,
          });
        }

        await chatSessionRepository.addMessage(sessionId, 'bot', emailResult.reply);

        return res.status(HTTP_STATUS.OK).json({
          reply: emailResult.reply,
          sessionId,
          language: sessionData.language || requestLanguage,
          intent: 'send_email',
          confidence: 1,
          nextStep: emailResult.needsConfirmation ? 'confirm_email_send' : 'email_sent',
          eventCreated: false,
          eventUpdated: false,
          emailQueued: !emailResult.needsConfirmation,
          emailConfirmationRequired: Boolean(emailResult.needsConfirmation),
          emailResult: emailResult.result || null,
          eventDraft: sessionData.event_draft || null,
          suggestions: [],
          summary: sessionData.event_draft
            ? openaiService.buildSummary(sessionData.event_draft)
            : undefined,
          validation: sessionData.event_draft
            ? openaiService.validateEventData(sessionData.event_draft)
            : undefined,
          fieldInfo: buildFieldInfo(),
        });
      }

      // Keep the prompt compact: only recent bot/user messages are sent back to the LLM.
      const conversationHistory = (sessionData.conversation_history || [])
        .filter((msg) => msg.role === 'bot' || msg.role === 'user')
        .slice(-14)
        .map((msg) => ({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: typeof msg.content === 'string' ? msg.content.slice(-700) : '',
        }));

      const llmResponse = await openaiService.processMessage(
        message,
        conversationHistory,
        sessionData.event_draft,
        requestLanguage,
        { languageLocked }
      );

      // Merge the AI result into the persisted draft before deciding whether to save.
      const eventDraft = openaiService.normalizeDraft(
        llmResponse.extractedData,
        llmResponse.language || requestLanguage
      );
      eventDraft.language = llmResponse.language || requestLanguage;
      const emailRequestedAfterCreate =
        Boolean(sessionData.email_requested_after_create) ||
        (requestedEmailSend && !sessionData.event_id && !sessionData.event_draft?.id);

      await chatSessionRepository.update(sessionId, {
        session_data: {
          ...sessionData,
          language: llmResponse.language,
          event_draft: eventDraft,
          current_step: llmResponse.nextStep,
          state: llmResponse.intent === 'confirm' ? 'confirming' : 'collecting',
          email_requested_after_create: emailRequestedAfterCreate,
        },
        current_step: llmResponse.nextStep,
        language: llmResponse.language,
      });

      await chatSessionRepository.addMessage(sessionId, 'bot', llmResponse.message);

      const validation = openaiService.validateEventData(eventDraft);
      // A database write happens only after the draft is complete and the user/model confirms it.
      const looksReadyToCommit = llmResponse.nextStep === 'confirm' && validation.valid;
      const userApprovedCommit = looksReadyToCommit && isConfirmationMessage(message);
      const wantsCreation = llmResponse.intent === 'confirm' || userApprovedCommit;
      const wantsUpdateCommit = llmResponse.intent === 'confirm' || userApprovedCommit;

      let eventCreated = false;
      let eventUpdated = false;
      let createdEventId = null;
      let updatedEventId = null;
      let reply = llmResponse.message;
      let emailQueued = false;
      let emailConfirmationRequired = false;
      let emailResult = null;

      if ((sessionData.mode === 'update' ? wantsUpdateCommit : wantsCreation) && validation.valid) {
        const isUpdate = sessionData.mode === 'update' && sessionData.event_id;

        if (isUpdate) {
          // Update the existing event row, then replace its role mappings.
          logger.info('chatController', 'Committing chat update to events table', {
            sessionId,
            userId,
            eventId: sessionData.event_id,
            roles: eventDraft.roles,
          });

          const updatedEvent = await eventRepository.updateWithRoles(
            sessionData.event_id,
            {
              name: eventDraft.name,
              subheading: eventDraft.subheading,
              description: eventDraft.description,
              banner_url: eventDraft.bannerUrl,
              timezone: eventDraft.timezone,
              status: eventDraft.status,
              start_time: eventDraft.startTime,
              end_time: eventDraft.endTime,
              vanish_time: eventDraft.vanishTime,
              language: eventDraft.language,
            },
            eventDraft.roles
          );

          if (!updatedEvent) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Event not found or could not be updated',
            });
          }

          eventUpdated = true;
          updatedEventId = updatedEvent.id;

          logger.info('chatController', 'Chat update committed successfully', {
            sessionId,
            userId,
            eventId: updatedEventId,
          });
        } else {
          // Create a brand new event only after the draft is complete and confirmed.
          const identity = buildEventIdentity({
            ...eventDraft,
            created_by: userId,
            roles: eventDraft.roles,
          });
          const requestHash = hashEventIdentity(identity);

          if (idempotencyRepository) {
            const claimResult = await idempotencyRepository.claimRequest(
              userId,
              chatCreateScope,
              chatCreateKey,
              requestHash
            );

            if (claimResult.state === 'replay' && claimResult.record?.response_body) {
              return res
                .status(claimResult.record.response_status_code || HTTP_STATUS.OK)
                .json(claimResult.record.response_body);
            }

            if (claimResult.state === 'mismatch') {
              return res.status(HTTP_STATUS.CONFLICT).json({
                message: 'This chat session already created an event with a different finalized payload.',
              });
            }

            if (claimResult.state === 'pending') {
              return res.status(HTTP_STATUS.CONFLICT).json({
                message: 'This chat event creation is already being processed.',
              });
            }

            req.idempotencyContext = {
              id: claimResult.record.id,
              scope: chatCreateScope,
              key: chatCreateKey,
              requestHash,
            };
          }

          const duplicateEvent = await eventRepository.findEquivalentEvent(identity);
          if (duplicateEvent) {
            // Prevent the same user from creating an equivalent event twice from chat.
            const duplicateResponse = {
              reply: 'An equivalent event already exists for this user. Change the event details before creating another one.',
              sessionId,
              language: llmResponse.language,
              intent: llmResponse.intent,
              confidence: llmResponse.confidence,
              nextStep: llmResponse.nextStep,
              eventCreated: false,
              eventUpdated: false,
              duplicateEvent: true,
              duplicateEventId: duplicateEvent.id,
              eventDraft,
              suggestions: llmResponse.suggestions,
              summary: llmResponse.summary,
              validation,
            };

            if (req.idempotencyContext?.id && idempotencyRepository) {
              await idempotencyRepository.completeRequest(
                req.idempotencyContext.id,
                HTTP_STATUS.OK,
                duplicateResponse,
                duplicateEvent.id
              );
            }

            return res.status(HTTP_STATUS.OK).json(duplicateResponse);
          }

          const newEvent = await eventRepository.createWithRoles({
            name: eventDraft.name,
            subheading: eventDraft.subheading,
            description: eventDraft.description,
            banner_url: eventDraft.bannerUrl,
            timezone: eventDraft.timezone,
            status: eventDraft.status,
            start_time: eventDraft.startTime,
            end_time: eventDraft.endTime,
            vanish_time: eventDraft.vanishTime,
            language: eventDraft.language,
            created_by: userId,
          }, eventDraft.roles);
          if (!newEvent) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
              success: false,
              error: 'Failed to create event',
            });
          }

          eventCreated = true;
          createdEventId = newEvent.id;
          eventDraft.id = newEvent.id;
        }

        if (eventUpdated) {
          await chatSessionRepository.remove(sessionId);
          reply = getCommitSuccessMessage(eventDraft.language, true);
        } else {
          const createdEventDraft = {
            ...eventDraft,
            id: createdEventId,
          };
          const nextSessionData = {
            ...sessionData,
            language: eventDraft.language,
            event_draft: createdEventDraft,
            current_step: 'email',
            state: 'event_created',
            mode: 'update',
            event_id: createdEventId,
          };

          let emailReply = '';
          const shouldSendEmailAfterCreate =
            requestedEmailSend || sessionData.email_requested_after_create;
          if (shouldSendEmailAfterCreate) {
            if (req.user?.role !== 'Admin') {
              emailReply = ' Only admins can send event notification emails.';
            } else {
              const emailSendResult = await buildEmailSendOrConfirmation(
                eventRepository,
                createdEventId,
                eventDraft.language
              );
              emailReply = ` ${emailSendResult.reply}`;

              if (emailSendResult.needsConfirmation) {
                emailConfirmationRequired = true;
                nextSessionData.pending_email_confirmation = {
                  eventId: createdEventId,
                  requestedAt: new Date().toISOString(),
                };
                nextSessionData.current_step = 'confirm_email_send';
                nextSessionData.state = 'confirming_email_send';
              } else {
                emailQueued = true;
                emailResult = emailSendResult.result || null;
                nextSessionData.current_step = 'email_sent';
                nextSessionData.state = 'email_sent';
              }
            }
          }
          nextSessionData.email_requested_after_create = false;

          await chatSessionRepository.update(sessionId, {
            session_data: nextSessionData,
            current_step: nextSessionData.current_step,
            language: eventDraft.language,
          });
          reply = shouldSendEmailAfterCreate
            ? `${getCommitSuccessMessage(eventDraft.language, false)}${emailReply}`
            : `${getCommitSuccessMessage(eventDraft.language, false)} Say "send the email" when you want to notify the selected role users.`;
        }
      } else if (wantsCreation && !validation.valid) {
        const language = openaiService.normalizeLanguage(llmResponse.language || requestLanguage);
        const missingText = validation.missingFields.join(', ');
        const errorText = validation.errors.join(', ');
        reply = language === 'de'
          ? `Vor dem Erstellen der Veranstaltung fehlen noch einige Angaben. Fehlende Felder: ${missingText || 'keine'}. Fehler: ${errorText || 'keine'}.`
          : language === 'fr'
            ? `Il manque encore des informations avant de creer l evenement. Champs manquants : ${missingText || 'aucun'}. Erreurs : ${errorText || 'aucune'}.`
            : `We still need a few details before creating the event. Missing fields: ${missingText || 'none'}. Errors: ${errorText || 'none'}.`;
      }

      logger.info('chatController', 'Processed chat message', {
        sessionId,
        userId,
        intent: llmResponse.intent,
        nextStep: llmResponse.nextStep,
        eventCreated,
        eventUpdated,
        createdEventId,
        updatedEventId,
        emailQueued,
        emailConfirmationRequired,
      });

      const formattedSuggestions = llmResponse.suggestions && llmResponse.suggestions.length > 0
        ? llmResponse.suggestions.slice(0, 3).map(s => ({ label: s, value: s }))
        : [];

      const responseBody = {
        reply,
        sessionId,
        language: llmResponse.language,
        intent: llmResponse.intent,
        confidence: llmResponse.confidence,
        nextStep: llmResponse.nextStep,
        eventCreated,
        eventUpdated,
        createdEventId,
        updatedEventId,
        emailQueued,
        emailConfirmationRequired,
        emailResult,
        eventDraft: eventCreated ? null : eventDraft,
        suggestions: formattedSuggestions,
        summary: llmResponse.summary,
        validation,
        fieldInfo: buildFieldInfo(),
      };

      if (eventCreated && req.idempotencyContext?.id && idempotencyRepository) {
        await idempotencyRepository.completeRequest(
          req.idempotencyContext.id,
          HTTP_STATUS.OK,
          responseBody,
          createdEventId
        );
      }

      return res.status(HTTP_STATUS.OK).json(responseBody);
    }),
    getSession: asyncHandler(async (req, res) => {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      const loaded = await getSessionData(chatSessionRepository, sessionId);

      if (!loaded) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      if (!isSessionOwner(loaded.session, userId)) {
        return res.status(403).json({ success: false, error: 'You cannot access this session' });
      }

      const { session, sessionData } = loaded;
      const eventDraft = openaiService.normalizeDraft(sessionData.event_draft, session.language);
      const nextStep = openaiService.getNextStep(eventDraft);

      const suggestions = openaiService.getSuggestions(nextStep, session.language);
      const formattedSuggestions = suggestions.length > 0
        ? suggestions.slice(0, 3).map(s => ({ label: s, value: s }))
        : [];

      return res.status(200).json({
        success: true,
        data: {
          sessionId: session.id,
          userId: session.user_id,
          language: session.language,
          conversationHistory: sessionData.conversation_history || [],
          eventDraft,
          currentStep: nextStep,
          state: sessionData.state || 'collecting',
          mode: sessionData.mode || 'create',
          eventId: sessionData.event_id || null,
          suggestions: formattedSuggestions,
          summary: openaiService.buildSummary(eventDraft),
          fieldInfo: buildFieldInfo(),
        },
      });
    }),

    deleteSession: asyncHandler(async (req, res) => {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      const loaded = await getSessionData(chatSessionRepository, sessionId);

      if (!loaded) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      if (!isSessionOwner(loaded.session, userId)) {
        return res.status(403).json({ success: false, error: 'You cannot access this session' });
      }

      const deleted = await chatSessionRepository.remove(sessionId);

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      logger.info('chatController', 'Session deleted', { sessionId });
      return res.status(200).json({ success: true, message: 'Session deleted' });
    }),
  };
};

module.exports = createChatController;
