import { readFileSync } from 'node:fs';
import { parseListingsCsv } from '../src/csv';

export const csvText = readFileSync(new URL('../../data/listings.csv', import.meta.url), 'utf8');
export const rawRows = parseListingsCsv(csvText);
export const rawById = (id: string) => {
  const r = rawRows.find(r => r.listingId === id);
  if (!r) throw new Error(`no such listing ${id}`);
  return r;
};
