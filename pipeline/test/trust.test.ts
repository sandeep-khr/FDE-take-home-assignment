import { describe, expect, it } from 'vitest';
import { buildUnitClusters, findClonePairs } from '../src/clones';
import { normalizeListing } from '../src/normalize';
import { assessTrust } from '../src/trust';
import { DEFAULT_CONFIG } from '../src/types';
import { rawRows } from './helpers';

const listings = rawRows.map(r => normalizeListing(r, DEFAULT_CONFIG));
const { pairs } = findClonePairs(listings, DEFAULT_CONFIG);
const clusters = buildUnitClusters(listings, pairs);
const duplicateCopyIds = new Set(
  clusters.flatMap(c => c.memberIds.filter(id => id !== c.representativeId)),
);
const ctx = { config: DEFAULT_CONFIG, duplicateCopyIds };
const decide = (id: string) => assessTrust(listings.find(l => l.listingId === id)!, ctx);
const codes = (id: string) => decide(id).reasons.map(r => r.code);

describe('quarantine rules', () => {
  it.each([
    ['CP-0084', 'impossible-dates'],
    ['CP-0082', 'impossible-price'],
    ['CP-0083', 'impossible-price'],
    ['CP-0085', 'bhk-area-mislabel'],
    ['CP-0081', 'subject-echo'],
  ])('%s is quarantined for %s', (id, code) => {
    const d = decide(id);
    expect(d.grade).toBe('D');
    expect(d.weight).toBe(0);
    expect(codes(id)).toContain(code);
  });

  it('CP-0085 carries the stale reason too (reasons stack)', () => {
    expect(codes('CP-0085')).toContain('stale-dead');
  });

  it('reasons carry validator-style expected/actual/involvedFields detail', () => {
    const r = decide('CP-0084').reasons.find(r => r.code === 'impossible-dates')!;
    expect(r.expected).toContain('on or after');
    expect(r.actual).toContain('2026-08-11');
    expect(r.involvedFields).toMatchObject({ posted_date: '2026-08-16', last_seen_date: '2026-08-11' });
  });
});

describe('staleness and aspiration', () => {
  it('CP-0003 excluded stale-dead (dark 77d)', () => {
    const d = decide('CP-0003');
    expect(codes('CP-0003')).toContain('stale-dead');
    expect(d.weight).toBe(0);
    expect(d.grade).toBe('D');
  });
  it('CP-0009 is grade B gray (dark 15d), half weight', () => {
    const d = decide('CP-0009');
    expect(d.grade).toBe('B');
    expect(d.weight).toBe(0.5);
    expect(codes('CP-0009')).toContain('stale-gray');
  });
  it('CP-0030 aspirational half-weight (live 117d, dark 1d)', () => {
    const d = decide('CP-0030');
    expect(d.weight).toBe(0.5);
    expect(codes('CP-0030')).toContain('aspirational-ask');
  });
});

describe('duplicates and weak signals', () => {
  it('CP-0073 is a duplicate copy (representative CP-0017 kept)', () => {
    const d = decide('CP-0073');
    expect(codes('CP-0073')).toContain('duplicate-copy');
    expect(d.grade).toBe('C');
    expect(d.weight).toBe(0);
    expect(decide('CP-0017').reasons.every(r => r.code !== 'duplicate-copy')).toBe(true);
  });

  it('weak signals annotate but never change weight', () => {
    const d = decide('CP-0086'); // blank area, fresh owner listing
    expect(codes('CP-0086')).toContain('blank-area');
    expect(d.grade).toBe('A');
    expect(d.weight).toBe(1);
  });

  it('deposit-template and few-photos are notes only', () => {
    const d = decide('CP-0026'); // 1 photo, deposit exactly 3.0x rent, fresh
    expect(codes('CP-0026')).toEqual(expect.arrayContaining(['deposit-template', 'few-photos']));
    expect(d.weight).toBe(1);
  });
});

describe('portfolio shape', () => {
  it('grade tallies match the ratified rules', () => {
    const all = listings.map(l => assessTrust(l, ctx));
    const tally = { A: 0, B: 0, C: 0, D: 0 };
    for (const d of all) tally[d.grade]++;
    expect(tally.D).toBe(5 + listings.filter(l => l.daysDark > 30 && !['CP-0085'].includes(l.listingId)).length);
    expect(tally.C).toBe(duplicateCopyIds.size - dupAlsoDOrOverlap());
    expect(tally.A + tally.B + tally.C + tally.D).toBe(86);
  });
});

// Duplicate copies that are ALSO stale-dead/quarantined grade D, not C.
function dupAlsoDOrOverlap(): number {
  return [...duplicateCopyIds].filter(id => {
    const l = listings.find(x => x.listingId === id)!;
    return l.daysDark > DEFAULT_CONFIG.staleExcludeAfterDays;
  }).length;
}
