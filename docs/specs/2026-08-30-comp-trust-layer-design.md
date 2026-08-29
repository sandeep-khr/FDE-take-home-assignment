# Comp Trust Layer — submission design

**Date:** 2026-08-30 · **Status:** Approved in discussion (Option A) · **Owner:** the candidate; Claude pairs

The Flent FDE take-home, Problem 1 ("the market data lies to us"). This doc records the
design agreed in chat so the build stays honest to it. It is a working document for us,
not a submission artifact.

## Story of the submission

> Your median is only as good as the evidence under it. This is the layer that grades
> that evidence — and shows its work.

Core reframe: the enemy is not junk listings, it is **silent cleaning**. Nothing is
deleted; every listing carries a trust grade with written reasons, exclusions remain
inspectable, and a reviewer can overturn any decision and watch the estimate recompute.
Second reframe: even a clean comp set measures **asking prices, not achieved rents** —
the output is an "ask benchmark" and says so; calibration against signed rents is an
execution-plan item, not scope creep here.

## Deliverables

1. **Approach note** (≤4 pages, PDF) — written by the candidate in their own voice;
   Claude critiques. Maps 1:1 to the brief's required bullets, ending with the honest
   AI-usage note built from `ai-usage-log.md`.
2. **Proof of work** (Option A) — deterministic pipeline + crafted review web app:
   - Pipeline: typed TypeScript module, case-packet data baked in, zero network calls,
     unit-tested rules, every threshold a named, labeled assumption.
   - App: static single-page build (deployable as a link), a guided ~5-minute review:
     raw pull → trust decisions listing-by-listing → duplicate clusters → surviving
     comp set → benchmark + confidence → leave-one-out sensitivity → failure case →
     live human overrides (local state, logged with reasons).
   - No backend, no DB, no infra. The repo itself is part of the proof.
3. **Execution plan** — 1 parent issue + ~7 ordered sub-issues, drafted by the
   candidate, reviewed hard. First metric: reviewer override rate + share of
   insufficient-evidence outputs (catches over-filtering and false confidence).

## Pipeline stages (all deterministic, all reason-emitting)

1. **Normalize** — dates, rents; canonical society + locality via a human-editable
   alias map surfaced in the UI.
2. **Duplicate clustering** — same canonical society + BHK + area within tolerance +
   overlapping live windows ⇒ cluster; representative row chosen by visible rule
   (owner over broker, then freshest); intra-cluster rent spread kept as evidence.
3. **Trust grading** — small legible rule set: staleness vs the 2026-08-18 snapshot,
   BHK/area mislabel checks, bait (anomalously low) and aspirational (anomalously
   high + long-lived) price flags, deposit sanity, poster type, photo count.
   Output: grade A–D + reasons list. Not ML. Thresholds ratified by the candidate
   from the Day-1 data exploration.
4. **Tiered comp selection** — Tier 1 same society matching config + furnishing;
   then same society other furnishing (labeled adjustment or exclusion); then
   micromarket matches. Subject: 2BHK semi-furnished, Lakeview Residences
   (canonical), Harlur–Sarjapur Road.
5. **Estimate + confidence** — trust-weighted median + range; confidence
   High/Medium/Low/Insufficient from effective N after dedup, evidence age,
   dispersion, source diversity; leave-one-out swing caps confidence.
6. **Verdict** — benchmark vs the landlord's ₹56k + ₹5k maintenance ask, with the
   listings' maintenance-inclusion ambiguity stated, plus the ask-vs-achieved
   asterisk.
7. **Failure case (first-class state)** — same pipeline on a thin segment returns
   INSUFFICIENT EVIDENCE with reasons and a "what to collect next" list. A designed
   moment, not an error screen.

## Visual direction

Flent's own language (cream ground, ink text, deep green accent, serif-italic
accents, pill chips, editorial card craft) executed at Shopify-Editions polish. The
proof should read as "this person already works here," not a portfolio piece.

## Working agreement

- The candidate makes every judgment call (thresholds, scope cuts, verdicts) and
  writes all submission prose; Claude explores data, stress-tests, builds with the
  candidate, verifies arithmetic, and critiques drafts as a hostile Flent reviewer.
- `ai-usage-log.md` is updated as we go and feeds the required AI-usage note.
  No concealment of AI use — Flent explicitly requires disclosure.
- Never invent evidence. The case packet is the complete world. Synthetic data, if
  any, is labeled loudly.

## Out of scope (deliberate)

- Scraping, storage, auth, persistence, ML price models, production thresholds,
  solving Problems 2–3 (beyond the calibration hook in the execution plan).

## Ratified ruleset (2026-08-30, from Day-1 exploration + candidate approval)

1. **Quarantine (grade D, reasons shown, never deleted):** CP-0082 impossible value ·
   CP-0083 error/luxury outlier · CP-0085 attribute mislabel + dead · CP-0084
   provenance inconsistency (last_seen < posted) · CP-0081 subject self-match
   (circular evidence).
2. **Staleness:** dark >30d excluded · 15–30d grade B (downweight ×0.5) · ≤14d full
   weight. Snapshot = 2026-08-18.
3. **Duplicate auto-merge:** same bridged society family + posted/last-seen within
   3d + area ≤25sf + (deposit exact OR rent ≤2%). Representative: owner-posted,
   else freshest. Intra-cluster rent spread displayed. Cross-society near-clones →
   human suspect queue only (CP-0026/0053 precedent).
4. **Alias policy:** ≥2 independent clone-bridges ⇒ auto-merge names (Lakeview
   family incl. Phase 1) · exactly 1 ⇒ suspected-same, human confirms (Fern Grove ↔
   Fern Grove Residency) · 0 ⇒ distinct (FernGrove Apartments; Bluewater variants).
5. **Aspirational downweight:** live window >60d and still listed ⇒ weight ×0.5,
   labeled ceiling evidence (5 of 19 Tier-1 rows).
6. **Deposit signal: weak/contextual only.** Bangalore's historic norm is 5–10
   months (web-verified context), so high multiples are not junk markers; exact
   3.0× template pattern logged as observation only.
7. **Confidence ladder:** High = N≥8 ∧ ≥3 sources ∧ LOO swing <₹1k ∧ median age
   <45d · Medium = N 4–7 ∨ swing <₹2.5k · Low = N 2–3 ∨ single-source dominance ·
   Insufficient = N≤1 ∨ swing ≥₹2.5k. Verdict always quotes median + range.
8. **Verdict framing:** benchmark vs ask shown under both maintenance readings
   (listings all-in vs base) — the ambiguity flips the sign (+2.5% vs −6%) and is
   named the top data fix; ask-vs-achieved asterisk always present.
9. **Failure-case demo:** fully-furnished Lakeview segment (4 weak survivors) ⇒
   LOW/INSUFFICIENT + collect-next list; secondary: 3BHK ask ⇒ N=0 after
   quarantine.

External context verified on the open web (framing only, never case evidence):
maintenance is conventionally a separate, inconsistently captured charge on Indian
rental platforms; Karnataka's 2025/26 rent-amendment reportedly caps residential
deposits at 2 months (in force Jan 2026) — the deal's 5-month ask is flagged for
legal review as negotiation leverage, labeled "reported, verify," never asserted.

## Risks

- Over-polished UI outshining substance → mitigate: UI exists to make evidence
  inspectable; every screen answers a reviewer question from the brief.
- Reviewer opens repo, not link → README gives the 5-minute path both ways.
- Voice drift toward AI-ese → candidate rewrites all prose start-to-finish on the
  final day; Claude checks facts only, not phrasing, on that pass.
