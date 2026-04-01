import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../services/api';

const getSessionStorageKey = (userId, eventId) =>
  `admin-chat-session:${userId}:${eventId || 'new'}`;

const detectBrowserLanguage = () => {
  const locale = (navigator.language || 'en').toLowerCase();
  if (locale.startsWith('de')) return 'de';
  if (locale.startsWith('fr')) return 'fr';
  return 'en';
};

const formatTime = (date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const formatDateTime = (dateString) => {
  if (!dateString) return 'Not set';
  const parsed = new Date(String(dateString).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime())
    ? dateString
    : parsed.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const decodeJsonStringFragment = (value) => {
  if (typeof value !== 'string') return '';
  try {
    return JSON.parse(`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }
};

const normalizeAssistantText = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const messageMatch = trimmed.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/s);
  if (messageMatch?.[1]) {
    return decodeJsonStringFragment(messageMatch[1]).trim();
  }

  const parseCandidate = (candidate) => {
    try {
      const parsed = JSON.parse(candidate);
      return typeof parsed?.message === 'string' ? parsed.message.trim() : null;
    } catch {
      return null;
    }
  };

  if (trimmed.startsWith('```')) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      const fencedMessageMatch = fenced[1].match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/s);
      if (fencedMessageMatch?.[1]) {
        return decodeJsonStringFragment(fencedMessageMatch[1]).trim();
      }
      const parsedMessage = parseCandidate(fenced[1]);
      if (parsedMessage) return parsedMessage;
    }
  }

  const directParsed = parseCandidate(trimmed);
  if (directParsed) return directParsed;

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const parsedMessage = parseCandidate(objectMatch[0]);
    if (parsedMessage) return parsedMessage;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
};

const Bubble = ({ role, text, ts }) => {
  const isUser = role === 'user';
  return (
    <div className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[84%] rounded-2xl px-4 py-3 text-sm shadow-sm',
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
            : 'bg-white border border-slate-200 text-slate-900',
        ].join(' ')}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
        <div className={['mt-2 text-[11px]', isUser ? 'text-white/80' : 'text-slate-500'].join(' ')}>
          {formatTime(ts)}
        </div>
      </div>
    </div>
  );
};

const DraftItem = ({ label, value }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-sm text-slate-900">{value || 'Not set'}</div>
  </div>
);

const EventDraftPreview = ({ draft, summary }) => {
  if (!draft) return null;

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h4 className="font-semibold text-amber-950">Event Draft</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DraftItem label="Event Name" value={draft.name} />
        <DraftItem label="Subheading" value={draft.subheading} />
        <DraftItem label="Status" value={draft.status} />
        <DraftItem label="Time Zone" value={draft.timezone} />
        <DraftItem label="Start" value={formatDateTime(draft.startTime)} />
        <DraftItem label="End" value={formatDateTime(draft.endTime)} />
        <DraftItem label="Vanish" value={formatDateTime(draft.vanishTime)} />
        <DraftItem label="Roles" value={draft.roles?.length ? draft.roles.join(', ') : ''} />
        <DraftItem label="Banner URL" value={draft.bannerUrl} />
      </div>
      <div className="mt-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</div>
        <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{draft.description || 'Not set'}</div>
      </div>
      {draft.bannerUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-amber-200 bg-white">
          <img src={draft.bannerUrl} alt="Event banner preview" className="h-40 w-full object-cover" />
        </div>
      )}
      {summary && (
        <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
          {summary}
        </div>
      )}
    </div>
  );
};

const SuggestionRow = ({ items, onPick, disabled }) => {
  if (!items?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <button
          key={`${typeof item === 'object' && item !== null ? (item.value || item.label || 'suggestion') : String(item)}-${index}`}
          type="button"
          disabled={disabled}
          onClick={() => onPick(typeof item === 'object' && item !== null ? (item.value || item.label || '') : item)}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {typeof item === 'object' && item !== null ? (item.label || item.value || '') : item}
        </button>
      ))}
    </div>
  );
};

const isNotFoundError = (error) =>
  error?.statusCode === 404 ||
  error?.response?.status === 404 ||
  /Session not found/i.test(error?.message || '');

const AdminChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const editingEventId = searchParams.get('eventId');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [eventDraft, setEventDraft] = useState(null);
  const [eventCompleted, setEventCompleted] = useState(false);
  const [completionMode, setCompletionMode] = useState('create');
  const [language, setLanguage] = useState(detectBrowserLanguage());
  const [languageLocked, setLanguageLocked] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState('');
  const [mode, setMode] = useState(editingEventId ? 'update' : 'create');
  const endRef = useRef(null);
  const initialLanguageRef = useRef(language);
  const languageSelection = languageLocked ? language : 'auto';

  const createFreshSession = useCallback(async (activeLanguage = language) => {
    // Start a clean session when the user opens chat, clears it, or the backend session disappears.
    if (!user?.id) {
      throw new Error('User is not ready');
    }

    const response = await chatAPI.createSession(user.id, activeLanguage, editingEventId);
    const storageKey = getSessionStorageKey(user.id, editingEventId);

    setSessionId(response.sessionId);
    setLanguage(response.language || activeLanguage);
    setSuggestions(response.suggestions || []);
    setSummary(response.summary || '');
    setEventDraft(response.eventDraft || null);
    setMode(response.mode || (editingEventId ? 'update' : 'create'));
    localStorage.setItem(storageKey, response.sessionId);
    setMessages([
      {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        text: normalizeAssistantText(response.greeting),
        ts: new Date(),
      },
    ]);

    return response;
  }, [editingEventId, language, user?.id]);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setInitializing(true);
        setError(null);
        setMode(editingEventId ? 'update' : 'create');

        // Restore the saved session when possible so a refresh does not lose the draft.
        if (authLoading) return;
        if (!user?.id) {
          setError('User not authenticated');
          setInitializing(false);
          return;
        }

        const storageKey = getSessionStorageKey(user.id, editingEventId);
        const storedSessionId = localStorage.getItem(storageKey);

        if (storedSessionId) {
          try {
            const response = await chatAPI.getSession(storedSessionId);
            const session = response.data;
            setSessionId(session.sessionId);
            setLanguage(session.language || initialLanguageRef.current);
            setEventDraft(session.eventDraft || null);
            setSuggestions(session.suggestions || []);
            setSummary(session.summary || '');
            setMode(session.mode || (editingEventId ? 'update' : 'create'));
            setMessages(
              (session.conversationHistory || []).map((message, index) => ({
                id: `${message.role || 'message'}-${index}-${message.timestamp || Date.now()}`,
                role: message.role === 'bot' ? 'assistant' : 'user',
                text: message.role === 'bot' ? normalizeAssistantText(message.content) : message.content,
                ts: message.timestamp ? new Date(message.timestamp) : new Date(),
              }))
            );
            setInitializing(false);
            return;
          } catch (sessionError) {
            if (!isNotFoundError(sessionError)) {
              throw sessionError;
            }
            localStorage.removeItem(storageKey);
          }
        }

        await createFreshSession(initialLanguageRef.current);
      } catch (err) {
        setError(`Failed to initialize chat: ${err.message}`);
      } finally {
        setInitializing(false);
      }
    };

    initializeSession();
  }, [user, authLoading, editingEventId, createFreshSession]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, suggestions]);

  useEffect(() => {
    if (!user?.id) return;
    const storageKey = getSessionStorageKey(user.id, editingEventId);
    if (sessionId) {
      localStorage.setItem(storageKey, sessionId);
    }
  }, [sessionId, user, editingEventId]);

  const pushAssistantMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        text: normalizeAssistantText(text),
        ts: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (presetMessage) => {
    // Send one chat turn to the backend and let it decide the next prompt.
    const text = (presetMessage ?? draft).trim();
    if (!text || loading || !sessionId || !user) return;

    setDraft('');
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text, ts: new Date() },
    ]);
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(user.id, sessionId, text, language, languageLocked);
      pushAssistantMessage(response.reply);
      if (!languageLocked) {
        setLanguage(response.language || language);
      }
      setSuggestions(response.suggestions || []);
      setSummary(response.summary || '');
      if (response.eventDraft) setEventDraft(response.eventDraft);

      if (response.eventCreated || response.eventUpdated) {
        setCompletionMode(response.eventUpdated ? 'update' : 'create');
        setEventCompleted(true);
        setEventDraft(null);
        setSuggestions([]);
        setSummary('');
        setMode('create');

        await createFreshSession(response.language || language);
        setTimeout(() => setEventCompleted(false), 3000);
      }
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          await createFreshSession(language);
          setError(null);
          return;
        } catch (recoveryError) {
          setError(`Failed to recover chat session: ${recoveryError.message}`);
          return;
        }
      }
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChatSession = async () => {
    // Delete the active session and immediately start over with a fresh one.
    if (!sessionId || loading || initializing) return;
    const shouldClear = window.confirm('Clear this chat session and start over?');
    if (!shouldClear) return;

    setLoading(true);
    setError(null);

    try {
      await chatAPI.deleteSession(sessionId);

      if (user?.id) {
        const storageKey = getSessionStorageKey(user.id, editingEventId);
        localStorage.removeItem(storageKey);
      }

      setSessionId(null);
      setMessages([]);
      setDraft('');
      setEventDraft(null);
      setSuggestions([]);
      setSummary('');
      setEventCompleted(false);

      await createFreshSession(language);
    } catch (err) {
      setError(err.message || 'Failed to clear chat session');
    } finally {
      setLoading(false);
    }
  };


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const canSend = draft.trim().length > 0 && !loading && !initializing && sessionId;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI Event Creation Assistant</h2>
            <p className="mt-1 text-sm text-slate-600">
              {mode === 'update'
                ? 'Update an existing event through conversation. The assistant loads the current draft and applies your changes.'
                : 'Create an event entirely through conversation. The assistant keeps the draft, validates dates, and supports corrections.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={languageSelection}
              onChange={(e) => {
                if (e.target.value === 'auto') {
                  setLanguageLocked(false);
                  return;
                }
                setLanguage(e.target.value);
                setLanguageLocked(true);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="auto">Auto</option>
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="fr">French</option>
            </select>
            <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
              <Sparkles className="h-4 w-4" />
              AI Guided
            </div>
            <button
              type="button"
              onClick={handleClearChatSession}
              disabled={loading || initializing || !sessionId}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {eventCompleted && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 animate-pulse">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <div>
            <h4 className="font-semibold text-green-900">Success</h4>
            <p className="text-sm text-green-800">{completionMode === 'update' ? 'The event was updated successfully.' : 'The event was created and added to the list.'}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-[58vh] min-h-[420px] overflow-y-auto p-4 sm:p-5">
          {initializing ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-600">Initializing chat...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} text={m.text} ts={m.ts} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <Loader className="h-4 w-4 animate-spin text-indigo-600" />
                    <span className="text-sm text-slate-600">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick replies</div>
          <SuggestionRow items={suggestions} onPick={handleSendMessage} disabled={loading || initializing} />
          <EventDraftPreview draft={eventDraft} summary={summary} />
        </div>

        <div className="border-t border-slate-200 p-4 sm:p-5">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="sr-only" htmlFor="chat-message">Message</label>
              <textarea
                id="chat-message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || initializing}
                rows={3}
                placeholder={mode === 'update'
                  ? 'Example: Change the start time to next Wednesday at 2 PM and set status to Published.'
                  : 'Example: Create a sales incentive called Q2 Accelerator, publish it in Asia/Katmandu, start next Monday at 10 AM, end at 11 AM, vanish one week later, roles Admin and Manager.'}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
              <div className="mt-2 text-xs text-slate-500">
                <Clock className="mb-1 inline h-3 w-3" /> Shift+Enter for new line, Enter to send
              </div>
            </div>

            <button
              type="button"
              disabled={!canSend}
              onClick={() => handleSendMessage()}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:px-5">
          Try corrections like "change start time to Tuesday 3 PM", "set roles to Admin and Viewer", or "publish it in Europe/London".
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;


