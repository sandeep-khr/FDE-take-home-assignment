# AI usage log

Running, honest record of the candidate's inputs and decisions, and where AI
(Claude) helped carry them through. Feeds the AI-usage note required in the
approach note.

## 2026-08-30

- Candidate chose Problem 1, a web-app proof of work and a pairing workflow, with
  transparent AI disclosure as an FDE strength. They asked Claude to audit the
  supplied brief, case packet, context pack and screenshots for data and product
  risks; Claude summarized the material and surfaced candidate-reviewable traps
  (society aliasing, cross-posts, stale rows, a mislabeled 3BHK, censored
  outcomes and screenshot product smells).
- Candidate selected Option A — a static pipeline plus review app — over a
  full-stack build and a notebook/report. The design was co-created in
  discussion and captured in
  `docs/specs/2026-08-30-comp-trust-layer-design.md`.
- Candidate directed an evidence-first exploration of duplicate listings, society
  name variants and rows that should not influence the benchmark. Claude wrote
  and ran the Day-1 scripts over `listings.csv` (`exploration/`), identifying 5
  quarantine candidates (including CP-0081, a probable cross-post of the subject
  deal), 14 strict clone pairs, evidence-bridged society aliasing, aspirational
  long-lived asks and the maintenance-inclusion ambiguity that flips the verdict.
  The first loose dedup rule over-merged 31 rows into one cluster (Tier 1 → N=2);
  after review, it was tightened and retained as a documented over-cleaning
  lesson.
- Candidate reviewed the findings and ratified the decision points: staleness
  cutoff, strict dedup criteria, two-bridge alias policy, aspirational
  downweighting, confidence ladder, quarantine list and failure-case choice.
  Claude recorded the evidence in `exploration/FINDINGS.md`.

## 2026-08-30 (build session, Tasks 1–7)

- Candidate supplied the ratified ruleset and asked for a deterministic,
  test-first implementation. Claude wrote the TypeScript pipeline against the
  exploration's ground-truth numbers; the candidate rules remain the normative
  spec.
- Candidate's call to preserve uncertain cross-society matches and gray-age
  listings guided two build corrections: CP-0026 stays contributing (suspect
  queue, not duplicate) and CP-0015 stays at half weight (gray, not dead) → Tier
  1 N=21, median unchanged ₹59,500. Claude verified both independently in
  Python before fixing tests.
- Candidate required a confidence label that did not overstate thin evidence.
  Claude proposed an amendment, later reviewed by the candidate: run the ladder
  on effective N (Σ trust weights) with AND-ed criteria, so the 4-row furnished
  segment cannot be called "medium" on stability alone.
- Candidate requested a replayable fixture; Claude generated the golden run and
  the candidate eyeballed it against FINDINGS before commit.

## 2026-08-30 (build session, Tasks 8–13)

- Candidate set the craft bar and
  specified that reviewers should see the evidence funnel and change the outcome
  with live overrides. Claude built the Vite + React review app in Flent's visual
  language: rail, ticker, ten scenes and live overrides.
- Candidate verified in the browser that removing a load-bearing comp degrades
  confidence HIGH → MEDIUM as an emergent result of the ratified ladder, not a
  scripted demo. 58 automated tests were green and the production build clean.

## 2026-08-30 (prep session)

- Candidate asked to make the verdict explicitly actionable and to prepare for
  independent review of every rule and scope cut. Claude added the "act on it"
  strip and prepared two PRIVATE documents: a worked study guide and an
  approach-note skeleton. The agreement remained that the candidate writes all
  submission prose; Claude critiques and fact-checks.

## 2026-08-30 (v2 redesign)

- Candidate reviewed v1 and rejected it as "not easy to read; ticker and
  navbar-like rail." Based on that critique, Claude rebuilt the app as a
  data-driven editorial essay: removed the ticker and sticky rail (only a 3px
  reading-progress line remains), introduced the "census of 86" signature
  (every listing a physical cell, judged as the story progresses), oversized
  chapter numerals, tables behind progressive disclosure and one inversion
  moment (the refusal chapter on deep pine). Tests stayed green throughout.

## 2026-08-30 (map decision)

- Candidate proposed a hero locality map to test whether some areas were more
  misleading than others. Claude helped check that idea against the data: there
  are no coordinates, societies are anonymised, and locality differences are
  noise on tiny samples (e.g. 5/14 vs 3/29), while the useful concentration is
  behavioral (broker rows 36% junk/dup vs 22% owner). Candidate chose not to
  include the map in this proof of work and instead banked geo trust telemetry
  for production once real coordinates exist; the scope cut also appears in the
  approach note.

## 2026-08-30 (verification session)

