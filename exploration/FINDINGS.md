# Day-1 findings — what's actually inside listings.csv

Working notes from the exploration scripts (`explore_listings.py`, `explore_followup.py`).
All numbers are reproducible; snapshot date is 2026-08-18. These notes feed the approach
note but are not submission prose.

## The planted traps, by ID

| Listing | What's wrong | Proposed handling |
|---|---|---|
| CP-0082 | ₹12,000 rent for a 1,100 sf 2BHK (₹10.9/sf, deposit ₹50k) | Quarantine: impossible value — data error or bait |
| CP-0083 | ₹185,000 rent, ₹157/sf, deposit ₹6L | Quarantine: error or non-comparable luxury outlier |
| CP-0085 | "1BHK" at 2,100 sf; also last seen 106 days ago | Quarantine: attribute mislabel + dead listing |
| CP-0084 | `last_seen` (Aug 11) **before** `posted` (Aug 16); 0 photos | Quarantine: provenance inconsistency — dates can't both be true |
| CP-0081 | 3BHK label, but 1,175 sf + ₹2.8L deposit + ₹58k ask + posted Aug 14 = **the subject deal itself**, cross-posted by a broker with the wrong BHK | Quarantine: self-match — circular evidence (the deal must not benchmark against its own listing) |

CP-0081 is the deepest trap: Market-ops flagged "a 3BHK that looks like this 2BHK
copied with the wrong label," but it isn't just mislabeled — it matches the subject's
area, deposit and timing exactly. Including it would let the landlord's own ask
validate itself.

## Duplicates (cross-posts)

- **14 strict clone pairs** (same society family, posted/last-seen within 3 days,
  area within 25 sf, deposit exact or rent within 2%). Mostly the CP-0069..0080
  block cloning earlier rows across platforms, sometimes at rents ₹500–₹4,000 apart
  — broker markup visible inside clusters.
- **The near-miss that proves the review queue**: CP-0026 (Lakeview, ₹58.5k, dep
  ₹175.5k) vs CP-0053 (Bluewater Heights, ₹58k, dep ₹348k), same week, similar area.
  Rent+area+dates say "same home"; deposits and society say otherwise. Different
  homes that rhyme. Auto-drop would have destroyed a real comp → cross-society
  near-clones only ever go to the human suspect queue.
- **Lesson learned in our own first pass**: a loose transitive-closure dedup
  (area ±30 sf or blank, rent ±6%, any window overlap) chained 31 Lakeview rows
  into ONE cluster and shrank Tier 1 to N=2 — over-cleaning manufactures scarcity
  and would have produced a false "insufficient evidence." Both failure directions
  are real and both need guarding.

## Society aliasing — merge only on evidence

Every society has spelling variants. Clone pairs that *bridge* two spellings prove
co-reference:

- `Lakeview Res. / Lake View Residency / Lakeview Residences / … Phase 1` —
  bridged by ≥3 independent clone units → **auto-merge** (44 of 86 rows).
- `Fern Grove ↔ Fern Grove Residency` — bridged by exactly one unit (posted 3×) →
  **suspected same**, human confirms.
- `FernGrove Apartments` — never bridged, and its units are 930–1,005 sf vs
  1,105–1,255 sf → stays **distinct**. Same for `Bluewater Height(s)/Blue Water Hts`.

Localities: Lakeview rows appear only under `Harlur-Sarjapur Road / Haralur /
Harlur Road` (one pocket, three spellings). `Kasavanahalli` (14) and `Sarjapur
Road` (3) belong to other societies — the "wider pocket" from the demand thread.

## Staleness and aspiration

- Freshness: 69/86 seen within 14 days of snapshot; 6 in a 15–30-day gray zone;
  11 dark for 31–106 days (the dead tail includes both CP-0044/0077 clones, both
  CP-0050/0078 clones, CP-0003, CP-0049, CP-0085).
- **Aspirational asks**: 5 of the 19 Tier-1 survivors have been continuously listed
  for >60 days (CP-0030: 117 days at ₹63k). A listing the market has refused for
  months is evidence of a ceiling, not of clearing rent.
- 25 rows have deposit = exactly 3.0× rent (platform/broker template smell) —
  observation only, too weak to act on alone.
