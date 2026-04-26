import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function str(v) {
  return v != null ? String(v).trim() : '';
}

function normalizeEmail(v) {
  return str(v).toLowerCase();
}

function resolveTenantIdFromReq(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    const tid = str(ctx.tenant_id);
    return tid || null;
  } catch {
    return null;
  }
}

function safePublicLead(lead) {
  return {
    lead_id: lead.id,
    status: lead.status,
  };
}

function computeQualificationScore(q) {
  const o = q && typeof q === 'object' ? q : {};
  const budget = str(o.budget);
  const intent = str(o.intent);
  const timeline = str(o.timeline);
  const complete = Boolean(intent && timeline);
  const qualified = complete;
  return {
    status: qualified ? 'qualified' : complete ? 'engaged' : 'new',
    qualified,
    complete,
    fields: { budget: budget || null, intent: intent || null, timeline: timeline || null },
  };
}

export async function handleTenantLeadCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const tenantId = resolveTenantIdFromReq(req);
  if (!tenantId) return res.status(404).json({ error: 'TENANT_NOT_FOUND' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  const b = body && typeof body === 'object' ? body : {};
  const name = str(b.name);
  const email = normalizeEmail(b.email);
  const phone = str(b.phone) || null;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'email is required' });

  const intent = 'private_listings_france_lead';
  const market = 'France';
  const listing = 'private_internal_listings';

  try {
    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name,
        email,
        phone,
        intent,
        market,
        listing,
        status: 'new',
        qualificationJson: null,
        score: null,
      },
    });
    return res.status(200).json({
      ok: true,
      ...safePublicLead(lead),
      auto_response: {
        message:
          'Thanks — to match you with the right private listings in France, please answer 3 quick questions.',
        questions: [
          { key: 'budget', label: 'Budget range (optional)' },
          { key: 'intent', label: 'What are you looking for (buy/rent, location, must-haves)?' },
          { key: 'timeline', label: 'When do you want to move / transact?' },
        ],
      },
    });
  } catch (e) {
    return res.status(500).json({ error: 'LEAD_CREATE_FAILED', detail: String(e?.message || e) });
  }
}

export async function handleTenantLeadQualify(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const tenantId = resolveTenantIdFromReq(req);
  if (!tenantId) return res.status(404).json({ error: 'TENANT_NOT_FOUND' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  const b = body && typeof body === 'object' ? body : {};
  const leadId = str(b.lead_id || b.leadId);
  const answers = b.answers && typeof b.answers === 'object' ? b.answers : null;
  if (!leadId) return res.status(400).json({ error: 'lead_id is required' });
  if (!answers) return res.status(400).json({ error: 'answers is required' });

  const score = computeQualificationScore(answers);
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || String(lead.tenantId || '') !== tenantId) return res.status(404).json({ error: 'Lead not found' });

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        qualificationJson: score.fields,
        status: score.status,
        score: score.qualified ? 'qualified' : score.complete ? 'engaged' : 'new',
      },
    });

    if (score.qualified) {
      try {
        console.warn('[lead_alert] qualified', JSON.stringify({ tenant_id: tenantId, lead_id: leadId }));
      } catch {
        /* ignore */
      }
    }

    return res.status(200).json({
      ok: true,
      ...safePublicLead(updated),
      qualified: score.qualified,
    });
  } catch (e) {
    return res.status(500).json({ error: 'LEAD_QUALIFY_FAILED', detail: String(e?.message || e) });
  }
}

