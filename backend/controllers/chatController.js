#!/usr/bin/env node

const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const openaiService = require('../services/openaiService');
const HTTP_STATUS = require('../constants/httpStatus');
const { buildEventIdentity, hashEventIdentity } = require('../utils/eventIdentity');
const { EVENT_FIELD_INFO } = require('../services/chatEventUtils');
const MAX_MESSAGE_LENGTH = 4000;

async function getSessionData(chatSessionRepository, sessionId) {
  // Load the saved chat session and its draft so we can resume after refresh.
  const session = await chatSessionRepository.getById(sessionId);
  if (!session) return null;

  const sessionData = typeof session.session_data === 'string'
    ? JSON.parse(session.session_data)
    : session.session_data;

  return { session, sessionData };
}

function isSessionOwner(session, userId) {
  return Number(session?.user_id) === Number(userId);
}

function mapEventToDraft(event) {
  // Convert the DB event row into the draft shape used by the chat assistant.
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

function buildFieldInfo() {
  return EVENT_FIELD_INFO;
}

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

function isConfirmationMessage(message = '') {
  // Keep the final save trigger explicit so the model does not auto-commit too early.
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

      await chatSessionRepository.update(sessionId, {
        session_data: {
          ...sessionData,
          language: llmResponse.language,
          event_draft: eventDraft,
          current_step: llmResponse.nextStep,
          state: llmResponse.intent === 'confirm' ? 'confirming' : 'collecting',
        },
        current_step: llmResponse.nextStep,
        language: llmResponse.language,
      });

      await chatSessionRepository.addMessage(sessionId, 'bot', llmResponse.message);

      const validation = openaiService.validateEventData(eventDraft);
      const looksReadyToCommit = llmResponse.nextStep === 'confirm' && validation.valid;
      const userApprovedCommit = looksReadyToCommit && isConfirmationMessage(message);
      const wantsCreation = llmResponse.intent === 'confirm' || userApprovedCommit;
      const wantsUpdateCommit = llmResponse.intent === 'confirm' || userApprovedCommit;

      let eventCreated = false;
      let eventUpdated = false;
      let createdEventId = null;
      let updatedEventId = null;
      let reply = llmResponse.message;

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
        }

        await chatSessionRepository.remove(sessionId);
        reply = getCommitSuccessMessage(eventDraft.language, eventUpdated);
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



