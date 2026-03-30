/**
 * Event Constants and Configuration
 * Handles event-related business logic constants
 */

const EVENT_STATUS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  PENDING: 'Pending',
};

const EVENT_LANGUAGES = {
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
  GERMAN: 'de',
  CHINESE: 'zh',
};

// Common timezones (examples)
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'India/Kolkata',
];

// Event validation rules
const EVENT_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 255,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 5000,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 999999,
};

// Duplicate event detection window (in minutes)
// Events created by same user within this time window with same name/timezone are flagged
const DUPLICATE_CHECK_WINDOW_MINUTES = 5;

module.exports = {
  EVENT_STATUS,
  EVENT_LANGUAGES,
  COMMON_TIMEZONES,
  EVENT_VALIDATION,
  DUPLICATE_CHECK_WINDOW_MINUTES,
};
