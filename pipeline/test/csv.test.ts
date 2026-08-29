import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseListingsCsv } from '../src/csv';

const text = readFileSync(new URL('../../data/listings.csv', import.meta.url), 'utf8');

describe('data provenance', () => {
  it('CSV is byte-identical to the case packet', () => {
    expect(createHash('sha256').update(text).digest('hex')).toBe(
      '561c4abbf7aecc7b68b17a5a68ba79c57bbcb13c8d3f5584b454b5c90aed507f',
    );
  });
});

describe('parseListingsCsv', () => {
  const rows = parseListingsCsv(text);

  it('parses all 86 rows with ids intact', () => {
    expect(rows).toHaveLength(86);
    expect(rows[0]!.listingId).toBe('CP-0001');
    expect(rows.at(-1)!.listingId).toBe('CP-0086');
  });

  it('parses blanks as null, numbers as numbers', () => {
    const r86 = rows.find(r => r.listingId === 'CP-0086')!;
    expect(r86.areaSqft).toBeNull();
    expect(r86.deposit).toBeNull();
    const r1 = rows.find(r => r.listingId === 'CP-0001')!;
    expect(r1.rent).toBe(60000);
    expect(r1.deposit).toBe(300000);
    expect(r1.bhk).toBe(2);
    expect(r1.photoCount).toBe(7);
    expect(r1.posterType).toBe('broker');
  });

  it('keeps raw strings untouched (no normalization here)', () => {
    expect(rows.find(r => r.listingId === 'CP-0082')!.furnishing).toBe('semi furnished');
    expect(rows.find(r => r.listingId === 'CP-0002')!.society).toBe('Lake View Residency');
  });
});
