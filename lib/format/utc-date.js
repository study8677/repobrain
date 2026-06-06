/**
 * SSR-stable, hydration-safe date formatter for any React component
 * whose date output is rendered both on the server (Vercel SSR) and on
 * the client (operator browser).
 *
 * Why this exists:
 *   The 2026-06-06 P0 on `/admin/lead-rescue/[id]` was a React
 *   hydration failure caused by `new Date(iso).toLocaleString()` in
 *   render. Server-side that call uses the Vercel container's locale +
 *   timezone (typically UTC, en-US default). Client-side it uses the
 *   operator's browser locale + timezone (e.g. Mauritius UTC+4, en-GB).
 *   The two strings are different for the same ISO timestamp, so
 *   React sees a text mismatch during hydration and aborts hydrating
 *   the subtree. Every event handler in that subtree silently fails
 *   to attach — exactly matching the "Save button does nothing" P0.
 *
 * Why this implementation (and not `Intl.DateTimeFormat`):
 *   Even with `timeZone: 'UTC'`, `Intl.DateTimeFormat` can produce
 *   different output between Node (full-icu) and browsers, depending
 *   on bundled locale tables. The only formatter that is guaranteed
 *   bit-for-bit identical across runtimes is one that uses only the
 *   `getUTC*` accessors + zero-padded numeric components.
 *
 * Output shape:
 *   `YYYY-MM-DD HH:mm:ss UTC` for valid input.
 *   `'—'` for null / undefined / empty / unparseable input.
 *
 * Operator UX rationale:
 *   For a factory-admin operator surface, displaying canonical UTC is
 *   actually clearer than browser-local time — it removes any "what
 *   timezone is this?" ambiguity when comparing rows or coordinating
 *   with logs, automation events, or n8n receipts.
 *
 * IMPORTANT:
 *   Never replace this with `toLocaleString`, `toLocaleDateString`,
 *   `toLocaleTimeString`, or any `Intl.*` call in code paths whose
 *   output is rendered before client hydration completes. The
 *   `node-tests/admin-lead-rescue-detail-hydration-stable.test.mjs`
 *   suite forbids those patterns and will fail loudly.
 *
 * @param {string | number | Date | null | undefined} value
 * @returns {string}
 */
export function fmtDateStableUtc(value) {
  if (value === null || value === undefined || value === '') return '—';
  let d;
  try {
    d = value instanceof Date ? value : new Date(value);
  } catch {
    return '—';
  }
  if (!d || Number.isNaN(d.getTime())) return '—';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export default fmtDateStableUtc;
