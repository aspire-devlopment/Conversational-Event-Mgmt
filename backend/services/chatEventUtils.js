const { COMMON_TIMEZONES, EVENT_STATUS } = require('../constants/eventConfig');
const { ALL_ROLES } = require('../constants/appConfig');
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'];
const SUPPORTED_ROLES = ALL_ROLES;
const STATUS_VALUES = Object.values(EVENT_STATUS);
// Shared field metadata keeps the assistant wording, validation, and UI labels aligned.
const EVENT_FIELD_INFO = {
  name: { type: 'text', label: 'Event Name', required: true },
  subheading: { type: 'text', label: 'Subheading', required: true },
  description: { type: 'textarea', label: 'Description', required: true },
  bannerUrl: {
    type: 'url',
    label: 'Banner Image URL',
    required: true,
    helperText: 'Use a direct image URL. Upload support can be added later if needed.',
  },
  timezone: { type: 'select', label: 'Time Zone', required: true, options: COMMON_TIMEZONES },
  status: { type: 'select', label: 'Status', required: true, options: ['Draft', 'Published', 'Pending'] },
  startTime: { type: 'datetime', label: 'Start Date & Time', required: true },
  endTime: { type: 'datetime', label: 'End Date & Time', required: true },
  vanishTime: { type: 'datetime', label: 'Vanish Date & Time', required: true },
  roles: {
    type: 'multiselect',
    label: 'Roles',
    required: true,
    multiple: true,
    options: SUPPORTED_ROLES,
    helperText: 'Select one or more roles. This is a required multi-select field.',
  },
};
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ALIASES = {
  sunday: ['sunday', 'domingo', 'dimanche'],
  monday: ['monday', 'lunes', 'lundi'],
  tuesday: ['tuesday', 'martes', 'mardi'],
  wednesday: ['wednesday', 'miercoles', 'mercredi'],
  thursday: ['thursday', 'jueves', 'jeudi'],
  friday: ['friday', 'viernes', 'vendredi'],
  saturday: ['saturday', 'sabado', 'samedi'],
};
const LANGUAGE_MARKERS = {
  es: [
    ' hola ', ' gracias ', ' evento ', ' zona horaria ', ' manana ',
    ' proximo ', ' proxima ', ' hoy ', ' dentro de ', ' publicar ',
  ],
  fr: [
    ' bonjour ', ' merci ', ' evenement ', ' fuseau ', ' demain ',
    ' prochain ', ' prochaine ', ' aujourd hui ', ' dans ', ' publier ',
  ],
};

