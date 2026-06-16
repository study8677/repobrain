/**
 * Living Word Mauritius — schedule data shape (future-ready placeholder).
 *
 * v0: static module. No DB persistence. No public JSON endpoint. No iCal export.
 * The shape exists so future packets can swap the static array for a Prisma-
 * backed query without changing any consumer (sandbox sections, future chatbot
 * answers like "when's the next service?").
 *
 * Approval discipline (see `visual-sandbox-plan.md` §5.2):
 *   - Every entry has `approved: boolean` and `source: ScheduleSource`.
 *   - The sandbox renders an entry only if EITHER (a) `source === 'placeholder'`
 *     AND the entry is rendered with the explicit "approval pending" label, OR
 *     (b) `approved === true` (which is never true in v0).
 *   - All v0 entries are placeholders. Real entries land later through a
 *     separate pastor-approved packet.
 *
 * Conservative-copy posture:
 *   - No real service times, no real address, no real names of people / groups
 *     / businesses appear in any entry.
 */

/**
 * @typedef {'service'|'event'|'youth'|'wordgroup'|'special'} ScheduleCategory
 * @typedef {'all'|'children'|'youth'|'adults'} AgeBand
 * @typedef {'public'|'unlisted'|'private'} Visibility
 * @typedef {'once'|'weekly'|'monthly'|'custom'} Recurrence
 * @typedef {'church-input'|'chatbot-followup'|'imported'|'placeholder'} ScheduleSource
 *
 * @typedef {Object} ScheduleLocation
 * @property {string} [name]
 * @property {string} [mapUrl]
 *
 * @typedef {Object} ScheduleRegistration
 * @property {boolean} required
 * @property {string} [url]
 * @property {string} [deadline]
 *
 * @typedef {Object} ScheduleContact
 * @property {string} [role]
 *
 * @typedef {Object} ScheduleEntry
 * @property {string} id
 * @property {string} tenantId
 * @property {ScheduleCategory} category
 * @property {string} title
 * @property {string} [description]
 * @property {ScheduleLocation} [location]
 * @property {Recurrence} recurrence
 * @property {string} [startsAt]
 * @property {string} [endsAt]
 * @property {number} [weeklyDayOfWeek]
 * @property {string} [weeklyTime]
 * @property {Visibility} visibility
 * @property {AgeBand} [ageBand]
 * @property {ScheduleRegistration} [registration]
 * @property {ScheduleContact} [contact]
 * @property {boolean} approved
 * @property {string} [approvedBy]
 * @property {string} [approvedAt]
 * @property {ScheduleSource} source
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

const TENANT_ID = 'living-word-mauritius';
const CREATED = '2026-06-16T00:00:00.000Z';

/** @type {ScheduleEntry[]} */
export const PLACEHOLDER_SCHEDULE = [
  {
    id: 'lwm-sunday-service-placeholder',
    tenantId: TENANT_ID,
    category: 'service',
    title: 'Sunday service (placeholder)',
    description:
      'Placeholder entry only. Real service times are published on the Living Word Mauritius website.',
    location: { name: 'See Living Word Mauritius website' },
    recurrence: 'weekly',
    weeklyDayOfWeek: 0,
    visibility: 'unlisted',
    ageBand: 'all',
    approved: false,
    source: 'placeholder',
    notes: 'sandbox fixture; approval pending — not for public use',
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: 'lwm-special-event-placeholder',
    tenantId: TENANT_ID,
    category: 'event',
    title: 'Special event (placeholder)',
    description:
      'Placeholder entry only. Real special events are published on the Living Word Mauritius website.',
    location: { name: 'See Living Word Mauritius website' },
    recurrence: 'once',
    startsAt: '2099-01-01T00:00:00.000Z',
    visibility: 'unlisted',
    ageBand: 'all',
    approved: false,
    source: 'placeholder',
    notes: 'sandbox fixture; approval pending — not for public use',
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: 'lwm-youth-programme-placeholder',
    tenantId: TENANT_ID,
    category: 'youth',
    title: 'Youth programme (placeholder)',
    description:
      'Placeholder entry only. The chatbot collects parent/guardian contact only — never child details.',
    location: { name: 'See Living Word Mauritius website' },
    recurrence: 'weekly',
    weeklyDayOfWeek: 6,
    visibility: 'unlisted',
    ageBand: 'youth',
    contact: { role: 'youth team' },
    approved: false,
    source: 'placeholder',
    notes: 'sandbox fixture; approval pending — not for public use',
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: 'lwm-wordgroup-placeholder',
    tenantId: TENANT_ID,
    category: 'wordgroup',
    title: 'WordGroup (placeholder)',
    description:
      'Placeholder entry only. WordGroup names and meeting details are not published on this sandbox.',
    location: { name: 'See Living Word Mauritius website' },
    recurrence: 'weekly',
    weeklyDayOfWeek: 3,
    visibility: 'unlisted',
    ageBand: 'adults',
    contact: { role: 'WordGroups team' },
    approved: false,
    source: 'placeholder',
    notes: 'sandbox fixture; name redacted until pastor approval',
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: 'lwm-special-programme-placeholder',
    tenantId: TENANT_ID,
    category: 'special',
    title: 'Special programme (placeholder)',
    description:
      'Placeholder entry only. Real special programmes are announced through church channels.',
    location: { name: 'See Living Word Mauritius website' },
    recurrence: 'once',
    startsAt: '2099-06-01T00:00:00.000Z',
    visibility: 'unlisted',
    ageBand: 'all',
    approved: false,
    source: 'placeholder',
    notes: 'sandbox fixture; approval pending — not for public use',
    createdAt: CREATED,
    updatedAt: CREATED,
  },
];

/**
 * @param {ScheduleCategory} category
 * @returns {ScheduleEntry[]}
 */
export function getEntriesForCategory(category) {
  return PLACEHOLDER_SCHEDULE.filter((e) => e.category === category);
}

/**
 * Stub for future "next occurrence" logic. v0 returns null because no real
 * entries are approved.
 *
 * @param {ScheduleEntry} _entry
 * @returns {string|null}
 */
export function getNextOccurrence(_entry) {
  return null;
}

/**
 * @returns {boolean} whether any entry is approved (true => sandbox is showing
 * something other than placeholders; v0 always false).
 */
export function hasApprovedEntries() {
  return PLACEHOLDER_SCHEDULE.some((e) => e.approved === true);
}
