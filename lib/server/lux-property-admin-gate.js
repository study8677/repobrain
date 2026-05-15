/**
 * Server-only: who may load `/properties/admin` (SSR) vs redirect to login vs 403 access denied.
 * Keeps redirect logic testable without Next.js request mocks.
 */

import { isLuxPropertyEditorSession } from './lux-property-editor-access.js';

const LUX = 'luxe-maurice';

/**
 * @param {{ hostResolvedTenantId: string, session: { ok: boolean, payload?: object } }} args
 * @returns
 *   | { kind: 'wrong_host_tenant' }
 *   | { kind: 'needs_login' }
 *   | { kind: 'not_tenant_session' }
 *   | { kind: 'tenant_mismatch', session_tenant_id: string }
 *   | { kind: 'allowed_editor' }
 *   | { kind: 'editor_forbidden', signed_in_username: string | null, signed_in_tenant_id: string }
 */
export function resolveLuxPropertyAdminPageAccess(args) {
  const hostTenantId = String(args.hostResolvedTenantId || '').trim();
  if (hostTenantId !== LUX) {
    return { kind: 'wrong_host_tenant' };
  }
  const s = args.session;
  if (!s || !s.ok || !s.payload || typeof s.payload !== 'object') {
    return { kind: 'needs_login' };
  }
  const p = s.payload;
  if (String(p.typ || '') !== 'tenant') {
    return { kind: 'not_tenant_session' };
  }
  const tid = String(p.tenant_id || '').trim();
  if (tid !== LUX) {
    return { kind: 'tenant_mismatch', session_tenant_id: tid };
  }
  if (isLuxPropertyEditorSession(p)) {
    return { kind: 'allowed_editor' };
  }
  const username = String(p.username || '').trim().toLowerCase();
  return {
    kind: 'editor_forbidden',
    signed_in_username: username || null,
    signed_in_tenant_id: tid,
  };
}
