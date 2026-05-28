# Content Atom Schema

Status: Mandatory source-of-truth structure for AI-retrievable marketing and sales knowledge

## 1. Purpose

Execution-layer AI agents perform better when they retrieve approved, structured content instead of improvising. A content atom is a reusable unit of commercial truth.

Each atom connects a buyer problem, approved claim, proof, objection, CTA, and channel guidance.

## 2. YAML schema

```yaml
content_atom:
  id: "CF-MKT-0001"
  status: "draft | approved | deprecated"
  owner: ""
  last_reviewed: "YYYY-MM-DD"
  next_review_due: "YYYY-MM-DD"

  audience:
    segment: ""
    role: ""
    industry: ""
    company_stage: ""
    geography: ""

  buyer_context:
    funnel_stage: "awareness | consideration | conversion | onboarding | retention | expansion"
    buyer_problem: ""
    business_cost: ""
    desired_outcome: ""
    urgency_trigger: ""

  approved_positioning:
    primary_claim: ""
    secondary_claims:
      - ""
    mechanism: ""
    differentiators:
      - ""
    disallowed_claims:
      - ""

  proof:
    proof_points:
      - claim_supported: ""
        proof_type: "case | metric | testimonial | screenshot | workflow | external_source | internal_artifact"
        source_id: ""
        source_location: ""
        freshness_date: "YYYY-MM-DD"
        confidence: "high | medium | low"
    proof_gaps:
      - ""

  objections:
    - objection: ""
      approved_response: ""
      proof_to_use: ""

  assets:
    attention_assets:
      - "social_post | short_video | carousel | hero_visual | headline"
    validation_assets:
      - "landing_page | FAQ | one_pager | case_study | demo | proposal_section | onboarding_guide"
    existing_asset_links:
      - ""
    needed_assets:
      - ""

  channel_guidance:
    website: ""
    linkedin: ""
    email: ""
    video: ""
    proposal: ""
    onboarding: ""

  cta:
    primary_cta: ""
    secondary_cta: ""
    disallowed_ctas:
      - ""

  tone:
    style: "clear, premium, direct, evidence-aware"
    words_to_use:
      - ""
    words_to_avoid:
      - ""

  compliance:
    legal_notes: ""
    privacy_notes: ""
    claims_restrictions: ""
```

## 3. Minimum viable atom

If time is limited, an agent may create a reduced atom, but it must still include:

- Audience.
- Buyer problem.
- Desired outcome.
- Approved claim.
- Proof status.
- Objection.
- CTA.
- Validation asset.

## 4. Approval standard

A content atom may not be marked approved unless:

- The claim is specific.
- Proof exists or the claim is intentionally framed as a hypothesis.
- Disallowed claims are documented.
- The CTA is clear.
- The atom has an owner and review date.

## 5. Agent retrieval instruction

Before producing marketing, sales, or client-facing copy, agents must first search for relevant content atoms. If no atom exists, the agent must create a draft atom before producing final copy.
