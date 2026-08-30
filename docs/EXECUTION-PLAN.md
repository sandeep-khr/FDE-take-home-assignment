# Execution plan — Comp Trust Layer v1

Assume the approach is approved on Monday. This is the plan I would put into
Linear: one parent issue, eight sub-issues in shipping order. Each sub-issue
states its outcome, scope boundary, dependencies, whether the data is real or
mocked, and how I'd prove it works. The order is the argument: each step is
chosen for what it teaches, and what that learning unlocks next.

---

## Parent issue

**Every market benchmark in BOSS carries a grade, a band, and reasons a human
can overturn.**

**User outcome.** The acquisition owner opens a deal and sees the ask
benchmark with its confidence level and rupee band. They can drill into any
listing's grade and written reasons (what the rule expected vs what it saw),
overturn any call with a logged reason, and watch the number recompute. When
evidence is thin, the page says INSUFFICIENT and lists what to collect — it
never prints a median anyway.

**v1 includes:** canonical ingestion of the existing scrape with provenance;
the prototype's trust rules engine, config-driven; dedup and alias resolution
with a human suspect queue; benchmark + band + confidence ladder; the
evidence panel with overrides and an audit log inside the BOSS deal page;
maintenance-inclusion captured at scrape time.

**v1 explicitly excludes:** an achieved-rent calibration model (v1 only logs
the data for it); geo trust telemetry; platform trust ranking; photo-hash
dedup (fast-follow once hashes exist — see data asks); any ML in the decision
path; rebuilding other parts of BOSS.

**True before release:** shadow-mode run on ≥10 live deals reviewed by
Supply; every benchmark replayable from stored evidence; a full ~27,000-row
pull processed in interactive time (the prototype does a synthetic 27k file
in under 3 seconds in-process; the perf test ships in the repo).

**First metric on the wall:** reviewer override rate AND the share of
LOW/INSUFFICIENT outputs. Together they catch both ways this system can fail
— trusting too much, and cleaning too much.

---

## Sub-issues, in order

### 1 · Canonical listing store with provenance
**Outcome:** every scraped listing stored with source, first-seen, last-seen
and field-level as-written values; impossible provenance (last_seen before
posted) flagged, not dropped. **Scope:** ingestion and schema only — no
rules, no UI. **Depends:** existing scraper output. **Data:** real.
**Prove it:** row and field coverage report against a week of raw scrape;
date-sanity counts. *Learns: how dirty the real 27k is compared to the
packet's curated mess — which drives every threshold after this.*

### 2 · Trust rules engine as a config-driven service
**Outcome:** the prototype's rule set (staleness, impossible values,
subject-echo, aspirational downweight, note-only weak signals) running as a
service; every threshold in one reviewed config; each decision emits
expected/actual/fields-examined. **Scope:** no dedup yet. **Depends:** #1.
**Data:** real, plus the case packet as a golden test — it must reproduce
₹59,500 / 21 rows / HIGH exactly. **Prove it:** golden test green; three real
pulls spot-reviewed by Supply. *Learns: which rules misfire on real data
before they can hurt a decision.*

### 3 · Dedup + alias resolution at scale, with the suspect queue
**Outcome:** date-window blocked clone detection (proven in the prototype);
evidence-bridged alias merging; a review queue for cross-society near-clones
and one-bridge aliases. Splink-style match weights only if the binary rules
prove brittle on volume. **Scope:** queue UI is minimal (list + confirm/
reject). **Depends:** #2. **Data:** real. **Prove it:** precision protocol —
sample 100 auto-folded clusters, Supply confirms or rejects; ≥95% precision
required before auto-fold stays on. *Learns: the real duplicate rate, and
whether evidence-bridged merging survives contact with 27k rows.*

### 4 · Benchmark service
**Outcome:** tiered comp selection, trust-weighted median, seeded bootstrap
band (withheld under 5 rows), effective-N confidence ladder with the spread
cap, per-deal subject configuration. **Scope:** numbers only — no UI.
**Depends:** #3. **Data:** real. **Prove it:** parity with the prototype on
the packet; interactive latency per micromarket. *Learns: how often real
segments come back LOW or INSUFFICIENT — the honesty rate, which sets
expectations for rollout.*

