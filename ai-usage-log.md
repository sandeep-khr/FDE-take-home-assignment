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

## 2026-08-30 (build session, Tasks 1–7)

- Claude wrote the TypeScript pipeline test-first against ground-truth numbers
  from the exploration; candidate's ratified ruleset is the normative spec.
- Two fixture corrections surfaced DURING build (both favoring the ratified
  rules over the exploration preview): CP-0026 stays contributing (cross-society
  near-clone → suspect queue, not duplicate) and CP-0015 stays at half weight
  (gray, not dead) → Tier 1 N=21, median unchanged ₹59,500. Verified
  independently in Python before fixing any test.
- One design amendment made by Claude pending candidate sign-off: confidence
  ladder now runs on effective N (Σ trust weights) with AND-ed criteria — the
  ratified OR-form would have graded the 4-row furnished segment "medium" on
  stability alone.
- Golden-run fixture generated and eyeballed against FINDINGS before commit.

## 2026-08-30 (build session, Tasks 8–13)

- Claude built the review app (Vite + React) in Flent's visual language with the
  frontend-design pass: evidence-funnel rail, ticker, ten scenes, live overrides.
  Candidate directed the craft bar ("Shopify-Editions level, Flent's own idiom").
- Verified in-browser: the override demo degrades confidence HIGH → MEDIUM when a
  load-bearing comp is pulled — emergent from the ratified ladder, not scripted.
- 58 automated tests green; production build clean.

## 2026-08-30 (prep session)

- Claude added the "act on it" strip to the verdict scene (closing the brief's
  "output they could genuinely act on" requirement explicitly).
- Claude wrote two PRIVATE prep documents (kept outside this repo): a study
  guide covering every rule, threshold, formula and scope cut with worked
  examples, and an approach-note skeleton (structure, beats, voice rules).
  Agreement unchanged: the candidate writes all submission prose; Claude
  critiques and fact-checks.

## 2026-08-30 (v2 redesign)

- Candidate rejected the v1 UI ("not easy to read; ticker and navbar-like rail")
  — correct critique. Claude rebuilt the app as a data-driven editorial essay:
  killed the ticker and the sticky rail (only fixed element now is a 3px
  reading-progress line), introduced the "census of 86" signature (every
  listing a physical cell, judged as the story progresses), oversized chapter
  numerals, tables demoted behind progressive disclosure, one inversion moment
  (the refusal chapter on deep pine). Tests unchanged and green throughout.

## 2026-08-30 (map decision)

- Candidate proposed plotting the 86 listings on a locality map in the hero to
  show "which locality is fooling more." Checked against the data together:
  no coordinates, anonymised societies (packet forbids identification), and
  junk-by-locality differences are noise on tiny, unreliable samples (e.g.
  5/14 vs 3/29) while the real concentration is behavioral (broker rows 36%
  junk/dup vs 22% owner). Candidate's call: no map in the proof of work; the
  idea is banked as a production execution-plan item (geo trust telemetry once
  real coordinates exist) and a scope-cut line in the approach note.

## 2026-08-30 (verification session)

- Candidate asked for the complete audit trail — every algorithm and
  assumption, verifiable from scratch. Claude added `npm run audit` (prints
  the full per-row reasoning trace from the golden run) and wrote a private
  audit-trail document with a numbered assumption register (packet facts vs
  ratified rules vs conventions), hand-verification recipes, and a
  challenge-first list. Verification and any rule changes are the candidate's.

## 2026-08-30 (research integration)

- Candidate brought external research (AVM FSD confidence, Splink-style record
  linkage, reported Indian rental-fraud patterns, MAD/bootstrap statistics,
  delisting-speed signal, photo perceptual hashes) and patterns from their own
  prior production system "reflect" (validator expected/actual transparency,
  spread-ratio thresholds, precedence dedup) — with an explicit instruction
  not to implement blindly.
- Rulings made together: ADOPTED in code — seeded-bootstrap rupee band + MAD
  (withheld below 5 rows: a tiny-sample band fakes precision), spread-ratio
  confidence cap (ported production threshold, tightened 3×→2× for rentals),
  validator-style expected/actual/involvedFields on every effectful reason,
  delisting-speed panel (display only, never in the math), photo-pHash as
  data fix #2. ADOPTED as citations/roadmap — FSD as the calibration target
  (rejected as a computed label: no transaction data to calibrate against),
  Fellegi-Sunter/Splink as the 27k-listing scale path, fraud-pattern
  reporting as labeled context. REJECTED — probabilistic linkage in code,
  numeric similarity weights, platform trust hierarchy (no in-packet
  evidence), min-ask cluster representative.

## 2026-08-30 (hero map + upload tool)

- Candidate asked for a pipeline illustration on the hero and an upload mode.
  Claude added the pipeline map (file → graded → units → tier 1 → benchmark →
  verdict, live counts, chapter links) and client-side CSV upload through the
  identical pipeline (validated before commit; loud failure; overrides reset;
  nothing leaves the browser). Hardcoded quarantine ids in the UI were
  replaced with data-derived ones so arbitrary files can't crash the page.
