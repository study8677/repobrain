import AiLeadRescueAdminDetail from '../../../components/AiLeadRescueAdminDetail.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';
import { loadAiLeadRescueDetailData } from '../../../lib/server/admin-lead-rescue-api.js';

export default function AdminLeadRescueDetailPage({ initialLead, initialError, leadId }) {
  return (
    <AiLeadRescueAdminDetail
      initialLead={initialLead}
      initialError={initialError}
      leadId={leadId}
    />
  );
}

/**
 * SSR pre-populates the detail view so the page never renders blank/black.
 * Auth gate runs first; if the loader fails (or the lead doesn't exist) we still
 * render the page with an `initialError` envelope and a Back-to-list / Retry /
 * raw-API link affordance — the operator never sees an unactionable surface.
 */
export async function getServerSideProps({ req, params }) {
  const id = typeof params?.id === 'string' ? params.id : '';
  const nextPath = id ? `/admin/lead-rescue/${id}` : '/admin/lead-rescue';
  const gate = requireAdminPageSession(req, nextPath);
  if ('redirect' in gate) return gate;

  let initialLead = null;
  let initialError = null;
  if (!id) {
    initialError = {
      error: 'ID_REQUIRED',
      message: 'No lead id was provided in the URL.',
      http_status: 400,
    };
  } else {
    try {
      const result = await loadAiLeadRescueDetailData({ id });
      if (result && result.ok === true) {
        initialLead = result.lead;
      } else if (result && result.ok === false) {
        initialError = {
          error: result.error || 'LOAD_FAILED',
          message: result.message || 'Could not load lead.',
          http_status: result.http_status || 500,
        };
      }
    } catch (e) {
      initialError = {
        error: 'SSR_LOAD_FAILED',
        message: e instanceof Error ? e.message : String(e),
        http_status: 500,
      };
    }
  }

  return {
    props: {
      ...gate.props,
      initialLead,
      initialError,
      leadId: id,
    },
  };
}
