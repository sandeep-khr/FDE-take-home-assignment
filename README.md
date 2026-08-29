# Comp Trust Layer

Proof of work for Flent's FDE take-home, Problem 1 — *the market data lies to us.*

Raw scraped listings go in. Graded, inspectable evidence comes out: a market ask
benchmark with an explicit confidence level, every exclusion carrying its written
reason, and a reviewer who can overturn any call and watch the arithmetic re-run.

## The five-minute review

Open the app (deployed link in the submission email, or `npm run dev` below) and
scroll — the page is the pipeline, in order:

1. **The ticker + funnel rail** — the verdict up front: 86 raw → 21 tier-1 rows,
   ₹59,500, high confidence. The rail is live; it moves when you override a row.
2. **01 · The pull** — all 86 raw rows, untouched. The trap: this table's median
   looks exactly as precise as a good one.
3. **02 · The grade** — every row graded A–D with plain-language reasons. Meet the
   quarantine: five rows whose values cannot all be true, including the subject
   deal itself cross-posted with the wrong BHK (circular evidence).
4. **03 · One home, one vote** — broker cross-posts collapse into 12 physical
   units; the rent spread inside a cluster is kept as broker-markup evidence. The
   suspect queue holds the pair the machine refuses to decide.
5. **04 · Names** — society spellings merge only when cross-posted units prove
   co-reference. Two bridges merge; one is a human suspicion; zero stay apart.
6. **05 · The estimate** — the median walk (raw ₹59,000 → tier-1 ₹59,500), why
   the raw median was right *by accident*, and the confidence the number earned.
7. **06 · The verdict** — the ask under both maintenance readings: +2.5% above or
   −5.9% below market, because the data doesn't say what listing rents include.
   The sign flip is the finding.
8. **07 · The failure case** — asked about the furnished segment, the system
   refuses to guess: 4 weak survivors, LOW confidence, a collect-next list.
9. **08 · The human** — exclude any comp with a reason; the funnel, benchmark and
   confidence recompute in front of you. (Try pulling a ₹59,500 comp: confidence
   honestly degrades to MEDIUM.)
10. **09 · The assumptions** — every threshold, rendered from the live config.

## Run it

```bash
npm ci
npm test        # pipeline ground truth + app render + live override (63 tests)
npm run dev     # app on http://localhost:5173
npm run build   # static production build in dist/
```

## What's here

| Path | What it is |
|---|---|
| `pipeline/src/` | The entire trust layer as pure, dependency-free TypeScript. Deterministic: same CSV, same result. |
| `pipeline/test/` | Ground-truth tests (fixtures verified independently in Python) + a reviewed golden run. |
| `app/` | The review surface (Vite + React). No backend; the pipeline runs in your browser on the verbatim CSV. |
| `data/listings.csv` | Byte-identical copy of the case packet's pull — enforced by a sha256 test. |
| `exploration/` | Day-1 reconnaissance scripts and `FINDINGS.md`, the trap inventory. |
| `docs/` | Design spec (ratified ruleset) and the implementation plan. |
| `ai-usage-log.md` | Running, honest log of where AI helped and where judgment entered. |

## Provenance rules

The case packet is the complete evidence. Nothing external enters the math; the
two web-verified notes in `exploration/FINDINGS.md` (maintenance conventions,
deposit norms) are labeled context only. No synthetic rows were added.
