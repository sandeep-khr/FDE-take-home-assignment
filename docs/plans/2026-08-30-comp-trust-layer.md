# Comp Trust Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deterministic TypeScript pipeline that grades the 86 case-packet listings into an inspectable market benchmark with explicit confidence, wrapped in a crafted static review app a Flent reviewer can walk in 5 minutes.

**Architecture:** One npm package. `pipeline/` is pure, dependency-free TypeScript (csv → normalize → clones → aliases → trust → estimate → verdict), fully unit-tested against ground-truth numbers from `exploration/FINDINGS.md`. `app/` is a Vite + React single page that runs the pipeline in-browser on the verbatim CSV and renders the guided review; human overrides re-run the pipeline live.

**Tech Stack:** TypeScript (strict), Vitest, React 18, Vite. No runtime deps in `pipeline/`. No backend, no network calls.

**Spec:** `docs/specs/2026-08-30-comp-trust-layer-design.md` (the ratified 9-rule ruleset is normative; FINDINGS.md holds the ground-truth numbers used as fixtures).

## Global Constraints

- `pipeline/` imports nothing outside itself and `data/` — zero runtime dependencies.
- Determinism: no `Date.now()`, no `Math.random()`; the snapshot date `2026-08-18` comes only from `PipelineConfig`.
- Every threshold lives in `PipelineConfig` (single source of truth, rendered in the app's Assumptions panel). No magic numbers inside rule code.
- Every exclusion/downweight carries a machine-readable reason code + human label. Nothing is deleted.
- `data/listings.csv` must stay byte-identical to the case packet: sha256 `561c4abbf7aecc7b68b17a5a68ba79c57bbcb13c8d3f5584b454b5c90aed507f`.
- Rupee formatting everywhere: `new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0})`.
- TS `strict: true`; tests colocated under `pipeline/test/`.
- Commit after every task (small, imperative messages).

## File Structure

```
submission/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts
  data/listings.csv            # verbatim copy of case-packet CSV
  pipeline/src/types.ts        # all shared interfaces + PipelineConfig + DEFAULT_CONFIG
  pipeline/src/csv.ts          # parseListingsCsv(text) -> RawListing[]
  pipeline/src/normalize.ts    # normalizeListing(raw, config) -> NormalizedListing
  pipeline/src/clones.ts       # findClonePairs / buildUnitClusters / pickRepresentative
  pipeline/src/aliases.ts      # decideAliases (bridge policy) + suggestAliases (string heuristics)
  pipeline/src/trust.ts        # assessTrust(listing, ctx) -> TrustDecision (rule engine)
  pipeline/src/estimate.ts     # segments, weightedMedian, leaveOneOut, confidence ladder
  pipeline/src/verdict.ts      # dual maintenance readings vs the ask; collect-next lists
  pipeline/src/pipeline.ts     # runPipeline(csvText, config, overrides) -> PipelineResult
  pipeline/test/*.test.ts      # one test file per module + golden.test.ts
  pipeline/test/fixtures/golden-run.json
  app/index.html  app/src/main.tsx  app/src/App.tsx  app/src/theme.css
  app/src/state.ts             # overrides state + memoized pipeline run
  app/src/scenes/{Hero,RawPull,TrustBoard,Clusters,AliasMap,Estimate,VerdictPanel,FailureCase,Overrides,Assumptions}.tsx
  app/test/render.test.tsx     # jsdom smoke tests per scene
```

## Interfaces (defined once in `pipeline/src/types.ts`, used verbatim everywhere)

```ts
export interface RawListing {
  listingId: string; source: string; postedDate: string; lastSeenDate: string;
  society: string; locality: string; bhk: number; furnishing: string;
  areaSqft: number | null; rent: number; deposit: number | null;
  photoCount: number; posterType: 'owner' | 'broker' | 'unknown';
}
export type FurnishingNorm = 'semi-furnished' | 'fully furnished' | 'unfurnished';
export interface NormalizedListing extends RawListing {
  furnishingNorm: FurnishingNorm; nameKey: string; stem: string; phase: string | null;
  daysDark: number; liveWindowDays: number; rentPerSf: number | null;
}
export interface ClonePair { aId: string; bId: string; kind: 'same-stem' | 'cross-stem'; evidence: string[]; }
export interface UnitCluster { id: string; memberIds: string[]; representativeId: string; rentMin: number; rentMax: number; nameKeys: string[]; }
export interface AliasDecision { stem: string; nameKeys: string[]; status: 'merged' | 'suspected' | 'distinct'; independentBridges: number; note: string; }
export interface AliasSuggestion { a: string; b: string; heuristic: 'compact-prefix' | 'token-abbrev'; }
export type ReasonEffect = 'quarantine' | 'exclude' | 'downweight' | 'note';
export interface TrustReason { code: string; label: string; effect: ReasonEffect; }
export interface TrustDecision { listingId: string; grade: 'A' | 'B' | 'C' | 'D'; weight: number; reasons: TrustReason[]; }
export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';
export interface SegmentEstimate {
  segmentId: string; label: string; contributingIds: string[]; n: number;
  weightedMedian: number | null; unweightedMedian: number | null;
  range: [number, number] | null; looSwing: number | null; distinctSources: number;
  medianAgeDays: number | null; confidence: Confidence; collectNext: string[];
}
export interface VerdictReading { assumption: 'listings-all-in' | 'listings-base'; comparedAsk: number; deviationPct: number; direction: 'above' | 'below' | 'within'; }
export interface Verdict { benchmarkSegmentId: string; readings: VerdictReading[]; asterisks: string[]; }
export interface Override { listingId: string; action: 'exclude' | 'reinstate'; reason: string; }
export interface PipelineResult {
  config: PipelineConfig; listings: NormalizedListing[];
  clonePairs: ClonePair[]; unitClusters: UnitCluster[]; suspects: ClonePair[];
  aliases: AliasDecision[]; aliasSuggestions: AliasSuggestion[];
  trust: Record<string, TrustDecision>; segments: SegmentEstimate[]; verdict: Verdict;
  overridesApplied: Override[];
}
export interface PipelineConfig {
  snapshotDate: string;                       // '2026-08-18'
  staleExcludeAfterDays: number;              // 30
  staleGrayAfterDays: number;                 // 14
  cloneDateSlackDays: number;                 // 3
  cloneAreaSlackSf: number;                   // 25
  cloneRentTolerance: number;                 // 0.02
  aspirationalMinWindowDays: number;          // 60
  aspirationalMaxDaysDark: number;            // 14
  minIndependentBridgesToMerge: number;       // 2
  rentPerSfBounds: [number, number];          // [25, 90]
  bhkAreaBoundsSf: Record<number, [number, number]>; // {1:[350,900], 2:[650,1500], 3:[900,2200]}
  grayWeight: number;                         // 0.5
  aspirationalWeight: number;                 // 0.5
  ladder: { highMinN: number; highMinSources: number; highMaxLooSwing: number; highMaxMedianAgeDays: number; mediumMinN: number; mediumMaxLooSwing: number; lowMinN: number; };
    // {8, 3, 1000, 45, 4, 2500, 2}
  subject: { society: string; areaSqft: number; deposit: number; baseRent: number; maintenance: number; bhk: number; furnishing: FurnishingNorm; postedWithinDays: number; };
    // {'Lakeview Residences', 1175, 280000, 56000, 5000, 2, 'semi-furnished', 7}
}
export const DEFAULT_CONFIG: PipelineConfig; // literal with the values above
```

Ground-truth fixture constants (from FINDINGS.md, already verified by two independent scripts): 86 rows · quarantine = CP-0081/82/83/84/85 · 14 same-stem clone pairs + 1 cross-stem suspect (CP-0026/CP-0053) · Lakeview stem merged with ≥2 bridges incl. Phase 1 · Fern Grove↔Fern Grove Residency exactly 1 bridge · Tier-1 unweighted: N=19, median ₹59,500, range ₹55,500–₹63,000, LOO swing ₹0 · furnished segment survivors = CP-0005/0012/0016/0027 · 3BHK segment N=0 after quarantine.

---

### Task 1: Scaffold + verbatim data + CSV parser

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `data/listings.csv` (copy), `pipeline/src/types.ts`, `pipeline/src/csv.ts`
- Test: `pipeline/test/csv.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseListingsCsv(text: string): RawListing[]`; `types.ts` exactly as the Interfaces section above, including `DEFAULT_CONFIG`.

- [ ] **Step 1: Scaffold**

```bash
cd /Users/domventas/Documents/Flent-FDE-take-home/submission
npm init -y && npm i -D typescript vitest @types/node
cp ../case-packet/listings.csv data/listings.csv
```
`package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`. `tsconfig.json`: `strict`, `module: ESNext`, `moduleResolution: bundler`, `target: ES2022`, `types: ["vite/client"]` added later.

- [ ] **Step 2: Write failing tests**

```ts
// pipeline/test/csv.test.ts
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseListingsCsv } from '../src/csv';

const text = readFileSync(new URL('../../data/listings.csv', import.meta.url), 'utf8');

describe('data provenance', () => {
  it('CSV is byte-identical to the case packet', () => {
    expect(createHash('sha256').update(text).digest('hex'))
      .toBe('561c4abbf7aecc7b68b17a5a68ba79c57bbcb13c8d3f5584b454b5c90aed507f');
  });
});

describe('parseListingsCsv', () => {
  const rows = parseListingsCsv(text);
  it('parses all 86 rows with ids intact', () => {
    expect(rows).toHaveLength(86);
    expect(rows[0].listingId).toBe('CP-0001');
    expect(rows.at(-1)!.listingId).toBe('CP-0086');
  });
  it('parses blanks as null, numbers as numbers', () => {
    const r86 = rows.find(r => r.listingId === 'CP-0086')!;
    expect(r86.areaSqft).toBeNull();
    expect(r86.deposit).toBeNull();
    const r1 = rows.find(r => r.listingId === 'CP-0001')!;
    expect(r1.rent).toBe(60000); expect(r1.deposit).toBe(300000); expect(r1.bhk).toBe(2);
  });
  it('keeps raw strings untouched (no normalization here)', () => {
    expect(rows.find(r => r.listingId === 'CP-0082')!.furnishing).toBe('semi furnished');
    expect(rows.find(r => r.listingId === 'CP-0002')!.society).toBe('Lake View Residency');
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npm test` → FAIL (`parseListingsCsv` missing).
- [ ] **Step 4: Implement**

```ts
// pipeline/src/csv.ts
import type { RawListing } from './types';
export function parseListingsCsv(text: string): RawListing[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`missing column ${name}`);
    return i;
  };
  const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));
  return lines.slice(1).map(line => {
    const c = line.split(','); // no quoted commas in this file; header check guards drift
    if (c.length !== header.length) throw new Error(`bad row: ${line}`);
    return {
      listingId: c[idx('listing_id')], source: c[idx('source')],
      postedDate: c[idx('posted_date')], lastSeenDate: c[idx('last_seen_date')],
      society: c[idx('society')], locality: c[idx('locality')],
      bhk: Number(c[idx('bhk')]), furnishing: c[idx('furnishing')],
      areaSqft: num(c[idx('area_sqft')]), rent: Number(c[idx('rent')]),
      deposit: num(c[idx('deposit')]), photoCount: Number(c[idx('photo_count')]),
      posterType: c[idx('poster_type')] as RawListing['posterType'],
    };
  });
}
```
Also create `types.ts` in full (every interface + `DEFAULT_CONFIG` literal).

- [ ] **Step 5: `npm test` → PASS, then commit** — `git add -A && git commit -m "feat: scaffold, verbatim data with provenance test, CSV parser"`

### Task 2: Normalization

**Files:**
- Create: `pipeline/src/normalize.ts` · Test: `pipeline/test/normalize.test.ts`

**Interfaces:**
- Consumes: `RawListing`, `PipelineConfig`.
- Produces: `normalizeListing(raw: RawListing, config: PipelineConfig): NormalizedListing`; helpers `nameKeyOf(society: string): { nameKey: string; stem: string; phase: string | null }`, `daysBetween(a: string, b: string): number` (UTC date math on 'YYYY-MM-DD').

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { nameKeyOf, normalizeListing } from '../src/normalize';
import { DEFAULT_CONFIG } from '../src/types';
// load rows via csv helper as in Task 1
it('collapses res-forms and keeps phase as suffix', () => {
  expect(nameKeyOf('Lakeview Res.').stem).toBe('lakeviewres');
  expect(nameKeyOf('Lake View Residency').stem).toBe('lakeviewres');
  expect(nameKeyOf('Lakeview Residences Phase 1')).toEqual({ nameKey: 'lakeviewres phase1', stem: 'lakeviewres', phase: 'phase1' });
  expect(nameKeyOf('FernGrove Apartments').stem).toBe('ferngroveapartments');
  expect(nameKeyOf('Blue Water Hts').stem).toBe('bluewaterhts');
});
it('normalizes furnishing variants', () => {
  const r = rows.find(r => r.listingId === 'CP-0082')!;
  expect(normalizeListing(r, DEFAULT_CONFIG).furnishingNorm).toBe('semi-furnished');
});
it('computes staleness and window vs snapshot', () => {
  const n85 = normalizeListing(rows.find(r => r.listingId === 'CP-0085')!, DEFAULT_CONFIG);
  expect(n85.daysDark).toBe(106);
  const n84 = normalizeListing(rows.find(r => r.listingId === 'CP-0084')!, DEFAULT_CONFIG);
  expect(n84.liveWindowDays).toBe(-5); // impossible; trust layer quarantines it
});
it('44 rows belong to the lakeview stem', () => {
  const n = rows.map(r => normalizeListing(r, DEFAULT_CONFIG));
  expect(n.filter(x => x.stem === 'lakeviewres')).toHaveLength(44);
});
```

- [ ] **Step 2: FAIL** → **Step 3: Implement** — `nameKeyOf`: lowercase → strip non-`[a-z0-9 ]` → `\bres(idences|idency|idence)?\b` → `res` → collapse spaces → extract `phase\s*\d+`; stem = nameKey sans phase, spaces removed. `daysBetween` via `Date.UTC` parse. `furnishingNorm`: lowercase, `-`↔space tolerant map to the three canon values. `rentPerSf = areaSqft ? rent / areaSqft : null`.
- [ ] **Step 4: PASS** → **Step 5: Commit** `feat: normalization (name keys, furnishing, staleness)`

### Task 3: Clone pairs, unit clusters, representatives

**Files:**
- Create: `pipeline/src/clones.ts` · Test: `pipeline/test/clones.test.ts`

**Interfaces:**
- Consumes: `NormalizedListing[]`, `PipelineConfig`.
- Produces: `findClonePairs(listings, config): { pairs: ClonePair[]; suspects: ClonePair[] }` (pairs = same-stem only; suspects = cross-stem near-clones); `buildUnitClusters(listings, pairs, config): UnitCluster[]` (union-find over same-stem pairs; singletons excluded); `pickRepresentative(members: NormalizedListing[]): string` (owner-posted first, then freshest `lastSeenDate`, then lowest id).

- [ ] **Step 1: Failing tests**

```ts
it('finds the 14 same-stem clone pairs and 1 cross-stem suspect', () => {
  const { pairs, suspects } = findClonePairs(listings, DEFAULT_CONFIG);
  expect(pairs).toHaveLength(14);
  expect(suspects).toHaveLength(1);
  expect(suspects[0]).toMatchObject({ aId: 'CP-0026', bId: 'CP-0053', kind: 'cross-stem' });
  const has = (a: string, b: string) => pairs.some(p => (p.aId === a && p.bId === b) || (p.aId === b && p.bId === a));
  expect(has('CP-0017', 'CP-0073')).toBe(true);
  expect(has('CP-0008', 'CP-0071')).toBe(true);
  expect(has('CP-0044', 'CP-0077')).toBe(true);
});
it('clusters the fern triangle into one unit', () => {
  const { pairs } = findClonePairs(listings, DEFAULT_CONFIG);
  const clusters = buildUnitClusters(listings, pairs, DEFAULT_CONFIG);
  const fern = clusters.find(c => c.memberIds.includes('CP-0036'))!;
  expect(fern.memberIds.sort()).toEqual(['CP-0036', 'CP-0039', 'CP-0076']);
});
it('representative prefers owner, then freshest', () => {
  const { pairs } = findClonePairs(listings, DEFAULT_CONFIG);
  const clusters = buildUnitClusters(listings, pairs, DEFAULT_CONFIG);
  const c = clusters.find(c => c.memberIds.includes('CP-0017'))!; // owner CP-0017 vs owner CP-0073 same dates -> lowest id
  expect(c.representativeId).toBe('CP-0017');
});
```

- [ ] **Step 2: FAIL** → **Step 3: Implement** — pair predicate: `bhk` equal ∧ posted dates within `cloneDateSlackDays` ∧ lastSeen within slack ∧ ((both areas present ∧ |Δarea| ≤ `cloneAreaSlackSf` ∧ (deposit exact-equal ∨ relRentDiff ≤ `cloneRentTolerance`)) ∨ (deposit exact-equal ∧ relRentDiff ≤ tolerance)). Same stem → `pairs`, different stems → `suspects`. `evidence`: string per matched criterion ('dates≤3d', 'area Δ25sf', 'deposit exact', 'rent ≤2%'). Union-find only over `pairs`.
- [ ] **Step 4: PASS** → **Step 5: Commit** `feat: strict clone detection, unit clusters, representative rule`

### Task 4: Alias decisions + suggestions

**Files:**
- Create: `pipeline/src/aliases.ts` · Test: `pipeline/test/aliases.test.ts`

**Interfaces:**
- Consumes: `NormalizedListing[]`, `UnitCluster[]`, `PipelineConfig`.
- Produces: `decideAliases(listings, clusters, config): AliasDecision[]` — one decision per stem having >1 distinct `nameKey`; bridges = number of unit clusters whose members span ≥2 nameKeys of that stem; status merged/suspected/distinct per `minIndependentBridgesToMerge`. `suggestAliases(listings): AliasSuggestion[]` — cross-stem suggestions via compact-prefix (one compact stem is a prefix of the other, ≥8 chars shared) and token-abbrev ('blue water hts' vs 'bluewater heights': each token of A is a prefix of the concatenated tokens of B in order).

- [ ] **Step 1: Failing tests**

```ts
it('merges lakeview incl. phase1 on ≥2 independent bridges', () => {
  const d = decideAliases(listings, clusters, DEFAULT_CONFIG).find(d => d.stem === 'lakeviewres')!;
  expect(d.status).toBe('merged');
  expect(d.independentBridges).toBeGreaterThanOrEqual(2);
  expect(d.nameKeys).toContain('lakeviewres phase1');
});
it('marks fern grove ↔ fern grove residency suspected on exactly 1 bridge', () => {
  const d = decideAliases(listings, clusters, DEFAULT_CONFIG).find(d => d.stem === 'ferngrove')!;
  expect(d.status).toBe('suspected'); expect(d.independentBridges).toBe(1);
});
it('never proposes merging ferngroveapartments into ferngrove via bridges', () => {
  const all = decideAliases(listings, clusters, DEFAULT_CONFIG);
  expect(all.find(d => d.nameKeys.some(k => k.includes('apartments')))?.stem ?? 'none').toBe('none');
});
it('suggests bluewater height/heights/hts as string-similar (suggestion only)', () => {
  const s = suggestAliases(listings);
  expect(s.some(x => x.a.includes('bluewater') && x.b.includes('bluewater'))).toBe(true);
});
```
Note: `ferngrove` vs `ferngroveres` share the stem `ferngrove` only if `nameKeyOf` collapses `residency` → `res` and stem-strips it — it does not; they are distinct stems. Resolution (locked here): `decideAliases` groups by **res-stripped stem** (`stem.replace(/res$/, '')`) so `ferngrove`/`ferngroveres` and `lakeviewres` variants group correctly, while `ferngroveapartments` stays outside. The AliasDecision.stem field carries the res-stripped group key.

- [ ] **Step 2: FAIL** → **Step 3: Implement** → **Step 4: PASS** → **Step 5: Commit** `feat: evidence-bridged alias policy + string-similarity suggestions`

### Task 5: Trust rule engine

**Files:**
- Create: `pipeline/src/trust.ts` · Test: `pipeline/test/trust.test.ts`

**Interfaces:**
- Consumes: `NormalizedListing`, context `{ config: PipelineConfig; duplicateCopyIds: Set<string> }` (duplicateCopyIds = cluster members minus representatives).
- Produces: `assessTrust(listing, ctx): TrustDecision`. Reason codes (exact strings, used by UI): `impossible-dates`, `impossible-price`, `bhk-area-mislabel`, `subject-echo`, `stale-dead`, `stale-gray`, `aspirational-ask`, `duplicate-copy`, `few-photos`, `unknown-poster`, `deposit-template`, `blank-area`.

Rule table (order matters; first quarantine wins the grade):
| Code | Trigger | Effect |
|---|---|---|
| impossible-dates | liveWindowDays < 0 | quarantine → D, weight 0 |
| impossible-price | rentPerSf outside `rentPerSfBounds` (area present) | quarantine → D |
| bhk-area-mislabel | area outside `bhkAreaBoundsSf[bhk]` | quarantine → D |
| subject-echo | same res-stripped stem as subject ∧ area within 25sf of subject ∧ deposit === subject.deposit ∧ postedDate within `subject.postedWithinDays` of snapshot | quarantine → D |
| stale-dead | daysDark > staleExcludeAfterDays | exclude → D, weight 0 |
| duplicate-copy | id ∈ duplicateCopyIds | exclude → C, weight 0 |
| stale-gray | staleGrayAfterDays < daysDark ≤ staleExcludeAfterDays | downweight ×grayWeight → B |
| aspirational-ask | liveWindowDays > aspirationalMinWindowDays ∧ daysDark ≤ aspirationalMaxDaysDark | downweight ×aspirationalWeight → B |
| few-photos / unknown-poster / deposit-template / blank-area | photoCount ≤ 2 / posterType unknown / deposit === 3×rent exactly / areaSqft null | note only, weight untouched |

Weights multiply; grade = D if any quarantine/exclude(stale), C if duplicate-copy, B if any downweight, else A.

- [ ] **Step 1: Failing tests** — one assertion per planted row:

```ts
const decide = (id: string) => assessTrust(byId(id), ctx);
it.each([
  ['CP-0084', 'impossible-dates'], ['CP-0082', 'impossible-price'],
  ['CP-0083', 'impossible-price'], ['CP-0085', 'bhk-area-mislabel'],
  ['CP-0081', 'subject-echo'],
])('%s is quarantined for %s', (id, code) => {
  const d = decide(id);
  expect(d.grade).toBe('D'); expect(d.weight).toBe(0);
  expect(d.reasons.map(r => r.code)).toContain(code);
});
it('CP-0003 excluded stale-dead; CP-0009 grade B gray; CP-0030 aspirational half-weight', () => {
  expect(decide('CP-0003').reasons.map(r => r.code)).toContain('stale-dead');
  expect(decide('CP-0009').grade).toBe('B');
  const d30 = decide('CP-0030');
  expect(d30.weight).toBe(0.5);
  expect(d30.reasons.map(r => r.code)).toContain('aspirational-ask');
});
it('weak signals annotate but never change weight', () => {
  const d = decide('CP-0086'); // blank area, fresh owner listing
  expect(d.reasons.map(r => r.code)).toContain('blank-area');
  expect(d.grade).toBe('A'); expect(d.weight).toBe(1);
});
it('CP-0073 is a duplicate copy (representative CP-0017 kept)', () => {
  expect(decide('CP-0073').reasons.map(r => r.code)).toContain('duplicate-copy');
});
```
Note: CP-0085 triggers both mislabel and stale-dead — reasons must contain both; grade stays D.

- [ ] **Step 2: FAIL** → **Step 3: Implement** (rule list as data; pure function) → **Step 4: PASS** → **Step 5: Commit** `feat: trust rule engine with reason codes`

### Task 6: Segments, estimates, confidence ladder

**Files:**
- Create: `pipeline/src/estimate.ts` · Test: `pipeline/test/estimate.test.ts`

**Interfaces:**
- Consumes: `NormalizedListing[]`, `trust: Record<string, TrustDecision>`, `AliasDecision[]`, `PipelineConfig`.
- Produces: `weightedMedian(items: {value: number; weight: number}[]): number | null` (sort by value, first cumulative ≥ half of total weight; null on empty); `buildSegments(...): SegmentEstimate[]` for exactly four segments: `tier1` (merged Lakeview family, 2BHK, semi-furnished), `tier2-micromarket` (all societies, 2BHK, semi-furnished), `furnished-lakeview` (merged family, 2BHK, fully furnished), `bhk3` (any 3BHK). Contributing = weight > 0. `looSwing` = max |weightedMedian(without i) − weightedMedian(all)|. `confidenceOf(est, ladder): Confidence` per rule 7. `collectNext`: for low/insufficient — fixed, segment-specific strings (verify listings by call, request society-group data, check own-portfolio adjacents).

- [ ] **Step 1: Failing tests**

```ts
it('weightedMedian: simple + weighted cases', () => {
  expect(weightedMedian([{value: 1, weight: 1}, {value: 3, weight: 1}])).toBe(3); // ≥ half rule: cum 1 of 2 → first ≥1 is value 1? lock: cum ≥ total/2 picks 1 → adjust expectation after implementing deterministic tie rule (document the rule in code)
  expect(weightedMedian([])).toBeNull();
});
it('tier1 matches FINDINGS ground truth', () => {
  const t1 = segs.find(s => s.segmentId === 'tier1')!;
  expect(t1.n).toBe(19);
  expect(t1.unweightedMedian).toBe(59500);
  expect(t1.range).toEqual([55500, 63000]);
  expect(t1.confidence).toBe('high');
});
it('furnished segment: 4 weak survivors, confidence below high, collectNext non-empty', () => {
  const f = segs.find(s => s.segmentId === 'furnished-lakeview')!;
  expect(f.contributingIds.sort()).toEqual(['CP-0005', 'CP-0012', 'CP-0016', 'CP-0027']);
  expect(['low', 'insufficient']).toContain(f.confidence);
  expect(f.collectNext.length).toBeGreaterThan(0);
});
it('3BHK segment is empty after quarantine → insufficient', () => {
  const s = segs.find(s => s.segmentId === 'bhk3')!;
  expect(s.n).toBe(0); expect(s.confidence).toBe('insufficient');
});
```
The first test's tie rule: implement lower-weighted-median (first index where cumulative ≥ total/2), then set the literal expectation to what that rule yields and keep the rule documented in a comment — the test locks the convention.
Caution on the furnished segment: exploration used staleness cutoff 21 for its survivor list; ratified config uses gray ≤30/exclude >30, under which CP-0003 (dark 77) stays excluded and CP-0027 (dark 16) is gray-B but contributing — the 4-survivor list holds. If the assertion fails, print contributingIds and reconcile against rules before touching fixtures.

- [ ] **Step 2: FAIL** → **Step 3: Implement** → **Step 4: PASS** → **Step 5: Commit** `feat: segments, weighted estimates, confidence ladder`

### Task 7: Verdict, orchestrator, overrides, golden run

**Files:**
- Create: `pipeline/src/verdict.ts`, `pipeline/src/pipeline.ts` · Test: `pipeline/test/pipeline.test.ts`, fixture `pipeline/test/fixtures/golden-run.json`

**Interfaces:**
- Consumes: everything above.
- Produces: `buildVerdict(segments, config): Verdict` — benchmark = `tier1`; readings: all-in (compare `subject.baseRent + subject.maintenance` vs weightedMedian) and base (compare `subject.baseRent`); `deviationPct = (comparedAsk − weightedMedian) / weightedMedian`, direction 'within' when |dev| < 0.02; asterisks: ask-vs-achieved, maintenance-inclusion-unknown. `runPipeline(csvText: string, config: PipelineConfig, overrides?: Override[]): PipelineResult` — overrides applied after trust: exclude → weight 0 grade D reason code `human-override`; reinstate → weight 1 grade A + same code; then estimates recompute.

- [ ] **Step 1: Failing tests**

```ts
it('verdict has opposite-direction readings (the sign flip)', () => {
  const r = result.verdict.readings;
  const allIn = r.find(x => x.assumption === 'listings-all-in')!;
  const base = r.find(x => x.assumption === 'listings-base')!;
  expect(allIn.deviationPct).toBeGreaterThan(0);   // ₹61k vs ₹59.5k-ish
  expect(base.deviationPct).toBeLessThan(0);       // ₹56k vs ₹59.5k-ish
});
it('is deterministic', () => {
  expect(runPipeline(text, DEFAULT_CONFIG)).toEqual(runPipeline(text, DEFAULT_CONFIG));
});
it('override excluding a tier1 comp recomputes the segment', () => {
  const o = runPipeline(text, DEFAULT_CONFIG, [{ listingId: 'CP-0018', action: 'exclude', reason: 'demo' }]);
  expect(o.segments.find(s => s.segmentId === 'tier1')!.n).toBe(18);
  expect(o.trust['CP-0018'].reasons.map(r => r.code)).toContain('human-override');
});
it('matches the reviewed golden run', () => {
  const golden = JSON.parse(readFileSync(new URL('./fixtures/golden-run.json', import.meta.url), 'utf8'));
  expect(runPipeline(text, DEFAULT_CONFIG)).toEqual(golden);
});
```

- [ ] **Step 2: FAIL** → **Step 3: Implement**; generate golden via a one-off script (`node --experimental-strip-types` or a vitest `it.skip`-turned-run) **only after** eyeballing: quarantine ids, N=19, medians, furnished survivors against FINDINGS.md. Commit the reviewed JSON.
- [ ] **Step 4: PASS (full suite)** → **Step 5: Commit** `feat: verdict with dual readings, pipeline orchestrator, overrides, golden run`

### Task 8: App shell, theme, in-browser pipeline

**Files:**
- Create: `vite.config.ts`, `app/index.html`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/theme.css`, `app/src/state.ts` · Test: `app/test/render.test.tsx`
- Modify: `package.json` (add `react react-dom`, `-D @vitejs/plugin-react vite jsdom @testing-library/react @types/react @types/react-dom`; scripts `dev`, `build`, `preview`)

**Interfaces:**
- Consumes: `runPipeline`, `DEFAULT_CONFIG`; CSV via `import csvText from '../../data/listings.csv?raw'`.
- Produces: `usePipeline(): { result: PipelineResult; overrides: Override[]; addOverride(o: Override): void; clearOverrides(): void }` (memoized recompute); `App` renders scene sections in order: Hero → RawPull → TrustBoard → Clusters → AliasMap → Estimate → VerdictPanel → FailureCase → Overrides → Assumptions (stub sections OK this task, each labeled).

Theme tokens (from Flent's site + BOSS screenshots — refined during Task 13's design pass): `--paper:#faf6ef; --ink:#1a1a18; --green:#0e6b4f; --green-deep:#0a4a37; --lavender:#e8e3f5; --peach:#f7e4d6; --rule:#e5ded2; --serif:'Instrument Serif',Georgia,serif; --sans:'Plus Jakarta Sans',system-ui,sans-serif` — loaded via Google Fonts `<link>` in `index.html`.

- [ ] **Step 1: Failing render test**

```tsx
// app/test/render.test.tsx  (vitest environment jsdom)
import { render, screen } from '@testing-library/react';
import App from '../src/App';
it('renders the hero with real pipeline numbers', () => {
  render(<App />);
  expect(screen.getByText(/86 raw listings/i)).toBeTruthy();
  expect(screen.getAllByText(/₹59,500/).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: FAIL** → **Step 3: Implement** (vite root `app`, alias `@pipeline` → `../pipeline/src`; vitest workspace: node env for pipeline tests, jsdom for app tests) → **Step 4: `npm test` and `npm run build` both PASS** → **Step 5: Commit** `feat: app shell with live in-browser pipeline`

### Task 9: RawPull + TrustBoard scenes (the inspectability core)

**Files:**
- Create: `app/src/scenes/RawPull.tsx`, `app/src/scenes/TrustBoard.tsx`, shared `app/src/components/{ListingRow,GradeChip,ReasonTag,SectionHeader}.tsx` · Test: extend `app/test/render.test.tsx`

**Interfaces:**
- Consumes: `PipelineResult`, `usePipeline`.
- Produces: `RawPull` — full 86-row table (id, source, society-as-written, bhk/furnishing, area, rent, deposit, photos, poster, posted→last-seen) with filter chips (source, grade); communicates "this is the mess." `TrustBoard` — every listing as a card/row: grade chip A–D, weight, each reason as a plain-language tag with the rule's threshold shown (e.g. "dark 77d > 30d"); grouped by grade, quarantine section prominent with the five planted rows and their stories; each row has an Exclude/Reinstate control calling `addOverride` (reason text required).

Scene content requirements (assertions): quarantine section lists exactly CP-0081/82/83/84/85 with reason labels; CP-0081 card carries the subject-echo narrative ("matches the subject deal's area, deposit and timing — circular evidence"); grade counts visible (A/B/C/D tallies).

- [ ] **Step 1: Failing tests** — assert quarantine ids render, reason label for CP-0084 contains "last seen before posted", exclude control exists for CP-0018.
- [ ] **Step 2: FAIL** → **Step 3: Implement** → **Step 4: PASS + visual check in Browser pane** → **Step 5: Commit** `feat: raw pull and trust board scenes`

### Task 10: Clusters + AliasMap scenes

**Files:**
- Create: `app/src/scenes/Clusters.tsx`, `app/src/scenes/AliasMap.tsx` · Test: extend render tests.

**Interfaces:**
- Consumes: `unitClusters`, `suspects`, `aliases`, `aliasSuggestions`.
- Produces: `Clusters` — each unit cluster as a card: members with sources, the kept representative starred, intra-cluster rent spread as a mini range bar ("the same home, ₹58k–₹62k depending on who posted it"); the suspect queue rendered separately with the CP-0026/0053 story ("rent+dates rhyme, deposits disagree — a human decides"). `AliasMap` — per stem-group: name variants as chips joined by bridge counts; merged (solid), suspected (dashed, with confirm affordance copy), distinct + suggestions (dotted, "string-similar only — no listing evidence").

- [ ] **Steps 1–5** — failing render assertions (suspect pair ids present; "Phase 1" chip inside the merged Lakeview group; FernGrove Apartments shown distinct), implement, pass + visual check, commit `feat: cluster and alias evidence scenes`.

### Task 11: Estimate walk + Verdict + Assumptions

**Files:**
- Create: `app/src/scenes/Estimate.tsx`, `app/src/scenes/VerdictPanel.tsx`, `app/src/scenes/Assumptions.tsx` · Test: extend render tests.

**Interfaces:**
- Consumes: `segments`, `verdict`, `config`.
- Produces: `Estimate` — the median walk as a horizontal waterfall (Raw 86 / ₹59,000 → …steps… → Tier 1 19 / ₹59,500) with N shrinking visibly; confidence badge with its earned criteria listed ("N=19 · 4 sources · LOO ₹0 · fresh"); LOO sentence ("remove any single comp and the median moves ₹0"). `VerdictPanel` — the ask (₹56k + ₹5k) against benchmark under BOTH readings side by side, sign flip made explicit, asterisks rendered as first-class footnotes, "top data fix: capture maintenance-inclusion per listing". `Assumptions` — every `PipelineConfig` value rendered from the live config object (never hardcoded), each with a one-line rationale.

- [ ] **Steps 1–5** — failing assertions (waterfall shows "19", both readings render with opposite signs, assumptions panel shows "30" from `staleExcludeAfterDays`), implement, pass + visual check, commit `feat: estimate walk, dual-reading verdict, assumptions panel`.

### Task 12: FailureCase + Overrides scenes

**Files:**
- Create: `app/src/scenes/FailureCase.tsx`, `app/src/scenes/Overrides.tsx` · Test: extend render tests.

**Interfaces:**
- Consumes: `furnished-lakeview` + `bhk3` segments, `usePipeline` overrides.
- Produces: `FailureCase` — designed as a first-class state, not an error: "Asked: what could this home list at once furnished? Answer: not enough good evidence." — the 4 survivors each shown with their weakness (6× deposit + 66 unfilled days / 1-day-old / 0 photos / gray staleness), then the refusal + `collectNext` checklist; the 3BHK N=0 case as a coda ("the only 3BHK row was the subject itself"). `Overrides` — live demo: excluding/reinstating recomputes N and the median in place; a visible audit log (listing, action, reason, resulting change).

- [ ] **Steps 1–5** — failing assertions (survivor ids render with weakness labels; after `addOverride` exclude CP-0018 the tier1 N in the DOM reads 18; log renders the reason), implement (user-event for the interaction test), pass + visual check, commit `feat: failure case and live override scenes`.

### Task 13: Craft pass, guided flow, README, build

**Files:**
- Modify: all scenes, `theme.css`, `App.tsx` (sticky progress nav of the 5-minute path) · Create: `README.md` (reviewer path: link → what to look at in each scene in order; repo path: `npm ci && npm test && npm run dev`; provenance + AI-usage pointer) · Test: full suite + `npm run build`.

**Interfaces:** no new code contracts — this is the Shopify-Editions-level polish pass executed with the frontend-design skill: typography rhythm (serif-italic display + sans body), the ticker-style header, pill chips, section numbers, motion on the waterfall, responsive down to 768px, print-decent. The candidate reviews every scene and dictates adjustments; nothing ships they haven't seen.

- [ ] **Step 1: Load frontend-design skill; audit each scene against Flent's language** → **Step 2: Apply** → **Step 3: `npm test` + `npm run build` PASS; walk the full flow in the Browser pane; screenshot set for the candidate** → **Step 4: Commit** `polish: editorial craft pass + reviewer README`

---

## Self-review notes

- **Spec coverage:** rules 1→Task 5 (quarantine codes), 2→Task 5 (stale grades), 3→Task 3, 4→Task 4, 5→Task 5 (aspirational), 6→Task 5 (notes only), 7→Task 6 (ladder), 8→Task 7 (dual readings), 9→Tasks 6+12 (failure segments + scene). Overrides requirement → Tasks 7+12. Assumptions visibility → Task 11. Provenance → Task 1. ✓
- **Known judgment points flagged inline:** weightedMedian tie convention (Task 6 Step 1), furnished-survivor reconciliation under ratified staleness (Task 6 caution), res-stripped stem grouping (Task 4 note).
- **Deployment** is deliberately not a task: submission-day step with the candidate (Vercel/Netlify account choice is theirs); the README covers the local path meanwhile.