- Furnishing strings need normalization too: one row says `semi furnished`
  (no hyphen).

## The numbers that matter (RATIFIED rules — canonical, pipeline-verified)

Correction 2026-08-30: the first version of this table used a preview 21-day
cutoff and a dedup bug that swallowed CP-0026 into the cross-society suspect
pair. Under the ratified rules (quarantine 5 · stale >30d out · 15–30d half
weight · strict same-family dedup · suspects stay contributing) the canonical
walk, verified independently in Python and in the TypeScript pipeline's tests:

| Step | N | Median ask |
|---|---|---|
| Raw pull | 86 | ₹59,000 |
| 2BHK only | 84 | ₹59,000 |
| minus quarantine (5 rows) | 81 | ₹59,000 |
| alive within 30d of snapshot | 71 | ₹58,500 |
| one row per physical unit | 61 | ₹58,000 |
| Lakeview family (bridged names) | 31 | ₹58,500 |
| **Tier 1: + semi-furnished** | **21** | **₹59,500** (range ₹55,500–₹63,000) |
| Tier 2: micromarket semi-furnished | 39 | ₹58,500 |

- Tier-1 is rock-stable: trust-weighted median also ₹59,500; leave-one-out swing
  ₹0; effective evidence 16.0 weighted rows across 4 sources. High confidence is
  *earned* here — and the confidence ladder runs on **effective N = Σ trust
  weights** with AND-ed criteria per level (amendment to ratified rule 7:
  half-weight ceiling/gray evidence must not buy full confidence, and a
  tiny-but-stable segment must not test "medium" on stability alone).
- **The honest headline: the raw median (₹59,000) was nearly right — by accident.**
  The junk was symmetric this time (₹12k error vs ₹185k error cancel; furnishing mix
  averages out). What cleaning actually buys: (1) you *know* the number instead of
  hoping; (2) honest effective N (86 → 19 relevant); (3) a usable range
  (₹55.5–63k vs the raw ₹12k–185k); (4) protection for the next deal, where the
  junk won't be symmetric.
- **Verdict vs the deal**: landlord asks ₹56k base + ₹5k maintenance = ₹61k all-in.
  Listings don't reliably state whether maintenance is included (Market-ops
  confirmed). If comp asks are all-in → the ask is ~+2.5% above market median; if
  they're base rents → it's ~6% below. **The maintenance ambiguity flips the sign
  of the deviation** — the single most valuable data fix, and the verdict must show
  both readings rather than pick one silently.

## Failure case (for the proof of work)

"Fully-furnished Lakeview 2BHK" — the segment the ₹72k tenant-revenue hypothesis
would love to lean on: 7 raw rows → after quarantine (CP-0083), staleness (CP-0003)
and dedup (CP-0072) → **4 survivors (₹67k/₹68k/₹68.5k/₹72k)**, of which one has a
6×-rent deposit and a 66-day unfilled window, one was posted the day before
snapshot (1-day live window), one has zero photos. Honest output: LOW/INSUFFICIENT
— with a collect-next list. Secondary demo: "3BHK benchmark" → the only 3BHK row is
the quarantined subject self-match → N=0.

## Web-verified external context (framing only — NOT case evidence)

- **Maintenance is a separate, inconsistently captured charge** on Indian rental
  platforms (NoBroker cites Bangalore maintenance ranging ₹300–₹6,559/month,
  distinct from rent). Confirms the sign-flip risk when comparing the ₹61k all-in
  ask to listing rents. Source: nobroker.in property-management pages.
- **Deposit norms:** Bangalore's historical residential deposit norm was 5–10
  months' rent; the Karnataka Rent (Amendment) Act 2025 — reported in force
  Jan 2026 — caps residential deposits at 2 months. Two implications, both
  labeled: (1) high listing deposit multiples are normal history, not junk
  signals → deposit stays a weak signal; (2) the subject deal's ₹2.8L = 5-month
  deposit ask sits above Flent's own >3-month threshold *and* the reported legal
  cap → negotiation leverage, flagged "verify with legal," never asserted as law.
  Sources: goodreturns.in, nestriqo.com, propnewz.com, proptechsolutions.in
  (secondary/SEO-grade — hence the legal-review caveat).
