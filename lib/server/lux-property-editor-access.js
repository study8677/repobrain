/**
 * LuxeMaurice property editor (Phase 2 Slice C) — who may use `/properties/admin` and listing admin CMP actions.
 *
 * Requires a **tenant password session** (`typ: 'tenant'`, `username` set). PIN-only tenant sessions do not carry
 * a username and cannot use the editor (return 403 with hint to use email/password on `/login`).
 */

const LUX_TENANT = 'luxe-maurice';

/** Lowercase usernames (email-style) allowed to edit listings. Extend in code when onboarding new editors. */
const LUX_PROPERTY_EDITOR_USERNAMES = new Set([
  'jan@luxemaurice.com',
  'anton@corpflowai.com',
  'antonvdberg@corpflowai.com',
]);

/**
 * @param {unknown} payload — `verifySession` / `getSessionFromRequest` payload
 */
export function isLuxPropertyEditorSession(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (String(payload.typ || '') !== 'tenant') return false;
  if (String(payload.tenant_id || '').trim() !== LUX_TENANT) return false;
  const u = String(payload.username || '').trim().toLowerCase();
  if (!u) return false;
  return LUX_PROPERTY_EDITOR_USERNAMES.has(u);
}
