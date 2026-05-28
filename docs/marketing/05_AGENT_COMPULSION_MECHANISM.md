# Agent Compulsion Mechanism

Status: Mandatory operating mechanism

## 1. Objective

The goal is to repeatedly force all AI agents, Cursor sessions, repo workstreams, marketing chats, sales chats, and development handoffs to operate against CorpFlowAI’s commercial communication standards.

The mechanism is not a reminder. It is a recurring gate.

## 2. The four enforcement layers

### Layer 1: Source-of-truth documents

The following documents must be treated as required context:

- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`
- `docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`
- `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md`
- `docs/marketing/03_CONTENT_ATOM_SCHEMA.md`
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md`
- `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`

Any agent producing external-facing work must cite which of these documents it used.

### Layer 2: Mandatory prompt preamble

Every new agent, Cursor, or marketing workstream must receive this preamble:

```markdown
Before producing prospect-facing or client-facing work, read and apply the CorpFlowAI marketing execution standards in `docs/marketing/`.

You must follow the Hook / Proof / Depth doctrine, the dual-asset pattern, the Agent Output Contract, and the Delivery Quality Gate.

Do not produce unsupported hype. Do not produce standalone attention assets without a validation path. Do not sacrifice technical precision for aesthetics or aesthetics for technical precision. CorpFlowAI deliverables must be commercially effective, technically exact, visually disciplined, and trust-building.

Your response must include:
1. Definition of done.
2. Audience and funnel stage.
3. Commercial outcome.
4. Proof status.
5. Requested asset.
6. Validation asset.
7. Quality-gate checklist.
```

### Layer 3: PR / issue checklist

Every PR or issue affecting external communication must include:

```markdown
## Marketing / Sales Quality Gate
- [ ] I checked `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`.
- [ ] I checked `docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`.
- [ ] The asset has Hook / Proof / Depth.
- [ ] The asset has a validation path.
- [ ] Claims are supported or explicitly flagged.
- [ ] The copy is scannable and buyer-specific.
- [ ] The visual direction supports comprehension.
- [ ] The CTA is singular and clear.
- [ ] The final output meets the Delivery Quality Gate score of 12/14 or better.
```

### Layer 4: Automated repository check

Add a lightweight script that checks whether PR or handoff markdown includes references to required marketing quality-gate language when relevant files change.

Recommended script path:

`scripts/check-marketing-quality-gate.mjs`

Recommended CI behavior:

- Warn on documentation-only branches.
- Fail on production-facing web, landing page, sales, or client content changes if no quality-gate marker exists.

## 3. Required recurring operator command

Use this command at the start of any marketing, sales, website, or client-facing workstream:

```markdown
Apply the CorpFlowAI Marketing Communication Standard from `docs/marketing/` as non-negotiable operating context. Produce the requested work only after enforcing the Agent Output Contract, Hook / Proof / Depth doctrine, dual-asset pattern, and Delivery Quality Gate. If proof is missing, flag it and produce the safest commercially useful version.
```

## 4. Agent refusal / revision trigger

Agents must stop and revise if they detect:

- unsupported claims;
- generic copy;
- weak CTA;
- no validation asset;
- visual direction with no cognitive purpose;
- contradiction with approved source-of-truth documentation;
- client-facing ambiguity;
- lack of quality-gate result.

## 5. Human approval trigger

Human review is required when:

- A claim references measurable financial, legal, operational, or performance results.
- A client name or case result is used.
- Pricing, guarantees, refunds, legal compliance, or regulated industries are mentioned.
- The asset becomes a public website page, paid ad, proposal, or contract-adjacent document.
