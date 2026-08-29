import { describe, expect, it } from 'vitest';
import { buildUnitClusters, findClonePairs } from '../src/clones';
import { bootstrapBand, buildSegments, confidenceOf, weightedMedian } from '../src/estimate';
import { normalizeListing } from '../src/normalize';
import { assessTrust } from '../src/trust';
import { DEFAULT_CONFIG, type TrustDecision } from '../src/types';
import { decideAliases } from '../src/aliases';
import { rawRows } from './helpers';

const listings = rawRows.map(r => normalizeListing(r, DEFAULT_CONFIG));
const { pairs } = findClonePairs(listings, DEFAULT_CONFIG);
const clusters = buildUnitClusters(listings, pairs);
const duplicateCopyIds = new Set(clusters.flatMap(c => c.memberIds.filter(id => id !== c.representativeId)));
const trust: Record<string, TrustDecision> = {};
for (const l of listings) trust[l.listingId] = assessTrust(l, { config: DEFAULT_CONFIG, duplicateCopyIds });
const aliases = decideAliases(listings, clusters, DEFAULT_CONFIG);
const segs = buildSegments(listings, trust, aliases, DEFAULT_CONFIG);
const seg = (id: string) => segs.find(s => s.segmentId === id)!;

describe('weightedMedian', () => {
  // Convention locked here: lower weighted median — the first value whose
  // cumulative weight reaches half the total. Deterministic, no interpolation.
  it('simple and weighted cases', () => {
    expect(weightedMedian([{ value: 1, weight: 1 }, { value: 3, weight: 1 }])).toBe(1);
    expect(weightedMedian([{ value: 50, weight: 0.5 }, { value: 100, weight: 2 }])).toBe(100);
    expect(weightedMedian([{ value: 7, weight: 1 }])).toBe(7);
    expect(weightedMedian([])).toBeNull();
  });
});

describe('tier1 (merged Lakeview family, 2BHK, semi-furnished)', () => {
  // The exploration walk previewed N=19 with a hard 21-day cutoff AND a dedup
  // bug that dropped CP-0026 as a "duplicate" of the cross-society CP-0053.
  // Under the ratified rules, 15–30d rows stay at half weight (adds CP-0015)
  // and cross-society near-clones stay contributing (keeps CP-0026) → N=21.
  // Independently recomputed in Python 2026-08-30. Median unmoved: ₹59,500.
  const t1 = seg('tier1');
  it('matches ground truth', () => {
    expect(t1.n).toBe(21);
    expect(t1.contributingIds).toContain('CP-0015');
    expect(t1.contributingIds).toContain('CP-0026');
    expect(t1.unweightedMedian).toBe(59500);
    expect(t1.weightedMedian).toBe(59500);
    expect(t1.range).toEqual([55500, 63000]);
  });
  it('is rock-stable: leave-one-out swing is zero', () => {
    expect(t1.looSwing).toBe(0);
  });
  it('earns high confidence (effective N 16, 4 sources, fresh)', () => {
    expect(t1.confidence).toBe('high');
    expect(t1.distinctSources).toBe(4);
    expect(t1.medianAgeDays).toBeLessThan(45);
  });
});

describe('tier2 (wider micromarket, 2BHK, semi-furnished)', () => {
  it('matches the independent recompute at the ratified staleness bound', () => {
    const t2 = seg('tier2-micromarket');
    expect(t2.n).toBe(39);
    expect(t2.unweightedMedian).toBe(58500);
  });
});

describe('furnished-lakeview (the failure case)', () => {
  const f = seg('furnished-lakeview');
  it('has exactly the 4 weak survivors', () => {
    expect([...f.contributingIds].sort()).toEqual(['CP-0005', 'CP-0012', 'CP-0016', 'CP-0027']);
  });
  it('confidence is low: 4 rows but only 3.0 effective evidence', () => {
    expect(f.confidence).toBe('low');
    expect(f.collectNext.length).toBeGreaterThan(0);
  });
});

describe('uncertainty maths', () => {
  const t1 = seg('tier1');
  it('bootstrap band is deterministic, inside the range, and brackets the median', () => {
    const again = bootstrapBand(
      t1.contributingIds.map(id => ({
        value: listings.find(l => l.listingId === id)!.rent,
        weight: trust[id]!.weight,
      })),
      DEFAULT_CONFIG.bootstrap,
    );
    expect(t1.band).toEqual(again); // same seed → same band
    const [lo, hi] = t1.band!;
    expect(lo).toBeLessThanOrEqual(t1.weightedMedian!);
    expect(hi).toBeGreaterThanOrEqual(t1.weightedMedian!);
    expect(lo).toBeGreaterThanOrEqual(t1.range![0]);
    expect(hi).toBeLessThanOrEqual(t1.range![1]);
  });
  it('MAD is a sane robust spread for tier1', () => {
    expect(t1.mad).toBeGreaterThan(0);
    expect(t1.mad).toBeLessThan(5000);
  });
  it('band is null when fewer than 2 contributors', () => {
    expect(seg('bhk3').band).toBeNull();
  });
  it('spread-ratio guardrail caps confidence at LOW however big the sample', () => {
    expect(confidenceOf(10, 4, 0, 5, 2.5, DEFAULT_CONFIG.ladder)).toBe('low');
    expect(confidenceOf(10, 4, 0, 5, 1.2, DEFAULT_CONFIG.ladder)).toBe('high');
    expect(t1.spreadRatio).toBeLessThan(DEFAULT_CONFIG.ladder.spreadRatioCap);
  });
});

describe('bhk3 (the self-match coda)', () => {
  it('is empty after quarantine → insufficient', () => {
    const s = seg('bhk3');
    expect(s.n).toBe(0);
    expect(s.weightedMedian).toBeNull();
    expect(s.confidence).toBe('insufficient');
    expect(s.collectNext.length).toBeGreaterThan(0);
  });
});