- Candidate required a complete audit trail: every algorithm and assumption
  verifiable from scratch. Claude implemented `npm run audit` (the full per-row
  reasoning trace from the golden run) and wrote a private audit document with
  a numbered assumption register (packet facts vs ratified rules vs
  conventions), hand-verification recipes and a challenge-first list. The
  candidate owns verification and any rule changes.

## 2026-08-30 (research integration)

- Candidate brought external research (AVM FSD confidence, Splink-style record
  linkage, reported Indian rental-fraud patterns, MAD/bootstrap statistics,
  delisting-speed signal, photo perceptual hashes) and patterns from their own
  prior production system "reflect" (validator expected/actual transparency,
  spread-ratio thresholds, precedence dedup) — with an explicit instruction
  not to implement blindly.
- Candidate used that research to set the adoption criteria: improve evidence
  quality or reviewer understanding without adding false precision. Claude
  helped evaluate the options. ADOPTED in code — seeded-bootstrap rupee band +
  MAD (withheld below 5 rows), a spread-ratio confidence cap (candidate's
  production threshold tightened 3×→2× for rentals), validator-style
  expected/actual/involvedFields on every effectful reason, a display-only
  delisting-speed panel and photo-pHash as data fix #2. ADOPTED as
  citations/roadmap — FSD as the calibration target, Fellegi-Sunter/Splink as
  the 27k-listing scale path and fraud-pattern reporting as labeled context.
  REJECTED — probabilistic linkage in code, numeric similarity weights,
  platform trust hierarchy (no in-packet evidence) and a min-ask cluster
  representative.

## 2026-08-30 (hero map + upload tool)

- Candidate specified that the proof should show the pipeline at a glance and
  let a reviewer run another CSV without sending data anywhere. Claude added the
  hero pipeline map (file → graded → units → tier 1 → benchmark → verdict, live
  counts and chapter links) and client-side CSV upload through the identical
  pipeline (validation, loud failure, reset overrides and no network transfer).
  In response to candidate's arbitrary-file requirement, hardcoded quarantine
  IDs were replaced with data-derived ones.

## 2026-08-30 (brief re-read + scale pass)

- Candidate re-read the proof-of-work spec and challenged whether the submission
  was "a story, not a tool the team can verify." Claude helped test that concern
  against the brief: a small app is the most ambitious listed medium, "five
  minutes working beats a large unfinished build," and the prototype→team-tool
  path is deliverable 3. The resulting submission is a tool (upload mode) with
  verifiable code (repo, tests and audit).
- Candidate used that review to identify two gaps: credible scale behavior and
  an explicit execution plan. Claude implemented date-window blocking with
  precomputed day ordinals, plus a labeled synthetic 27,000-row generator and
  performance test showing a full run in <3s. Claude also drafted a parent + 8
  ordered-sub-issue skeleton; the candidate wrote the final ticket prose.
- At the candidate's request, the app coda gives reviewers the exact verification
  path (`npm ci`, test and audit). The candidate also required large uploads to
  remain readable, so Claude capped display layers (census 860 cells, ledgers
  500 rows, galleries 12 and clusters 60) while retaining all rows in the math.
  Candidate verified in-browser that the synthetic 27,000-row upload runs
  end-to-end (27,000 → 25,917 credible → 11,709 units → 287 tier-1 rows →
  banded benchmark), and that the spread-ratio guard correctly capped the
  unseen synthetic market at LOW confidence.

## 2026-08-30 (repo + upload experience)

- Candidate chose a private repository until submission so solved traps remain
  unavailable to other candidates; the repo was pushed to
  github.com/sandeep-khr/Flent-FDE-take-home-assignment.
- Candidate directed the upload UX: a prominent drag-and-drop zone with the
  13-column schema caption, specific validations (.csv only, ≤10MB, non-empty,
  loud parser errors) and a "pipeline theater". Claude implemented it so every
  successful upload reveals the six stages in sequence with the real numbers
  from that file. The candidate's rationale was deliberate pacing for human
  review, not simulated work; it is skipped under prefers-reduced-motion.

## 2026-08-30 (sample-in-app + loading UX)

- Candidate required the scale claim to be reproducible in the app, not merely
  stated in documentation. Claude shipped the synthetic 27k sample in
  `app/public` with an in-zone one-click "run the sample" and download link,
  clearly labeled SYN/never-evidence.
- Candidate caught a real UX bug: a 3–5s frozen page before the theater opened.
  Claude fixed the two causes: validation now parses+normalizes only (ms)
  instead of running the full pipeline twice, and the theater opens immediately
  in a "running every rule over every row…" state before the heavy run. Claude
  also fixed the AnimatePresence flicker-race that wedged the modal and clarified
  the case-header labels (case · subject home · evidence as of).

## 2026-08-30 (Q&A decision + row dossier)

- Candidate proposed an in-app AI chatbot for algorithm and per-row questions,
  then used the system's trust requirement to challenge that idea. Together, we
  ruled it out: a probabilistic layer on a deterministic, fully explained system
  undermines the thesis; robust guardrails are a project, not a feature; an LLM
  key needs a backend we deliberately do not have; and BOSS already provides
  deal Q&A in Slack.
