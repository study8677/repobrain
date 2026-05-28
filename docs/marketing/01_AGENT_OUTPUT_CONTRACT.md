# Agent Output Contract for Marketing, Sales, and Client-Facing Work

Status: Mandatory  
Purpose: Force execution-layer AI agents to generate commercially useful, high-trust, visually disciplined deliverables.

## 1. Definition of done

An agent output is done only when it includes the asset requested, the supporting validation logic, and a quality-gate self-check.

A response that only produces copy is incomplete unless the task explicitly asks for copy only.

## 2. Required agent behavior

For every prospect-facing or client-facing output, the agent must:

1. Identify the target audience.
2. Identify the buyer stage.
3. State the intended commercial outcome.
4. Produce the requested asset.
5. Add proof or clearly identify missing proof.
6. Add or reference the next validation asset.
7. Include the next action / CTA.
8. Run the quality gate.

## 3. Required output header

Every agent response for external communications must begin with:

```markdown
Definition of done: [one sentence]
Audience: [segment / role]
Stage: [awareness / consideration / conversion / onboarding / retention / expansion]
Commercial outcome: [what this asset must cause]
Primary asset: [what was produced]
Validation asset: [what supports or should support it]
Proof status: [approved proof used / proof missing / proof needed]
```

## 4. Required content structure

Agents must use the following structure unless the requested channel has a stricter format:

```markdown
## Hook
[The attention-grabbing message]

## Buyer problem
[The specific pain, risk, cost, delay, or missed opportunity]

## CorpFlowAI mechanism
[How we solve it in operational terms]

## Proof / validation
[Source, example, case, screenshot, metric, process, or artifact]

## Objection handling
[Likely concern and answer]

## CTA
[One clear next action]

## Next validation asset
[Landing page, FAQ, one-pager, video, checklist, case study, proposal section, or onboarding guide]
```

## 5. Channel-specific rules

### Website / landing page

Must include:

- Hero claim.
- Subclaim.
- Who it is for.
- Problem block.
- Mechanism block.
- Proof block.
- FAQ or objection block.
- Primary CTA.
- Secondary CTA.
- Visual direction.

### Social post

Must include:

- First-line hook.
- One clear idea.
- Practical takeaway.
- CTA or conversation prompt.
- Suggested visual or carousel structure.
- Link to validation asset when relevant.

### Email

Must include:

- Subject line.
- First sentence that proves relevance.
- No generic hype.
- One reason to care.
- One proof point or credibility cue.
- One next step.

### Proposal / sales document

Must include:

- Buyer situation.
- Desired outcome.
- Scope boundaries.
- Proof / risk reduction.
- Timeline or implementation path.
- Decision next step.

### Video script

Must include:

- First 3-second hook.
- Scene-by-scene structure.
- Spoken copy.
- On-screen text.
- Visual evidence or product view.
- CTA.
- Companion written asset.

### Client management / onboarding

Must include:

- What changed or what happens next.
- Why it matters.
- What the client needs to do.
- Where the client can validate or revisit the information.
- Expected outcome.

## 6. Disallowed output patterns

Agents may not produce:

- Unsupported claims presented as facts.
- Generic “we help businesses grow” copy.
- Vague premium language without operational meaning.
- Long unbroken paragraphs.
- CTA clutter.
- Decorative visual suggestions that do not improve comprehension.
- Copy that contradicts approved website, offer, or sales documentation.
- Standalone short-form content with no validation path.

## 7. Agent quality gate

Every agent must include this checklist at the end of the work:

```markdown
## Quality gate
- Clear in 10 seconds: Yes/No
- Specific buyer problem: Yes/No
- Proof included or flagged: Yes/No
- Scannable structure: Yes/No
- Visual direction included where useful: Yes/No
- CTA is singular and obvious: Yes/No
- Validation asset included or requested: Yes/No
- No unsupported hype: Yes/No
- Aesthetic standard considered: Yes/No
```

If any answer is No, the agent must revise before handing off.
