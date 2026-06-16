/**
 * Living Word Mauritius — visual sandbox content (placeholder strings).
 *
 * Conservative, non-claim copy for the eight sections rendered by
 * `pages/site-preview.js`. Every string here MUST follow the four
 * conservative-copy rules from `visual-sandbox-plan.md` §4.1:
 *
 *   1. No specific times.
 *   2. No specific places.
 *   3. No specific people.
 *   4. No specific commitments.
 *
 * The sandbox is `noindex` and host-gated to
 * `living-word-mauritius.corpflowai.com`. Even so, treat all strings here as
 * if they could leak — write them so the worst case (URL leaks to a stranger)
 * is still a clear, accurate test-environment notice.
 */

/**
 * @typedef {Object} SandboxSection
 * @property {string} id           // anchor slug, must match the §3.1 table
 * @property {string} title
 * @property {string} body         // single short paragraph; conservative copy only
 * @property {string} [chatCta]    // optional one-line "open the chat" cue
 */

export const SANDBOX_BANNER =
  'CorpFlow sandbox — this is a CorpFlow test environment for Living Word Mauritius. ' +
  'It is not the live church website. Real content is approved and published on the ' +
  'Living Word Mauritius website.';

/** @type {SandboxSection[]} */
export const SANDBOX_SECTIONS = [
  {
    id: 'home',
    title: 'Home',
    body:
      'This page is a CorpFlow test environment used to exercise the chatbot, ' +
      'scheduling logic, and process-routing work for Living Word Mauritius. It is ' +
      'not the live church website and should not be shared as if it were.',
  },
  {
    id: 'events',
    title: 'Events',
    body:
      'Upcoming services, events, and special programmes are published on the Living ' +
      'Word Mauritius website. The placeholder entries shown below are operator-only ' +
      'fixtures used to test the schedule data shape and the chatbot path that talks ' +
      'about events. They are not real event listings.',
  },
  {
    id: 'wordgroups',
    title: 'WordGroups',
    body:
      'For up-to-date WordGroups information, please check the Living Word Mauritius ' +
      'website. A church team member can follow up about WordGroups if you ask through ' +
      'the chat below.',
    chatCta: 'Open the chat to ask about WordGroups',
  },
  {
    id: 'prayer',
    title: 'Prayer Request',
    body:
      'Prayer requests are read by a small pastoral team. This sandbox is not a ' +
      'counselling or crisis service — if you or someone you know is in immediate ' +
      'danger, please call your local emergency services. The chatbot below uses the ' +
      'same wording before any prayer detail is collected.',
    chatCta: 'Open the chat to share a prayer request',
  },
  {
    id: 'volunteer',
    title: 'Volunteer / Serve',
    body:
      'Volunteer and serve opportunities are managed by the church team. The chatbot ' +
      'collects basic adult contact details only, and a church team member follows up. ' +
      'No specific roles or schedules are claimed on this sandbox.',
    chatCta: 'Open the chat to express interest in serving',
  },
  {
    id: 'youth-children',
    title: 'Youth / Children',
    body:
      'Youth and children information is managed by the church team. The chatbot only ' +
      'collects parent or guardian contact details and a fixed-choice age band — it ' +
      'never collects child names or other sensitive child details. A church team ' +
      'member follows up.',
    chatCta: 'Open the chat to ask about youth and children',
  },
  {
    id: 'network',
    title: 'Business Network',
    body:
      'For up-to-date Business Network information, please check the Living Word ' +
      'Mauritius Business Network site. A church team member can follow up if you ' +
      'would like an introduction. The Business Network is not endorsed, vetted, or ' +
      'guaranteed by the chatbot or this sandbox; introductions are at the discretion ' +
      'of the church team.',
    chatCta: 'Open the chat to request a Business Network introduction',
  },
  {
    id: 'contact',
    title: 'Contact',
    body:
      'For verified contact details please use the contact page on the Living Word ' +
      'Mauritius website. The chatbot below can take a short message and a church ' +
      'team member will follow up when they can.',
    chatCta: 'Open the chat to leave a message',
  },
];

/**
 * @returns {SandboxSection|undefined}
 */
export function getSection(id) {
  return SANDBOX_SECTIONS.find((s) => s.id === id);
}
