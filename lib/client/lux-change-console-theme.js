/**
 * LuxeMaurice-only Change Console chrome (pages/change.js).
 * Does not apply to Core or other tenants — keeps existing dark operator shell elsewhere.
 */

import { LUXE_MAURICE_BRAND_TOKENS as T } from './luxe-maurice-brand-theme.js';
import { changePanelStyle, changePageShellStyle } from '../cmp/_lib/change-console-layout.js';

/**
 * @returns {import('../cmp/_lib/change-console-layout.js').ChangePanelStyleInput}
 */
export function buildLuxChangeConsoleChrome() {
  const shellBg = T.pageBg;
  const pageInner = {
    fontFamily: T.fontUi,
    padding: 28,
    maxWidth: 1240,
    margin: '0 auto',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    color: T.ink,
  };
  const card = changePanelStyle({
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusLg,
    background: T.white,
    padding: 18,
    boxShadow: '0 10px 36px rgba(28,25,23,0.06)',
  });
  const subtleCard = changePanelStyle({
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusLg,
    background: T.sand,
    padding: 16,
  });
  return {
    shellBg,
    pageInner,
    card,
    subtleCard,
    text: T.ink,
    textMuted: T.inkMuted,
    textLabel: T.heroMid,
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    border: T.border,
    link: T.goldDeep,
    gold: T.goldDeep,
    sand: T.sand,
    white: T.white,
    heroDeep: T.heroDeep,
    fontDisplay: T.fontDisplay,
    /** @param {boolean} active */
    pill(active) {
      return {
        padding: '8px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? T.goldDeep : T.borderStrong}`,
        background: active ? T.goldDeep : T.white,
        color: active ? T.white : T.ink,
        fontSize: 12,
        fontWeight: 800,
        cursor: 'pointer',
      };
    },
    queueBtn(active) {
      return {
        textAlign: 'left',
        padding: 12,
        borderRadius: T.radiusMd,
        border: `1px solid ${active ? T.goldDeep : T.border}`,
        background: active ? T.sand : T.white,
        color: T.ink,
        cursor: 'pointer',
        minWidth: 0,
        maxWidth: '100%',
        width: '100%',
        boxSizing: 'border-box',
        opacity: 1,
      };
    },
    queueBtnSmoke(active) {
      const base = this.queueBtn(active);
      return {
        ...base,
        opacity: 0.72,
        background: active ? T.sand : T.pageBg,
      };
    },
    refreshBtn(busy) {
      return {
        padding: '6px 12px',
        borderRadius: T.radiusMd,
        border: `1px solid ${T.borderStrong}`,
        background: T.white,
        color: T.heroDeep,
        fontWeight: 800,
        fontSize: 12,
        cursor: busy ? 'not-allowed' : 'pointer',
      };
    },
    badge(kind) {
      const map = {
        programme: { bg: 'rgba(138,111,28,0.12)', border: T.goldDeep, color: T.goldDeep },
        client_request: { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', color: '#1e40af' },
        smoke_test: { bg: 'rgba(100,116,139,0.12)', border: '#94a3b8', color: '#475569' },
        media: { bg: 'rgba(168,85,247,0.08)', border: '#a855f7', color: '#6b21a8' },
        property: { bg: 'rgba(34,197,94,0.1)', border: '#22c55e', color: '#14532d' },
        other: { bg: 'rgba(28,25,23,0.06)', border: T.border, color: T.inkMuted },
      };
      const b = map[kind] || map.other;
      return {
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        border: `1px solid ${b.border}`,
        background: b.bg,
        color: b.color,
      };
    },
    pre() {
      return {
        padding: 12,
        borderRadius: T.radiusMd,
        border: `1px solid ${T.border}`,
        background: T.pageBg,
        fontSize: 12,
        color: T.ink,
      };
    },
    input() {
      return {
        padding: '8px 10px',
        borderRadius: T.radiusMd,
        border: `1px solid ${T.border}`,
        background: T.white,
        color: T.ink,
        fontSize: 12,
      };
    },
    shellStyle() {
      return changePageShellStyle({ background: shellBg, minHeight: '100vh' });
    },
  };
}