function normalizeText(value) {
  return ` ${String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s:/.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function normalizeLanguage(language) {
  // Keep every language value in a canonical short form for downstream logic.
  const value = String(language || '').toLowerCase();
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('fr')) return 'fr';
  return 'en';
}

function createEmptyDraft(language = 'en') {
  // Start every session with a blank draft in the selected language.
  return {
    name: null,
    subheading: null,
    description: null,
    bannerUrl: null,
    timezone: null,
    status: null,
    startTime: null,
    endTime: null,
    vanishTime: null,
    roles: [],
    language: normalizeLanguage(language),
  };
}

function detectLanguage(text, fallback = 'en') {
  const sample = normalizeText(text);
  const scored = Object.entries(LANGUAGE_MARKERS)
    .map(([language, markers]) => ({
      language,
      score: markers.reduce((total, marker) => total + (sample.includes(marker) ? 1 : 0), 0),
    }))
    .sort((left, right) => right.score - left.score);

  if (scored[0]?.score > 0 && scored[0].score > (scored[1]?.score || 0)) {
    return scored[0].language;
  }
  return normalizeLanguage(fallback);
}

function normalizeRole(role) {
  // Map flexible human wording into the exact role names stored in the database.
  const value = String(role || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'admin') return 'Admin';
  if (value === 'manager') return 'Manager';
  if (['sales rep', 'sales representative', 'sales'].includes(value)) return 'Sales Rep';
  if (value === 'viewer') return 'Viewer';
  return null;
}

function parseRoleList(input) {
  // Multi-select roles may arrive as an array or a natural-language list.
  const values = Array.isArray(input) ? input : String(input || '').split(/,|and|y|et|\//i);
  return [...new Set(values.map((item) => normalizeRole(item)).filter(Boolean))];
}

function normalizeStatus(status) {
  // Status values should always land on one of the supported enums.
  const value = String(status || '').trim().toLowerCase();
  return STATUS_VALUES.find((item) => item.toLowerCase() === value) || null;
}

function normalizeTimezone(timezone) {
  // Accept common aliases so the chat can understand everyday timezone names.
  const value = String(timezone || '').trim();
  if (!value) return null;
  const exact = COMMON_TIMEZONES.find((item) => item.toLowerCase() === value.toLowerCase());
  if (exact) return exact;

  const aliasMap = {
    utc: 'UTC',
    gmt: 'UTC',
    est: 'America/New_York',
    edt: 'America/New_York',
    pst: 'America/Los_Angeles',
    pdt: 'America/Los_Angeles',
    ist: 'Asia/Kolkata',
    npt: 'Asia/Katmandu',
    nepal: 'Asia/Katmandu',
    uk: 'Europe/London',
  };

  return aliasMap[value.toLowerCase()] || value;
}

function parseAbsoluteDateTime(value) {
  const rawValue = String(value || '').trim();
  const normalizedValue = normalizeText(rawValue);
  const looksRelative = /\btoday\b|\btomorrow\b|\bday after tomorrow\b|\bnext\b|\bthis\b|\bin\s+\d+\b|\bwithin\b|\bhoy\b|\bmanana\b|\bpasado manana\b|\bproximo\b|\bproxima\b|\bdentro de\b|\bdemain\b|\bapres demain\b|\bprochain\b|\bprochaine\b|\bdans\b/.test(normalizedValue);
  const looksAbsolute = /\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?/.test(rawValue);
  if (!rawValue || looksRelative || !looksAbsolute) return null;

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimePart(input) {
  const text = normalizeText(input);
  if (/\bnoon\b|\bmediodia\b|\bmidi\b/.test(text)) return { hours: 12, minutes: 0, hasExplicitTime: true };
  if (/\bmidnight\b|\bmedianoche\b|\bminuit\b/.test(text)) return { hours: 0, minutes: 0, hasExplicitTime: true };

  const prefixedMatch = text.match(/\b(?:at|a las|a|vers)\s+(\d{1,2})(?::|\.|h)?(\d{2})?\s*(am|pm)?\b/i);
  const meridiemMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const twentyFourHourMatch = text.match(/\b(\d{1,2})(?:(:|\.|h)(\d{2})|h)\b/i);
  const match = prefixedMatch || meridiemMatch || twentyFourHourMatch;
  if (!match) return { hours: 10, minutes: 0, hasExplicitTime: false };

  let hours = Number(match[1]);
  const minutes = Number(
    match === twentyFourHourMatch
      ? (match[3] || 0)
      : (match[2] || 0)
  );
  const meridiem = match === twentyFourHourMatch ? undefined : match[3]?.toLowerCase();
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return { hours, minutes, hasExplicitTime: true };
}

function shiftToWeekday(baseDate, targetDay, alwaysNext = false) {
  const current = baseDate.getDay();
  let diff = targetDay - current;
  if (diff < 0 || diff === 0 || alwaysNext) diff += 7;
  const next = new Date(baseDate);
  next.setDate(next.getDate() + diff);
  return next;
}

function addRelativeAmount(baseDate, amount, unit) {
  const next = new Date(baseDate);
  if (unit === 'hour') next.setHours(next.getHours() + amount);
  if (unit === 'day') next.setDate(next.getDate() + amount);
  if (unit === 'week') next.setDate(next.getDate() + (amount * 7));
  return next;
}

function parseRelativeAmount(text, baseDate) {
  const patterns = [
    /\bin\s+(\d+)\s+(hour|hours|day|days|week|weeks)\b/,
    /\bwithin\s+(\d+)\s+(hour|hours|day|days|week|weeks)\b/,
    /\bdentro de\s+(\d+)\s+(hora|horas|dia|dias|semana|semanas)\b/,
    /\ben\s+(\d+)\s+(hora|horas|dia|dias|semaine|semaines|jour|jours)\b/,
    /\bdans\s+(\d+)\s+(heure|heures|jour|jours|semaine|semaines)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const amount = Number(match[1]);
    const rawUnit = match[2];
    const normalizedUnit = rawUnit.startsWith('hour') || rawUnit.startsWith('hora') || rawUnit.startsWith('heure')
      ? 'hour'
      : rawUnit.startsWith('week') || rawUnit.startsWith('semaine') || rawUnit.startsWith('semana')
        ? 'week'
        : 'day';
    return addRelativeAmount(baseDate, amount, normalizedUnit);
  }

  return null;
}

function parseRelativeDate(value, baseDate = new Date()) {
  const text = normalizeText(value);
  const date = new Date(baseDate);
  const { hours, minutes, hasExplicitTime } = parseTimePart(text);

  if (/\btoday\b|\bhoy\b|\baujourd hui\b/.test(text)) {
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  if (/\btomorrow\b|\bmanana\b|\bdemain\b/.test(text)) {
    date.setDate(date.getDate() + 1);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  if (/\bday after tomorrow\b|\bpasado manana\b|\bapres demain\b/.test(text)) {
    date.setDate(date.getDate() + 2);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  if (/\bnext week\b|\bproxima semana\b|\bsemaine prochaine\b/.test(text)) {
    date.setDate(date.getDate() + 7);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  if (/\bthis week\b|\besta semana\b|\bcette semaine\b/.test(text)) {
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  const relativeAmountDate = parseRelativeAmount(text, date);
  if (relativeAmountDate) {
    if (hasExplicitTime) {
      relativeAmountDate.setHours(hours, minutes, 0, 0);
    }
    return relativeAmountDate;
  }

  for (let index = 0; index < WEEKDAYS.length; index += 1) {
    const day = WEEKDAYS[index];
    const aliases = DAY_ALIASES[day] || [day];
    if (aliases.some((item) => text.includes(` ${item} `))) {
      if (/\bthis\b|\beste\b|\bcette\b|\bce\b/.test(text)) {
        const today = date.getDay();
        if (today <= index) {
          const currentWeek = new Date(date);
          currentWeek.setDate(date.getDate() + (index - today));
          currentWeek.setHours(hours, minutes, 0, 0);
          return currentWeek;
        }
      }
      const next = shiftToWeekday(
        date,
        index,
        /\bnext\b|\bproximo\b|\bproxima\b|\bprochain\b|\bprochaine\b/.test(text)
      );
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
  }

  return null;
}

function formatDateTime(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') + ` ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseDateTime(value, baseDate = new Date()) {
  if (!value) return null;
  const absolute = parseAbsoluteDateTime(value);
  if (absolute) return formatDateTime(absolute);
  const relative = parseRelativeDate(value, baseDate);
  return relative ? formatDateTime(relative) : null;
}

function addHours(dateTime, hours) {
  const parsed = parseAbsoluteDateTime(String(dateTime || '').replace(' ', 'T'));
  if (!parsed) return null;
  parsed.setHours(parsed.getHours() + hours);
  return formatDateTime(parsed);
}

function addDays(dateTime, days) {
  const parsed = parseAbsoluteDateTime(String(dateTime || '').replace(' ', 'T'));
  if (!parsed) return null;
  parsed.setDate(parsed.getDate() + days);
  return formatDateTime(parsed);
}

function normalizeDraft(rawDraft = {}, language = 'en') {
  const draft = createEmptyDraft(language);
  return {
    ...draft,
    ...rawDraft,
    bannerUrl: rawDraft.bannerUrl || rawDraft.banner_url || null,
    timezone: normalizeTimezone(rawDraft.timezone),
    status: normalizeStatus(rawDraft.status),
    startTime: parseDateTime(rawDraft.startTime) || rawDraft.startTime || null,
    endTime: parseDateTime(rawDraft.endTime) || rawDraft.endTime || null,
    vanishTime: parseDateTime(rawDraft.vanishTime) || rawDraft.vanishTime || null,
    roles: parseRoleList(rawDraft.roles),
    language: normalizeLanguage(rawDraft.language || language),
  };
}

function mergeDraft(currentDraft, extractedData, language) {
  const current = normalizeDraft(currentDraft, language);
  const merged = {
    ...current,
    ...(extractedData || {}),
  };

  merged.bannerUrl = merged.bannerUrl || null;
  merged.timezone = normalizeTimezone(merged.timezone);
  merged.status = normalizeStatus(merged.status);
  merged.startTime = parseDateTime(merged.startTime) || merged.startTime || null;
  merged.endTime = parseDateTime(merged.endTime) || merged.endTime || null;
  merged.vanishTime = parseDateTime(merged.vanishTime) || merged.vanishTime || null;
  merged.roles = parseRoleList(merged.roles);
  merged.language = normalizeLanguage(language || merged.language);

  const rawEndTime = String(extractedData?.endTime || '').toLowerCase();
  const rawVanishTime = String(extractedData?.vanishTime || '').toLowerCase();
  const rawEndText = normalizeText(rawEndTime);
  const rawVanishText = normalizeText(rawVanishTime);

  if ((merged.startTime || current.startTime) && rawEndText) {
    const startAnchor = merged.startTime || current.startTime;
    if (/same day|one hour later|later today|une heure apres|una hora despues/.test(rawEndText)) {
      merged.endTime = addHours(startAnchor, 1);
    }
  }

  if ((merged.endTime || current.endTime) && rawVanishText) {
    const anchor = merged.endTime || current.endTime;
    if (/one day after end|day after end|un dia despues del fin|un jour apres la fin/.test(rawVanishText)) {
      merged.vanishTime = addDays(anchor, 1);
    }
    if (/one week after end|week after end|una semana despues del fin|une semaine apres la fin/.test(rawVanishText)) {
      merged.vanishTime = addDays(anchor, 7);
    }
  }

  if (merged.startTime && !merged.endTime) merged.endTime = addHours(merged.startTime, 1);
  if (merged.endTime && !merged.vanishTime) merged.vanishTime = addHours(merged.endTime, 24);

  return merged;
}

function getMissingFields(draft) {
  // Return the first missing fields in the exact order the assistant should ask them.
  const missing = [];
  if (!draft.name) missing.push('name');
  if (!draft.subheading) missing.push('subheading');
  if (!draft.description) missing.push('description');
  if (!draft.bannerUrl) missing.push('bannerUrl');
  if (!draft.timezone) missing.push('timezone');
  if (!draft.status) missing.push('status');
  if (!draft.startTime) missing.push('startTime');
  if (!draft.endTime) missing.push('endTime');
  if (!draft.vanishTime) missing.push('vanishTime');
  if (!draft.roles?.length) missing.push('roles');
  return missing;
}

function getNextStep(draft) {
  return getMissingFields(draft)[0] || 'confirm';
}

function buildSummary(draft) {
  return [
    `Event Name: ${draft.name || 'not set'}`,
    `Subheading: ${draft.subheading || 'not set'}`,
    `Description: ${draft.description || 'not set'}`,
    `Banner URL: ${draft.bannerUrl || 'not set'}`,
    `Time Zone: ${draft.timezone || 'not set'}`,
    `Status: ${draft.status || 'not set'}`,
    `Start: ${draft.startTime || 'not set'}`,
    `End: ${draft.endTime || 'not set'}`,
    `Vanish: ${draft.vanishTime || 'not set'}`,
    `Roles: ${draft.roles?.length ? draft.roles.join(', ') : 'not set'}`,
  ].join('\n');
}

function getSuggestions(step, language = 'en') {
   const key = normalizeLanguage(language);
   const suggestions = {
     en: {
       name: ['Annual Tech Conference 2024', 'Product Launch Event', 'Team Building Workshop'],
       subheading: ['Join us for an exciting experience', 'Network with industry leaders', 'Learn and grow together'],
       description: ['A comprehensive event covering the latest industry trends and innovations', 'Connect with professionals and expand your network', 'Interactive sessions with expert speakers and hands-on workshops'],
       bannerUrl: ['https://example.com/banner1.jpg', 'https://example.com/banner2.jpg', 'https://example.com/banner3.jpg'],
       timezone: COMMON_TIMEZONES,
       status: ['Draft', 'Published', 'Pending'],
       roles: SUPPORTED_ROLES,
       startTime: ['Tomorrow 10 AM', 'Next Monday 2 PM', 'In 2 days at 4 PM'],
       endTime: ['Tomorrow 11 AM', 'Same day 1 hour later'],
       vanishTime: ['One day after end', 'One week after end'],
       confirm: ['Create event', 'Change start time', 'Change roles'],
     },
     es: {
       name: ['Conferencia Tecnológica Anual 2024', 'Evento de Lanzamiento de Producto', 'Taller de Construcción de Equipo'],
       subheading: ['Únete a nosotros para una experiencia emocionante', 'Conecta con líderes de la industria', 'Aprende y crece juntos'],
       description: ['Un evento integral que cubre las últimas tendencias e innovaciones de la industria', 'Conecta con profesionales y expande tu red', 'Sesiones interactivas con oradores expertos y talleres prácticos'],
       bannerUrl: ['https://example.com/banner1.jpg', 'https://example.com/banner2.jpg', 'https://example.com/banner3.jpg'],
       timezone: COMMON_TIMEZONES,
       status: ['Draft', 'Published', 'Pending'],
       roles: SUPPORTED_ROLES,
       startTime: ['Manana 10 AM', 'Proximo lunes 2 PM', 'Dentro de 2 dias a las 4 PM'],
       endTime: ['Manana 11 AM', 'El mismo dia una hora despues'],
       vanishTime: ['Un dia despues del fin', 'Una semana despues del fin'],
       confirm: ['Crear evento', 'Cambiar inicio', 'Cambiar roles'],
     },
     fr: {
       name: ['Conférence Technologique Annuelle 2024', 'Événement de Lancement de Produit', 'Atelier de Renforcement d\'Équipe'],
       subheading: ['Rejoignez-nous pour une expérience passionnante', 'Connectez-vous avec les leaders de l\'industrie', 'Apprenez et grandissez ensemble'],
       description: ['Un événement complet couvrant les dernières tendances et innovations de l\'industrie', 'Connectez-vous avec des professionnels et élargissez votre réseau', 'Sessions interactives avec des conférenciers experts et des ateliers pratiques'],
       bannerUrl: ['https://example.com/banner1.jpg', 'https://example.com/banner2.jpg', 'https://example.com/banner3.jpg'],
       timezone: COMMON_TIMEZONES,
       status: ['Draft', 'Published', 'Pending'],
       roles: SUPPORTED_ROLES,
       startTime: ['Demain 10h', 'Lundi prochain 14h', 'Dans 2 jours a 16h'],
       endTime: ['Demain 11h', 'Une heure apres'],
       vanishTime: ['Un jour apres la fin', 'Une semaine apres la fin'],
       confirm: ['Creer l evenement', 'Changer debut', 'Changer les roles'],
     },
   };
   return suggestions[key]?.[step] || [];
 }

function validateEventData(eventData) {
  // Validation stays deterministic so AI extraction never becomes the source of truth.
  const draft = normalizeDraft(eventData, eventData.language);
  const missingFields = getMissingFields(draft);
  const errors = [];
  const start = draft.startTime ? parseAbsoluteDateTime(draft.startTime.replace(' ', 'T')) : null;
  const end = draft.endTime ? parseAbsoluteDateTime(draft.endTime.replace(' ', 'T')) : null;
  const vanish = draft.vanishTime ? parseAbsoluteDateTime(draft.vanishTime.replace(' ', 'T')) : null;
  const invalidRoles = (draft.roles || []).filter((role) => !SUPPORTED_ROLES.includes(role));

  if (start && end && start >= end) errors.push('endTime must be after startTime');
  if (end && vanish && vanish <= end) errors.push('vanishTime must be after endTime');
  if (draft.bannerUrl && !/^https?:\/\/\S+$/i.test(draft.bannerUrl)) errors.push('bannerUrl must be a valid URL');
  if (invalidRoles.length > 0) {
    errors.push(`roles contains invalid values: ${invalidRoles.join(', ')}`);
  }

  return {
    valid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  };
}

module.exports = {
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
  EVENT_FIELD_INFO,
};
