import type { RawListing } from './types';

/**
 * Parse the case-packet listings CSV. The file is machine-generated with no
 * quoted fields; the header and column-count checks guard against silent drift
 * if that ever changes.
 */
export function parseListingsCsv(text: string): RawListing[] {
  const lines = text.trim().split(/\r?\n/);
  const header = (lines[0] ?? '').split(',');
  const idx = (name: string): number => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`listings.csv: missing column "${name}"`);
    return i;
  };
  const col = {
    listingId: idx('listing_id'),
    source: idx('source'),
    postedDate: idx('posted_date'),
    lastSeenDate: idx('last_seen_date'),
    society: idx('society'),
    locality: idx('locality'),
    bhk: idx('bhk'),
    furnishing: idx('furnishing'),
    areaSqft: idx('area_sqft'),
    rent: idx('rent'),
    deposit: idx('deposit'),
    photoCount: idx('photo_count'),
    posterType: idx('poster_type'),
  };
  const optionalNum = (s: string | undefined): number | null => {
    if (s === undefined || s.trim() === '') return null;
    const n = Number(s);
    if (Number.isNaN(n)) throw new Error(`listings.csv: non-numeric value "${s}"`);
    return n;
  };
  const requiredNum = (s: string | undefined, field: string): number => {
    const n = optionalNum(s);
    if (n === null) throw new Error(`listings.csv: blank required field ${field}`);
    return n;
  };

  return lines.slice(1).map(line => {
    const c = line.split(',');
    if (c.length !== header.length) throw new Error(`listings.csv: bad row "${line}"`);
    const posterType = c[col.posterType]!;
    if (posterType !== 'owner' && posterType !== 'broker' && posterType !== 'unknown') {
      throw new Error(`listings.csv: unexpected poster_type "${posterType}"`);
    }
    return {
      listingId: c[col.listingId]!,
      source: c[col.source]!,
      postedDate: c[col.postedDate]!,
      lastSeenDate: c[col.lastSeenDate]!,
      society: c[col.society]!,
      locality: c[col.locality]!,
      bhk: requiredNum(c[col.bhk], 'bhk'),
      furnishing: c[col.furnishing]!,
      areaSqft: optionalNum(c[col.areaSqft]),
      rent: requiredNum(c[col.rent], 'rent'),
      deposit: optionalNum(c[col.deposit]),
      photoCount: requiredNum(c[col.photoCount], 'photo_count'),
      posterType,
    };
  });
}
