# Delivery Quality Gate for External Communications

Status: Mandatory preflight before publishing, sending, or handing to development

## 1. Purpose

This quality gate protects CorpFlowAI from weak external communication, inconsistent claims, low-trust AI output, and aesthetically careless delivery.

## 2. Mandatory review checklist

### Strategic clarity

- The audience is explicit.
- The buyer stage is explicit.
- The commercial outcome is explicit.
- The asset has one primary job.

### Message quality

- The opening is specific and useful.
- The buyer problem is concrete.
- The benefit is stated in outcome language.
- The mechanism is understandable.
- The CTA is singular and obvious.

### Proof and trust

- Important claims are supported.
- Unsupported claims are softened or flagged.
- The asset is consistent with approved positioning.
- The asset does not contradict website, sales, or product documentation.
- The proof is recent enough for the claim being made.

### Scannability

- The asset can be understood quickly.
- Long paragraphs are avoided.
- Section headings carry meaning.
- Important information is visually findable.
- Tables, bullets, or diagrams are used where they reduce cognitive load.

### Visual and aesthetic quality

- The visual direction supports comprehension.
- The layout implies premium competence.
- There is enough whitespace.
- There is no decorative clutter.
- Screenshots, diagrams, or real product visuals are preferred over generic imagery.
- The page, post, video, or document feels deliberate rather than assembled.

### Conversion logic

- The next action is clear.
- A lower-friction path exists where appropriate.
- Objections are handled before the CTA where needed.
- The asset links to or references a validation asset.
- The asset moves the buyer one step forward.

### Client-facing trust

- Client instructions are clear.
- Next steps are unambiguous.
- Responsibilities are assigned where relevant.
- The content reduces support burden or decision confusion.

## 3. Scoring model

Each category is scored from 0 to 2:

- 0 = missing or weak.
- 1 = acceptable but needs improvement.
- 2 = strong.

Categories:

1. Strategic clarity.
2. Message quality.
3. Proof and trust.
4. Scannability.
5. Visual / aesthetic quality.
6. Conversion logic.
7. Channel fit.

Minimum publish score: 12 / 14.  
Anything below 12 must be revised.

## 4. Mandatory handoff format

When handing work to an engineer, designer, Cursor, or another agent, use:

```markdown
Definition of done: [one sentence]
Likely area: [app code / content / design / analytics / documentation]
Assets affected: [paths, pages, channels, files]
Commercial goal: [what buyer behavior this should improve]
Required proof: [approved proof or proof needed]
Visual standard: [what must be true aesthetically]
Verification: [URL, preview, screenshot, checklist, or acceptance test]
Do not change: [scope boundaries]
Handoff: [one paragraph with exact implementation instructions]
```

## 5. Final release rule

No prospect-facing or client-facing work should be shipped without a visible quality-gate statement in the PR, issue, chat handoff, or approval note.