- Candidate chose a deterministic alternative: a Row Dossier. Claude built it
  so any census cell or ledger ID exposes raw fields, derived values, every rule
  with expected/actual and fields examined, cluster and suspect roles,
  per-segment role and the override control. The candidate banked the LLM
  version as an execution-plan line: extend BOSS's Slack Q&A to cite these
  reason objects.

## 2026-08-30 (approach-note drafting)

- Candidate supplied the project decisions, verified pipeline numbers and format
  preference (a 4-page PDF over slides: prose carries the judgment the brief
  evaluates). At the candidate's request, Claude drafted an approach-note
  structure in the candidate's first-person voice from that input. The agreed
  condition was a real candidate rewrite before submission, with the AI
  disclosure adjusted to match the actual process; typesetting follows the
  rewrite in the app's visual language.

## 2026-08-30 (approach-note rewrite + fact-check)

- Candidate rewrote the drafted note substantially (restructured sections,
  their own phrasing throughout, new "claim I am willing to make" scoping
  section, cut the over-merge story and the scale claim) and exported a 4-page
  PDF. Claude ran a fact-check-only pass against the pipeline canon: zero
  numerical errors. Open fixes flagged: add links/name/date, add the 27k scale
  sentence, extend the short AI note to mention note-drafting (matching this
  log), execution plan still a separate pending deliverable.

## 2026-08-30 (execution plan drafted)

- Candidate proposed a "1 parent + 5–8 sub-issues" execution plan and requested
  at-scale data suggestions such as image hashes for duplicate cross-search.
  Candidate decided that the plan belongs in `docs/EXECUTION-PLAN.md`, not as an
  app chapter, so the app retains its 5-minute arc; the coda links to it. The
  candidate also defined a "data asks by leverage" appendix, with each ask tied
  to a packet failure. Claude drafted the plan from that agreed skeleton for the
  candidate to edit, following the approach-note protocol.

## 2026-08-30 (execution plan + project board)

- The candidate authored docs/EXECUTION-PLAN.md themselves (parent + 8
  sub-issues + a data-asks appendix justified by packet failures) and committed
  it directly. Claude fact-checked (all numbers correct) and transcribed the
  candidate's text verbatim into GitHub issues #1–#9, wired the dependency
  references, and added all nine to the candidate's GitHub Project board.
  The document remains the canonical deliverable; the board mirrors it.
- Board organized Linear-style at the candidate's direction: project renamed
  with a reading-guide README; issues #2–#9 linked as native sub-issues of #1
  (progress bar); custom fields Ship order / Cycle (4 paired phases) / Data
  (real · golden packet · external capture) / Learns set on every item;
  milestone "v1 — Comp Trust Layer" across all nine; two restrained labels
  (parent, external-dependency) in the submission's palette.

## 2026-08-31 (deploy + issue voice pass)

- Candidate deployed the proof of work (flent-fde-assignment.vercel.app);
  Claude smoke-tested the live site logged-out: pipeline numbers, census,
  dossier, meta/favicon, and the 27k sample all verified.
- Candidate reviewed the GitHub issues with a fresh eye, judged the uniform
  Outcome/Scope/Prove-it template and polished closer lines as AI-flavored,
  and directed a rewrite: plain titles, Goal / Done when / Depends / Open
  question structure, uneven detail (dedup issue kept deepest), aphorisms and
  the Splink name-drop removed. Claude transcribed the rewrite across #1–#9.
  The five-field coverage the brief requires stays explicit in
  docs/EXECUTION-PLAN.md, the deliverable of record.

## 2026-08-31 (approach note v2)

- Candidate asked Claude to apply the four agreed fixes and typeset the note.
  Claude rebuilt the PDF from the candidate's v1 text verbatim (Chrome
  print-to-PDF, the submission's own visual language), inserting only: the
  header links/name/date, the 27,000-row scale sentence, the over-merge
  disclosure, and the AI-note clause covering note drafting ("which I then
  rewrote" — the rewrite is v1's documented history). Candidate corrected the
  name to Sandeep Kumar. Source HTML ships beside the PDF.

## 2026-08-31 (correction — restyle reverted)

- Claude overstepped on the approach-note v2: instead of adding the requested
  lines to the candidate's own template, it re-typeset the document in a new
  style. The candidate rejected this. Corrected: the candidate's
  build_approach_note.py restored from history, patched with only the four
  agreed insertions (clickable header links + name/date, the 27k scale
  sentence, the condensed over-merge disclosure, the AI-note drafting
  clause), DOCX rebuilt with the candidate's own generator, the restyled PDF
  and its source removed, and the candidate's v1 PDF restored pending their
  own PDF export.
