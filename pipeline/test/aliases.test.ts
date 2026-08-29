import { describe, expect, it } from 'vitest';
import { decideAliases, suggestAliases } from '../src/aliases';
import { buildUnitClusters, findClonePairs } from '../src/clones';
import { normalizeListing } from '../src/normalize';
import { DEFAULT_CONFIG } from '../src/types';
import { rawRows } from './helpers';

const listings = rawRows.map(r => normalizeListing(r, DEFAULT_CONFIG));
const { pairs } = findClonePairs(listings, DEFAULT_CONFIG);
const clusters = buildUnitClusters(listings, pairs);
const decisions = decideAliases(listings, clusters, DEFAULT_CONFIG);

describe('decideAliases', () => {
  it('merges the lakeview family incl. phase1 on ≥2 independent bridges', () => {
    const d = decisions.find(d => d.stem === 'lakeview')!;
    expect(d.status).toBe('merged');
    expect(d.independentBridges).toBeGreaterThanOrEqual(2);
    expect(d.nameKeys).toContain('lakeviewres phase1');
    expect(d.nameKeys).toContain('lakeviewres');
  });

  it('marks fern grove ↔ fern grove residency suspected on exactly 1 bridge', () => {
    const d = decisions.find(d => d.stem === 'ferngrove')!;
    expect(d.status).toBe('suspected');
    expect(d.independentBridges).toBe(1);
    expect(d.nameKeys.sort()).toEqual(['ferngrove', 'ferngroveres']);
  });

  it('never groups ferngroveapartments with the ferngrove family', () => {
    expect(decisions.some(d => d.nameKeys.includes('ferngroveapartments'))).toBe(false);
  });

  it('emits no decision for single-name societies (nothing to merge)', () => {
    expect(decisions.some(d => d.stem === 'maplecourtyard')).toBe(false);
  });
});

describe('suggestAliases', () => {
  const suggestions = suggestAliases(listings);
  it('suggests bluewater height/heights as string-similar (suggestion only)', () => {
    expect(
      suggestions.some(
        s => s.a.startsWith('bluewaterheight') && s.b.startsWith('bluewaterheight') && s.a !== s.b,
      ),
    ).toBe(true);
  });
  it('suggests the hts abbreviation via token-abbrev', () => {
    expect(suggestions.some(s => [s.a, s.b].includes('bluewaterhts'))).toBe(true);
  });
  it('never suggests across unrelated societies', () => {
    expect(suggestions.some(s => [s.a, s.b].includes('maplecourtyard') && [s.a, s.b].some(x => x.startsWith('parkside')))).toBe(false);
  });
});
