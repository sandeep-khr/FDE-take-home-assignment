# AI usage log

Running, honest record of where AI (Claude) helped and where the candidate's own
judgment entered. Feeds the AI-usage note required in the approach note.

## 2026-08-30

- Claude read the full brief, case packet, context pack and screenshots; summarized
  the assignment and surfaced planted data traps (society aliasing, cross-posts,
  stale rows, a mislabeled 3BHK, censored outcomes, screenshot product smells).
- Candidate decided: attack Problem 1; proof of work as a web app; pairing workflow;
  no concealment of AI use — disclosure framed as an FDE strength.
- Design co-created in discussion; candidate approved Option A (static pipeline +
  review app) over a full-stack build and a notebook/report. Spec written to
  `docs/specs/2026-08-30-comp-trust-layer-design.md`.
- Claude wrote and ran the Day-1 exploration scripts over `listings.csv`
  (`exploration/`), surfacing: 5 quarantine candidates (incl. CP-0081, a probable
  cross-post of the subject deal itself), 14 strict clone pairs, evidence-bridged
  society aliasing, aspirational long-lived asks, and the maintenance-inclusion
  ambiguity that flips the deviation verdict's sign. Claude's first loose dedup
  rule over-merged 31 rows into one cluster (Tier 1 → N=2); tightened after
  inspection — kept as a documented lesson about over-cleaning.
- Findings written to `exploration/FINDINGS.md`. Candidate to ratify every
  threshold and rule (staleness cutoff, dedup criteria, alias policy, aspirational
  downweighting, confidence ladder, quarantine list, failure-case choice) —
  pending.
