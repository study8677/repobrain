import AiLeadRescueAdminList from '../../../components/AiLeadRescueAdminList.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';
import { loadAiLeadRescueListData } from '../../../lib/server/admin-lead-rescue-api.js';

export default function AdminLeadRescueIndexPage({ initialLeads, initialError }) {
  return <AiLeadRescueAdminList initialLeads={initialLeads} initialError={initialError} />;
}

/**
 * SSR pre-populates the AI Lead Rescue list so the page never shows a permanent "Loading…".
 * If the DB call fails server-side, we still render the page with an error envelope so the
 * operator sees the diagnostic message + Retry button instead of a stuck spinner.
 */
export async function getServerSideProps({ req }) {
  const gate = requireAdminPageSession(req, '/admin/lead-rescue');
  if ('redirect' in gate) return gate;

  let initialLeads = null;
  let initialError = null;
  try {
    const result = await loadAiLeadRescueListData({ filters: {} });
    if (result && result.ok === true) {
      initialLeads = Array.isArray(result.leads) ? result.leads : [];
    } else if (result && result.ok === false) {
      initialError = {
        error: result.error || 'LOAD_FAILED',
        message: result.message || 'Could not load AI Lead Rescue leads.',
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

  return {
    props: {
      ...gate.props,
      initialLeads,
      initialError,
    },
  };
}
