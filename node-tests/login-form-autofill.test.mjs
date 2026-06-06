/**
 * Regression test for `public/login.html` autofill semantics.
 *
 * Root cause (fixed by `fix(auth): correct login autofill semantics for
 * admin redirect`): the Factory Admin / operator-tenant / simple
 * email-password / simple PIN inputs were not wrapped in <form> elements
 * and lacked proper `name` + `autocomplete` attributes. Chrome / Google
 * Password Manager could therefore (a) confuse the saved account
 * password with a PIN field, (b) fail to offer save on submit, and (c)
 * cause visible autofill flicker. The Factory Admin login also did not
 * honour `?next=` after success, so operators redirected from
 * `/admin/lead-rescue` stayed on `/login` after signing in.
 *
 * This test parses the static HTML and asserts the attribute shape we
 * rely on so the fix cannot silently regress.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGIN_HTML = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.html'), 'utf8');

/**
 * Pull the full opening <input ... /> tag for a given id from the HTML.
 * Tolerates attribute order, whitespace, and multi-line formatting.
 *
 * @param {string} html
 * @param {string} id
 * @returns {string}
 */
function inputTagById(html, id) {
  // Match `<input ...id="<id>"... />` — id can appear anywhere inside the tag.
  const re = new RegExp(`<input\\b[^>]*\\bid="${id}"[^>]*/?>`, 'i');
  const m = html.match(re);
  assert.ok(m, `expected <input id="${id}"> in public/login.html`);
  return m[0];
}

/**
 * Returns the value of attribute `name` on the given input tag string.
 * Returns null when the attribute is absent.
 *
 * @param {string} tag
 * @param {string} name
 * @returns {string | null}
 */
function attr(tag, name) {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i');
  const m = tag.match(re);
  return m ? m[1] : null;
}

/**
 * Returns true when the given input id appears inside the <form id=formId>
 * block (between its opening <form ...> tag and the next </form>).
 *
 * @param {string} html
 * @param {string} formId
 * @param {string} inputId
 */
function inputIsInsideForm(html, formId, inputId) {
  const open = new RegExp(`<form\\b[^>]*\\bid="${formId}"[^>]*>`, 'i');
  const oM = html.match(open);
  if (!oM) return false;
  const start = (oM.index || 0) + oM[0].length;
  const after = html.slice(start);
  const close = after.search(/<\/form>/i);
  if (close < 0) return false;
  const body = after.slice(0, close);
  return new RegExp(`<input\\b[^>]*\\bid="${inputId}"`, 'i').test(body);
}

test('factory admin column: <form> wraps username + password with correct autocomplete', () => {
  assert.ok(
    /<form\b[^>]*\bid="formFactoryAdminLogin"[^>]*\baction="#[^"]*"[^>]*\bmethod="post"/i.test(LOGIN_HTML),
    'formFactoryAdminLogin must declare method=post and a fragment action',
  );
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formFactoryAdminLogin', 'adminUser'));
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formFactoryAdminLogin', 'adminPass'));

  const user = inputTagById(LOGIN_HTML, 'adminUser');
  assert.equal(attr(user, 'name'), 'username');
  assert.equal(attr(user, 'type'), 'text');
  assert.equal(attr(user, 'autocomplete'), 'username');

  const pass = inputTagById(LOGIN_HTML, 'adminPass');
  assert.equal(attr(pass, 'name'), 'password');
  assert.equal(attr(pass, 'type'), 'password');
  assert.equal(attr(pass, 'autocomplete'), 'current-password');
});

test('operator tenant column: email/password get username + current-password autocomplete', () => {
  assert.ok(/<form\b[^>]*\bid="formOperatorTenantLogin"[^>]*\bmethod="post"/i.test(LOGIN_HTML));
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formOperatorTenantLogin', 'tenantUser'));
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formOperatorTenantLogin', 'tenantPass'));
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formOperatorTenantLogin', 'tenantPin'));

  const user = inputTagById(LOGIN_HTML, 'tenantUser');
  assert.equal(attr(user, 'name'), 'username');
  assert.equal(attr(user, 'autocomplete'), 'username');

  const pass = inputTagById(LOGIN_HTML, 'tenantPass');
  assert.equal(attr(pass, 'name'), 'password');
  assert.equal(attr(pass, 'type'), 'password');
  assert.equal(attr(pass, 'autocomplete'), 'current-password');
});

test('operator tenant PIN must not steal the saved account password', () => {
  const pin = inputTagById(LOGIN_HTML, 'tenantPin');
  const name = attr(pin, 'name');
  assert.notEqual(name, 'password', 'tenantPin name must not be "password" or Chrome steals the saved account password');
  assert.equal(name, 'login_pin');
  assert.equal(attr(pin, 'autocomplete'), 'one-time-code');
  assert.equal(attr(pin, 'inputmode'), 'numeric');
});

test('client simple email/password: dedicated form with proper autocomplete + names', () => {
  assert.ok(/<form\b[^>]*\bid="formClientEmailLogin"[^>]*\bmethod="post"/i.test(LOGIN_HTML));
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formClientEmailLogin', 'simpleUser'));
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formClientEmailLogin', 'simplePass'));

  const user = inputTagById(LOGIN_HTML, 'simpleUser');
  assert.equal(attr(user, 'name'), 'username');
  assert.equal(attr(user, 'type'), 'email');
  assert.equal(attr(user, 'autocomplete'), 'username');

  const pass = inputTagById(LOGIN_HTML, 'simplePass');
  assert.equal(attr(pass, 'name'), 'password');
  assert.equal(attr(pass, 'type'), 'password');
  assert.equal(attr(pass, 'autocomplete'), 'current-password');
});

