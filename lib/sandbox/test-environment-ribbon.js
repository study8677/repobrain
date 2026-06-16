/**
 * TestEnvironmentRibbon — persistent, high-visibility sandbox marker.
 *
 * Posture rule for every CorpFlow sandbox / preview page:
 *
 *   - Fixed at the top of the viewport (position: fixed, top: 0).
 *   - Spans full viewport width (left: 0, right: 0).
 *   - Orange / high-contrast background, white bold text.
 *   - Visible on desktop and mobile (text wraps gracefully on narrow viewports).
 *   - NOT dismissible (no close button, no aria-hidden toggle, no localStorage).
 *   - Remains visible while scrolling (consequence of position: fixed).
 *   - Z-index above the chat widget panel so the ribbon never gets covered when
 *     a tester opens the chat. The chat widget bundle uses z-index 2147483600
 *     for the bubble and 2147483601 for the panel; the ribbon sits at
 *     2147483640 which is comfortably above both with headroom for any future
 *     widget surface.
 *
 * The ribbon does not provide its own padding compensation — the consuming
 * page is responsible for adding enough top padding to its main wrapper so
 * that page content is not hidden under the ribbon. Recommended: at least
 * 80px top padding on the outer wrapper to handle 2-line wrap on narrow
 * mobile viewports (where "TEST ENVIRONMENT — Not the live Living Word
 * Mauritius website" wraps to ~2 lines at 14px font).
 *
 * Source of truth for the requirement: the project manager's
 * "Future visual sandbox requirement" instruction (2026-06-16) and
 * `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-plan.md`
 * §3.3.
 *
 * @param {{ message: string }} props - Exact verbatim text to display in the
 *                                      ribbon. Caller is responsible for
 *                                      composing tenant-specific wording. No
 *                                      default — the message must be passed
 *                                      explicitly so it is never wrong by
 *                                      accident on a new sandbox page.
 */
export function TestEnvironmentRibbon({ message }) {
  if (!message) {
    // Defensive: never render an empty ribbon. A blank loud bar is worse than
    // none — testers might dismiss it as a styling bug.
    return null;
  }
  return (
    <div
      role="alert"
      aria-label="Test environment notice"
      data-corpflow-test-environment-ribbon="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483640,
        background: '#EA580C',
        color: '#FFFFFF',
        padding: '10px 16px',
        font: '700 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
        borderBottom: '2px solid #C2410C',
        letterSpacing: 0.2,
        // Ensure long text wraps gracefully on narrow mobile rather than
        // overflowing horizontally.
        whiteSpace: 'normal',
        wordBreak: 'normal',
      }}
    >
      {message}
    </div>
  );
}

export default TestEnvironmentRibbon;
