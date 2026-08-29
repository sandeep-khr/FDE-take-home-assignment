import { describe, expect, it } from 'vitest';
import { buildUnitClusters, findClonePairs } from '../src/clones';
import { normalizeListing } from '../src/normalize';
import { DEFAULT_CONFIG } from '../src/types';
import { rawRows } from './helpers';

const listings = rawRows.map(r => normalizeListing(r, DEFAULT_CONFIG));
const { pairs, suspects } = findClonePairs(listings, DEFAULT_CONFIG);
const clusters = buildUnitClusters(listings, pairs);
const hasPair = (a: string, b: string) =>
  pairs.some(p => (p.aId === a && p.bId === b) || (p.aId === b && p.bId === a));

describe('findClonePairs', () => {
  it('finds the 14 same-stem clone pairs and 1 cross-stem suspect', () => {
    expect(pairs).toHaveLength(14);
    expect(suspects).toHaveLength(1);
    expect([suspects[0]!.aId, suspects[0]!.bId].sort()).toEqual(['CP-0026', 'CP-0053']);
    expect(suspects[0]!.kind).toBe('cross-stem');
  });

  it('detects known cross-platform clones', () => {
    expect(hasPair('CP-0017', 'CP-0073')).toBe(true);
    expect(hasPair('CP-0008', 'CP-0071')).toBe(true);
    expect(hasPair('CP-0044', 'CP-0077')).toBe(true);
    expect(hasPair('CP-0064', 'CP-0080')).toBe(true);
  });

  it('records evidence strings on each pair', () => {
    const p = pairs.find(p => hasPairIds(p, 'CP-0017', 'CP-0073'))!;
    expect(p.evidence.length).toBeGreaterThan(0);
  });
});

function hasPairIds(p: { aId: string; bId: string }, a: string, b: string) {
  return (p.aId === a && p.bId === b) || (p.aId === b && p.bId === a);
}

describe('buildUnitClusters', () => {
  it('clusters the fern triangle into one unit', () => {
    const fern = clusters.find(c => c.memberIds.includes('CP-0036'))!;
    expect([...fern.memberIds].sort()).toEqual(['CP-0036', 'CP-0039', 'CP-0076']);
    expect(fern.rentMin).toBe(59500);
    expect(fern.rentMax).toBe(60500);
  });

  it('representative prefers owner, then freshest, then lowest id', () => {
    const c17 = clusters.find(c => c.memberIds.includes('CP-0017'))!;
    expect(c17.representativeId).toBe('CP-0017'); // both owner, same dates → lowest id
    const c1 = clusters.find(c => c.memberIds.includes('CP-0001'))!;
    expect(c1.representativeId).toBe('CP-0001'); // both brokers, same last_seen → lowest id
  });

  it('every cluster spans at least two listings and carries its nameKeys', () => {
    expect(clusters.every(c => c.memberIds.length >= 2)).toBe(true);
    const c8 = clusters.find(c => c.memberIds.includes('CP-0008'))!;
    expect(c8.nameKeys).toContain('lakeviewres phase1');
    expect(c8.nameKeys).toContain('lakeviewres');
  });
});
