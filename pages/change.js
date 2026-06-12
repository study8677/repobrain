import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { LUX_PHASE1_REVIEW_TICKET_ID } from '../lib/cmp/_lib/client-decisions-client.js';
import { LUX_PARENT_PROGRAMME_TICKET_ID } from '../lib/cmp/_lib/lux-client-requests.js';
import {
  CHANGE_LAYOUT_EXPECTED_COMMIT_PREFIX,
  CHANGE_LAYOUT_INSTRUMENTATION_ID,
  CHANGE_LAYOUT_MARK_VERSION,
  scanHorizontalOverflow,
} from '../lib/cmp/_lib/change-layout-debug.js';
import {
  CHANGE_LAYOUT_FIXTURE_LONG_LINE,
  changeFlexMainChildStyle,
  changePageShellStyle,
  changePanelStyle,
  changePreBlockStyle,
  changeSelectContainStyle,
  changeTextContainStyle,
} from '../lib/cmp/_lib/change-console-layout.js';
import {
  LUX_LEAD_CRM_STAGES,
  activityKindLabel,
  luxLeadCrmStageLabel,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';
import {
  LUX_ATTACHMENT_ARCHIVE_REASON_SMOKE_DEFAULT,
  LUX_ATTACHMENT_OPERATOR_FILTER_IDS,
  LUX_AI_SUGGESTION_STATUSES,
  LUX_VIDEO_GOVERNANCE_STATUSES,
  buildLuxAttachmentWhereUsedRows,
  computeLuxAttachmentMediaSummary,
  computeLuxVideoAttachmentReadiness,
  detectLuxOperatorTestMediaHint,
  luxAttachmentCleanupCandidate,
  luxAttachmentMatchesOperatorFilter,
} from '../lib/cmp/_lib/lux-request-attachments.js';
import { buildLuxChangeConsoleChrome } from '../lib/client/lux-change-console-theme.js';
import {
  classifyLuxChangeQueueTicket,
  groupLuxOperatorQueueTickets,
} from '../lib/client/lux-change-queue-classify.js';
import {
  isLuxContentSprintTicket,
  normalizeLuxContentSprintCode,
} from '../lib/client/lux-content-sprint-guidance.js';
import LuxContentSprintPanel from '../components/LuxContentSprintPanel.js';

function normalizeLocale(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
  if (!s) return 'en';
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('fr')) return 'fr';
  if (s.startsWith('de')) return 'de';
  if (s.startsWith('pt')) return 'pt';
  return 'en';
}

function stageForWorkflowState(wf) {
  const s = String(wf || '').trim();
  if (s === 'in_review' || s === 'preview_ready' || s === 'changes_requested' || s === 'client_approved')
    return 'Review';
  if (s === 'approved_for_build' || s === 'building' || s === 'publishing' || s === 'published') return 'Build';
  if (s === 'awaiting_client_programme_decisions') return 'Draft';
  if (s === 'ready_for_estimate' || s === 'estimated') return 'Draft';
  if (s === 'refining') return 'Clarify';
  return 'Intake';
}

function isoToDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pillStyle(active, chrome) {
  if (chrome && typeof chrome.pill === 'function') return chrome.pill(active);
  return {
    padding: '8px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? '#38bdf8' : '#334155'}`,
    background: active ? 'rgba(56,189,248,0.12)' : 'rgba(2,6,23,0.35)',
    color: active ? '#e0f2fe' : '#cbd5e1',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  };
}

/** Lux-only: `<details>` accordion so media tools are not all expanded at once. */
function LuxChangeCollapsibleSection({ chrome, summary, cardStyle, children, defaultOpen = false, sectionId }) {
  if (!chrome) {
    return <div style={cardStyle}>{children}</div>;
  }
  return (
    <details id={sectionId} style={{ ...cardStyle, minWidth: 0 }} defaultOpen={defaultOpen}>
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.08em',
          color: chrome.textLabel,
        }}
      >
        {summary}
      </summary>
      <div style={{ marginTop: 12 }}>{children}</div>
    </details>
  );
}

