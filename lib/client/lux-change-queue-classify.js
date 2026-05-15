import { LUX_PARENT_PROGRAMME_TICKET_ID } from '../cmp/_lib/lux-client-requests.js';
import { LUX_PHASE1_REVIEW_TICKET_ID } from '../cmp/_lib/client-decisions-client.js';

/**
 * @typedef {'programme' | 'client_request' | 'smoke_test' | 'media' | 'property' | 'other'} LuxQueueBucket
 */

/**
 * @param {{ ticket_id?: string, requested_change?: string }} row
 * @returns {{ bucket: LuxQueueBucket, badge: string }}
 */
export function classifyLuxChangeQueueTicket(row) {
  const id = String(row?.ticket_id || '').trim();
  const title = String(row?.requested_change || '').trim();
  const hay = `${id} ${title}`.toLowerCase();

  if (id === LUX_PARENT_PROGRAMME_TICKET_ID) {
    return { bucket: 'programme', badge: 'Programme' };
  }
  if (id === LUX_PHASE1_REVIEW_TICKET_ID) {
    return { bucket: 'programme', badge: 'Programme' };
  }

  if (
    /\bsmoke\b|\btest\b|qa\s*fixture|verification\s*artifact|phase\s*[0-9][a-z.]?\s*smoke|example\.invalid|\/smoke\//i.test(
      hay,
    )
  ) {
    return { bucket: 'smoke_test', badge: 'Smoke/test' };
  }
  if (/\bmedia\b|attachment|publish|unpublish|lifecycle|gallery|hero\s*slot|card\s*slot/i.test(hay)) {
    return { bucket: 'media', badge: 'Media' };
  }
  if (/\bproperty\b|listing|lux.?postgres|\/properties|property.?editor|slug\s*lm-/i.test(hay)) {
    return { bucket: 'property', badge: 'Property' };
  }
  if (/\bconcierge\b|\blead\b|crm|client\s*request|intake|enquiry/i.test(hay)) {
    return { bucket: 'client_request', badge: 'Client request' };
  }
  return { bucket: 'other', badge: 'Ticket' };
}

/**
 * Primary queue first, smoke/test last (still visible; not deleted).
 *
 * @param {Array<{ ticket_id?: string, requested_change?: string }>} tickets
 * @returns {{ primary: typeof tickets, smoke: typeof tickets }}
 */
export function partitionLuxChangeQueueTickets(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const primary = [];
  const smoke = [];
  for (const t of list) {
    if (classifyLuxChangeQueueTicket(t).bucket === 'smoke_test') smoke.push(t);
    else primary.push(t);
  }
  return { primary, smoke };
}
