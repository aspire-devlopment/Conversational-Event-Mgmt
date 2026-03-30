/**
 * File: chatSessionRepository.js
 * Purpose: Chat session data access layer with LLM support
 * Description: Repository for managing chat sessions with conversation history,
 *              event drafts, and LLM interaction state. Database storage is the
 *              default strategy. File fallback is opt-in for local development only.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { createEmptyDraft, normalizeLanguage } = require('../services/chatEventUtils');

const SESSIONS_DIR = path.join(__dirname, '../sessions');
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FILE_FALLBACK_ENABLED =
  String(process.env.ENABLE_FILE_SESSION_FALLBACK || '').toLowerCase() === 'true';

function buildExpiryDate(baseDate = new Date()) {
  return new Date(baseDate.getTime() + SESSION_DURATION);
}

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

class ChatSessionRepository {
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  async cleanupExpiredSessions() {
    try {
      await this.dataContext.execute('DELETE FROM chat_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
    } catch (err) {
      if (!FILE_FALLBACK_ENABLED) throw err;
      logger.warn('chatSessionRepository', 'Failed to clean expired DB sessions', { error: err.message });
      this._cleanupExpiredFiles();
    }
  }

  async list() {
    try {
      await this.cleanupExpiredSessions();
      const q = `
        SELECT id, user_id, session_data, current_step, language, expires_at, created_at, updated_at
        FROM chat_sessions
        WHERE expires_at > CURRENT_TIMESTAMP
        ORDER BY updated_at DESC
      `;
      return await this.dataContext.query(q);
    } catch (err) {
      if (!FILE_FALLBACK_ENABLED) throw err;
      logger.warn('chatSessionRepository', 'Failed to query database, using file storage fallback', { error: err.message });
      return this._listFromFiles();
    }
  }

  async getById(id) {
    try {
      await this.cleanupExpiredSessions();
      const q = `
        SELECT id, user_id, session_data, current_step, language, expires_at, created_at, updated_at
        FROM chat_sessions
        WHERE id = $1
          AND expires_at > CURRENT_TIMESTAMP
      `;
      const rows = await this.dataContext.query(q, [id]);
      return rows[0] || null;
    } catch (err) {
      if (!FILE_FALLBACK_ENABLED) throw err;
      logger.debug('chatSessionRepository', 'Database query failed, using file storage fallback', { id });
      return this._getFromFile(id);
    }
  }

  async create(payload) {
    const sessionId = payload.id || uuidv4();
    const now = new Date();
    const expiresAt = buildExpiryDate(now);

    const sessionData = {
      id: sessionId,
      user_id: payload.user_id,
      conversation_history: payload.conversation_history || [],
      event_draft: payload.event_draft || createEmptyDraft(payload.language || 'en'),
      current_step: payload.current_step || 0,
      language: normalizeLanguage(payload.language || 'en'),
      state: 'init',
      mode: payload.mode || 'create',
      event_id: payload.event_id || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    };

    try {
      await this.cleanupExpiredSessions();
      const q = `
        INSERT INTO chat_sessions (id, user_id, session_data, current_step, language, expires_at)
        VALUES ($1, $2, $3::jsonb, $4, $5, $6)
        RETURNING id, user_id, session_data, current_step, language, expires_at, created_at, updated_at
      `;
      const rows = await this.dataContext.query(q, [
        sessionId,
        payload.user_id,
        JSON.stringify(sessionData),
        payload.current_step || 0,
        payload.language || 'en',
        expiresAt.toISOString()
      ]);
      return rows[0];
    } catch (err) {
      if (!FILE_FALLBACK_ENABLED) throw err;
      logger.debug('chatSessionRepository', 'Database insert failed, using file storage fallback', { user_id: payload.user_id });
      this._saveToFile(sessionData);
      return sessionData;
    }
  }

  async update(id, payload) {
    try {
      const nextSessionData = payload.session_data || null;
      const nextExpiresAt = payload.expires_at
        ? new Date(payload.expires_at)
        : buildExpiryDate(new Date());
      if (nextSessionData) {
        nextSessionData.updated_at = new Date().toISOString();
        nextSessionData.expires_at = nextExpiresAt.toISOString();
      }

      const q = `
        UPDATE chat_sessions
        SET user_id = COALESCE($2, user_id),
            session_data = COALESCE($3::jsonb, session_data),
            current_step = COALESCE($4, current_step),
            language = COALESCE($5, language),
            expires_at = COALESCE($6, expires_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, user_id, session_data, current_step, language, expires_at, created_at, updated_at
      `;
      const rows = await this.dataContext.query(q, [
        id,
        payload.user_id,
        nextSessionData ? JSON.stringify(nextSessionData) : null,
        payload.current_step,
        payload.language,
        nextExpiresAt.toISOString()
      ]);
      return rows[0] || null;
    } catch (err) {
      if (!FILE_FALLBACK_ENABLED) throw err;
      logger.debug('chatSessionRepository', 'Database update failed, using file storage fallback', { id });
      return this._updateInFile(id, payload);
    }
  }

  async addMessage(sessionId, role, content) {
    try {
      const session = await this.getById(sessionId);
      if (!session) return null;

      const sessionData = typeof session.session_data === 'string' 
        ? JSON.parse(session.session_data) 
        : session.session_data;

      if (!sessionData.conversation_history) {
        sessionData.conversation_history = [];
      }

      sessionData.conversation_history.push({
        role,
        content,
        timestamp: new Date().toISOString()
      });

      return this.update(sessionId, { session_data: sessionData });
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to add message', { error: err.message, sessionId });
      throw err;
    }
  }

  async updateEventDraft(sessionId, eventData) {
    try {
      const session = await this.getById(sessionId);
      if (!session) return null;

      const sessionData = typeof session.session_data === 'string' 
        ? JSON.parse(session.session_data) 
        : session.session_data;

      sessionData.event_draft = {
        ...sessionData.event_draft,
        ...eventData
      };

      return this.update(sessionId, { session_data: sessionData });
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to update event draft', { error: err.message, sessionId });
      throw err;
    }
  }

  async remove(id) {
    try {
      const result = await this.dataContext.execute('DELETE FROM chat_sessions WHERE id = $1', [id]);
      if (result.rowCount > 0) {
        this._deleteFromFile(id);
        return true;
      }
      return this._deleteFromFile(id);
    } catch (err) {
      if (!FILE_FALLBACK_ENABLED) throw err;
      logger.debug('chatSessionRepository', 'Database delete failed, using file storage fallback', { id });
      return this._deleteFromFile(id);
    }
  }

  // File-based fallback methods
  _saveToFile(session) {
    try {
      const file = path.join(SESSIONS_DIR, `${session.id}.json`);
      fs.writeFileSync(file, JSON.stringify(session, null, 2), 'utf8');
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to save session to file', { error: err.message });
    }
  }

  _getFromFile(id) {
    try {
      const file = path.join(SESSIONS_DIR, `${id}.json`);
      if (!fs.existsSync(file)) return null;

      const data = fs.readFileSync(file, 'utf8');
      const session = JSON.parse(data);

      // Check expiration
      if (new Date(session.expires_at) < new Date()) {
        this._deleteFromFile(id);
        return null;
      }

      return {
        id: session.id,
        user_id: session.user_id,
        session_data: session,
        current_step: session.current_step,
        language: session.language,
        expires_at: session.expires_at
      };
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to read session from file', { error: err.message, id });
      return null;
    }
  }

  _updateInFile(id, updates) {
    try {
      const session = this._getFromFile(id);
      if (!session) return null;

      const merged = {
        ...session.session_data,
        ...updates.session_data,
        updated_at: new Date().toISOString()
      };

      this._saveToFile(merged);
      return { ...session, session_data: merged };
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to update session file', { error: err.message, id });
      return null;
    }
  }

  _deleteFromFile(id) {
    try {
      const file = path.join(SESSIONS_DIR, `${id}.json`);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        return true;
      }
      return false;
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to delete session file', { error: err.message, id });
      return false;
    }
  }

  _listFromFiles() {
    try {
      this._cleanupExpiredFiles();
      const files = fs.readdirSync(SESSIONS_DIR);
      return files
        .map(f => this._getFromFile(f.replace('.json', '')))
        .filter(s => s !== null);
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to list session files', { error: err.message });
      return [];
    }
  }

  _cleanupExpiredFiles() {
    try {
      const files = fs.readdirSync(SESSIONS_DIR);
      files.forEach((fileName) => {
        const id = fileName.replace('.json', '');
        this._getFromFile(id);
      });
    } catch (err) {
      logger.error('chatSessionRepository', 'Failed to clean expired session files', { error: err.message });
    }
  }
}

module.exports = ChatSessionRepository;

