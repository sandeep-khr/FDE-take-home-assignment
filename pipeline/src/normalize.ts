import type { FurnishingNorm, NormalizedListing, PipelineConfig, RawListing } from './types';

/** UTC day difference between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const parse = (s: string): number => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new Error(`bad date "${s}"`);
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

/**
 * Normalize a society name for matching. Residences/Residency/Residence collapse
 * to "res" (the packet's clone pairs prove those forms co-refer); a phase number
 * survives as a suffix so phase merging stays a separate, evidence-based decision.
 */
export function nameKeyOf(society: string): { nameKey: string; stem: string; phase: string | null } {
  let s = society.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  s = s.replace(/\bres(idences|idency|idence)?\b/g, 'res');
  s = s.replace(/\s+/g, ' ').trim();
  let phase: string | null = null;
  const m = /\bphase\s*(\d+)\b/.exec(s);
  if (m) {
    phase = `phase${m[1]}`;
    s = s.replace(/\bphase\s*\d+\b/, '').replace(/\s+/g, ' ').trim();
  }
  const stem = s.replace(/ /g, '');
  return { nameKey: phase ? `${stem} ${phase}` : stem, stem, phase };
}

/**
 * Family group key: drops a trailing "res" so "Fern Grove" and "Fern Grove
 * Residency" compare as one candidate family, while suffixes that name a
 * different project ("...apartments") keep families apart.
 */
export const resGroupKey = (stem: string): string => stem.replace(/res$/, '');

const FURNISHING_MAP: Record<string, FurnishingNorm> = {
  'semi-furnished': 'semi-furnished',
  'semi furnished': 'semi-furnished',
  'fully furnished': 'fully furnished',
  'fully-furnished': 'fully furnished',
  unfurnished: 'unfurnished',
};

export function normalizeListing(raw: RawListing, config: PipelineConfig): NormalizedListing {
  const furnishingNorm = FURNISHING_MAP[raw.furnishing.toLowerCase().trim()];
  if (!furnishingNorm) throw new Error(`unmapped furnishing "${raw.furnishing}" on ${raw.listingId}`);
  const { nameKey, stem, phase } = nameKeyOf(raw.society);
  return {
    ...raw,
    furnishingNorm,
    nameKey,
    stem,
    phase,
    daysDark: daysBetween(raw.lastSeenDate, config.snapshotDate),
    liveWindowDays: daysBetween(raw.postedDate, raw.lastSeenDate),
    rentPerSf: raw.areaSqft ? raw.rent / raw.areaSqft : null,
  };
}