### 5 · Evidence panel in the BOSS deal page
**Outcome:** the census/ledger/dossier/override flow embedded where signing
happens; every override logged with author and reason; the trust layer's
reason objects wired into BOSS's existing Slack Q&A so "why was this comp
excluded?" answers with citations instead of prose. **Scope:** read + override
only; no threshold editing in UI. **Depends:** #4; BOSS frontend. **Data:**
real. **Prove it:** an acquisition owner reaches any number's reasons in two
clicks; overrides replay; Slack answers quote reason objects verbatim.
*Learns: whether humans actually use the disagree button — the core product
bet of this whole design.*

### 6 · Scrape-time data fixes: maintenance flag + photo hashes
**Outcome:** two new fields captured at source — whether the listed rent
includes maintenance, and a perceptual hash per listing photo. **Scope:**
capture and store only; hash-based dedup itself is a fast-follow. **Depends:**
scraping team (external). **Data:** real. **Prove it:** share of new listings
carrying each field after two weeks; on deals where inclusion is known, the
two-reading verdict collapses to one. *Learns: how fast the verdict sharpens
from a single captured field — the cheapest accuracy win available.*

### 7 · Shadow mode + calibration logging
**Outcome:** the layer runs beside the current process on 10+ live deals;
for each, the benchmark is logged next to the eventually negotiated/signed
rent and days-to-fill. **Scope:** no behavior change for the team yet.
**Depends:** #5. **Data:** real. **Prove it:** side-by-side report; go/no-go
review with Supply. *Learns: the real gap between asking and achieved rents —
which over time turns the dispersion band into a calibrated, FSD-style error,
and is the bridge to Problem 2.*

### 8 · Rollout + operating playbook
**Outcome:** dashboards for override rate, LOW/INSUFFICIENT share and
time-to-benchmark; a threshold-review cadence; an escalation path for when
the suspect queue backs up. **Scope:** operations, not features. **Depends:**
#7 go decision. **Data:** real. **Prove it:** two weeks of live metrics
without manual babysitting. *Learns: whether the system holds up as a habit,
not a demo.*

---

## Appendix — the data I'd ask for, in order of leverage

Each ask is justified by a failure observed in this case packet, not by
appetite for data.

1. **Photo perceptual hashes.** We caught the packet's duplicates only
   because area, deposit and dates happened to agree. Identical photos under
   two broker numbers is a near-certain duplicate and a reported fraud
   pattern on Indian portals; hashes turn our hardest matching problem into
   an easy one.
2. **Maintenance-inclusion flag.** One unknown flips this deal's verdict
   from +2.5% above market to −5.9% below. Highest accuracy per byte of any
   field on this list.
3. **Stable platform listing IDs + edit history.** The packet's rows are
   snapshots. With platform IDs we'd see rent edits on the same listing —
   price-cut trajectories are negotiation evidence — and tell true delistings
   from reposts (a repost has a new ID and the same photos).
4. **Per-day observation logs instead of a single last-seen date.** Turns
   staleness from a guess into a measurement, distinguishes "gone" from
   "missed crawl", and makes the delisting-speed signal (the closest thing to
   transaction evidence in listings data) a real survival model.
5. **A canonical society registry** (ID, name variants, coordinates, phase
   structure), maintained once. Kills the alias problem at the root — we
   spent an entire pipeline stage proving "Lake View Residency" is "Lakeview
   Residences"; a registry makes that a lookup. Also unlocks distance-based
   tiers and a junk heat-map by micromarket.
6. **Poster identity signals** (hashed contact number / account across
   listings). The packet shows broker rows running 36% junk-or-duplicate vs
   22% for owners; the same number behind forty "owner" listings is a broker.
   Enables poster-level trust learned from outcomes rather than asserted.
7. **Flent's own signed rents and fill days, joined by society/micromarket.**
   The ask→achieved calibration everything above feeds into; without it,
   every listings benchmark stays an ask-side number, however clean.