test('client simple PIN: separate form, name=login_pin, autocomplete=one-time-code', () => {
  assert.ok(/<form\b[^>]*\bid="formClientPinLogin"[^>]*\bmethod="post"/i.test(LOGIN_HTML));
  assert.ok(inputIsInsideForm(LOGIN_HTML, 'formClientPinLogin', 'simplePin'));
  // simpleUser / simplePass must NOT be inside the PIN form (would let
  // Chrome cross-fill the saved password into the PIN flow).
  assert.equal(inputIsInsideForm(LOGIN_HTML, 'formClientPinLogin', 'simpleUser'), false);
  assert.equal(inputIsInsideForm(LOGIN_HTML, 'formClientPinLogin', 'simplePass'), false);

  const pin = inputTagById(LOGIN_HTML, 'simplePin');
  const name = attr(pin, 'name');
  assert.notEqual(name, 'password', 'simplePin name must not be "password" or Chrome treats it as the account password');
  assert.equal(name, 'login_pin');
  assert.equal(attr(pin, 'type'), 'password', 'PIN remains masked');
  assert.equal(attr(pin, 'autocomplete'), 'one-time-code');
  assert.equal(attr(pin, 'inputmode'), 'numeric');
});

test('all login forms are distinct so Chrome does not cross-pollinate fields', () => {
  const formIds = [
    'formFactoryAdminLogin',
    'formOperatorTenantLogin',
    'formClientEmailLogin',
    'formClientPinLogin',
  ];
  for (const id of formIds) {
    const re = new RegExp(`<form\\b[^>]*\\bid="${id}"`, 'gi');
    const matches = LOGIN_HTML.match(re) || [];
    assert.equal(matches.length, 1, `form id="${id}" must appear exactly once`);
  }
});

test('factory admin success branch redirects to safeNextPath() when ?next= is present', () => {
  // The success path inside the formFactoryAdminLogin submit handler must
  // honour `next` so operators redirected from /admin/lead-rescue land
  // back there instead of being stranded on /login.
  assert.ok(
    /formFactoryAdminLogin'\)\.addEventListener\('submit'/.test(LOGIN_HTML),
    'admin form must listen for submit',
  );
  assert.ok(
    /level:\s*'admin'[\s\S]{0,800}?rawNextParam\(\)[\s\S]{0,200}?window\.location\.href\s*=\s*safeNextPath\(\)/.test(
      LOGIN_HTML,
    ),
    'admin success must redirect via safeNextPath() when rawNextParam() is set',
  );
});

test('operator tenant success branch redirects to safeNextPath() when ?next= is present', () => {
  assert.ok(
    /formOperatorTenantLogin'\)\.addEventListener\('submit'/.test(LOGIN_HTML),
    'operator-tenant form must listen for submit',
  );
  // The tenant success path must also honour ?next= so an operator who
  // came via /login?next=/change ends up on /change after signing in.
  assert.ok(
    /Logged in as tenant\. Session cookie set\.'\)[\s\S]{0,200}?rawNextParam\(\)[\s\S]{0,200}?window\.location\.href\s*=\s*safeNextPath\(\)/.test(
      LOGIN_HTML,
    ),
    'tenant success must redirect via safeNextPath() when rawNextParam() is set',
  );
});

test('safeNextPath() rejects open redirects and missing values', () => {
  // The same-origin-only check must be present so `?next=//evil.com`
  // cannot navigate the operator off site after login.
  assert.ok(
    /path\.indexOf\('\/'\)\s*!==\s*0\s*\|\|\s*path\.indexOf\('\/\/'\)\s*===\s*0/.test(LOGIN_HTML),
    'safeNextPath() must reject paths that do not start with a single "/"',
  );
});

test('reset / forgot-password new-password fields use autocomplete=new-password', () => {
  const reset = inputTagById(LOGIN_HTML, 'resetNewPass');
  assert.equal(attr(reset, 'type'), 'password');
  assert.equal(attr(reset, 'autocomplete'), 'new-password');

  const simpleReset = inputTagById(LOGIN_HTML, 'simpleResetNewPass');
  assert.equal(attr(simpleReset, 'type'), 'password');
  assert.equal(attr(simpleReset, 'autocomplete'), 'new-password');
});

test('no password / PIN value is hard-coded or rendered inline from JS', () => {
  // Crude but useful: ensure we never accidentally `value="..."` a
  // password / PIN field, and never log raw credentials to console.
  const inputIds = ['adminPass', 'tenantPass', 'tenantPin', 'simplePass', 'simplePin'];
  for (const id of inputIds) {
    const tag = inputTagById(LOGIN_HTML, id);
    assert.equal(attr(tag, 'value'), null, `${id} must not be pre-populated with a value`);
  }
  assert.equal(/console\.log\([^)]*\$\('(adminPass|tenantPass|tenantPin|simplePass|simplePin)'\)/.test(LOGIN_HTML), false);
});