function ChangeQueueTicketRow({ t, selectedTicketId, onSelect, luxChrome }) {
  const id = String(t.ticket_id || '');
  const active = id && id === selectedTicketId;
  const cls = luxChrome ? classifyLuxChangeQueueTicket(t) : null;
  const btnStyle = luxChrome
    ? cls.bucket === 'archived_smoke'
      ? luxChrome.queueBtnSmoke(active)
      : cls.bucket === 'internal'
        ? luxChrome.queueBtnInternal(active)
        : luxChrome.queueBtn(active)
    : {
        textAlign: 'left',
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${active ? 'rgba(56,189,248,0.6)' : 'rgba(148,163,184,0.25)'}`,
        background: active ? 'rgba(56,189,248,0.10)' : 'rgba(15,23,42,0.35)',
        color: '#e2e8f0',
        cursor: 'pointer',
        minWidth: 0,
        maxWidth: '100%',
        width: '100%',
        boxSizing: 'border-box',
      };
  const monoColor = luxChrome ? luxChrome.textMuted : '#94a3b8';
  const titleColor =
    luxChrome && cls?.bucket === 'internal' ? luxChrome.textMuted : luxChrome ? luxChrome.text : '#e2e8f0';
  const summaryText =
    luxChrome && cls?.bucket === 'internal'
      ? 'No summary — internal or draft row'
      : String(t.requested_change || '—');
  return (
    <button
      type="button"
      data-lux-queue-ticket-id={id || undefined}
      onClick={() => onSelect(id)}
      style={btnStyle}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {luxChrome && cls ? <span style={luxChrome.badge(cls.bucket)}>{cls.badge}</span> : null}
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 10,
            color: monoColor,
            ...changeTextContainStyle(),
          }}
        >
          {id}
        </div>
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          color: titleColor,
          lineHeight: 1.35,
          fontWeight: luxChrome ? 650 : 400,
          ...changeTextContainStyle(),
        }}
      >
        {summaryText}
      </div>
    </button>
  );
}

/** Lux-only: grouped operator queue with counts, collapsed archives, optional hide. */
function LuxOperatorQueueList({
  chrome,
  grouped,
  selectedTicketId,
  onSelectTicket,
  luxQueueTestsOpen,
  setLuxQueueTestsOpen,
  luxQueueInternalOpen,
  setLuxQueueInternalOpen,
  luxHideArchivedSmoke,
  setLuxHideArchivedSmoke,
  selectedTicketIsArchivedSmoke,
}) {
  const c = grouped.counts;
  const sectionTitleStyle = {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: chrome.textLabel,
  };
  const firstTitleStyle = { ...sectionTitleStyle, marginTop: 0 };

  function mapRows(rows, keyPrefix) {
    return rows.map((t) => {
      const id = String(t.ticket_id || '');
      return (
        <ChangeQueueTicketRow
          key={id || keyPrefix}
          t={t}
          selectedTicketId={selectedTicketId}
          onSelect={onSelectTicket}
          luxChrome={chrome}
        />
      );
    });
  }

  return (
    <>
      <div
        style={{
          marginBottom: 10,
          fontSize: 11,
          lineHeight: 1.45,
          color: chrome.textMuted,
        }}
      >
        Programme ({c.programme}) · Active ({c.activeClient}) · Property ({c.propertyMedia}) · CRM ({c.crmLeads}) ·
        Internal ({c.internal}) · Smoke ({c.archivedSmoke})
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          fontSize: 12,
          fontWeight: 700,
          color: chrome.text,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={luxHideArchivedSmoke}
          onChange={(e) => setLuxHideArchivedSmoke(Boolean(e.target.checked))}
        />
        Hide archived smoke / test artifacts (queue stays auditable; show to select)
      </label>

      <div style={{ display: 'grid', gap: 0 }}>
        {grouped.programme.length ? (
          <div key="lux-q-programme">
            <div style={firstTitleStyle}>Programme ({grouped.programme.length})</div>
            <div style={{ display: 'grid', gap: 8 }}>{mapRows(grouped.programme, 'pg')}</div>
          </div>
        ) : null}

        {grouped.activeClient.length ? (
          <div key="lux-q-active">
            <div style={sectionTitleStyle}>Active client work ({grouped.activeClient.length})</div>
            <div style={{ display: 'grid', gap: 8 }}>{mapRows(grouped.activeClient, 'ac')}</div>
          </div>
        ) : null}

        {grouped.propertyMedia.length ? (
          <div key="lux-q-prop">
            <div style={sectionTitleStyle}>Property & media ({grouped.propertyMedia.length})</div>
            <div style={{ display: 'grid', gap: 8 }}>{mapRows(grouped.propertyMedia, 'pm')}</div>
          </div>
        ) : null}

        {grouped.crmLeads.length ? (
          <div key="lux-q-crm">
            <div style={sectionTitleStyle}>CRM / leads ({grouped.crmLeads.length})</div>
            <div style={{ display: 'grid', gap: 8 }}>{mapRows(grouped.crmLeads, 'cr')}</div>
          </div>
        ) : null}

        {grouped.internal.length ? (
          <details
            key="lux-q-internal"
            open={luxQueueInternalOpen}
            onToggle={(e) => setLuxQueueInternalOpen(Boolean(e.target.open))}
            style={{
              marginTop: 4,
              border: `1px dashed ${chrome.border}`,
              borderRadius: 12,
              padding: '8px 10px',
              background: chrome.sand,
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
                color: chrome.textMuted,
                listStyle: 'none',
              }}
            >
              Uncategorized / internal ({grouped.internal.length})
            </summary>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>{mapRows(grouped.internal, 'in')}</div>
          </details>
        ) : null}

        {grouped.archivedSmoke.length ? (
          luxHideArchivedSmoke && !selectedTicketIsArchivedSmoke ? (
            <div
              key="lux-q-smoke-hidden"
              style={{
                marginTop: 8,
                padding: '10px 12px',
                borderRadius: 12,
                border: `1px dashed ${chrome.border}`,
                background: chrome.sand,
                fontSize: 12,
                color: chrome.textMuted,
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 800, color: chrome.text }}>Test & smoke artifacts ({grouped.archivedSmoke.length})</div>
              <div style={{ marginTop: 6 }}>
                Hidden for a cleaner desk. Nothing is deleted — turn off the checkbox above or click Show to review history.
              </div>
              <button
                type="button"
                onClick={() => setLuxHideArchivedSmoke(false)}
                style={{
                  marginTop: 10,
                  ...chrome.refreshBtn(false),
                }}
              >
                Show smoke / test artifacts
              </button>
            </div>
          ) : (
            <details
              key="lux-q-smoke"
              open={luxQueueTestsOpen}
              onToggle={(e) => setLuxQueueTestsOpen(Boolean(e.target.open))}
              style={{
                marginTop: 8,
                border: `1px dashed ${chrome.border}`,
                borderRadius: 12,
                padding: '8px 10px',
                background: chrome.sand,
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 800,
                  color: chrome.textMuted,
                  listStyle: 'none',
                }}
              >
                Test & smoke artifacts ({grouped.archivedSmoke.length}) — collapsed by default; still selectable
              </summary>
              <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>{mapRows(grouped.archivedSmoke, 'sm')}</div>
            </details>
          )
        ) : null}
      </div>
    </>
  );
}

/** Mirrors `public/change.html` workflow labels for Intake detection. */
function workflowLabel(state) {
  const s = String(state || '').trim().toLowerCase();
  const map = {
    intake: 'Intake',
    refining: 'Refining',
    ready_for_estimate: 'Ready for estimate',
    estimated: 'Estimated',
    approved_for_build: 'Approved for build',
    building: 'Building',
    preview_ready: 'Preview ready',
    in_review: 'In review',
    changes_requested: 'Changes requested',
    client_approved: 'Client approved',
    publishing: 'Publishing',
    published: 'Published',
    closed: 'Closed',
    not_delivered: 'NOT DELIVERED',
  };
  return map[s] || (s ? s : '—');
}

function computeIsIntakeUx(ticketLike) {
  const m = ticketLike && typeof ticketLike === 'object' ? ticketLike : {};
  const tp = m.ticket_progress && typeof m.ticket_progress === 'object' ? m.ticket_progress : null;
  const cv = tp && tp.client_view && typeof tp.client_view === 'object' ? tp.client_view : {};
  const wfRaw = cv.workflow_state != null ? String(cv.workflow_state).trim() : '';
  const wf = wfRaw.toLowerCase();
  const st = String((tp && tp.status) || m.status || '').trim().toLowerCase();
  if (st === 'closed') return false;
  const label = workflowLabel(wfRaw);
  if (label === 'Intake') return true;
  if (!wf && (st === 'open' || st === 'created' || !st)) return true;
  return false;
}

function formatExistingRequestText(ticketLike) {
  const m = ticketLike && typeof ticketLike === 'object' ? ticketLike : {};
  const d = m.description != null ? String(m.description).trim() : '';
  if (d) return d;
  const bs = m.brief_structured && typeof m.brief_structured === 'object' ? m.brief_structured : null;
  if (bs && typeof bs.summary === 'string' && bs.summary.trim()) return String(bs.summary).trim();
  const tp = m.ticket_progress && typeof m.ticket_progress === 'object' ? m.ticket_progress : null;
  const cv = tp && tp.client_view && typeof tp.client_view === 'object' ? tp.client_view : {};
  const pm = typeof cv.progress_message === 'string' ? cv.progress_message.trim() : '';
  if (pm) return pm;
  return 'No description has been saved on this request yet. Add your wording above.';
}

function formatUsd(val) {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatHoursBand(low, high) {
  const lo = typeof low === 'number' ? low : Number(low);
  const hi = typeof high === 'number' ? high : Number(high);
  if (Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi > 0) return `${lo} – ${hi} hrs`;
  if (Number.isFinite(lo) && lo > 0) return `${lo}+ hrs`;
  return null;
}

function luxOperatorAttachmentFilterLabel(id) {
  const k = id != null ? String(id).trim().toLowerCase() : '';
  const map = {
    all: 'All',
    pending_review: 'Pending review',
    reviewed: 'Reviewed',
    rejected: 'Rejected',
    archived: 'Archived',
    linked: 'Linked',
    published: 'Published',
    needs_action: 'Needs action',
  };
  return map[k] || k || 'All';
}

function luxPublishHistoryActionLabel(action) {
  const a = action != null ? String(action).trim().toLowerCase() : '';
  if (a === 'published') return 'Published';
  if (a === 'unpublished') return 'Unpublished';
  if (a === 'archived') return 'Archived';
  if (a === 'restored') return 'Restored';
  return action != null ? String(action) : '—';
}

/** Phase 4D.5 — optional ticket fields for smoke/test hinting (client-only). */
function luxTicketAttachmentHintContext(ticketLike) {
  const t = ticketLike && typeof ticketLike === 'object' ? ticketLike : {};
  return {
    title: t.title,
    description: t.description,
    client_email: t.client_email != null ? t.client_email : t.clientEmail,
    contact_email:
      t.contact_email != null
        ? t.contact_email
        : t.contactEmail != null
          ? t.contactEmail
          : t.requester_email,
    requester_email: t.requester_email,
    email: t.email,
  };
}

export default function ChangeConsolePage() {
  const router = useRouter();
  const [locale, setLocale] = useState('en');
  const [uiContext, setUiContext] = useState(null);
  const [session, setSession] = useState({ logged_in: false, level: 'anonymous', tenant_id: null });
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [stage, setStage] = useState('Intake');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [clientDecisionBusy, setClientDecisionBusy] = useState(false);
  const [clientDecisionLink, setClientDecisionLink] = useState('');
  const [clientDecisionExpiresAt, setClientDecisionExpiresAt] = useState('');
  const [clientDecisionStatus, setClientDecisionStatus] = useState('');
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadPatchBusy, setLeadPatchBusy] = useState(false);
  const [leadStageDraft, setLeadStageDraft] = useState('new');
  const [leadFollowDraft, setLeadFollowDraft] = useState('');
  const [leadNoteDraft, setLeadNoteDraft] = useState('');
  const [leadOwnerDraft, setLeadOwnerDraft] = useState('');
  const [leadNextActionDraft, setLeadNextActionDraft] = useState('');
  const [leadNextActionNoteDraft, setLeadNextActionNoteDraft] = useState('');
  const [crmFilterStage, setCrmFilterStage] = useState('all');
  const [crmFilterOwner, setCrmFilterOwner] = useState('');
  const [crmFilterProperty, setCrmFilterProperty] = useState('');
  const [crmFilterHealth, setCrmFilterHealth] = useState('all');
  // CRM noise filter: by default the LEADS · New count and visible list exclude
  // server-flagged `system_generated` leads (Phase 2 / Phase 3 / smoke verification
  // fixtures with @example.com / @placeholder.local / @corpflowai.invalid contacts,
  // etc.). Operators can toggle them back in via "Show internal/test" without losing
  // audit access — the rows still exist in Postgres, the API still returns them,
  // we only filter them client-side from the operator view.
  const [crmShowSystemGenerated, setCrmShowSystemGenerated] = useState(false);
  const [leadPatchStatus, setLeadPatchStatus] = useState('');
  const [requestDraft, setRequestDraft] = useState('');
  const [intakeNotice, setIntakeNotice] = useState('');
  const [forceRefine, setForceRefine] = useState(false);
  const [estimateStatus, setEstimateStatus] = useState('');
  const [estimateBusy, setEstimateBusy] = useState(false);

  const [luxRequests, setLuxRequests] = useState([]);
  const [luxReqType, setLuxReqType] = useState('website_refinement');
  const [luxReqTitle, setLuxReqTitle] = useState('');
  const [luxReqDesc, setLuxReqDesc] = useState('');
  const [luxReqPropertyRef, setLuxReqPropertyRef] = useState('');
  const [luxReqPriority, setLuxReqPriority] = useState('Normal');
  const [luxReqBusy, setLuxReqBusy] = useState(false);
  const [luxReqStatus, setLuxReqStatus] = useState('');

  const [attachments, setAttachments] = useState([]);
  const [attachmentsTicketId, setAttachmentsTicketId] = useState('');
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState('');
  // Upload to this ticket (Phase 4D.5 / PR #348). Files are sent base64-encoded
  // through the existing `POST /api/change-attachment/upload` endpoint, which is
  // tenant-scoped server-side and auto-annotates the Lux media-governance entry
  // in `console_json`. No second upload system, no new API, no public route.
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadStatusKind, setUploadStatusKind] = useState(/** @type {'idle'|'info'|'ok'|'error'} */ ('idle'));
  // PR #351 — last successful upload, surfaced as an in-section "just uploaded"
  // line so the operator sees confirmation directly inside the upload card even
  // when the bigger ATTACHMENTS list is below the fold or collapsed.
  const [lastUploadedAttachment, setLastUploadedAttachment] = useState(
    /** @type {{attachment_id: string, file_name: string, byte_size: number, content_type: string, at: string} | null} */ (
      null
    ),
  );
  const luxAttachmentUploadInputRef = useRef(null);
  const luxAttachmentUploadSectionRef = useRef(null);
  const [attachmentReviewBusyId, setAttachmentReviewBusyId] = useState('');
  const [attachmentReviewNoteDrafts, setAttachmentReviewNoteDrafts] = useState({});
  const [attachmentLinkBusyId, setAttachmentLinkBusyId] = useState('');
  const [attachmentLinkSlugDrafts, setAttachmentLinkSlugDrafts] = useState({});
  const [attachmentLinkSlotDrafts, setAttachmentLinkSlotDrafts] = useState({});
  const [attachmentLinkNoteDrafts, setAttachmentLinkNoteDrafts] = useState({});
  const [attachmentPublishBusyKey, setAttachmentPublishBusyKey] = useState('');
  const [attachmentPublishCaptionDrafts, setAttachmentPublishCaptionDrafts] = useState({});
  const [attachmentPublishAltDrafts, setAttachmentPublishAltDrafts] = useState({});
  const [attachmentGalleryOrderDrafts, setAttachmentGalleryOrderDrafts] = useState({});
  const [attachmentGalleryCoverDrafts, setAttachmentGalleryCoverDrafts] = useState({});
  const [attachmentArchiveBusyId, setAttachmentArchiveBusyId] = useState('');
  const [attachmentRestoreBusyId, setAttachmentRestoreBusyId] = useState('');
  const [attachmentVideoGovBusyId, setAttachmentVideoGovBusyId] = useState('');
  const [attachmentEditorialBusyId, setAttachmentEditorialBusyId] = useState('');
  const [attachmentArchiveReasonDrafts, setAttachmentArchiveReasonDrafts] = useState({});
  const [attachmentOperatorFilter, setAttachmentOperatorFilter] = useState('all');
  const [luxMediaLibRows, setLuxMediaLibRows] = useState([]);
  const [luxMediaLibBusy, setLuxMediaLibBusy] = useState(false);
  const [luxMediaLibErr, setLuxMediaLibErr] = useState('');
  const [luxMediaLibOpen, setLuxMediaLibOpen] = useState(false);
  const [luxMediaLibSearch, setLuxMediaLibSearch] = useState('');
  const [luxMediaLibSlug, setLuxMediaLibSlug] = useState('');
  const [luxMediaLibSlot, setLuxMediaLibSlot] = useState('');
  const [luxMediaLibMediaType, setLuxMediaLibMediaType] = useState('');
  const [luxMediaLibFilter, setLuxMediaLibFilter] = useState('all');

  const attachmentMediaSummary = useMemo(
    () => computeLuxAttachmentMediaSummary(attachments),
    [attachments],
  );

  const filteredAttachments = useMemo(
    () => attachments.filter((a) => luxAttachmentMatchesOperatorFilter(a, attachmentOperatorFilter)),
    [attachments, attachmentOperatorFilter],
  );

  const luxOperatorPropertySlugHint = useMemo(() => {
    const lib = String(luxMediaLibSlug || '').trim();
    if (lib) return lib;
    const drafts = attachmentLinkSlugDrafts && typeof attachmentLinkSlugDrafts === 'object' ? attachmentLinkSlugDrafts : {};
    for (const k of Object.keys(drafts)) {
      const s = String(drafts[k] || '').trim();
      if (s) return s;
    }
    for (const a of attachments) {
      const pls = Array.isArray(a.property_links) ? a.property_links : [];
      for (const pl of pls) {
        const slug = String(pl?.property_slug || '').trim();
        if (slug) return slug;
      }
    }
    return '';
  }, [luxMediaLibSlug, attachmentLinkSlugDrafts, attachments]);

  const showChangeLayoutFixture =
    process.env.NODE_ENV === 'development' && router.isReady && String(router.query.changeLayoutFixture || '') === '1';

  const showChangeDebugBanner = router.isReady && String(router.query.debug || '') === '1';
  const layoutDebugEnabled = router.isReady && String(router.query.layoutDebug || '') === '1';

  const changeRootRef = useRef(null);
  const layoutOutlineCleanupRef = useRef(() => {});
  const [layoutDebugSnapshot, setLayoutDebugSnapshot] = useState(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflowX;
    const prevBody = body.style.overflowX;
    html.style.overflowX = 'hidden';
    body.style.overflowX = 'hidden';
    return () => {
      html.style.overflowX = prevHtml;
      body.style.overflowX = prevBody;
    };
  }, []);

  useEffect(() => {
    try {
      setLocale(normalizeLocale(navigator.language));
    } catch {
      setLocale('en');
    }
  }, []);

  const stageTabs = useMemo(() => ['Intake', 'Clarify', 'Draft', 'Review', 'Build'], []);

  async function refreshUiContext() {
    const r = await fetch('/api/ui/context', { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j || j.ok !== true) throw new Error(j?.error || 'ui/context failed');
    setUiContext(j);
    setSession(j.session || { logged_in: false, level: 'anonymous', tenant_id: null });
    return j;
  }

  async function loadQueue() {
    const r = await fetch('/api/cmp/router?action=ticket-operator-queue&limit=50', {
      credentials: 'include',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
    const rows = Array.isArray(j.tickets) ? j.tickets : [];
    setTickets(rows);
    return rows;
  }

  async function loadTicketById(id) {
    const tid = String(id || '').trim();
    if (!tid) return null;
    const r = await fetch('/api/cmp/router?action=ticket-get&id=' + encodeURIComponent(tid), {
      credentials: 'include',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
    setTicket(j);
    const wf = j?.ticket_progress?.client_view?.workflow_state || '';
    setStage(stageForWorkflowState(wf));
    return j;
  }

  async function loadLeads() {
    const r = await fetch('/api/cmp/router?action=concierge-leads-list&limit=100', {
      credentials: 'include',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
    const rows = Array.isArray(j.leads) ? j.leads : [];
    setLeads(rows);
    return rows;
  }

  async function loadLuxRelatedRequests() {
    if (!luxLeadCrmEnabled) return [];
    const r = await fetch('/api/cmp/router?action=lux-client-requests-list&limit=25', { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = String(j?.error || j?.detail || j?.hint || '').trim();
      if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
        throw new Error('Your session expired. Please refresh and log in again.');
      }
      throw new Error(msg || `http_${r.status}`);
    }
    const rows = Array.isArray(j.requests) ? j.requests : [];
    setLuxRequests(rows);
    return rows;
  }

  /**
   * Read a `File` into a base64 string (no data: prefix). Resolves to `''` on
   * failure so the caller can surface a user-friendly error without throwing.
   * @param {File} file
   * @returns {Promise<string>}
   */
  function readFileAsBase64(file) {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const idx = result.indexOf('base64,');
          resolve(idx >= 0 ? result.slice(idx + 'base64,'.length) : '');
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      } catch {
        resolve('');
      }
    });
  }

  /**
   * Server-enforced limits live in `lib/server/change-attachments.js`. The client
   * pre-check is intentionally lenient — it only catches *obvious* problems (huge
   * file, plainly-disallowed type) so the operator gets immediate feedback. The
   * server is the source of truth for the allowlist and the size limit.
   *
   * PR #351 — `clientMimeAllowed` now tolerates an empty / unknown `file.type`
   * because some browsers (notably Windows when picking files without an
   * extension-to-MIME registry hit) hand us `''` for legitimate images. The
   * canonical check happens server-side; rejecting on `''` here just produced a
   * confusing client-side false negative on valid files.
   */
  const LUX_UPLOAD_MAX_BYTES_HINT = 3 * 1024 * 1024;
  const LUX_UPLOAD_ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
  const LUX_UPLOAD_ALLOWED_MIME_EXACT = ['application/pdf'];

  function clientMimeAllowed(contentType) {
    const ct = String(contentType || '').toLowerCase();
    if (!ct) return true; // tolerate unknown — server enforces canonical allowlist
    if (LUX_UPLOAD_ALLOWED_MIME_EXACT.includes(ct)) return true;
    return LUX_UPLOAD_ALLOWED_MIME_PREFIXES.some((p) => ct.startsWith(p));
  }

  /**
   * Send one file through `POST /api/change-attachment/upload` (governed pipeline)
   * and refresh the attachments list so the operator can immediately review / link
   * / publish.
   *
   * PR #351 — Surface a one-line `[lux-upload]` diagnostic at each step so any
   * silent-drop regression is recoverable from the browser console alone, and
   * push verbatim server error text into the status pill (no swallowing).
   *
   * @param {string} ticketId
   * @param {File} file
   */
  async function uploadFileToTicket(ticketId, file) {
    if (!ticketId) {
      setUploadStatus('Open a ticket before choosing a file to upload.');
      setUploadStatusKind('error');
      return;
    }
    if (!file) return;
    try {
      // eslint-disable-next-line no-console
      console.warn(
        '[lux-upload] picked file name=%s size=%s type=%s ticket=%s',
        String(file.name || ''),
        String(file.size || 0),
        String(file.type || '<empty>'),
        String(ticketId || ''),
      );
    } catch {
      // logging is best-effort.
    }
    if (file.size > LUX_UPLOAD_MAX_BYTES_HINT) {
      setUploadStatus(
        `File is too large for this upload (max ${Math.round(LUX_UPLOAD_MAX_BYTES_HINT / 1024 / 1024)} MB; this file is ${(file.size / 1024 / 1024).toFixed(2)} MB). Please use a smaller asset or speak to the operator about a larger ingest path.`,
      );
      setUploadStatusKind('error');
      return;
    }
    const rawContentType = String(file.type || '').trim();
    const contentType = rawContentType || 'application/octet-stream';
    if (!clientMimeAllowed(contentType)) {
      setUploadStatus(
        `Unsupported file type "${contentType}". Allowed: images, videos, PDF. (The server applies the canonical allowlist.)`,
      );
      setUploadStatusKind('error');
      return;
    }
    setUploadBusy(true);
    setUploadStatus(`Uploading ${file.name} (${(file.size / 1024).toFixed(1)} KB, ${contentType})…`);
    setUploadStatusKind('info');
    try {
      const data_base64 = await readFileAsBase64(file);
      if (!data_base64) {
        try {
          // eslint-disable-next-line no-console
          console.warn('[lux-upload] FileReader returned empty result for %s', file.name);
        } catch {
          // logging best-effort.
        }
        setUploadStatus('Could not read the file in this browser. Try a different file or browser.');
        setUploadStatusKind('error');
        return;
      }
      try {
        // eslint-disable-next-line no-console
        console.warn(
          '[lux-upload] POST /api/change-attachment/upload ticket=%s file_name=%s base64_len=%s',
          String(ticketId || ''),
          String(file.name || ''),
          String(data_base64.length || 0),
        );
      } catch {
        // logging best-effort.
      }
      let r;
      try {
        r = await fetch('/api/change-attachment/upload', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticket_id: ticketId,
            file_name: String(file.name || 'upload.bin').slice(0, 240),
            content_type: contentType,
            data_base64,
          }),
        });
      } catch (netErr) {
        const msg = String(netErr?.message || netErr || 'network_error');
        try {
          // eslint-disable-next-line no-console
          console.warn('[lux-upload] network error: %s', msg);
        } catch {
          // logging best-effort.
        }
        setUploadStatus(`Upload failed: network error (${msg}). Check your connection or try again.`);
        setUploadStatusKind('error');
        return;
      }
      const j = await r.json().catch(() => ({}));
      try {
        // eslint-disable-next-line no-console
        console.warn(
          '[lux-upload] response status=%s body=%s',
          String(r.status),
          JSON.stringify(j).slice(0, 500),
        );
      } catch {
        // logging best-effort.
      }
      if (!r.ok) {
        const err = String(j?.error || j?.detail || j?.hint || `http_${r.status}`);
        setUploadStatus(`Upload failed (HTTP ${r.status}): ${err}`);
        setUploadStatusKind('error');
        return;
      }
      const warn = j && typeof j.lux_meta_warning === 'string' ? j.lux_meta_warning : '';
      setUploadStatus(
        warn
          ? `Uploaded ${j.file_name || file.name} (${(file.size / 1024).toFixed(1)} KB). Metadata warning: ${warn}`
          : `Uploaded and available on this ticket: ${j.file_name || file.name} (${(file.size / 1024).toFixed(1)} KB). Scroll down to ATTACHMENTS to review, link, and publish.`,
      );
      setUploadStatusKind(warn ? 'info' : 'ok');
      setLastUploadedAttachment({
        attachment_id: j.attachment_id || '',
        file_name: j.file_name || file.name,
        byte_size: typeof j.byte_size === 'number' ? j.byte_size : file.size,
        content_type: j.content_type || contentType,
        at: new Date().toISOString(),
      });
      try {
        const refreshed = await loadAttachmentsForTicket(ticketId);
        try {
          // eslint-disable-next-line no-console
          console.warn(
            '[lux-upload] refreshed attachments for ticket=%s count=%s',
            String(ticketId || ''),
            String(Array.isArray(refreshed) ? refreshed.length : 'unknown'),
          );
        } catch {
          // logging best-effort.
        }
      } catch (refreshErr) {
        try {
          // eslint-disable-next-line no-console
          console.warn('[lux-upload] attachments refresh failed: %s', String(refreshErr?.message || refreshErr));
        } catch {
          // logging best-effort.
        }
        // Non-fatal: the upload succeeded; the operator can refresh manually.
      }
    } catch (e) {
      const msg = String(e?.message || e || 'unknown_error');
      try {
        // eslint-disable-next-line no-console
        console.warn('[lux-upload] caught exception: %s', msg);
      } catch {
        // logging best-effort.
      }
      setUploadStatus(`Upload failed: ${msg}`);
      setUploadStatusKind('error');
    } finally {
      setUploadBusy(false);
      // Reset the input value so the operator can pick the SAME file again after a
      // success or failure (otherwise the `change` event won't fire for an
      // identical re-selection — browser-level behaviour, not React).
      const inp =
        luxAttachmentUploadInputRef.current ||
        (typeof document !== 'undefined'
          ? document.getElementById('lux-ticket-attachment-upload-input')
          : null);
      if (inp) {
        try {
          inp.value = '';
        } catch {
          // Reading-only browsers ignore this; harmless.
        }
      }
    }
  }

  function handleAttachmentUploadInputChange(e) {
    try {
      const files = e?.target?.files;
      if (!files || !files.length) {
        try {
          // eslint-disable-next-line no-console
          console.warn('[lux-upload] input change with no files');
        } catch {
          // logging best-effort.
        }
        return;
      }
      const ticketId = String(selectedTicketId || attachmentsTicketId || '').trim();
      uploadFileToTicket(ticketId, files[0]);
    } catch (err) {
      const msg = String(err?.message || err || 'unknown_error');
      try {
        // eslint-disable-next-line no-console
        console.warn('[lux-upload] input change handler error: %s', msg);
      } catch {
        // logging best-effort.
      }
      setUploadStatus(`Upload failed: ${msg}`);
      setUploadStatusKind('error');
    }
  }

  /**
   * Wired into the Content sprint panel's "Upload content" button. Opens the
   * native OS file picker for the existing governed upload input.
   *
   * Lookup strategy (defensive — PR #350):
   *   1. React ref `luxAttachmentUploadInputRef.current` (fast path).
   *   2. `document.getElementById('lux-ticket-attachment-upload-input')` (fallback
   *      for any ref-attachment race or partial-hydration edge case — the upload
   *      input now carries a stable `id` and `name` attribute exactly for this).
   *
   * The fast path covers PR #348 + #349 (refs are wired and the section render
   * guard was relaxed to `!isEstimateMode && selectedTicketId`). The fallback
   * exists because PR #349's production rollout still surfaced
   * "Upload area is not available right now" on real C1–C4 sprint tickets — and
   * the safest belt-and-suspenders is to not depend solely on a React ref being
   * attached at click time.
   *
   * If both lookups fail, we surface a one-line `console.warn` so operators can
   * paste diagnostic state, and we keep the non-silent inline + alert fallback.
   */
  function handleSprintUploadContentClick() {
    if (!selectedTicketId) {
      setUploadStatus('Open a content sprint ticket before uploading.');
      setUploadStatusKind('error');
      return;
    }
    let section = luxAttachmentUploadSectionRef.current || null;
    let input = luxAttachmentUploadInputRef.current || null;
    let foundVia = 'ref';
    if ((!section || !input) && typeof document !== 'undefined') {
      try {
        if (!section) section = document.getElementById('lux-ticket-attachment-upload');
        if (!input) input = document.getElementById('lux-ticket-attachment-upload-input');
        foundVia = 'document.getElementById';
      } catch {
        // No DOM access (SSR / restrictive sandbox); fall through to fallback below.
      }
    }
    if (!input) {
      // Surface a one-line diagnostic so the operator can paste console state.
      // Per PM-first-communication rule this is operator-facing; keep it short.
      try {
        // eslint-disable-next-line no-console
        console.warn(
          '[lux-upload] Upload area is not in the DOM. selectedTicketId=%s isEstimateMode=%s isLuxContentSprintTicketSelected=%s sectionRefAttached=%s inputRefAttached=%s anchorById=%s inputById=%s',
          String(selectedTicketId || ''),
          String(isEstimateMode),
          String(isLuxContentSprintTicketSelected),
          Boolean(luxAttachmentUploadSectionRef.current),
          Boolean(luxAttachmentUploadInputRef.current),
          typeof document !== 'undefined'
            ? Boolean(document.getElementById('lux-ticket-attachment-upload'))
            : 'no-document',
          typeof document !== 'undefined'
            ? Boolean(document.getElementById('lux-ticket-attachment-upload-input'))
            : 'no-document',
        );
      } catch {
        // logging is best-effort.
      }
      setUploadStatus(
        'Upload area is not available right now. Try reloading /change with this ticket open. If the problem persists, contact the operator on duty.',
      );
      setUploadStatusKind('error');
      try {
        window?.alert?.(
          'Upload area is not available right now. Try reloading /change with this ticket open.',
        );
      } catch {
        // alert is best-effort and may be blocked in some environments.
      }
      return;
    }
    if (section) {
      try {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        try {
          section.scrollIntoView();
        } catch {
          // No DOM access (SSR or restrictive test envs) — focus + click below still fire.
        }
      }
    }
    try {
      input.focus({ preventScroll: true });
    } catch {
      try {
        input.focus();
      } catch {
        // Focus failures are non-fatal; the section has scrolled into view.
      }
    }
    // Option (b) from the brief: trigger the native file picker directly. Browsers
    // allow `input.click()` on a file input only inside the same user gesture, and
    // `handleSprintUploadContentClick` IS that user gesture, so the picker opens
    // synchronously. Wrapped in try/catch so a restrictive environment falls back
    // to scroll + focus (option (a)) without throwing. `foundVia` is referenced so
    // bundlers don't tree-shake the variable; it's also useful when debugging.
    try {
      input.click();
    } catch {
      // No-op: the section has already scrolled into view and the input is focused.
    }
    if (foundVia !== 'ref') {
      try {
        // eslint-disable-next-line no-console
        console.warn('[lux-upload] used DOM fallback (%s) to reach upload input', foundVia);
      } catch {
        // logging is best-effort.
      }
    }
  }

  async function loadAttachmentsForTicket(tid) {
    const id = String(tid || '').trim();
    if (!id) {
      setAttachments([]);
      setAttachmentsTicketId('');
      return [];
    }
    setAttachmentsBusy(true);
    setAttachmentsError('');
    try {
      const r = await fetch('/api/change-attachment/list?ticket_id=' + encodeURIComponent(id), {
        credentials: 'include',
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) {
          setAttachmentsError('Your session expired. Please refresh and log in again.');
        } else if (r.status === 404) {
          setAttachmentsError('Ticket not found, or attachment access is denied for this tenant.');
        } else {
          setAttachmentsError(String(j?.error || j?.detail || j?.hint || `http_${r.status}`));
        }
        setAttachments([]);
        setAttachmentsTicketId(id);
        return [];
      }
      const rows = Array.isArray(j.attachments) ? j.attachments : [];
      setAttachments(rows);
      setAttachmentsTicketId(id);
      return rows;
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
      setAttachments([]);
      setAttachmentsTicketId(id);
      return [];
    } finally {
      setAttachmentsBusy(false);
    }
  }

  async function loadLuxMediaLibrary() {
    if (!luxLeadCrmEnabled) return;
    setLuxMediaLibBusy(true);
    setLuxMediaLibErr('');
    try {
      const qs = new URLSearchParams();
      if (luxMediaLibSearch.trim()) qs.set('q', luxMediaLibSearch.trim());
      if (luxMediaLibSlug.trim()) qs.set('property_slug', luxMediaLibSlug.trim());
      if (luxMediaLibSlot.trim()) qs.set('slot', luxMediaLibSlot.trim());
      if (luxMediaLibMediaType.trim()) qs.set('media_type', luxMediaLibMediaType.trim());
      if (luxMediaLibFilter.trim()) qs.set('filter', luxMediaLibFilter.trim());
      const r = await fetch(`/api/lux/operator-media-library?${qs.toString()}`, { credentials: 'include' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j?.error || j?.detail || `http_${r.status}`));
      setLuxMediaLibRows(Array.isArray(j.rows) ? j.rows : []);
    } catch (e) {
      setLuxMediaLibErr(String(e?.message || e));
      setLuxMediaLibRows([]);
    } finally {
      setLuxMediaLibBusy(false);
    }
  }

  async function submitAttachmentVideoGovernance(attachmentId, body) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    if (!tid || !aid) return;
    setAttachmentVideoGovBusyId(aid);
    setAttachmentsError('');
    try {
      const r = await fetch('/api/cmp/router?action=lux-attachment-video-governance-set', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid, attachment_id: aid, ...body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      if (j?.attachment) {
        setAttachments((prev) => prev.map((row) => (row.attachment_id === aid ? j.attachment : row)));
      }
      await loadAttachmentsForTicket(tid);
      if (luxMediaLibOpen) await loadLuxMediaLibrary();
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentVideoGovBusyId('');
    }
  }

  async function submitAttachmentEditorialSuggestion(attachmentId, body) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    if (!tid || !aid) return;
    setAttachmentEditorialBusyId(aid);
    setAttachmentsError('');
    try {
      const r = await fetch('/api/cmp/router?action=lux-attachment-editorial-suggestion-set', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid, attachment_id: aid, ...body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      if (j?.attachment) {
        setAttachments((prev) => prev.map((row) => (row.attachment_id === aid ? j.attachment : row)));
      }
      await loadAttachmentsForTicket(tid);
      if (luxMediaLibOpen) await loadLuxMediaLibrary();
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentEditorialBusyId('');
    }
  }

  async function submitAttachmentReview(attachmentId, reviewStatus) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    if (!tid || !aid) return;
    setAttachmentReviewBusyId(aid);
    setAttachmentsError('');
    try {
      const note = (attachmentReviewNoteDrafts && attachmentReviewNoteDrafts[aid]) || '';
      const r = await fetch('/api/cmp/router?action=lux-attachment-review-set', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: tid,
          attachment_id: aid,
          review_status: reviewStatus,
          review_note: String(note || '').trim() || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      // Optimistic local update from server response, then refresh to be safe.
      if (j?.attachment) {
        setAttachments((prev) => prev.map((row) => (row.attachment_id === aid ? j.attachment : row)));
      }
      await loadAttachmentsForTicket(tid);
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentReviewBusyId('');
    }
  }

  async function submitAttachmentPropertyLink(attachmentId) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    if (!tid || !aid) return;
    setAttachmentLinkBusyId(aid);
    setAttachmentsError('');
    try {
      const propertySlug = String((attachmentLinkSlugDrafts && attachmentLinkSlugDrafts[aid]) || '').trim();
      const intendedSlot = String((attachmentLinkSlotDrafts && attachmentLinkSlotDrafts[aid]) || '').trim();
      const linkNote = String((attachmentLinkNoteDrafts && attachmentLinkNoteDrafts[aid]) || '').trim();
      const r = await fetch('/api/cmp/router?action=lux-attachment-property-link-set', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: tid,
          attachment_id: aid,
          property_slug: propertySlug,
          intended_slot: intendedSlot,
          link_note: linkNote || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      await loadAttachmentsForTicket(tid);
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentLinkBusyId('');
    }
  }

  async function submitAttachmentPropertyUnlink(attachmentId, propertySlug, intendedSlot) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    if (!tid || !aid) return;
    setAttachmentLinkBusyId(aid);
    setAttachmentsError('');
    try {
      const r = await fetch('/api/cmp/router?action=lux-attachment-property-link-remove', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: tid,
          attachment_id: aid,
          property_slug: String(propertySlug || '').trim(),
          intended_slot: String(intendedSlot || '').trim(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      await loadAttachmentsForTicket(tid);
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentLinkBusyId('');
    }
  }

  function attachmentPublishDraftKey(attachmentId, propertySlug, intendedSlot) {
    return `${String(attachmentId || '').trim()}|${String(propertySlug || '').trim()}|${String(intendedSlot || '').trim()}`;
  }

  async function submitAttachmentPropertyPublish(attachmentId, propertySlug, intendedSlot) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    const slug = String(propertySlug || '').trim();
    const slot = String(intendedSlot || '').trim();
    const pubKey = attachmentPublishDraftKey(aid, slug, slot);
    if (!tid || !aid || !slug || !slot) return;
    setAttachmentPublishBusyKey(pubKey);
    setAttachmentsError('');
    try {
      const capDraft = attachmentPublishCaptionDrafts[pubKey];
      const altDraft = attachmentPublishAltDrafts[pubKey];
      const slotLower = String(slot).toLowerCase();
      const publishBody = {
        ticket_id: tid,
        attachment_id: aid,
        property_slug: slug,
        intended_slot: slot,
        public_caption: capDraft != null ? String(capDraft) : null,
        public_alt_text: altDraft != null ? String(altDraft) : null,
      };
      if (slotLower === 'gallery') {
        const ord = attachmentGalleryOrderDrafts[pubKey];
        if (ord != null && String(ord).trim() !== '') {
          const n = Number.parseInt(String(ord).trim(), 10);
          if (Number.isFinite(n)) publishBody.gallery_order = n;
        }
        publishBody.is_gallery_cover = attachmentGalleryCoverDrafts[pubKey] === true;
      }
      const r = await fetch('/api/cmp/router?action=lux-attachment-property-publish', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishBody),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      await loadAttachmentsForTicket(tid);
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentPublishBusyKey('');
    }
  }

  async function submitAttachmentPropertyUnpublish(attachmentId, propertySlug, intendedSlot) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    const slug = String(propertySlug || '').trim();
    const slot = String(intendedSlot || '').trim();
    const pubKey = attachmentPublishDraftKey(aid, slug, slot);
    if (!tid || !aid || !slug || !slot) return;
    setAttachmentPublishBusyKey(pubKey);
    setAttachmentsError('');
    try {
      const r = await fetch('/api/cmp/router?action=lux-attachment-property-unpublish', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: tid,
          attachment_id: aid,
          property_slug: slug,
          intended_slot: slot,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      await loadAttachmentsForTicket(tid);
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentPublishBusyKey('');
    }
  }

  async function submitAttachmentArchive(attachmentId, opts) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    if (!tid || !aid) return;
    setAttachmentArchiveBusyId(aid);
    setAttachmentsError('');
    try {
      const override =
        opts && typeof opts === 'object' && opts.archiveReason != null ? String(opts.archiveReason).trim() : '';
      const fromDraft = (attachmentArchiveReasonDrafts && attachmentArchiveReasonDrafts[aid]) || '';
      const reasonRaw = override || fromDraft;
      const r = await fetch('/api/cmp/router?action=lux-attachment-archive', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: tid,
          attachment_id: aid,
          archive_reason: String(reasonRaw || '').trim() || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      await loadAttachmentsForTicket(tid);
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentArchiveBusyId('');
    }
  }

  async function submitAttachmentRestore(attachmentId) {
    const tid = String(selectedTicketId || '').trim();
    const aid = String(attachmentId || '').trim();
    if (!tid || !aid) return;
    setAttachmentRestoreBusyId(aid);
    setAttachmentsError('');
    try {
      const r = await fetch('/api/cmp/router?action=lux-attachment-restore', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: tid,
          attachment_id: aid,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      await loadAttachmentsForTicket(tid);
    } catch (e) {
      setAttachmentsError(String(e?.message || e));
    } finally {
      setAttachmentRestoreBusyId('');
    }
  }

  async function submitLuxRequest() {
    if (!luxLeadCrmEnabled) return;
    if (luxReqBusy) return;
    setLuxReqBusy(true);
    setLuxReqStatus('');
    try {
      const title = String(luxReqTitle || '').trim();
      const description = String(luxReqDesc || '').trim();
      if (!title) {
        setLuxReqStatus('Title is required.');
        return;
      }
      if (!description) {
        setLuxReqStatus('Description is required.');
        return;
      }
      const body = {
        request_type: luxReqType,
        title,
        description,
        priority: luxReqPriority,
        property_reference: String(luxReqPropertyRef || '').trim() || null,
      };
      const r = await fetch('/api/cmp/router?action=lux-client-request-create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || j?.detail || j?.hint || '').trim();
        if (r.status === 403 && msg.toLowerCase().includes('dormant gate')) {
          throw new Error('Your session expired. Please refresh and log in again.');
        }
        throw new Error(msg || `http_${r.status}`);
      }
      setLuxReqStatus('Request created successfully.');
      setLuxReqTitle('');
      setLuxReqDesc('');
      setLuxReqPropertyRef('');
      await loadLuxRelatedRequests();
      const rows = await loadQueue();
      const createdId = j?.request?.ticket_id ? String(j.request.ticket_id) : '';
      if (createdId && rows.some((x) => String(x.ticket_id) === createdId)) {
        setSelectedTicketId(createdId);
        await loadTicketById(createdId);
      }
    } catch (e) {
      setLuxReqStatus(String(e?.message || e));
    } finally {
      setLuxReqBusy(false);
    }
  }

  function clearLuxRequestForm() {
    setLuxReqType('website_refinement');
    setLuxReqTitle('');
    setLuxReqDesc('');
    setLuxReqPropertyRef('');
    setLuxReqPriority('Normal');
    setLuxReqStatus('');
  }

  const luxLeadCrmEnabled = useMemo(() => {
    return (
      session.logged_in === true &&
      String(session.level || '').toLowerCase() === 'tenant' &&
      String(session.tenant_id || '').trim() === 'luxe-maurice'
    );
  }, [session.logged_in, session.level, session.tenant_id]);

  const luxChangeChrome = useMemo(
    () => (luxLeadCrmEnabled ? buildLuxChangeConsoleChrome() : null),
    [luxLeadCrmEnabled],
  );
  const luxQueueGrouped = useMemo(() => groupLuxOperatorQueueTickets(tickets), [tickets]);
  const [luxQueueTestsOpen, setLuxQueueTestsOpen] = useState(false);
  const [luxQueueInternalOpen, setLuxQueueInternalOpen] = useState(false);
  const [luxHideArchivedSmoke, setLuxHideArchivedSmoke] = useState(true);

  const selectedTicketIsArchivedSmoke = useMemo(() => {
    if (!selectedTicketId) return false;
    return luxQueueGrouped.archivedSmoke.some((t) => String(t.ticket_id || '') === String(selectedTicketId));
  }, [luxQueueGrouped.archivedSmoke, selectedTicketId]);

  useEffect(() => {
    if (!luxChangeChrome || !selectedTicketId) return;
    if (selectedTicketIsArchivedSmoke) setLuxHideArchivedSmoke(false);
  }, [luxChangeChrome, selectedTicketId, selectedTicketIsArchivedSmoke]);

  // LuxeMaurice Content Population Sprint detection — drives the Add content panel
  // and the collapsed Advanced workflow state controls. Server-side `ticket-get`
  // returns `ticket.lux_sprint_meta` with `sprint_code` for sprint children only
  // (no raw console_json exposure required).
  const luxSprintMeta = useMemo(() => {
    const meta = ticket && ticket.lux_sprint_meta && typeof ticket.lux_sprint_meta === 'object' ? ticket.lux_sprint_meta : null;
    if (!meta) return null;
    const code = normalizeLuxContentSprintCode(meta.sprint_code);
    return code ? { ...meta, sprint_code: code } : null;
  }, [ticket]);

  const isLuxContentSprintTicketSelected = useMemo(
    () => isLuxContentSprintTicket(luxSprintMeta),
    [luxSprintMeta],
  );

  // The operator-facing view of leads. Default-excludes `system_generated` rows
  // so the LEADS · New strip + visible list only count real concierge leads. Toggle
  // `crmShowSystemGenerated` to include them when auditing.
  const operatorViewLeads = useMemo(() => {
    if (!luxLeadCrmEnabled) return leads;
    if (crmShowSystemGenerated) return leads;
    return leads.filter((lead) => lead?.system_generated !== true);
  }, [leads, luxLeadCrmEnabled, crmShowSystemGenerated]);

  const systemGeneratedLeadCount = useMemo(() => {
    if (!luxLeadCrmEnabled) return 0;
    return leads.reduce((n, l) => (l?.system_generated === true ? n + 1 : n), 0);
  }, [leads, luxLeadCrmEnabled]);

  const crmStageCounts = useMemo(() => {
    const base = Object.fromEntries(LUX_LEAD_CRM_STAGES.map((s) => [s, 0]));
    if (!luxLeadCrmEnabled) return base;
    for (const lead of operatorViewLeads) {
      const st = lead?.operator_workflow?.stage;
      if (st && base[st] !== undefined) base[st] += 1;
    }
    return base;
  }, [operatorViewLeads, luxLeadCrmEnabled]);

  const crmOwnerHints = useMemo(() => {
    if (!luxLeadCrmEnabled) return [];
    const s = new Set();
    for (const lead of operatorViewLeads) {
      const u = lead?.operator_workflow?.owner?.username;
      if (u) s.add(String(u).trim());
    }
    return [...s].sort().slice(0, 40);
  }, [operatorViewLeads, luxLeadCrmEnabled]);

  const crmVisibleLeads = useMemo(() => {
    if (!luxLeadCrmEnabled) return operatorViewLeads;
    const ownerQ = String(crmFilterOwner || '').trim().toLowerCase();
    const propQ = String(crmFilterProperty || '').trim().toLowerCase();
    return operatorViewLeads.filter((lead) => {
      const ow = lead.operator_workflow;
      if (!ow) return true;
      if (crmFilterStage !== 'all' && String(ow.stage || '') !== crmFilterStage) return false;
      if (ownerQ) {
        const un = ow.owner?.username != null ? String(ow.owner.username).toLowerCase() : '';
        if (!un.includes(ownerQ)) return false;
      }
      if (propQ) {
        const slug = lead.property_interest?.slug != null ? String(lead.property_interest.slug).toLowerCase() : '';
        const title = lead.property_interest?.title != null ? String(lead.property_interest.title).toLowerCase() : '';
        const listing = lead.listing != null ? String(lead.listing).toLowerCase() : '';
        if (!slug.includes(propQ) && !title.includes(propQ) && !listing.includes(propQ)) return false;
      }
      if (crmFilterHealth === 'overdue_follow_up' && !ow.overdue_follow_up) return false;
      if (crmFilterHealth === 'stale_lead' && !ow.stale_lead) return false;
      if (crmFilterHealth === 'untouched_new' && !ow.untouched_new) return false;
      return true;
    });
  }, [
    operatorViewLeads,
    luxLeadCrmEnabled,
    crmFilterStage,
    crmFilterOwner,
    crmFilterProperty,
    crmFilterHealth,
  ]);

  const selectedLead = useMemo(
    () => leads.find((x) => String(x.id || '') === String(selectedLeadId || '')) || null,
    [leads, selectedLeadId],
  );

  useEffect(() => {
    if (!luxLeadCrmEnabled || !selectedLead?.operator_workflow) return;
    const ow = selectedLead.operator_workflow;
    setLeadStageDraft(String(ow.stage || 'new'));
    setLeadFollowDraft(ow.follow_up_status != null ? String(ow.follow_up_status) : '');
    setLeadOwnerDraft(ow.owner?.username != null ? String(ow.owner.username) : '');
    setLeadNextActionDraft(isoToDatetimeLocalValue(ow.next_action_at));
    setLeadNextActionNoteDraft(ow.next_action_note != null ? String(ow.next_action_note) : '');
    setLeadNoteDraft('');
  }, [
    luxLeadCrmEnabled,
    selectedLeadId,
    selectedLead?.operator_workflow?.stage,
    selectedLead?.operator_workflow?.follow_up_status,
    selectedLead?.operator_workflow?.owner?.username,
    selectedLead?.operator_workflow?.next_action_at,
    selectedLead?.operator_workflow?.next_action_note,
  ]);

  function intentLabel(intentVal) {
    const i = String(intentVal || '').trim();
    if (i === 'lux_property_enquiry') return 'Property enquiry';
    if (i === 'ai_concierge_lite') return 'Concierge (general)';
    return i || '—';
  }

  function discoveryLabel(ds) {
    if (String(ds || '') === 'feed') return 'Explore (feed preview)';
    if (String(ds || '') === 'manual_curated') return 'Manual (curated)';
    if (String(ds || '') === 'curated') return 'Featured (curated)';
    if (String(ds || '') === 'lux_postgres') return 'Private showcase';
    return ds ? String(ds) : '—';
  }

  async function applyLuxLeadOperatorPatch() {
    const id = String(selectedLeadId || '').trim();
    if (!id || !luxLeadCrmEnabled) return;
    setLeadPatchBusy(true);
    setLeadPatchStatus('');
    try {
      const ow = selectedLead?.operator_workflow;
      const curStage = ow ? String(ow.stage || 'new') : 'new';
      const curFollow = ow?.follow_up_status != null ? String(ow.follow_up_status) : '';
      const curOwner = ow?.owner?.username != null ? String(ow.owner.username) : '';
      const stageChanged = String(leadStageDraft || '') !== curStage;
      const followChanged = String(leadFollowDraft || '') !== curFollow;
      const ownerChanged = String(leadOwnerDraft || '').trim() !== curOwner;
      const noteTrim = String(leadNoteDraft || '').trim();
      const prevDtLocal = isoToDatetimeLocalValue(ow?.next_action_at);
      const nextActionChanged = String(leadNextActionDraft || '').trim() !== String(prevDtLocal || '').trim();
      const curNextNote = ow?.next_action_note != null ? String(ow.next_action_note) : '';
      const nextNoteChanged = String(leadNextActionNoteDraft || '').trim() !== curNextNote.trim();
      const body = { lead_id: id };
      if (stageChanged) body.stage = leadStageDraft;
      if (followChanged) body.follow_up_status = leadFollowDraft;
      if (ownerChanged) body.assign_owner = String(leadOwnerDraft || '').trim();
      if (noteTrim) body.note = noteTrim;
      if (nextActionChanged) {
        const trimDt = String(leadNextActionDraft || '').trim();
        if (!trimDt) body.next_action_at = null;
        else {
          const d = new Date(trimDt);
          if (Number.isNaN(d.getTime())) {
            setLeadPatchStatus('Invalid next action date/time.');
            return;
          }
          body.next_action_at = d.toISOString();
        }
      }
      if (nextNoteChanged) body.next_action_note = String(leadNextActionNoteDraft || '').trim();
      if (
        !body.stage &&
        body.follow_up_status === undefined &&
        !body.note &&
        body.assign_owner === undefined &&
        body.next_action_at === undefined &&
        body.next_action_note === undefined
      ) {
        setLeadPatchStatus('Nothing to save.');
        return;
      }
      const r = await fetch('/api/cmp/router?action=concierge-lead-operator-patch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      setLeadPatchStatus('Saved.');
      setLeadNoteDraft('');
      await loadLeads();
    } catch (e) {
      setLeadPatchStatus(String(e?.message || e));
    } finally {
      setLeadPatchBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const ctx = await refreshUiContext();
        if (cancelled) return;
        const loggedIn = ctx?.session?.logged_in === true;
        const isLuxTenant =
          loggedIn &&
          String(ctx?.session?.level || '').toLowerCase() === 'tenant' &&
          String(ctx?.session?.tenant_id || '').trim() === 'luxe-maurice';
        const isTenantScoped =
          loggedIn &&
          String(ctx?.session?.level || '').toLowerCase() === 'tenant' &&
          String(ctx?.session?.tenant_id || '').trim().length > 0;
        const shouldLoadQueue = loggedIn && (ctx?.surface === 'core' || isTenantScoped);
        if (!shouldLoadQueue) return;

        const rows = await loadQueue();
        if (cancelled) return;
        if (isLuxTenant) await loadLeads();
        if (isLuxTenant) await loadLuxRelatedRequests();
        if (cancelled) return;
        const first = rows[0]?.ticket_id ? String(rows[0].ticket_id) : '';
        if (first) {
          setSelectedTicketId(first);
          await loadTicketById(first);
        }
      } catch (e) {
        if (cancelled) return;
        setError(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setRequestDraft('');
      return;
    }
    if (!ticket) return;
    if (String(ticket.ticket_id || '').trim() !== selectedTicketId) return;
    const d = ticket.description != null ? String(ticket.description) : '';
    setRequestDraft(d);
  }, [selectedTicketId, ticket]);

  useEffect(() => {
    const tid = String(selectedTicketId || '').trim();
    if (!tid) {
      setAttachments([]);
      setAttachmentsTicketId('');
      setAttachmentsError('');
      return;
    }
    if (attachmentsTicketId === tid) return;
    void loadAttachmentsForTicket(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId]);

  useEffect(() => {
    setAttachmentOperatorFilter('all');
  }, [selectedTicketId]);

  async function onSelectTicket(id) {
    setError('');
    setIntakeNotice('');
    setEstimateStatus('');
    setForceRefine(false);
    setClientDecisionLink('');
    setClientDecisionExpiresAt('');
    setClientDecisionStatus('');
    const tid = String(id || '').trim();
    if (!tid) return;
    setSelectedTicketId(tid);
    try {
      await loadTicketById(tid);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  async function saveIntakeContinue() {
    const tid = String(selectedTicketId || '').trim();
    if (!tid) {
      setError('Select a ticket first.');
      return;
    }
    const msg = String(requestDraft || '').trim();
    if (!msg) {
      setError('Add a short description of your request first.');
      return;
    }
    setBusy(true);
    setError('');
    setIntakeNotice('');
    try {
      const r = await fetch('/api/cmp/router?action=change-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid, message: msg, locale }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      await loadTicketById(tid);
      setIntakeNotice('Saved. Your wording is stored on this ticket for the team to review.');
      window.setTimeout(() => setIntakeNotice(''), 5000);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function requestEstimate() {
    const tid = String(selectedTicketId || '').trim();
    if (!tid) {
      setError('Select a ticket first.');
      return;
    }
    const desc = String(ticket?.description || requestDraft || '').trim();
    if (!desc) {
      setError('A short description is required before we can estimate.');
      return;
    }
    setEstimateBusy(true);
    setError('');
    setEstimateStatus('');
    try {
      const r = await fetch('/api/cmp/router?action=costing-preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid, description: desc, locale }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      setEstimateStatus('Estimate saved.');
      await loadTicketById(tid);
      window.setTimeout(() => setEstimateStatus(''), 5000);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setEstimateBusy(false);
    }
  }

  async function proceedAfterEstimate() {
    const tid = String(selectedTicketId || '').trim();
    if (!tid) {
      setError('Select a ticket first.');
      return;
    }
    const desc = String(ticket?.description || requestDraft || '').trim();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/cmp/router?action=approve-build', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid, description: desc, locale }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      await loadTicketById(tid);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function mintClientDecisionLink() {
    const tid = String(selectedTicketId || '').trim();
    if (!tid) return;
    setClientDecisionBusy(true);
    setClientDecisionLink('');
    setClientDecisionExpiresAt('');
    setClientDecisionStatus('Generating link…');
    try {
      const r = await fetch('/api/cmp/router?action=client-decisions-link-mint', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      const url = String(j.magic_link_url || '').trim();
      const exp = String(j.expires_at || '').trim();
      if (!url) throw new Error('magic_link_url missing');
      setClientDecisionLink(url);
      setClientDecisionExpiresAt(exp);
      setClientDecisionStatus('Link ready.');
    } catch (e) {
      setClientDecisionStatus(String(e?.message || e));
    } finally {
      setClientDecisionBusy(false);
    }
  }

  async function copyToClipboard(text) {
    const v = String(text || '');
    if (!v) return false;
    try {
      await navigator.clipboard.writeText(v);
      return true;
    } catch {
      return false;
    }
  }

  const wf = ticket?.ticket_progress?.client_view?.workflow_state || '';
  const needClientDecision = String(wf || '').trim() === 'awaiting_client_programme_decisions';
  const wfLabel = ticket ? workflowLabel(String(wf || '')) : '—';
  const wfKey = String(wf || '').trim().toLowerCase();
  const isReadyForEstimateOnly = wfKey === 'ready_for_estimate';
  const isEstimatedWorkflow = wfKey === 'estimated';
  const isEstimateMode = isReadyForEstimateOnly || isEstimatedWorkflow;
  const cv = ticket?.ticket_progress?.client_view && typeof ticket.ticket_progress.client_view === 'object'
    ? ticket.ticket_progress.client_view
    : {};
  const hasEstimate = Boolean(
    cv?.last_estimate_at ||
      cv?.actual_cost_to_client_usd != null ||
      cv?.market_reference_usd != null ||
      cv?.effort_hours_low != null ||
      cv?.effort_hours_high != null
  );

  const approvedBuild =
    String(ticket?.status || '').trim().toLowerCase() === 'approved' &&
    String(ticket?.stage || '').trim().toLowerCase() === 'build';
  const luxPhase1ReviewDone = ticket?.client_decisions_summary?.sufficient_to_proceed === true;
  const showLuxPhase1ReviewPanel =
    String(selectedTicketId || '').trim() === LUX_PHASE1_REVIEW_TICKET_ID && approvedBuild && !luxPhase1ReviewDone;
  const showGenericClientDecisionPanel =
    needClientDecision &&
    String(selectedTicketId || '').trim() !== LUX_PHASE1_REVIEW_TICKET_ID &&
    approvedBuild;
  const showLuxPhase1ReviewComplete =
    String(selectedTicketId || '').trim() === LUX_PHASE1_REVIEW_TICKET_ID && approvedBuild && luxPhase1ReviewDone;

  const showIntakeSkin = Boolean(selectedTicketId && ticket && computeIsIntakeUx(ticket));
  const showIntakeSurface = showIntakeSkin || forceRefine;
  const workflowStageLabel = ticket ? wfLabel : '—';

  const pageInner = luxChangeChrome
    ? { ...luxChangeChrome.pageInner }
    : {
        fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
        padding: 24,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        color: '#e2e8f0',
      };

  const card = luxChangeChrome
    ? { ...luxChangeChrome.card }
    : changePanelStyle({
        border: '1px solid rgba(148,163,184,0.25)',
        borderRadius: 16,
        background: 'rgba(2,6,23,0.55)',
        padding: 16,
      });

  const subtleCard = luxChangeChrome
    ? { ...luxChangeChrome.subtleCard }
    : changePanelStyle({
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: 16,
        background: 'rgba(2,6,23,0.45)',
        padding: 16,
      });

  const luxInk = luxChangeChrome
    ? {
        label: luxChangeChrome.textLabel,
        body: luxChangeChrome.text,
        muted: luxChangeChrome.textMuted,
        borderHairline: luxChangeChrome.border,
      }
    : null;

  const dollarsOur = cv?.actual_cost_to_client_usd ?? cv?.display_amount_usd ?? null;
  const dollarsMarket = cv?.market_reference_usd ?? cv?.full_market_value_usd ?? null;
  const hoursBand = formatHoursBand(cv?.effort_hours_low, cv?.effort_hours_high);
  const ourUsd = formatUsd(dollarsOur);
  const marketUsd = formatUsd(dollarsMarket);

  const isTenantClient =
    session.logged_in === true && String(session.level || '').toLowerCase() === 'tenant' && !!session.tenant_id;
  const billingExempt = uiContext?.billing_exempt === true;
  const creditBal = typeof uiContext?.token_credit_balance_usd === 'number' ? uiContext.token_credit_balance_usd : null;
  const budgetAvailable = isTenantClient && !billingExempt && creditBal != null && creditBal > 0;
  const budgetUnknown = isTenantClient && !billingExempt && creditBal == null;
  const clientTypeLabel = !isTenantClient
    ? 'Provider / internal'
    : billingExempt
      ? 'Non-billing / partner'
      : budgetAvailable
        ? 'Standard Billing Client'
        : 'Billing Client';

  const canProceed = Boolean(
    session.logged_in === true &&
      (String(session.level || '').toLowerCase() === 'admin' || uiContext?.show_approve_build === true),
  );

  useLayoutEffect(() => {
    if (!layoutDebugEnabled || typeof window === 'undefined') {
      layoutOutlineCleanupRef.current();
      layoutOutlineCleanupRef.current = () => {};
      setLayoutDebugSnapshot(null);
      return undefined;
    }

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;

    const run = () => {
      if (cancelled) return;
      const root = changeRootRef.current;
      if (!root) return;

      layoutOutlineCleanupRef.current();
      layoutOutlineCleanupRef.current = () => {};

      const scan = scanHorizontalOverflow(root, window);
      const snapshot = {
        innerWidth: scan.innerWidth,
        docScrollWidth: scan.docScrollWidth,
        docClientWidth: scan.docClientWidth,
        items: scan.items.map(({ element: _el, ...rest }) => rest),
      };
      setLayoutDebugSnapshot(snapshot);

      try {
        console.info('[layoutDebug]', snapshot);
      } catch {
        /* ignore */
      }

      try {
        const cs = window.getComputedStyle(root);
        console.info('[layoutDebug] changeRoot computed', {
          display: cs.display,
          width: cs.width,
          minWidth: cs.minWidth,
          maxWidth: cs.maxWidth,
          overflowX: cs.overflowX,
          whiteSpace: cs.whiteSpace,
        });
      } catch {
        /* ignore */
      }

      const touched = [];
      for (const it of scan.items) {
        const el = it.element;
        touched.push({ el, o: el.style.outline, oo: el.style.outlineOffset });
        if (it.widerThanViewport) {
          el.style.outline = '3px solid rgba(239,68,68,0.95)';
        } else {
          el.style.outline = '2px solid rgba(249,115,22,0.95)';
        }
        el.style.outlineOffset = '1px';
      }
      layoutOutlineCleanupRef.current = () => {
        for (const t of touched) {
          t.el.style.outline = t.o;
          t.el.style.outlineOffset = t.oo;
        }
      };
    };

    const schedule = () => {
      raf1 = window.requestAnimationFrame(() => {
        run();
        raf2 = window.requestAnimationFrame(run);
      });
    };

    schedule();
    const onResize = () => schedule();
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.removeEventListener('resize', onResize);
      layoutOutlineCleanupRef.current();
      layoutOutlineCleanupRef.current = () => {};
    };
  }, [
    layoutDebugEnabled,
    router.isReady,
    selectedTicketId,
    ticket,
    leads,
    luxRequests,
    showIntakeSurface,
    isEstimateMode,
    forceRefine,
    clientDecisionLink,
    error,
    busy,
  ]);

  return (
    <div ref={changeRootRef} style={luxChangeChrome ? luxChangeChrome.shellStyle() : changePageShellStyle({ background: '#020617', minHeight: '100vh' })}>
      <div style={pageInner}>
      {showChangeDebugBanner ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(251,191,36,0.45)',
            background: 'rgba(251,191,36,0.08)',
            fontSize: 11,
            color: '#fef3c7',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            ...changeTextContainStyle({ whiteSpace: 'pre-wrap' }),
          }}
        >
          {JSON.stringify(
            {
              layout_fix_version: CHANGE_LAYOUT_MARK_VERSION,
              layout_instrumentation_id: CHANGE_LAYOUT_INSTRUMENTATION_ID,
              expected_commit_prefix: CHANGE_LAYOUT_EXPECTED_COMMIT_PREFIX,
              vercel_sha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null,
              node_env: process.env.NODE_ENV,
            },
            null,
            2,
          )}
        </div>
      ) : null}
      <div style={{ marginBottom: 14 }}>
        {luxChangeChrome ? (
          <>
            <div style={{ fontFamily: luxChangeChrome.fontDisplay, fontSize: 28, fontWeight: 700, color: luxChangeChrome.heroDeep }}>
              LuxeMaurice · Change Console
            </div>
            <div style={{ marginTop: 8, color: luxChangeChrome.textMuted, fontSize: 14, lineHeight: 1.55 }}>
              Operator workspace on Lux — same programme as the public site and property desk. Pick a ticket, then use one
              governed action at a time.
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <a
                href="/properties"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${luxChangeChrome.gold}`,
                  color: luxChangeChrome.gold,
                  fontWeight: 800,
                  fontSize: 12,
                  textDecoration: 'none',
                  background: luxChangeChrome.white,
                }}
              >
                Public /properties
              </a>
              <a
                href="/properties/admin"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${luxChangeChrome.gold}`,
                  color: luxChangeChrome.gold,
                  fontWeight: 800,
                  fontSize: 12,
                  textDecoration: 'none',
                  background: luxChangeChrome.white,
                }}
              >
                Property editor
              </a>
              <a
                href="/concierge"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${luxChangeChrome.border}`,
                  color: luxChangeChrome.text,
                  fontWeight: 750,
                  fontSize: 12,
                  textDecoration: 'none',
                  background: luxChangeChrome.sand,
                }}
              >
                Concierge
              </a>
              {luxOperatorPropertySlugHint ? (
                <>
                  <a
                    href={`/property/${encodeURIComponent(luxOperatorPropertySlugHint)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: `1px solid ${luxChangeChrome.border}`,
                      color: luxChangeChrome.heroDeep,
                      fontWeight: 800,
                      fontSize: 12,
                      textDecoration: 'none',
                      background: luxChangeChrome.white,
                    }}
                  >
                    Listing · {luxOperatorPropertySlugHint}
                  </a>
                  <a
                    href={`/property/${encodeURIComponent(luxOperatorPropertySlugHint)}?preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: `1px solid ${luxChangeChrome.border}`,
                      color: luxChangeChrome.text,
                      fontWeight: 750,
                      fontSize: 12,
                      textDecoration: 'none',
                      background: luxChangeChrome.sand,
                    }}
                  >
                    Preview (staff)
                  </a>
                </>
              ) : null}
              <a
                href="#lux-media-workspace"
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${luxChangeChrome.border}`,
                  color: luxChangeChrome.text,
                  fontWeight: 750,
                  fontSize: 12,
                  textDecoration: 'none',
                  background: luxChangeChrome.white,
                }}
              >
                Media workspace
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 950, color: '#f8fafc' }}>Change Console</div>
            <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13, lineHeight: 1.45 }}>
              Operator workspace: open, select a ticket, take one governed action.
            </div>
          </>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)',
          gap: 14,
          width: '100%',
          minWidth: 0,
        }}
      >
        <div style={{ ...card, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: luxChangeChrome ? luxChangeChrome.textLabel : '#cbd5e1',
                letterSpacing: '0.08em',
              }}
            >
              OPERATOR QUEUE
            </div>
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const ctx = await refreshUiContext();
                  const rows = await loadQueue();
                  const isLuxTenant =
                    ctx?.session?.logged_in === true &&
                    String(ctx?.session?.level || '').toLowerCase() === 'tenant' &&
                    String(ctx?.session?.tenant_id || '').trim() === 'luxe-maurice';
                  if (isLuxTenant) await loadLeads();
                  if (isLuxTenant) await loadLuxRelatedRequests();
                  const first = rows[0]?.ticket_id ? String(rows[0].ticket_id) : '';
                  if (!selectedTicketId && first) await onSelectTicket(first);
                } catch (e) {
                  setError(String(e?.message || e));
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              style={
                luxChangeChrome
                  ? luxChangeChrome.refreshBtn(busy)
                  : {
                      padding: '6px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(15,23,42,0.35)',
                      color: '#e2e8f0',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }
              }
            >
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: luxChangeChrome ? luxChangeChrome.textMuted : '#94a3b8' }}>
            {session.logged_in ? (
              <span>
                Session: <strong style={{ color: luxChangeChrome ? luxChangeChrome.text : '#e2e8f0' }}>{String(session.level || '')}</strong>
                {session.tenant_id ? (
                  <span>
                    {' '}
                    ({String(session.tenant_id)})
                  </span>
                ) : null}
              </span>
            ) : (
              <span>
                Not logged in. <a href="/login" style={{ color: luxChangeChrome ? luxChangeChrome.link : '#7dd3fc' }}>Login</a>
              </span>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {tickets.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {!luxChangeChrome ? (
                  tickets.map((t) => {
                    const id = String(t.ticket_id || '');
                    return (
                      <ChangeQueueTicketRow
                        key={id || 'q'}
                        t={t}
                        selectedTicketId={selectedTicketId}
                        onSelect={onSelectTicket}
                        luxChrome={null}
                      />
                    );
                  })
                ) : (
                  <LuxOperatorQueueList
                    chrome={luxChangeChrome}
                    grouped={luxQueueGrouped}
                    selectedTicketId={selectedTicketId}
                    onSelectTicket={onSelectTicket}
                    luxQueueTestsOpen={luxQueueTestsOpen}
                    setLuxQueueTestsOpen={setLuxQueueTestsOpen}
                    luxQueueInternalOpen={luxQueueInternalOpen}
                    setLuxQueueInternalOpen={setLuxQueueInternalOpen}
                    luxHideArchivedSmoke={luxHideArchivedSmoke}
                    setLuxHideArchivedSmoke={setLuxHideArchivedSmoke}
                    selectedTicketIsArchivedSmoke={selectedTicketIsArchivedSmoke}
                  />
                )}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  color: luxChangeChrome ? luxChangeChrome.textMuted : '#94a3b8',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {session.logged_in
                  ? 'No open tickets found (or queue is unavailable for this session).'
                  : 'Log in to view your queue.'}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, minWidth: 0, width: '100%', maxWidth: '100%' }}>
          {luxChangeChrome ? (
            <div
              id="lux-programme-desk-summary"
              style={{
                ...card,
                minWidth: 0,
                border: `1px solid ${luxChangeChrome.border}`,
                background: `linear-gradient(180deg, ${luxChangeChrome.white} 0%, ${luxChangeChrome.sand} 100%)`,
              }}
            >
              <div style={{ fontFamily: luxChangeChrome.fontDisplay, fontSize: 20, fontWeight: 700, color: luxChangeChrome.heroDeep }}>
                Programme status
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: luxChangeChrome.textMuted, lineHeight: 1.45 }}>
                Master ticket <code style={{ fontSize: 11, color: luxChangeChrome.text }}>{LUX_PARENT_PROGRAMME_TICKET_ID}</code>{' '}
                — compact desk view; open the ticket for full history.
              </div>
              <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 13, color: luxChangeChrome.text, lineHeight: 1.55 }}>
                <li>
                  <strong>Public /properties</strong> — live for published inventory.
                </li>
                <li>
                  <strong>Property editor</strong> — /properties/admin for allowlisted staff.
                </li>
                <li>
                  <strong>Media governance</strong> — review, link, publish, lifecycle (server-enforced).
                </li>
                <li>
                  <strong>First real client-published listing</strong> — pending programme evidence.
                </li>
                <li>
                  <strong>Jan validation / concierge verification</strong> — pending.
                </li>
              </ul>
              <div style={{ marginTop: 12 }}>
                <a
                  href="#lux-media-workspace"
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: luxChangeChrome.gold,
                    textDecoration: 'none',
                    borderBottom: `1px solid ${luxChangeChrome.gold}`,
                  }}
                >
                  Jump to media workspace
                </a>
              </div>
            </div>
          ) : null}

          {isLuxContentSprintTicketSelected && luxChangeChrome ? (
            <LuxContentSprintPanel
              sprintCode={luxSprintMeta?.sprint_code || null}
              chrome={luxChangeChrome}
              onUploadClick={handleSprintUploadContentClick}
            />
          ) : null}

          <div style={{ ...card, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                minWidth: 0,
                width: '100%',
              }}
            >
              <div style={changeFlexMainChildStyle()}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: luxInk ? luxInk.label : '#cbd5e1',
                    letterSpacing: '0.08em',
                  }}
                >
                  STAGE
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: luxInk ? luxInk.body : '#e2e8f0',
                    lineHeight: 1.45,
                    ...changeTextContainStyle(),
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    Stage:{' '}
                    {selectedTicketId
                      ? workflowStageLabel !== '—'
                        ? workflowStageLabel
                        : 'Intake'
                      : '—'}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 12,
                      color: luxInk ? luxInk.muted : '#94a3b8',
                      ...changeTextContainStyle(),
                    }}
                  >
                    Ticket: {selectedTicketId || '—'}
                  </div>
                </div>
              </div>
              {isLuxContentSprintTicketSelected ? (
                <details
                  data-testid="lux-stage-tabs-advanced-collapsed"
                  style={{ flexShrink: 0, maxWidth: '100%', minWidth: 0 }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      listStyle: 'none',
                      fontSize: 11,
                      fontWeight: 800,
                      color: luxInk ? luxInk.muted : '#94a3b8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Advanced workflow state ▾
                  </summary>
                  <div
                    data-testid="lux-stage-tabs-advanced-buttons"
                    style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}
                  >
                    {stageTabs.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStage(s)}
                        style={pillStyle(stage === s, luxChangeChrome)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: luxInk ? luxInk.muted : '#94a3b8', lineHeight: 1.4 }}>
                    Generic Intake / Clarify / Draft / Review / Build controls. The content sprint
                    panel above is the primary interaction for this ticket; use these stage controls
                    only when you need to drive the underlying workflow state machine.
                  </div>
                </details>
              ) : (
                <div
                  data-testid="lux-stage-tabs-primary"
                  style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}
                >
                  {stageTabs.map((s) => (
                    <button key={s} type="button" onClick={() => setStage(s)} style={pillStyle(stage === s, luxChangeChrome)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, borderTop: `1px solid ${luxInk ? luxInk.borderHairline : 'rgba(148,163,184,0.18)'}`, paddingTop: 14 }}>
              {showLuxPhase1ReviewPanel ? (
                <div
                  style={{
                    border: '1px solid rgba(56,189,248,0.35)',
                    borderRadius: 14,
                    padding: 14,
                    background: 'rgba(56,189,248,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#e0f2fe' }}>Next: Phase 1 client review</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                    Phase 1 is live on lux.corpflowai.com (presentation + concierge only). Send a one-time link so
                    the client can approve direction, classify images, and authorize (or hold) Phase 2. No login
                    required for the client.
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={mintClientDecisionLink}
                      disabled={clientDecisionBusy || !selectedTicketId}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: 'none',
                        background: clientDecisionBusy ? '#94a3b8' : '#38bdf8',
                        color: '#020617',
                        fontWeight: 950,
                        cursor: clientDecisionBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {clientDecisionBusy ? 'Generating…' : 'Send Phase 1 review request'}
                    </button>
                    {clientDecisionLink ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyToClipboard(clientDecisionLink);
                          setClientDecisionStatus(ok ? 'Copied.' : 'Copy failed — select and copy manually.');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(15,23,42,0.35)',
                          color: '#e2e8f0',
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        Copy link
                      </button>
                    ) : null}
                  </div>
                  {clientDecisionLink ? (
                    <div style={{ marginTop: 10 }}>
                      <input
                        readOnly
                        value={clientDecisionLink}
                        style={{
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          padding: 10,
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.45)',
                          color: '#e2e8f0',
                          fontSize: 12,
                          ...changeTextContainStyle(),
                        }}
                      />
                      {clientDecisionExpiresAt ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                          Expires: {clientDecisionExpiresAt}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {clientDecisionStatus ? (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>{clientDecisionStatus}</div>
                  ) : null}
                </div>
              ) : null}

              {showGenericClientDecisionPanel ? (
                <div
                  style={{
                    border: '1px solid rgba(56,189,248,0.35)',
                    borderRadius: 14,
                    padding: 14,
                    background: 'rgba(56,189,248,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#e0f2fe' }}>Client input required</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                    Send a one-time link so the client can answer the programme decisions. No login required for the
                    client.
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={mintClientDecisionLink}
                      disabled={clientDecisionBusy || !selectedTicketId}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: 'none',
                        background: clientDecisionBusy ? '#94a3b8' : '#38bdf8',
                        color: '#020617',
                        fontWeight: 950,
                        cursor: clientDecisionBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {clientDecisionBusy ? 'Generating…' : 'Send client decision request'}
                    </button>
                    {clientDecisionLink ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyToClipboard(clientDecisionLink);
                          setClientDecisionStatus(ok ? 'Copied.' : 'Copy failed — select and copy manually.');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(15,23,42,0.35)',
                          color: '#e2e8f0',
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        Copy link
                      </button>
                    ) : null}
                  </div>
                  {clientDecisionLink ? (
                    <div style={{ marginTop: 10 }}>
                      <input
                        readOnly
                        value={clientDecisionLink}
                        style={{
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          padding: 10,
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.45)',
                          color: '#e2e8f0',
                          fontSize: 12,
                          ...changeTextContainStyle(),
                        }}
                      />
                      {clientDecisionExpiresAt ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                          Expires: {clientDecisionExpiresAt}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {clientDecisionStatus ? (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>{clientDecisionStatus}</div>
                  ) : null}
                </div>
              ) : null}

              {showLuxPhase1ReviewComplete ? (
                <div
                  style={{
                    marginTop: showLuxPhase1ReviewPanel || showGenericClientDecisionPanel ? 12 : 0,
                    border: '1px solid rgba(74,222,128,0.35)',
                    borderRadius: 14,
                    padding: 12,
                    background: 'rgba(74,222,128,0.08)',
                    fontSize: 12,
                    color: '#bbf7d0',
                    lineHeight: 1.45,
                  }}
                >
                  Phase 1 client review form is complete for this ticket. Phase 2 still waits on your delivery
                  process (no automatic build from this step).
                </div>
              ) : null}

              <div style={{ marginTop: 14, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, minWidth: 0, maxWidth: '100%' }}>
                <div style={{ fontWeight: 900, color: '#e2e8f0', ...changeTextContainStyle() }}>
                  {selectedTicketId && ticket ? workflowStageLabel : stage}
                </div>
                <div style={{ marginTop: 6, color: '#94a3b8', ...changeTextContainStyle() }}>
                  Next:{' '}
                  {showIntakeSurface
                    ? 'Next step: Add or refine your request, then continue.'
                    : isEstimateMode
                      ? isReadyForEstimateOnly
                        ? 'Get Estimate.'
                        : 'Review the estimate and proceed when ready.'
                    : String(ticket?.ticket_progress?.client_view?.workflow_next_action || '—')}
                </div>
                {ticket?.lux_programme_summary?.phase_2_status ? (
                  luxChangeChrome ? (
                    <details style={{ marginTop: 8 }}>
                      <summary
                        style={{
                          fontSize: 12,
                          color: luxChangeChrome.textMuted,
                          cursor: 'pointer',
                          listStyle: 'none',
                          fontWeight: 700,
                        }}
                      >
                        Programme detail (Phase 1 / 2 summary)
                      </summary>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: luxChangeChrome.textMuted,
                          lineHeight: 1.45,
                          ...changeTextContainStyle(),
                        }}
                      >
                        Programme: Phase 1 {String(ticket.lux_programme_summary.phase_1_status || '—')} · Phase 2{' '}
                        {String(ticket.lux_programme_summary.phase_2_status || '—')}
                        {ticket.lux_programme_summary.listing_approach
                          ? ` · listing approach: ${String(ticket.lux_programme_summary.listing_approach)}`
                          : null}
                      </div>
                    </details>
                  ) : (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: '#94a3b8',
                        lineHeight: 1.45,
                        ...changeTextContainStyle(),
                      }}
                    >
                      Programme: Phase 1 {String(ticket.lux_programme_summary.phase_1_status || '—')} · Phase 2{' '}
                      {String(ticket.lux_programme_summary.phase_2_status || '—')}
                      {ticket.lux_programme_summary.listing_approach
                        ? ` · listing approach: ${String(ticket.lux_programme_summary.listing_approach)}`
                        : null}
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>

          {session.logged_in && isEstimateMode && !showIntakeSurface ? (
            <div style={{ display: 'grid', gap: 14, minWidth: 0, width: '100%', maxWidth: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isReadyForEstimateOnly ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
                  gap: 14,
                  minWidth: 0,
                }}
              >
                {isReadyForEstimateOnly ? (
                  <div style={subtleCard}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                      ESTIMATE
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                      Ready to request an estimate for this change.
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => void requestEstimate()}
                        disabled={estimateBusy || busy}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(56,189,248,0.35)',
                          background: estimateBusy || busy ? 'rgba(148,163,184,0.18)' : 'rgba(56,189,248,0.14)',
                          color: estimateBusy || busy ? '#94a3b8' : '#e0f2fe',
                          fontWeight: 900,
                          fontSize: 12,
                          cursor: estimateBusy || busy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Get Estimate
                      </button>
                      {estimateStatus ? (
                        <div style={{ marginTop: 10, fontSize: 11, color: '#86efac' }}>{estimateStatus}</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div style={subtleCard}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                    BUDGET & BILLING
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0, width: '100%' }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        marginTop: 4,
                        flexShrink: 0,
                        background: budgetAvailable ? '#22c55e' : budgetUnknown ? '#f59e0b' : '#64748b',
                        boxShadow: budgetAvailable ? '0 0 10px rgba(34,197,94,0.35)' : 'none',
                      }}
                    />
                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.45, minWidth: 0, flex: '1 1 0%', ...changeTextContainStyle() }}>
                      <div style={{ fontWeight: 900, color: budgetAvailable ? '#86efac' : budgetUnknown ? '#fcd34d' : '#cbd5e1' }}>
                        {budgetAvailable
                          ? 'Budget is available'
                          : budgetUnknown
                            ? 'Budget check not available yet'
                            : billingExempt && isTenantClient
                              ? 'Not a billing client'
                              : 'Not a billing client'}
                      </div>
                      <div style={{ marginTop: 6, color: '#94a3b8' }}>
                        {budgetAvailable
                          ? 'Sufficient budget is available for this change.'
                          : budgetUnknown
                            ? 'Budget tracking is not connected for this client yet.'
                            : 'Budget tracking is not available.'}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                        Client type:{' '}
                        <span
                          style={{
                            display: 'inline-block',
                            marginLeft: 6,
                            padding: '3px 10px',
                            borderRadius: 999,
                            border: '1px solid rgba(148,163,184,0.22)',
                            background: 'rgba(15,23,42,0.35)',
                            color: '#e2e8f0',
                            fontWeight: 800,
                          }}
                        >
                          {clientTypeLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={subtleCard}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                  ESTIMATE SUMMARY
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                  Based on analysis of this change request.
                </div>

                {hasEstimate ? (
                  <div
                    style={{
                      marginTop: 14,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                      gap: 14,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 14,
                        border: '1px solid rgba(56,189,248,0.22)',
                        background: 'rgba(56,189,248,0.06)',
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#93c5fd', letterSpacing: '0.08em' }}>
                        TYPICAL MARKET ESTIMATE
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>Estimated Man-Hours</div>
                      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950, color: '#bfdbfe' }}>
                        {hoursBand || 'Not available yet'}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>Estimated Cost</div>
                      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950, color: '#93c5fd' }}>
                        {marketUsd || 'Not available yet'}
                      </div>
                      {!marketUsd ? (
                        <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                          Market comparison can be added later.
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        borderRadius: 14,
                        border: '1px solid rgba(34,197,94,0.22)',
                        background: 'rgba(34,197,94,0.06)',
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#86efac', letterSpacing: '0.08em' }}>
                        OUR ESTIMATE
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>Estimated Man-Hours</div>
                      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950, color: '#bbf7d0' }}>
                        {hoursBand || 'Not available yet'}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>Estimated Cost</div>
                      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950, color: '#86efac' }}>
                        {ourUsd || 'Not available yet'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, fontSize: 12, color: '#94a3b8' }}>Estimate not generated yet.</div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.14)',
                    background: 'rgba(15,23,42,0.35)',
                    padding: 10,
                    fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  Estimates are preliminary and may change after clarification or scope adjustments.
                </div>
              </div>

              <div style={subtleCard}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                  NEXT ACTIONS
                </div>
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  {hasEstimate ? (
                    <button
                      type="button"
                      disabled={busy || !canProceed}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid rgba(34,197,94,0.35)',
                        background: busy || !canProceed ? 'rgba(148,163,184,0.18)' : 'rgba(34,197,94,0.14)',
                        color: busy || !canProceed ? '#94a3b8' : '#dcfce7',
                        textAlign: 'left',
                        cursor: busy || !canProceed ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => void proceedAfterEstimate()}
                    >
                      <div style={{ fontWeight: 900 }}>Proceed</div>
                      <div style={{ marginTop: 4, fontSize: 11, color: busy || !canProceed ? '#94a3b8' : '#bbf7d0' }}>
                        Start the work on this change
                      </div>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid rgba(56,189,248,0.22)',
                      background: 'rgba(56,189,248,0.06)',
                      color: '#e0f2fe',
                      textAlign: 'left',
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => setForceRefine(true)}
                  >
                    <div style={{ fontWeight: 900 }}>Change Request</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>Modify the overall change</div>
                  </button>
                  {!hasEstimate ? (
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>
                      Proceed becomes available after you generate an estimate.
                    </div>
                  ) : !canProceed ? (
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>
                      Proceeding isn’t available for this session yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {session.logged_in && (!isEstimateMode || showIntakeSurface) ? (
            <div style={{ ...card, minWidth: 0 }}>
              {session.logged_in && (!selectedTicketId || showIntakeSurface) ? (
                <div
                  style={{
                    marginBottom: 14,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(56,189,248,0.22)',
                    background: 'rgba(14,165,233,0.06)',
                    fontSize: 13,
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                  }}
                >
                  This is where you describe your request. The clearer this is, the faster we can help you.
                </div>
              ) : null}
              <div style={{ fontSize: showIntakeSkin ? 11 : 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                {showIntakeSurface ? 'Your request' : 'Describe the change'}
              </div>
              <textarea
                value={requestDraft}
                onChange={(e) => setRequestDraft(e.target.value)}
                placeholder="Describe what you want changed in plain language…"
                rows={showIntakeSurface ? 8 : 5}
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  minHeight: showIntakeSurface ? 220 : 140,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(51,65,85,0.65)',
                  background: 'rgba(2,6,23,0.72)',
                  color: '#f1f5f9',
                  fontSize: 13,
                  lineHeight: 1.45,
                  resize: 'vertical',
                  ...changeTextContainStyle(),
                }}
              />
              {showIntakeSurface ? (
                <>
                  <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
                    Existing request
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid rgba(51,65,85,0.65)',
                      background: 'rgba(2,6,23,0.55)',
                      fontSize: 13,
                      color: '#e2e8f0',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      minHeight: '4.5rem',
                      ...changeTextContainStyle(),
                    }}
                  >
                    {ticket ? formatExistingRequestText(ticket) : '—'}
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid rgba(52,211,153,0.22)',
                      background: 'rgba(6,78,59,0.15)',
                      fontSize: 13,
                      color: '#e2e8f0',
                      lineHeight: 1.5,
                    }}
                  >
                    You are ready to continue when your request clearly explains what you want changed and what
                    outcome you expect.
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => void saveIntakeContinue()}
                      disabled={busy}
                      style={{
                        padding: '12px 18px',
                        borderRadius: 12,
                        border: 'none',
                        background: busy ? '#64748b' : '#38bdf8',
                        color: '#020617',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: busy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Save and continue
                    </button>
                  </div>
                </>
              ) : null}
              {intakeNotice ? (
                <div style={{ marginTop: 12, fontSize: 12, color: '#86efac' }}>{intakeNotice}</div>
              ) : null}
            </div>
          ) : null}

          {!showIntakeSurface && !isEstimateMode ? (
            luxChangeChrome ? (
              <details
                key={`lux-snap-${selectedTicketId || 'none'}`}
                style={{ ...card, minWidth: 0 }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    listStyle: 'none',
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    color: luxChangeChrome.textLabel,
                  }}
                >
                  Technical details · ticket snapshot (JSON)
                </summary>
                <div style={{ marginTop: 10, maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
                  <pre
                    style={{
                      ...luxChangeChrome.pre(),
                      ...changePreBlockStyle(),
                    }}
                  >
                    {JSON.stringify(
                      ticket
                        ? {
                            ticket_id: selectedTicketId,
                            status: ticket.status,
                            stage: ticket.stage,
                            workflow_state: ticket?.ticket_progress?.client_view?.workflow_state,
                            description_preview: ticket.description ? String(ticket.description).slice(0, 500) : null,
                            client_decisions_summary: ticket.client_decisions_summary || null,
                            lux_programme_summary: ticket.lux_programme_summary || null,
                            operator_signal: ticket.operator_signal || null,
                          }
                        : { hint: session.logged_in ? 'Select a ticket to load.' : 'Log in to load tickets.' },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </details>
            ) : (
              <div style={{ ...card, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                  TICKET SNAPSHOT
                </div>
                <div style={{ marginTop: 10, maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
                  <pre
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: '1px solid rgba(148,163,184,0.18)',
                      background: 'rgba(2,6,23,0.45)',
                      fontSize: 12,
                      color: '#e2e8f0',
                      ...changePreBlockStyle(),
                    }}
                  >
                    {JSON.stringify(
                      ticket
                        ? {
                            ticket_id: selectedTicketId,
                            status: ticket.status,
                            stage: ticket.stage,
                            workflow_state: ticket?.ticket_progress?.client_view?.workflow_state,
                            description_preview: ticket.description ? String(ticket.description).slice(0, 500) : null,
                            client_decisions_summary: ticket.client_decisions_summary || null,
                            lux_programme_summary: ticket.lux_programme_summary || null,
                            operator_signal: ticket.operator_signal || null,
                          }
                        : { hint: session.logged_in ? 'Select a ticket to load.' : 'Log in to load tickets.' },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            )
          ) : null}

          {luxChangeChrome && !showIntakeSurface && !isEstimateMode ? (
            <LuxChangeCollapsibleSection
              chrome={luxChangeChrome}
              summary="Media workspace"
              cardStyle={{ ...card, minWidth: 0 }}
              defaultOpen={false}
              sectionId="lux-media-workspace"
            >
                <div style={{ marginTop: 0, fontSize: 12, color: luxChangeChrome.textMuted, lineHeight: 1.45 }}>
                  Review approved images and videos across LuxeMaurice content requests. Use this area to find media
                  that has already been uploaded, reviewed, linked, or published. Use Load / refresh after changing
                  filters.
                </div>
                <details
                  data-testid="lux-media-workspace-technical-note"
                  style={{ marginTop: 8, fontSize: 11, color: luxChangeChrome.textMuted, lineHeight: 1.45 }}
                >
                  <summary style={{ cursor: 'pointer', listStyle: 'none', fontWeight: 700 }}>Technical note</summary>
                  <div style={{ marginTop: 4 }}>
                    Cross-ticket Lux programme requests — metadata only (no media bytes are loaded here, the storage
                    layer streams bytes separately). Persistence model is described in
                    docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md.
                  </div>
                </details>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setLuxMediaLibOpen((v) => !v)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(129,140,248,0.45)',
                    background: 'rgba(99,102,241,0.14)',
                    color: '#e0e7ff',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {luxMediaLibOpen ? 'Hide' : 'Show'} library panel
                </button>
                {luxMediaLibOpen ? (
                  <button
                    type="button"
                    disabled={luxMediaLibBusy}
                    onClick={() => void loadLuxMediaLibrary()}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(56,189,248,0.45)',
                      background: 'rgba(14,165,233,0.12)',
                      color: '#bae6fd',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: luxMediaLibBusy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {luxMediaLibBusy ? 'Loading…' : 'Load / refresh'}
                  </button>
                ) : null}
              </div>
              {luxMediaLibOpen ? (
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                    <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                      Search
                      <input
                        value={luxMediaLibSearch}
                        onChange={(e) => setLuxMediaLibSearch(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 10,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.65)',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      />
                    </label>
                    <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                      Property slug
                      <input
                        value={luxMediaLibSlug}
                        onChange={(e) => setLuxMediaLibSlug(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 10,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.65)',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      />
                    </label>
                    <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                      Slot
                      <select
                        value={luxMediaLibSlot}
                        onChange={(e) => setLuxMediaLibSlot(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 10,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.65)',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      >
                        <option value="">Any</option>
                        <option value="hero">hero</option>
                        <option value="gallery">gallery</option>
                        <option value="card">card</option>
                        <option value="reference">reference</option>
                      </select>
                    </label>
                    <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                      Media type
                      <select
                        value={luxMediaLibMediaType}
                        onChange={(e) => setLuxMediaLibMediaType(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 10,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.65)',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      >
                        <option value="">Any</option>
                        <option value="image">image</option>
                        <option value="video">video</option>
                        <option value="document">document</option>
                      </select>
                    </label>
                    <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                      Filter
                      <select
                        value={luxMediaLibFilter}
                        onChange={(e) => setLuxMediaLibFilter(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 10,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.65)',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      >
                        {LUX_ATTACHMENT_OPERATOR_FILTER_IDS.map((fid) => (
                          <option key={fid} value={fid}>
                            {luxOperatorAttachmentFilterLabel(fid)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {luxMediaLibErr ? <div style={{ fontSize: 12, color: '#fca5a5' }}>{luxMediaLibErr}</div> : null}
                  <div
                    style={{
                      maxHeight: 280,
                      overflow: 'auto',
                      border: '1px solid rgba(148,163,184,0.15)',
                      borderRadius: 10,
                      fontSize: 11,
                      color: '#e2e8f0',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                          <th style={{ padding: 8 }}>Ticket</th>
                          <th style={{ padding: 8 }}>File</th>
                          <th style={{ padding: 8 }}>Type</th>
                          <th style={{ padding: 8 }}>Review</th>
                          <th style={{ padding: 8 }}>Where</th>
                        </tr>
                      </thead>
                      <tbody>
                        {luxMediaLibRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: 10, color: '#64748b' }}>
                              No rows — run Load / refresh.
                            </td>
                          </tr>
                        ) : (
                          luxMediaLibRows.map((row) => {
                            const wid = String(row.attachment_id || '');
                            const wu = Array.isArray(row.where_used) ? row.where_used : [];
                            const wuLabel = wu
                              .map((w) => `${w.property_slug || ''}·${w.intended_slot || ''}`)
                              .join(' · ');
                            return (
                              <tr key={`${row.ticket_id}:${wid}`} style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                                <td style={{ padding: 8, wordBreak: 'break-all' }}>{String(row.ticket_id || '').slice(0, 12)}…</td>
                                <td style={{ padding: 8, wordBreak: 'break-all' }}>{row.file_name}</td>
                                <td style={{ padding: 8 }}>{row.media_type}</td>
                                <td style={{ padding: 8 }}>{row.review_status}</td>
                                <td style={{ padding: 8 }}>{wuLabel || '—'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </LuxChangeCollapsibleSection>
          ) : null}

          {/*
           * Render the Upload to this ticket section whenever a ticket is selected
           * and we are not in estimate-only mode. Sprint child tickets C1–C4 sit in
           * the Intake workflow stage by design (they were created as fresh sprint
           * work items in PR #345), so the earlier `!showIntakeSurface` guard
           * silently gated them out — operators clicking the "Upload content"
           * button on a sprint ticket reached the unavailable-state fallback.
           *
           * PR #350 belt-and-suspenders: also render unconditionally when a sprint
           * ticket is selected, even if some future state combination makes
           * `isEstimateMode` true. This guarantees the "Upload content" CTA in the
           * Content sprint panel always has a target.
           */}
          {selectedTicketId && (!isEstimateMode || isLuxContentSprintTicketSelected) ? (
            <div
              id="lux-ticket-attachment-upload"
              data-testid="lux-ticket-attachment-upload"
              ref={luxAttachmentUploadSectionRef}
              style={{
                ...card,
                minWidth: 0,
                border: '1px solid rgba(168,132,44,0.35)',
                background: 'rgba(168,132,44,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: luxInk ? luxInk.label : '#cbd5e1',
                  textTransform: 'uppercase',
                }}
              >
                Upload to this ticket
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: luxInk ? luxInk.body : '#e2e8f0',
                  lineHeight: 1.5,
                }}
              >
                Choose an image, video, or PDF to attach to this ticket. The file is
                governed by the existing LuxeMaurice attachment pipeline: it is uploaded
                privately, then reviewed, linked, and only published when explicitly
                approved on an allowed slot (hero, gallery, or card). Nothing becomes
                public from this step alone.
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <input
                  ref={luxAttachmentUploadInputRef}
                  id="lux-ticket-attachment-upload-input"
                  name="lux-ticket-attachment-upload-input"
                  data-testid="lux-ticket-attachment-upload-input"
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={handleAttachmentUploadInputChange}
                  disabled={uploadBusy}
                  style={{ fontSize: 12, color: luxInk ? luxInk.body : '#e2e8f0', maxWidth: '100%' }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: luxInk ? luxInk.muted : '#94a3b8',
                    lineHeight: 1.45,
                  }}
                >
                  Max ~3 MB per upload via /change. Larger assets go through the operator
                  ingest path documented in docs/LUX/LUX_MEDIA_GOVERNANCE.md.
                </span>
              </div>
              {uploadStatus ? (
                <div
                  data-testid="lux-ticket-attachment-upload-status"
                  data-status-kind={uploadStatusKind}
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    lineHeight: 1.5,
                    padding: '8px 10px',
                    borderRadius: 10,
                    color:
                      uploadStatusKind === 'error'
                        ? '#fecaca'
                        : uploadStatusKind === 'ok'
                          ? '#bbf7d0'
                          : uploadStatusKind === 'info'
                            ? '#bae6fd'
                            : '#e2e8f0',
                    border: `1px solid ${
                      uploadStatusKind === 'error'
                        ? 'rgba(248,113,113,0.4)'
                        : uploadStatusKind === 'ok'
                          ? 'rgba(74,222,128,0.4)'
                          : uploadStatusKind === 'info'
                            ? 'rgba(125,211,252,0.4)'
                            : 'rgba(148,163,184,0.3)'
                    }`,
                    background:
                      uploadStatusKind === 'error'
                        ? 'rgba(248,113,113,0.1)'
                        : uploadStatusKind === 'ok'
                          ? 'rgba(74,222,128,0.1)'
                          : uploadStatusKind === 'info'
                            ? 'rgba(125,211,252,0.1)'
                            : 'rgba(15,23,42,0.4)',
                  }}
                >
                  {uploadStatus}
                </div>
              ) : null}
              {lastUploadedAttachment ? (
                <div
                  data-testid="lux-ticket-attachment-upload-last"
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    lineHeight: 1.5,
                    padding: '8px 10px',
                    borderRadius: 10,
                    color: '#bbf7d0',
                    border: '1px solid rgba(74,222,128,0.35)',
                    background: 'rgba(74,222,128,0.08)',
                  }}
                >
                  <strong>Just uploaded:</strong> {lastUploadedAttachment.file_name}{' '}
                  ({(lastUploadedAttachment.byte_size / 1024).toFixed(1)} KB,{' '}
                  {lastUploadedAttachment.content_type}). It is now attached to this ticket
                  and ready for review · link · publish in the ATTACHMENTS section below
                  (current count: {attachments.length}).
                </div>
              ) : null}
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: luxInk ? luxInk.muted : '#94a3b8',
                  lineHeight: 1.45,
                }}
              >
                After upload, scroll down to the ATTACHMENTS section to mark reviewed,
                link to a property slug, and (when approved) publish on an allowed slot.
              </div>
            </div>
          ) : null}

          {/*
           * Render the per-ticket ATTACHMENTS list whenever a ticket is selected,
           * we are not in estimate-only mode, and the ticket has attachments.
           *
           * PR #351 — Sprint child tickets C1–C4 sit in the Intake workflow stage by
           * design (created by PR #345), so the earlier `!showIntakeSurface` guard
           * silently hid this section for the exact tickets the Add content panel
           * targets. Operators uploaded a file successfully through the governed
           * pipeline but never saw the new attachment row, so they reasonably
           * concluded "the file was dropped". Mirroring the bypass we applied to
           * the upload-section render guard in PR #350.
           */}
          {selectedTicketId && (!isEstimateMode || isLuxContentSprintTicketSelected) && attachments.length > 0 ? (
            <LuxChangeCollapsibleSection
              chrome={luxChangeChrome}
              summary="This ticket · attachments, review, link, publish"
              cardStyle={{ ...card, minWidth: 0 }}
              defaultOpen={Boolean(luxChangeChrome)}
            >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                ATTACHMENTS
                <span style={{ marginLeft: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                  · operator review
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                Tenant-private until reviewed; public only after link + publish on an allowed slot (hero, gallery, or
                card).
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: '#a5b4fc',
                  lineHeight: 1.45,
                  border: '1px solid rgba(129,140,248,0.25)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  background: 'rgba(99,102,241,0.08)',
                }}
              >
                Phase 4D.3 · Replace media safely: upload a new attachment, mark it reviewed, link it to the property,
                publish it, then archive the old attachment. You may set the archive reason to e.g.{' '}
                <span style={{ color: '#e2e8f0' }}>replaced by &lt;attachment_id or filename&gt;</span>.
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 8,
                  fontSize: 11,
                  color: '#cbd5e1',
                }}
              >
                {[
                  ['Total', attachmentMediaSummary.total],
                  ['Pending review', attachmentMediaSummary.pending_review],
                  ['Reviewed', attachmentMediaSummary.reviewed],
                  ['Rejected', attachmentMediaSummary.rejected],
                  ['Archived', attachmentMediaSummary.archived],
                  ['Linked', attachmentMediaSummary.linked],
                  ['Published', attachmentMediaSummary.published],
                  ['Needs action', attachmentMediaSummary.needs_action],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      border: '1px solid rgba(148,163,184,0.18)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: 'rgba(2,6,23,0.40)',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ marginTop: 4, fontSize: 16, fontWeight: 900, color: '#e2e8f0' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 8, alignItems: 'center' }}>
                  Show
                  <select
                    value={attachmentOperatorFilter}
                    onChange={(e) => setAttachmentOperatorFilter(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                      minWidth: 180,
                    }}
                  >
                    {LUX_ATTACHMENT_OPERATOR_FILTER_IDS.map((fid) => (
                      <option key={fid} value={fid}>
                        {luxOperatorAttachmentFilterLabel(fid)}
                      </option>
                    ))}
                  </select>
                </label>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Phase 4D.4 · client-side filters only; does not change what is public.
                </span>
              </div>
              {attachmentsBusy ? (
                <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>Loading attachments…</div>
              ) : null}
              {attachmentsError ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(244,63,94,0.35)',
                    background: 'rgba(244,63,94,0.10)',
                    color: '#fecdd3',
                    fontSize: 12,
                    ...changeTextContainStyle(),
                  }}
                >
                  {attachmentsError}
                </div>
              ) : null}
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {filteredAttachments.map((a) => {
                  const aid = String(a.attachment_id || a.id || '');
                  const isLuxMeta = a.attachment_id != null;
                  const status = String(a.review_status || (isLuxMeta ? 'pending_review' : '')).toLowerCase();
                  const life = String(a.lifecycle_status || 'active').toLowerCase();
                  const isArchived = life === 'archived';
                  const whereUsedRows = buildLuxAttachmentWhereUsedRows(a);
                  const hintCtx = luxTicketAttachmentHintContext(ticket);
                  const showTestMediaHint = detectLuxOperatorTestMediaHint(a, hintCtx);
                  const showCleanupCandidate = luxAttachmentCleanupCandidate(a, hintCtx);
                  const statusBadge =
                    status === 'reviewed'
                      ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', color: '#dcfce7', label: 'Reviewed' }
                      : status === 'rejected'
                        ? { bg: 'rgba(244,63,94,0.10)', border: 'rgba(244,63,94,0.35)', color: '#fecdd3', label: 'Rejected' }
                        : status === 'pending_review'
                          ? { bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.35)', color: '#fef08a', label: 'Pending review' }
                          : { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', color: '#cbd5e1', label: 'Untracked' };
                  const sizeKb = Number.isFinite(Number(a.byte_size)) ? Math.round(Number(a.byte_size) / 1024) : null;
                  const isReviewBusy = attachmentReviewBusyId === aid;
                  const isLinkBusy = attachmentLinkBusyId === aid;
                  const isArchiveBusy = attachmentArchiveBusyId === aid;
                  const isRestoreBusy = attachmentRestoreBusyId === aid;
                  const mediaTypeLower = String(a.media_type || '').toLowerCase();
                  const canPublishSlot = status === 'reviewed' && mediaTypeLower === 'image' && !isArchived;
                  const propertyLinks = Array.isArray(a.property_links) ? a.property_links : [];
                  return (
                    <div
                      key={aid}
                      style={{
                        border: `1px solid ${isArchived ? 'rgba(244,63,94,0.35)' : 'rgba(148,163,184,0.18)'}`,
                        borderRadius: 12,
                        background: isArchived ? 'rgba(244,63,94,0.06)' : 'rgba(2,6,23,0.45)',
                        padding: 12,
                        minWidth: 0,
                        ...changeTextContainStyle(),
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'baseline',
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            fontSize: 13,
                            fontWeight: 800,
                            color: '#e2e8f0',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            alignItems: 'center',
                            ...changeTextContainStyle(),
                          }}
                        >
                          <span>{String(a.file_name || 'upload')}</span>
                          {showTestMediaHint ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 8,
                                border: '1px solid rgba(251,191,36,0.45)',
                                background: 'rgba(251,191,36,0.12)',
                                color: '#fef9c3',
                                flexShrink: 0,
                              }}
                              title="Heuristic match on filename, notes, or ticket text (smoke / phase / test / verify / example.invalid patterns). Not a security label; does not delete or hide media."
                            >
                              Test media
                            </span>
                          ) : null}
                          {showCleanupCandidate ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 8,
                                border: '1px solid rgba(148,163,184,0.45)',
                                background: 'rgba(148,163,184,0.12)',
                                color: '#e2e8f0',
                                flexShrink: 0,
                              }}
                              title="Advisory only: test/smoke signals + not currently public on Lux hero/gallery/card. Archive is the safe cleanup step; no automatic delete."
                            >
                              Cleanup candidate
                            </span>
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '4px 8px',
                              borderRadius: 999,
                              border: `1px solid ${statusBadge.border}`,
                              background: statusBadge.bg,
                              color: statusBadge.color,
                              letterSpacing: '0.02em',
                              flexShrink: 0,
                            }}
                          >
                            {statusBadge.label}
                          </span>
                          {isArchived ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '4px 8px',
                                borderRadius: 999,
                                border: '1px solid rgba(244,63,94,0.45)',
                                background: 'rgba(244,63,94,0.12)',
                                color: '#fecdd3',
                                letterSpacing: '0.02em',
                                flexShrink: 0,
                              }}
                            >
                              Archived
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {isLuxMeta && (showTestMediaHint || showCleanupCandidate) ? (
                        <div style={{ marginTop: 6, fontSize: 10, color: '#64748b', lineHeight: 1.45 }}>
                          Phase 4D.5 · Badges are advisory only (not security). Hard delete is out of scope — use
                          Archive when retiring smoke or QA fixtures.
                        </div>
                      ) : null}
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: '#94a3b8',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        {a.media_type ? <span>Type: {String(a.media_type)}</span> : null}
                        {a.content_type ? <span>MIME: {String(a.content_type)}</span> : null}
                        {sizeKb != null ? <span>Size: {sizeKb} KB</span> : null}
                        {a.intended_use ? <span>Use: {String(a.intended_use).replaceAll('_', ' ')}</span> : null}
                        {a.created_at ? <span>Added: {new Date(a.created_at).toLocaleString()}</span> : null}
                        {isLuxMeta ? (
                          <span style={{ fontWeight: 800, color: isArchived ? '#fecdd3' : '#cbd5e1' }}>
                            Lifecycle: {isArchived ? 'Archived' : 'Active'}
                          </span>
                        ) : null}
                      </div>
                      {isLuxMeta && (a.archived_at || a.archive_reason || a.restored_at) ? (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', display: 'grid', gap: 4 }}>
                          {a.archived_at ? (
                            <div>
                              Archived{a.archived_by ? ` by ${String(a.archived_by)}` : null} ·{' '}
                              {new Date(a.archived_at).toLocaleString()}
                            </div>
                          ) : null}
                          {a.archive_reason ? (
                            <div style={{ color: '#cbd5e1', whiteSpace: 'pre-wrap', ...changeTextContainStyle() }}>
                              Reason: {String(a.archive_reason)}
                            </div>
                          ) : null}
                          {a.restored_at ? (
                            <div>
                              Restored{a.restored_by ? ` by ${String(a.restored_by)}` : null} ·{' '}
                              {new Date(a.restored_at).toLocaleString()}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {a.notes ? (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: '#e2e8f0',
                            whiteSpace: 'pre-wrap',
                            ...changeTextContainStyle(),
                          }}
                        >
                          <span style={{ color: '#94a3b8' }}>Notes: </span>
                          {String(a.notes)}
                        </div>
                      ) : null}
                      {a.review_status === 'reviewed' || a.review_status === 'rejected' ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                          {a.reviewed_by ? <span>Reviewed by {String(a.reviewed_by)}</span> : null}
                          {a.reviewed_at ? <span> · {new Date(a.reviewed_at).toLocaleString()}</span> : null}
                          {a.review_note ? (
                            <div
                              style={{
                                marginTop: 4,
                                color: '#cbd5e1',
                                whiteSpace: 'pre-wrap',
                                ...changeTextContainStyle(),
                              }}
                            >
                              "{String(a.review_note)}"
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {isLuxMeta ? (
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 11,
                            color: '#94a3b8',
                            border: '1px solid rgba(148,163,184,0.15)',
                            borderRadius: 10,
                            padding: '8px 10px',
                            background: 'rgba(15,23,42,0.35)',
                          }}
                        >
                          <div style={{ fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.04em', marginBottom: 6 }}>
                            Where used
                          </div>
                          {whereUsedRows.length === 0 ? (
                            <div style={{ color: '#64748b' }}>Not linked to any property.</div>
                          ) : (
                            <div style={{ display: 'grid', gap: 8 }}>
                              {whereUsedRows.map((row, wri) => (
                                <div
                                  key={`${row.property_slug}:${row.intended_slot}:${wri}`}
                                  style={{
                                    border: '1px solid rgba(148,163,184,0.12)',
                                    borderRadius: 8,
                                    padding: '6px 8px',
                                    fontSize: 11,
                                    color: '#cbd5e1',
                                    lineHeight: 1.45,
                                    minWidth: 0,
                                    ...changeTextContainStyle(),
                                  }}
                                >
                                  <div style={{ fontWeight: 800, color: '#e2e8f0' }}>
                                    {row.property_slug}
                                    {row.property_title ? (
                                      <span style={{ fontWeight: 700, color: '#94a3b8' }}> · {row.property_title}</span>
                                    ) : null}
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Slot:</span> {row.intended_slot}
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Publish:</span> {row.publish_label}
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Lifecycle:</span> {row.lifecycle_label}
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Visibility:</span>{' '}
                                    {row.public_labels.join(' · ')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {propertyLinks.length > 0 ? (
                        <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                          <div style={{ fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.04em' }}>
                            Linked properties (controls)
                          </div>
                          {propertyLinks.map((pl, idx) => {
                            const slug = String(pl?.property_slug || '');
                            const slot = String(pl?.intended_slot || '');
                            return (
                              <div
                                key={`${slug}:${slot}:${idx}`}
                                style={{
                                  border: '1px solid rgba(148,163,184,0.18)',
                                  borderRadius: 10,
                                  background: 'rgba(2,6,23,0.40)',
                                  padding: '8px 10px',
                                  minWidth: 0,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                  <div style={{ minWidth: 0, color: '#e2e8f0', fontWeight: 800, ...changeTextContainStyle() }}>
                                    {slug}
                                    {pl?.property_title ? (
                                      <span style={{ color: '#94a3b8', fontWeight: 700 }}> · {String(pl.property_title)}</span>
                                    ) : null}
                                  </div>
                                  <div style={{ color: '#94a3b8', fontWeight: 800, flexShrink: 0 }}>
                                    Slot: {slot || '—'}
                                  </div>
                                </div>
                                <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {pl?.linked_by ? <span>Linked by {String(pl.linked_by)}</span> : null}
                                  {pl?.linked_at ? <span> · {new Date(pl.linked_at).toLocaleString()}</span> : null}
                                </div>
                                {pl?.link_note ? (
                                  <div style={{ marginTop: 4, color: '#cbd5e1', whiteSpace: 'pre-wrap', ...changeTextContainStyle() }}>
                                    "{String(pl.link_note)}"
                                  </div>
                                ) : null}
                                {canPublishSlot ? (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      paddingTop: 8,
                                      borderTop: '1px solid rgba(148,163,184,0.15)',
                                      display: 'grid',
                                      gap: 8,
                                    }}
                                  >
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.04em' }}>
                                      Phase 4C.3 / 4D.1 / 4D.2 · public slot (Lux host only)
                                    </div>
                                    {String(slot).toLowerCase() === 'card' ? (
                                      <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.45 }}>
                                        Card = homepage / property listing image when published (falls back to staged hero if
                                        absent).
                                      </div>
                                    ) : null}
                                    {String(slot).toLowerCase() === 'gallery' ? (
                                      <>
                                        <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                                          Gallery order (optional, 0–9999)
                                          <input
                                            type="number"
                                            min={0}
                                            max={9999}
                                            value={
                                              attachmentGalleryOrderDrafts[attachmentPublishDraftKey(aid, slug, slot)] ??
                                              (pl?.gallery_order != null ? String(pl.gallery_order) : '')
                                            }
                                            onChange={(e) =>
                                              setAttachmentGalleryOrderDrafts((prev) => ({
                                                ...prev,
                                                [attachmentPublishDraftKey(aid, slug, slot)]: e.target.value,
                                              }))
                                            }
                                            style={{
                                              padding: '8px 10px',
                                              borderRadius: 10,
                                              border: '1px solid rgba(148,163,184,0.25)',
                                              background: 'rgba(2,6,23,0.65)',
                                              color: '#e2e8f0',
                                              fontSize: 12,
                                              maxWidth: 140,
                                            }}
                                          />
                                        </label>
                                        <label style={{ fontSize: 11, color: '#cbd5e1', display: 'flex', gap: 8, alignItems: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={
                                              (attachmentGalleryCoverDrafts[attachmentPublishDraftKey(aid, slug, slot)] !== undefined
                                                ? attachmentGalleryCoverDrafts[attachmentPublishDraftKey(aid, slug, slot)]
                                                : pl?.is_gallery_cover === true) === true
                                            }
                                            onChange={(e) =>
                                              setAttachmentGalleryCoverDrafts((prev) => ({
                                                ...prev,
                                                [attachmentPublishDraftKey(aid, slug, slot)]: e.target.checked,
                                              }))
                                            }
                                          />
                                          Gallery cover (first in grid on the public page)
                                        </label>
                                      </>
                                    ) : null}
                                    <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                                      Publish status:{' '}
                                      <span style={{ fontWeight: 800 }}>
                                        {String(pl?.publish_status || 'unpublished').toLowerCase() === 'published'
                                          ? 'Published'
                                          : 'Unpublished'}
                                      </span>
                                    </div>
                                    {pl?.published_at ? (
                                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                        Published {pl?.published_by ? `by ${String(pl.published_by)} · ` : null}
                                        {new Date(pl.published_at).toLocaleString()}
                                      </div>
                                    ) : null}
                                    {pl?.unpublished_at ? (
                                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                        Unpublished {pl?.unpublished_by ? `by ${String(pl.unpublished_by)} · ` : null}
                                        {new Date(pl.unpublished_at).toLocaleString()}
                                      </div>
                                    ) : null}
                                    {Array.isArray(pl?.publish_history) && pl.publish_history.length > 0 ? (
                                      <div style={{ fontSize: 10, color: '#64748b', display: 'grid', gap: 2 }}>
                                        <div style={{ fontWeight: 800, color: '#94a3b8' }}>Publish history (latest)</div>
                                        {pl.publish_history.slice(-5).map((h, hi) => (
                                          <div key={`${slug}:${slot}:hist:${hi}`} style={{ lineHeight: 1.35 }}>
                                            {h?.at ? `${new Date(String(h.at)).toLocaleString()} · ` : null}
                                            {h?.action ? luxPublishHistoryActionLabel(h.action) : '—'}
                                            {h?.actor ? ` · ${String(h.actor)}` : null}
                                            {h?.note ? (
                                              <span style={{ color: '#cbd5e1' }}>{` — ${String(h.note)}`}</span>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                    <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                                      Public caption (optional)
                                      <input
                                        value={
                                          attachmentPublishCaptionDrafts[attachmentPublishDraftKey(aid, slug, slot)] ??
                                          (pl?.public_caption != null ? String(pl.public_caption) : '')
                                        }
                                        onChange={(e) =>
                                          setAttachmentPublishCaptionDrafts((prev) => ({
                                            ...prev,
                                            [attachmentPublishDraftKey(aid, slug, slot)]: e.target.value,
                                          }))
                                        }
                                        maxLength={180}
                                        placeholder="Short caption shown on the public property page."
                                        style={{
                                          padding: '8px 10px',
                                          borderRadius: 10,
                                          border: '1px solid rgba(148,163,184,0.25)',
                                          background: 'rgba(2,6,23,0.65)',
                                          color: '#e2e8f0',
                                          fontSize: 12,
                                          ...changeTextContainStyle(),
                                        }}
                                      />
                                    </label>
                                    <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                                      Public alt text (optional)
                                      <input
                                        value={
                                          attachmentPublishAltDrafts[attachmentPublishDraftKey(aid, slug, slot)] ??
                                          (pl?.public_alt_text != null ? String(pl.public_alt_text) : '')
                                        }
                                        onChange={(e) =>
                                          setAttachmentPublishAltDrafts((prev) => ({
                                            ...prev,
                                            [attachmentPublishDraftKey(aid, slug, slot)]: e.target.value,
                                          }))
                                        }
                                        maxLength={180}
                                        placeholder="Accessible description for the public image."
                                        style={{
                                          padding: '8px 10px',
                                          borderRadius: 10,
                                          border: '1px solid rgba(148,163,184,0.25)',
                                          background: 'rgba(2,6,23,0.65)',
                                          color: '#e2e8f0',
                                          fontSize: 12,
                                          ...changeTextContainStyle(),
                                        }}
                                      />
                                    </label>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>
                                      Set caption/alt before first publish; use Publish again to update public text after
                                      publishing.
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      <button
                                        type="button"
                                        disabled={
                                          isLinkBusy ||
                                          isArchived ||
                                          attachmentPublishBusyKey === attachmentPublishDraftKey(aid, slug, slot)
                                        }
                                        onClick={() => void submitAttachmentPropertyPublish(aid, slug, slot)}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: 10,
                                          border: '1px solid rgba(129,140,248,0.45)',
                                          background: 'rgba(99,102,241,0.14)',
                                          color: '#e0e7ff',
                                          fontWeight: 800,
                                          fontSize: 12,
                                          cursor:
                                          isLinkBusy ||
                                          isArchived ||
                                          attachmentPublishBusyKey === attachmentPublishDraftKey(aid, slug, slot)
                                            ? 'not-allowed'
                                            : 'pointer',
                                        }}
                                      >
                                        Publish
                                      </button>
                                      <button
                                        type="button"
                                        disabled={
                                          isLinkBusy ||
                                          isArchived ||
                                          attachmentPublishBusyKey === attachmentPublishDraftKey(aid, slug, slot) ||
                                          String(pl?.publish_status || '').toLowerCase() !== 'published'
                                        }
                                        onClick={() => void submitAttachmentPropertyUnpublish(aid, slug, slot)}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: 10,
                                          border: '1px solid rgba(148,163,184,0.35)',
                                          background: 'rgba(15,23,42,0.55)',
                                          color: '#e2e8f0',
                                          fontWeight: 800,
                                          fontSize: 12,
                                          cursor:
                                            isLinkBusy ||
                                            isArchived ||
                                            attachmentPublishBusyKey === attachmentPublishDraftKey(aid, slug, slot) ||
                                            String(pl?.publish_status || '').toLowerCase() !== 'published'
                                              ? 'not-allowed'
                                              : 'pointer',
                                        }}
                                      >
                                        Unpublish
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    disabled={isLinkBusy || isArchived}
                                    onClick={() => void submitAttachmentPropertyUnlink(aid, slug, slot)}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: 10,
                                      border: '1px solid rgba(148,163,184,0.25)',
                                      background: 'rgba(148,163,184,0.10)',
                                      color: '#e2e8f0',
                                      fontWeight: 800,
                                      fontSize: 12,
                                      cursor: isLinkBusy || isArchived ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    Unlink
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {a.download_url ? (
                          <a
                            href={String(a.download_url)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '8px 12px',
                              borderRadius: 10,
                              border: '1px solid rgba(56,189,248,0.35)',
                              background: 'rgba(14,165,233,0.10)',
                              color: '#bae6fd',
                              fontWeight: 800,
                              fontSize: 12,
                              textDecoration: 'none',
                            }}
                          >
                            View / download
                          </a>
                        ) : null}
                      </div>
                      {isLuxMeta ? (
                        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.04em' }}>
                            Phase 4D.3 · lifecycle
                          </div>
                          {!isArchived ? (
                            <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                              Archive reason (optional, max 600 chars)
                              <textarea
                                value={attachmentArchiveReasonDrafts[aid] || ''}
                                onChange={(e) =>
                                  setAttachmentArchiveReasonDrafts((prev) => ({ ...prev, [aid]: e.target.value }))
                                }
                                rows={2}
                                maxLength={600}
                                placeholder='e.g. replaced by new-hero.png or attachment id clxyz…'
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(148,163,184,0.25)',
                                  background: 'rgba(2,6,23,0.65)',
                                  color: '#e2e8f0',
                                  fontSize: 12,
                                  resize: 'vertical',
                                  ...changeTextContainStyle(),
                                }}
                              />
                            </label>
                          ) : null}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              disabled={isArchiveBusy || isRestoreBusy || isArchived}
                              onClick={() => void submitAttachmentArchive(aid)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid rgba(244,63,94,0.45)',
                                background: 'rgba(244,63,94,0.12)',
                                color: '#fecdd3',
                                fontWeight: 800,
                                fontSize: 12,
                                cursor:
                                  isArchiveBusy || isRestoreBusy || isArchived ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isArchiveBusy ? 'Archiving…' : 'Archive'}
                            </button>
                            <button
                              type="button"
                              disabled={isArchiveBusy || isRestoreBusy || !isArchived}
                              onClick={() => void submitAttachmentRestore(aid)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid rgba(34,197,94,0.35)',
                                background: 'rgba(34,197,94,0.10)',
                                color: '#dcfce7',
                                fontWeight: 800,
                                fontSize: 12,
                                cursor:
                                  isArchiveBusy || isRestoreBusy || !isArchived ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isRestoreBusy ? 'Restoring…' : 'Restore'}
                            </button>
                          </div>
                          {showTestMediaHint && !isArchived && !showCleanupCandidate ? (
                            <div style={{ fontSize: 10, color: '#fbbf24', lineHeight: 1.45 }}>
                              Phase 4D.5 · This attachment still matches public Lux slot heuristics (hero / gallery /
                              card). Unpublish first, then archive when finished.
                            </div>
                          ) : null}
                          {showTestMediaHint && !isArchived ? (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 10,
                                alignItems: 'center',
                              }}
                            >
                              <button
                                type="button"
                                disabled={isArchiveBusy || isRestoreBusy}
                                onClick={() =>
                                  void submitAttachmentArchive(aid, {
                                    archiveReason: LUX_ATTACHMENT_ARCHIVE_REASON_SMOKE_DEFAULT,
                                  })
                                }
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(251,191,36,0.45)',
                                  background: 'rgba(251,191,36,0.10)',
                                  color: '#fef9c3',
                                  fontWeight: 800,
                                  fontSize: 12,
                                  cursor: isArchiveBusy || isRestoreBusy ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isArchiveBusy ? 'Archiving…' : 'Archive as smoke/test artifact'}
                              </button>
                              <span style={{ fontSize: 10, color: '#64748b', maxWidth: 420, lineHeight: 1.4 }}>
                                Same as Archive with a prefilled reason; still runs the normal archive flow (unpublishes
                                links first when needed).
                              </span>
                            </div>
                          ) : null}
                          <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                            Review note (optional)
                            <textarea
                              value={attachmentReviewNoteDrafts[aid] || ''}
                              onChange={(e) =>
                                setAttachmentReviewNoteDrafts((prev) => ({ ...prev, [aid]: e.target.value }))
                              }
                              rows={2}
                              maxLength={1000}
                              placeholder="Why reviewed/rejected; constraints; follow-up needed."
                              style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: '1px solid rgba(148,163,184,0.25)',
                                background: 'rgba(2,6,23,0.65)',
                                color: '#e2e8f0',
                                fontSize: 12,
                                resize: 'vertical',
                                ...changeTextContainStyle(),
                              }}
                            />
                          </label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              disabled={isReviewBusy}
                              onClick={() => void submitAttachmentReview(aid, 'reviewed')}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid rgba(34,197,94,0.35)',
                                background: 'rgba(34,197,94,0.12)',
                                color: '#dcfce7',
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: isReviewBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Mark reviewed
                            </button>
                            <button
                              type="button"
                              disabled={isReviewBusy}
                              onClick={() => void submitAttachmentReview(aid, 'rejected')}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid rgba(244,63,94,0.35)',
                                background: 'rgba(244,63,94,0.10)',
                                color: '#fecdd3',
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: isReviewBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              disabled={isReviewBusy}
                              onClick={() => void submitAttachmentReview(aid, 'pending_review')}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid rgba(148,163,184,0.35)',
                                background: 'rgba(15,23,42,0.55)',
                                color: '#e2e8f0',
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: isReviewBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Reset to pending
                            </button>
                          </div>

                          {status === 'reviewed' && !isArchived ? (
                            <div style={{ marginTop: 6, display: 'grid', gap: 8 }}>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Phase 4C.2 · link reviewed media to a property (still private; not published).
                              </div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'minmax(0,1fr) minmax(0,140px)',
                                  gap: 8,
                                  alignItems: 'end',
                                }}
                              >
                                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4, minWidth: 0 }}>
                                  Property slug
                                  <input
                                    value={attachmentLinkSlugDrafts[aid] || ''}
                                    onChange={(e) =>
                                      setAttachmentLinkSlugDrafts((prev) => ({ ...prev, [aid]: e.target.value }))
                                    }
                                    placeholder="lm-phase2d-manual-demo"
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: 10,
                                      border: '1px solid rgba(148,163,184,0.25)',
                                      background: 'rgba(2,6,23,0.65)',
                                      color: '#e2e8f0',
                                      fontSize: 12,
                                      width: '100%',
                                      minWidth: 0,
                                      boxSizing: 'border-box',
                                    }}
                                  />
                                </label>
                                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4, minWidth: 0 }}>
                                  Slot
                                  <select
                                    value={attachmentLinkSlotDrafts[aid] || 'reference'}
                                    onChange={(e) =>
                                      setAttachmentLinkSlotDrafts((prev) => ({ ...prev, [aid]: e.target.value }))
                                    }
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: 10,
                                      border: '1px solid rgba(148,163,184,0.25)',
                                      background: 'rgba(2,6,23,0.65)',
                                      color: '#e2e8f0',
                                      fontSize: 12,
                                      width: '100%',
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    {['hero', 'card', 'detail', 'gallery', 'reference'].map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                                Link note (optional)
                                <textarea
                                  value={attachmentLinkNoteDrafts[aid] || ''}
                                  onChange={(e) =>
                                    setAttachmentLinkNoteDrafts((prev) => ({ ...prev, [aid]: e.target.value }))
                                  }
                                  rows={2}
                                  maxLength={600}
                                  placeholder="Why this asset belongs on this property."
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(148,163,184,0.25)',
                                    background: 'rgba(2,6,23,0.65)',
                                    color: '#e2e8f0',
                                    fontSize: 12,
                                    resize: 'vertical',
                                    ...changeTextContainStyle(),
                                  }}
                                />
                              </label>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  disabled={isLinkBusy}
                                  onClick={() => void submitAttachmentPropertyLink(aid)}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(56,189,248,0.35)',
                                    background: 'rgba(14,165,233,0.10)',
                                    color: '#bae6fd',
                                    fontWeight: 800,
                                    fontSize: 12,
                                    cursor: isLinkBusy ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  Link to property
                                </button>
                              </div>
                            </div>
                          ) : status === 'reviewed' && isArchived ? (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>
                              This attachment is archived. Link and publish controls are disabled; download remains
                              available. Restore to active if you need to publish again (restore does not auto-republish).
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                          Operator review is only available on Lux client-request tickets.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {attachments.length > 0 && filteredAttachments.length === 0 ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(15,23,42,0.45)',
                    fontSize: 12,
                    color: '#94a3b8',
                  }}
                >
                  No attachments match this filter. Choose All or another filter to see items again.
                </div>
              ) : null}
              <div
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: '#64748b',
                  lineHeight: 1.5,
                  borderTop: '1px solid rgba(148,163,184,0.12)',
                  paddingTop: 10,
                }}
              >
                Phase 4D.4 / 4D.5 · Cleanup: this console does not hard-delete bytes. Archive remains the safe operator
                action. Phase 4D.5 adds smoke/test hints and an optional one-click archive with a standard reason — no
                auto-archive and no bulk delete. Any future hard-delete needs a separate Lux-scoped policy and explicit
                approval.
              </div>
            </div>
            </LuxChangeCollapsibleSection>
          ) : null}

          {!showIntakeSurface && !isEstimateMode ? (
          <div style={{ ...card, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
              LEADS
              {luxLeadCrmEnabled ? (
                <span style={{ marginLeft: 8, fontWeight: 700, color: '#67e8f9', letterSpacing: '0.04em' }}>
                  · LuxeMaurice CRM (concierge)
                </span>
              ) : null}
            </div>
            {luxLeadCrmEnabled && systemGeneratedLeadCount > 0 ? (
              <div
                data-testid="lux-crm-system-generated-toggle"
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: '#94a3b8',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  lineHeight: 1.4,
                }}
              >
                <span>
                  {crmShowSystemGenerated
                    ? `Showing ${systemGeneratedLeadCount} internal / test lead${systemGeneratedLeadCount === 1 ? '' : 's'} alongside real leads.`
                    : `${systemGeneratedLeadCount} internal / test lead${systemGeneratedLeadCount === 1 ? '' : 's'} hidden from real-lead counts.`}
                </span>
                <button
                  type="button"
                  onClick={() => setCrmShowSystemGenerated((v) => !v)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: '1px solid rgba(148,163,184,0.4)',
                    background: 'rgba(15,23,42,0.55)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {crmShowSystemGenerated ? 'Hide internal / test' : 'Show internal / test'}
                </button>
              </div>
            ) : null}
            {luxLeadCrmEnabled ? (
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                {LUX_LEAD_CRM_STAGES.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 11,
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(15,23,42,0.5)',
                      color: '#e2e8f0',
                      fontWeight: 700,
                    }}
                  >
                    {luxLeadCrmStageLabel(s)}: {crmStageCounts[s] ?? 0}
                  </span>
                ))}
              </div>
            ) : null}
            {luxLeadCrmEnabled ? (
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                  alignItems: 'end',
                  minWidth: 0,
                  width: '100%',
                }}
              >
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4, minWidth: 0 }}>
                  Stage
                  <select
                    value={crmFilterStage}
                    onChange={(e) => setCrmFilterStage(e.target.value)}
                    style={{
                      ...changeSelectContainStyle(),
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  >
                    <option value="all">All stages</option>
                    {LUX_LEAD_CRM_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {luxLeadCrmStageLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4, minWidth: 0 }}>
                  Owner contains
                  <input
                    list="crm-owner-hints"
                    value={crmFilterOwner}
                    onChange={(e) => setCrmFilterOwner(e.target.value)}
                    placeholder="Filter by owner"
                    style={{
                      ...changeSelectContainStyle(),
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <datalist id="crm-owner-hints">
                    {crmOwnerHints.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </label>
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4, gridColumn: 'span 2', minWidth: 0 }}>
                  Property (slug / title / ref)
                  <input
                    value={crmFilterProperty}
                    onChange={(e) => setCrmFilterProperty(e.target.value)}
                    placeholder="e.g. lm- or partial title"
                    style={{
                      ...changeSelectContainStyle(),
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  />
                </label>
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4, minWidth: 0 }}>
                  Health
                  <select
                    value={crmFilterHealth}
                    onChange={(e) => setCrmFilterHealth(e.target.value)}
                    style={{
                      ...changeSelectContainStyle(),
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  >
                    <option value="all">All</option>
                    <option value="overdue_follow_up">Overdue next action</option>
                    <option value="stale_lead">Stale (7d+ no touch)</option>
                    <option value="untouched_new">Untouched New</option>
                  </select>
                </label>
              </div>
            ) : null}
            {luxLeadCrmEnabled && leads.length ? (
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Showing {crmVisibleLeads.length} of {leads.length} loaded leads
              </div>
            ) : null}
            <div style={{ marginTop: 10, display: 'grid', gap: 8, minWidth: 0, width: '100%' }}>
              {crmVisibleLeads.length ? (
                crmVisibleLeads.map((lead) => {
                  const lid = String(lead.id || '');
                  const activeLux = luxLeadCrmEnabled && lid && lid === selectedLeadId;
                  const ow = lead.operator_workflow;
                  return (
                    <button
                      key={lid}
                      type="button"
                      onClick={() => {
                        if (luxLeadCrmEnabled) setSelectedLeadId(lid);
                      }}
                      style={{
                        textAlign: 'left',
                        cursor: luxLeadCrmEnabled ? 'pointer' : 'default',
                        border:
                          activeLux && luxLeadCrmEnabled
                            ? '1px solid rgba(103,232,249,0.45)'
                            : '1px solid rgba(148,163,184,0.18)',
                        borderRadius: 12,
                        background: activeLux && luxLeadCrmEnabled ? 'rgba(103,232,249,0.07)' : 'rgba(2,6,23,0.45)',
                        padding: 10,
                        color: 'inherit',
                        font: 'inherit',
                        minWidth: 0,
                        maxWidth: '100%',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', ...changeTextContainStyle() }}>
                        {String(lead.name || 'Lead')}
                        {lead?.system_generated === true ? (
                          <span
                            data-testid="lux-crm-system-generated-badge"
                            title={`Hidden by default — ${lead.system_generated_reason || 'matches internal/test heuristic'}`}
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 999,
                              background: 'rgba(148,163,184,0.18)',
                              border: '1px solid rgba(148,163,184,0.35)',
                              color: '#cbd5e1',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                            }}
                          >
                            internal/test
                          </span>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8', ...changeTextContainStyle() }}>{String(lead.contact || '—')}</div>
                      <div style={{ marginTop: 6, fontSize: 10, color: '#64748b', ...changeTextContainStyle() }}>
                        Intent: <span style={{ color: '#94a3b8' }}>{intentLabel(lead.intent)}</span>
                        {lead.created_at ? (
                          <span style={{ display: 'block', marginTop: 2 }}>
                            Created: {new Date(lead.created_at).toLocaleString()}
                          </span>
                        ) : null}
                        {lead.updated_at ? (
                          <span style={{ display: 'block', marginTop: 2 }}>
                            Updated: {new Date(lead.updated_at).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      {luxLeadCrmEnabled && ow ? (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#a5f3fc', fontWeight: 750, ...changeTextContainStyle() }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minWidth: 0, maxWidth: '100%' }}>
                            <span>Stage: {String(ow.stage_label || luxLeadCrmStageLabel(ow.stage))}</span>
                            {ow.owner?.username ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(253,230,138,0.15)',
                                  border: '1px solid rgba(253,230,138,0.35)',
                                  color: '#fde68a',
                                }}
                              >
                                Owner · {String(ow.owner.username)}
                              </span>
                            ) : null}
                            {ow.overdue_follow_up ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(248,113,113,0.15)',
                                  border: '1px solid rgba(248,113,113,0.4)',
                                  color: '#fecaca',
                                }}
                              >
                                Overdue next action
                              </span>
                            ) : null}
                            {ow.stale_lead ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(251,191,36,0.12)',
                                  border: '1px solid rgba(251,191,36,0.35)',
                                  color: '#fcd34d',
                                }}
                              >
                                Stale
                              </span>
                            ) : null}
                            {ow.untouched_new ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(96,165,250,0.12)',
                                  border: '1px solid rgba(96,165,250,0.35)',
                                  color: '#bfdbfe',
                                }}
                              >
                                Untouched New
                              </span>
                            ) : null}
                          </div>
                          {ow.next_action_at ? (
                            <span style={{ display: 'block', marginTop: 6, fontWeight: 600, color: '#94a3b8', ...changeTextContainStyle() }}>
                              Next action: {new Date(ow.next_action_at).toLocaleString()}
                            </span>
                          ) : null}
                          {ow.follow_up_status ? (
                            <span style={{ display: 'block', marginTop: 4, fontWeight: 600, color: '#94a3b8', ...changeTextContainStyle() }}>
                              Follow-up: {String(ow.follow_up_status)}
                            </span>
                          ) : null}
                          {ow.latest_note?.text ? (
                            <span style={{ display: 'block', marginTop: 4, fontWeight: 600, color: '#cbd5e1', ...changeTextContainStyle() }}>
                              Latest note: {String(ow.latest_note.text).slice(0, 160)}
                              {String(ow.latest_note.text).length > 160 ? '…' : ''}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {lead.property_interest && lead.property_interest.title ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#bef264', lineHeight: 1.35, ...changeTextContainStyle() }}>
                          Property: {String(lead.property_interest.title)}
                          {lead.property_interest.slug ? ` · ref ${String(lead.property_interest.slug)}` : ''}
                          <span style={{ display: 'block', marginTop: 4, color: '#86efac', fontSize: 10, ...changeTextContainStyle() }}>
                            Discovery: {discoveryLabel(lead.property_interest.discovery_source)}
                          </span>
                          {lead.property_interest.price_range ? (
                            <span style={{ display: 'block', marginTop: 2, color: '#a3e635', fontSize: 10, ...changeTextContainStyle() }}>
                              Range: {String(lead.property_interest.price_range)}
                            </span>
                          ) : null}
                        </div>
                      ) : lead.listing ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#bef264', ...changeTextContainStyle() }}>Listing ref: {String(lead.listing)}</div>
                      ) : null}
                      <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', lineHeight: 1.35 }}>
                        Client message
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#cbd5e1', lineHeight: 1.4, ...changeTextContainStyle() }}>{String(lead.message || '—')}</div>
                    </button>
                  );
                })
              ) : leads.length ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No leads match filters.</div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No leads yet.</div>
              )}
            </div>

            {luxLeadCrmEnabled && selectedLeadId && selectedLead ? (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(148,163,184,0.18)',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: '#67e8f9', letterSpacing: '0.06em' }}>
                  OPERATOR ACTIONS — internal only (not visible on concierge)
                </div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Stage
                  <select
                    value={leadStageDraft}
                    onChange={(e) => setLeadStageDraft(e.target.value)}
                    style={{
                      ...changeSelectContainStyle(),
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  >
                    {LUX_LEAD_CRM_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {luxLeadCrmStageLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Assigned operator (owner)
                  <input
                    value={leadOwnerDraft}
                    onChange={(e) => setLeadOwnerDraft(e.target.value)}
                    placeholder="Username or handle (clear field + save to unassign)"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Next action (local time)
                  <input
                    type="datetime-local"
                    value={leadNextActionDraft}
                    onChange={(e) => setLeadNextActionDraft(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#64748b' }}>Clear the field and save to remove the reminder.</span>
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Next action note (optional)
                  <input
                    value={leadNextActionNoteDraft}
                    onChange={(e) => setLeadNextActionNoteDraft(e.target.value)}
                    placeholder="Short reminder for operators"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Follow-up status
                  <input
                    value={leadFollowDraft}
                    onChange={(e) => setLeadFollowDraft(e.target.value)}
                    placeholder="e.g. Awaiting reply — Mon"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Add internal note (appends)
                  <textarea
                    value={leadNoteDraft}
                    onChange={(e) => setLeadNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Visible only to operators on /change — not sent to the client."
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                      resize: 'vertical',
                    }}
                  />
                </label>
                {Array.isArray(selectedLead.operator_workflow?.activity) && selectedLead.operator_workflow.activity.length ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>Activity</div>
                    <div
                      style={{
                        display: 'grid',
                        gap: 6,
                        maxHeight: 220,
                        overflowY: 'auto',
                        padding: 8,
                        borderRadius: 12,
                        border: '1px solid rgba(148,163,184,0.15)',
                        background: 'rgba(15,23,42,0.35)',
                      }}
                    >
                      {selectedLead.operator_workflow.activity.map((ev, idx) => (
                        <div
                          key={`${ev.at}-${ev.kind}-${idx}`}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: '1px solid rgba(148,163,184,0.12)',
                            background: 'rgba(2,6,23,0.4)',
                          }}
                        >
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            {ev.at ? new Date(ev.at).toLocaleString() : ''} · {String(ev.actor_label || '')}
                          </div>
                          <div style={{ marginTop: 4, color: '#e2e8f0', fontWeight: 650 }}>
                            {activityKindLabel(ev.kind)}
                          </div>
                          {ev.kind === 'stage_changed' && ev.detail ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {String(ev.detail.from || '')} → {String(ev.detail.to || '')}
                            </div>
                          ) : null}
                          {ev.kind === 'follow_up_updated' && ev.detail?.status !== undefined ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {String(ev.detail.status || '—')}
                            </div>
                          ) : null}
                          {ev.kind === 'note_added' && ev.detail?.preview ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {String(ev.detail.preview)}
                              {String(ev.detail.preview).length >= 200 ? '…' : ''}
                            </div>
                          ) : null}
                          {ev.kind === 'owner_assigned' && ev.detail?.owner_username ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#fde68a' }}>
                              {String(ev.detail.owner_username)}
                            </div>
                          ) : null}
                          {ev.kind === 'next_action_updated' ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {ev.detail?.next_action_at
                                ? new Date(String(ev.detail.next_action_at)).toLocaleString()
                                : '—'}
                              {ev.detail?.next_action_note_preview ? (
                                <span style={{ display: 'block', marginTop: 2 }}>
                                  {String(ev.detail.next_action_note_preview)}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedLead.operator_workflow?.stage_audit?.length ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>Stage audit (last entries)</div>
                    <div style={{ display: 'grid', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                      {[...(selectedLead.operator_workflow.stage_audit || [])].reverse().map((a, idx) => (
                        <div
                          key={`${a.at}-${idx}`}
                          style={{ fontSize: 10, color: '#86efac', lineHeight: 1.4 }}
                        >
                          {a.at ? new Date(a.at).toLocaleString() : ''} · {String(a.operator_label || '')}:{' '}
                          {String(a.previous_stage || '')} → {String(a.new_stage || '')}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedLead.operator_workflow?.internal_notes?.length ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>Recent notes</div>
                    <div style={{ display: 'grid', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {[...(selectedLead.operator_workflow.internal_notes || [])].reverse().map((n, idx) => (
                        <div
                          key={`${n.at}-${idx}`}
                          style={{
                            padding: 8,
                            borderRadius: 10,
                            border: '1px solid rgba(148,163,184,0.15)',
                            background: 'rgba(15,23,42,0.45)',
                          }}
                        >
                          <div style={{ fontSize: 10, color: '#64748b' }}>{n.at ? new Date(n.at).toLocaleString() : ''}</div>
                          <div style={{ marginTop: 4, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{String(n.text || '')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={leadPatchBusy}
                  onClick={() => applyLuxLeadOperatorPatch()}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(103,232,249,0.35)',
                    background: 'rgba(103,232,249,0.12)',
                    color: '#ecfeff',
                    fontWeight: 850,
                    fontSize: 13,
                    cursor: leadPatchBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {leadPatchBusy ? 'Saving…' : 'Save updates'}
                </button>
                {leadPatchStatus ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{leadPatchStatus}</div>
                ) : null}
              </div>
            ) : null}
          </div>
          ) : null}

          {!showIntakeSurface && !isEstimateMode && luxLeadCrmEnabled ? (
            <div style={{ ...card, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                REQUEST SOMETHING NEW
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>
                Creates a new tenant-scoped ticket linked to the Lux programme ticket{' '}
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{LUX_PARENT_PROGRAMME_TICKET_ID}</span>. This does not
                overwrite or close the master programme ticket.
              </div>

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                  Request type
                  <select
                    value={luxReqType}
                    onChange={(e) => setLuxReqType(e.target.value)}
                    style={{
                      ...changeSelectContainStyle(),
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  >
                    <option value="property_update">Property update</option>
                    <option value="website_refinement">Website refinement</option>
                    <option value="concierge_workflow">Concierge workflow</option>
                    <option value="marketing_request">Marketing request</option>
                    <option value="crm_workflow">CRM workflow</option>
                    <option value="new_feature">New feature</option>
                    <option value="support_issue">Support issue</option>
                  </select>
                </label>

                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                  Priority
                  <select
                    value={luxReqPriority}
                    onChange={(e) => setLuxReqPriority(e.target.value)}
                    style={{
                      ...changeSelectContainStyle(),
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </label>

                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                  Optional property reference
                  <input
                    value={luxReqPropertyRef}
                    onChange={(e) => setLuxReqPropertyRef(e.target.value)}
                    placeholder="e.g. lm-nc-ridge"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  />
                </label>
              </div>

              <label style={{ marginTop: 10, fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                Title
                <input
                  value={luxReqTitle}
                  onChange={(e) => setLuxReqTitle(e.target.value)}
                  placeholder="Short summary"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: 'rgba(2,6,23,0.65)',
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
              </label>

              <label style={{ marginTop: 10, fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                Description
                <textarea
                  value={luxReqDesc}
                  onChange={(e) => setLuxReqDesc(e.target.value)}
                  rows={5}
                  placeholder="What changed, why it matters, expected outcome."
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: 'rgba(2,6,23,0.65)',
                    color: '#e2e8f0',
                    fontSize: 12,
                    resize: 'vertical',
                  }}
                />
              </label>

              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(56,189,248,0.22)',
                  background: 'rgba(14,165,233,0.06)',
                  color: '#bae6fd',
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                Uploaded media is private and reviewed by an operator before it is used on the public site.
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => void submitLuxRequest()}
                  disabled={luxReqBusy}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(34,197,94,0.35)',
                    background: 'rgba(34,197,94,0.12)',
                    color: '#dcfce7',
                    fontWeight: 850,
                    fontSize: 13,
                    cursor: luxReqBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {luxReqBusy ? 'Submitting…' : 'Submit request'}
                </button>
                <button
                  type="button"
                  onClick={() => clearLuxRequestForm()}
                  disabled={luxReqBusy}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.35)',
                    background: 'rgba(15,23,42,0.55)',
                    color: '#e2e8f0',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: luxReqBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
              {luxReqStatus ? <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>{luxReqStatus}</div> : null}
              {String(luxReqStatus || '').toLowerCase().includes('successfully') ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(34,197,94,0.35)',
                    background: 'rgba(34,197,94,0.10)',
                    color: '#dcfce7',
                    fontSize: 12,
                    fontWeight: 750,
                  }}
                >
                  Request created successfully.
                </div>
              ) : null}

              <div style={{ marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                  RELATED REQUESTS
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>Newest first · linked to programme ticket</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  {luxRequests.length ? (
                    luxRequests.map((r) => (
                      <button
                        key={String(r.ticket_id)}
                        type="button"
                        onClick={() => void onSelectTicket(String(r.ticket_id))}
                        style={{
                          textAlign: 'left',
                          border: '1px solid rgba(148,163,184,0.18)',
                          borderRadius: 12,
                          background: 'rgba(2,6,23,0.45)',
                          padding: 10,
                          color: 'inherit',
                          font: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            alignItems: 'baseline',
                            minWidth: 0,
                            width: '100%',
                          }}
                        >
                          <div style={{ ...changeFlexMainChildStyle(), fontSize: 12, fontWeight: 850, color: '#e2e8f0', ...changeTextContainStyle() }}>
                            {String(r.title || 'Request')}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>
                            {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {r.request_type ? <span>Type: {String(r.request_type).replaceAll('_', ' ')}</span> : null}
                          {r.priority ? <span>Priority: {String(r.priority)}</span> : null}
                          {r.stage ? <span>Stage: {String(r.stage)}</span> : null}
                          {r.status ? <span>Status: {String(r.status)}</span> : null}
                          {r.property_reference ? <span>Property: {String(r.property_reference)}</span> : null}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>No related requests yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 14,
            border: '1px solid rgba(244,63,94,0.35)',
            background: 'rgba(244,63,94,0.10)',
            color: '#fecdd3',
            borderRadius: 14,
            padding: 12,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      {showChangeLayoutFixture ? (
        <div style={{ ...changePanelStyle({ marginTop: 18, padding: 14 }) }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.06em' }}>
            LAYOUT FIXTURE (dev only · ?changeLayoutFixture=1)
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>
            Stress panel: long paths, URLs, JSON, and markdown should stay inside the page width.
          </div>
          <textarea
            readOnly
            value={CHANGE_LAYOUT_FIXTURE_LONG_LINE}
            rows={8}
            style={{
              marginTop: 10,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              ...changeTextContainStyle({ display: 'block' }),
            }}
          />
          <pre
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'rgba(2,6,23,0.5)',
              fontSize: 11,
              color: '#e2e8f0',
              ...changePreBlockStyle(),
            }}
          >
            {CHANGE_LAYOUT_FIXTURE_LONG_LINE}
          </pre>
        </div>
      ) : null}

      {layoutDebugEnabled && layoutDebugSnapshot ? (
        <div
          data-layout-debug-overlay="1"
          style={{
            position: 'fixed',
            bottom: 12,
            right: 12,
            zIndex: 99999,
            maxWidth: 'min(560px, calc(100vw - 24px))',
            maxHeight: '42vh',
            overflow: 'auto',
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(56,189,248,0.45)',
            background: 'rgba(2,6,23,0.92)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            fontSize: 11,
            color: '#e2e8f0',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <div style={{ fontWeight: 950, color: '#7dd3fc', marginBottom: 8 }}>?layoutDebug=1</div>
          <div style={{ ...changeTextContainStyle({ whiteSpace: 'pre-wrap', marginBottom: 8 }) }}>
            {JSON.stringify(
              {
                docScrollWidth: layoutDebugSnapshot.docScrollWidth,
                docClientWidth: layoutDebugSnapshot.docClientWidth,
                innerWidth: layoutDebugSnapshot.innerWidth,
                docOverflowPx: layoutDebugSnapshot.docScrollWidth - layoutDebugSnapshot.innerWidth,
              },
              null,
              2,
            )}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
            Red outline: wider than viewport · Orange: internal scroll (scrollWidth {'>'} clientWidth+5)
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {(layoutDebugSnapshot.items || []).slice(0, 40).map((row, idx) => (
              <div
                key={`${row.path}-${idx}`}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: '1px solid rgba(148,163,184,0.22)',
                  background: 'rgba(15,23,42,0.55)',
                  ...changeTextContainStyle(),
                }}
              >
                <div style={{ color: '#fde68a', fontWeight: 800 }}>
                  {row.widerThanViewport ? 'VIEWPORT ' : ''}
                  {row.internalOverflow ? 'INTERNAL ' : ''}
                  {'<'}
                  {row.tag}
                  {'>'}
                </div>
                <div style={{ marginTop: 4, color: '#cbd5e1', wordBreak: 'break-all' }}>{row.path}</div>
                <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                  cw:{row.clientWidth} sw:{row.scrollWidth} rectW:{Math.round(row.rectWidth)} rectR:
                  {Math.round(row.rectRight)}
                </div>
                {row.className ? (
                  <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>class: {row.className}</div>
                ) : null}
                {row.styleHint ? (
                  <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>{row.styleHint}</div>
                ) : null}
                {row.textSample ? (
                  <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8' }}>{row.textSample}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

