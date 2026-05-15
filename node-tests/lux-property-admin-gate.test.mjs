import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLuxPropertyAdminPageAccess } from '../lib/server/lux-property-admin-gate.js';

test('lux property admin gate: wrong host tenant', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'other',
    session: { ok: true, payload: { typ: 'tenant', tenant_id: 'luxe-maurice', username: 'jan@luxemaurice.com' } },
  });
  assert.equal(r.kind, 'wrong_host_tenant');
});

test('lux property admin gate: needs login', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'luxe-maurice',
    session: { ok: false },
  });
  assert.equal(r.kind, 'needs_login');
});

test('lux property admin gate: Jan editor allowed', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'luxe-maurice',
    session: { ok: true, payload: { typ: 'tenant', tenant_id: 'luxe-maurice', username: 'jan@luxemaurice.com' } },
  });
  assert.equal(r.kind, 'allowed_editor');
});

test('lux property admin gate: Anton editor allowed', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'luxe-maurice',
    session: { ok: true, payload: { typ: 'tenant', tenant_id: 'luxe-maurice', username: 'anton@corpflowai.com' } },
  });
  assert.equal(r.kind, 'allowed_editor');
});

test('lux property admin gate: Lux tenant non-editor → forbidden (no login redirect in page)', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'luxe-maurice',
    session: { ok: true, payload: { typ: 'tenant', tenant_id: 'luxe-maurice', username: 'other@company.com' } },
  });
  assert.equal(r.kind, 'editor_forbidden');
  assert.equal(r.signed_in_username, 'other@company.com');
  assert.equal(r.signed_in_tenant_id, 'luxe-maurice');
});

test('lux property admin gate: PIN session (no username) → forbidden', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'luxe-maurice',
    session: { ok: true, payload: { typ: 'tenant', tenant_id: 'luxe-maurice' } },
  });
  assert.equal(r.kind, 'editor_forbidden');
  assert.equal(r.signed_in_username, null);
});

test('lux property admin gate: admin session on Lux host → wrong session', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'luxe-maurice',
    session: { ok: true, payload: { typ: 'admin', username: 'root' } },
  });
  assert.equal(r.kind, 'not_tenant_session');
});

test('lux property admin gate: tenant other workspace → mismatch', () => {
  const r = resolveLuxPropertyAdminPageAccess({
    hostResolvedTenantId: 'luxe-maurice',
    session: { ok: true, payload: { typ: 'tenant', tenant_id: 'legal-demo', username: 'a@b.com' } },
  });
  assert.equal(r.kind, 'tenant_mismatch');
  assert.equal(r.session_tenant_id, 'legal-demo');
});
