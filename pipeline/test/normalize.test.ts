import { describe, expect, it } from 'vitest';
import { daysBetween, nameKeyOf, normalizeListing } from '../src/normalize';
import { DEFAULT_CONFIG } from '../src/types';
import { rawById, rawRows } from './helpers';

describe('nameKeyOf', () => {
  it('collapses res-forms and keeps phase as suffix', () => {
    expect(nameKeyOf('Lakeview Res.').stem).toBe('lakeviewres');
    expect(nameKeyOf('Lake View Residency').stem).toBe('lakeviewres');
    expect(nameKeyOf('Lakeview Residences').stem).toBe('lakeviewres');
    expect(nameKeyOf('Lakeview Residences Phase 1')).toEqual({
      nameKey: 'lakeviewres phase1',
      stem: 'lakeviewres',
      phase: 'phase1',
    });
    expect(nameKeyOf('FernGrove Apartments').stem).toBe('ferngroveapartments');
    expect(nameKeyOf('Fern Grove Residency').stem).toBe('ferngroveres');
    expect(nameKeyOf('Blue Water Hts').stem).toBe('bluewaterhts');
    expect(nameKeyOf('Maple Court Yard').stem).toBe('maplecourtyard');
  });
});

describe('daysBetween', () => {
  it('does UTC date math on YYYY-MM-DD', () => {
    expect(daysBetween('2026-08-11', '2026-08-18')).toBe(7);
    expect(daysBetween('2026-08-16', '2026-08-11')).toBe(-5);
  });
});

describe('normalizeListing', () => {
  it('normalizes furnishing variants', () => {
    expect(normalizeListing(rawById('CP-0082'), DEFAULT_CONFIG).furnishingNorm).toBe('semi-furnished');
    expect(normalizeListing(rawById('CP-0003'), DEFAULT_CONFIG).furnishingNorm).toBe('fully furnished');
    expect(normalizeListing(rawById('CP-0006'), DEFAULT_CONFIG).furnishingNorm).toBe('unfurnished');
  });

  it('computes staleness and window vs snapshot', () => {
    const n85 = normalizeListing(rawById('CP-0085'), DEFAULT_CONFIG);
    expect(n85.daysDark).toBe(106);
    expect(n85.liveWindowDays).toBe(2);
    const n84 = normalizeListing(rawById('CP-0084'), DEFAULT_CONFIG);
    expect(n84.liveWindowDays).toBe(-5); // impossible; the trust layer quarantines it
  });

  it('computes rent per sqft when area is present', () => {
    expect(normalizeListing(rawById('CP-0086'), DEFAULT_CONFIG).rentPerSf).toBeNull();
    const n82 = normalizeListing(rawById('CP-0082'), DEFAULT_CONFIG);
    expect(n82.rentPerSf).toBeCloseTo(10.9, 1);
  });

  it('44 rows belong to the lakeview stem', () => {
    const n = rawRows.map(r => normalizeListing(r, DEFAULT_CONFIG));
    expect(n.filter(x => x.stem === 'lakeviewres')).toHaveLength(44);
  });
});
