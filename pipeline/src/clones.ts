import { resGroupKey } from './normalize';
import type { ClonePair, NormalizedListing, PipelineConfig, UnitCluster } from './types';

/**
 * Strict clone rule: the same physical unit cross-posted. Deliberately tight —
 * a loose rule chained 31 distinct Lakeview homes into one cluster during
 * exploration (over-cleaning manufactures scarcity), and a cross-society pair
 * (CP-0026/CP-0053) showed that rent+area+dates alone can rhyme by accident.
 */
function clonePredicate(a: NormalizedListing, b: NormalizedListing, config: PipelineConfig): string[] | null {
  if (a.bhk !== b.bhk) return null;
  const dateSlack = config.cloneDateSlackDays;
  const postedClose = Math.abs(daysDiff(a.postedDate, b.postedDate)) <= dateSlack;
  const seenClose = Math.abs(daysDiff(a.lastSeenDate, b.lastSeenDate)) <= dateSlack;
  if (!postedClose || !seenClose) return null;

  const areaClose =
    a.areaSqft !== null && b.areaSqft !== null && Math.abs(a.areaSqft - b.areaSqft) <= config.cloneAreaSlackSf;
  const depositExact = a.deposit !== null && b.deposit !== null && a.deposit === b.deposit;
  const rentClose = Math.abs(a.rent - b.rent) / Math.max(a.rent, b.rent) <= config.cloneRentTolerance;

  const matched = (areaClose && (depositExact || rentClose)) || (depositExact && rentClose);
  if (!matched) return null;

  const evidence = [`posted/last-seen within ${dateSlack}d`];
  if (areaClose) evidence.push(`area within ${config.cloneAreaSlackSf}sf`);
  if (depositExact) evidence.push('deposit exactly equal');
  if (rentClose) evidence.push(`rent within ${config.cloneRentTolerance * 100}%`);
  return evidence;
}

function daysDiff(a: string, b: string): number {
  const p = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((p(b) - p(a)) / 86_400_000);
}

export function findClonePairs(
  listings: NormalizedListing[],
  config: PipelineConfig,
): { pairs: ClonePair[]; suspects: ClonePair[] } {
  const pairs: ClonePair[] = [];
  const suspects: ClonePair[] = [];
  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      const a = listings[i]!;
      const b = listings[j]!;
      const evidence = clonePredicate(a, b, config);
      if (!evidence) continue;
      const kind = resGroupKey(a.stem) === resGroupKey(b.stem) ? 'same-stem' : 'cross-stem';
      const pair: ClonePair = { aId: a.listingId, bId: b.listingId, kind, evidence };
      (kind === 'same-stem' ? pairs : suspects).push(pair);
    }
  }
  return { pairs, suspects };
}

/** Union same-stem clone pairs into physical-unit clusters (singletons omitted). */
export function buildUnitClusters(listings: NormalizedListing[], pairs: ClonePair[]): UnitCluster[] {
  const byId = new Map(listings.map(l => [l.listingId, l]));
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== c) {
      const next = parent.get(c)!;
      parent.set(c, r);
      c = next;
    }
    return r;
  };
  for (const l of listings) parent.set(l.listingId, l.listingId);
  for (const p of pairs) parent.set(find(p.aId), find(p.bId));

  const groups = new Map<string, string[]>();
  for (const l of listings) {
    const root = find(l.listingId);
    groups.set(root, [...(groups.get(root) ?? []), l.listingId]);
  }

  const clusters: UnitCluster[] = [];
  for (const memberIds of groups.values()) {
    if (memberIds.length < 2) continue;
    const members = memberIds.map(id => byId.get(id)!);
    clusters.push({
      id: `unit-${[...memberIds].sort()[0]}`,
      memberIds: [...memberIds].sort(),
      representativeId: pickRepresentative(members),
      rentMin: Math.min(...members.map(m => m.rent)),
      rentMax: Math.max(...members.map(m => m.rent)),
      nameKeys: [...new Set(members.map(m => m.nameKey))].sort(),
    });
  }
  return clusters.sort((a, b) => a.id.localeCompare(b.id));
}

/** Owner-posted beats broker/unknown; then freshest last_seen; then lowest id. */
export function pickRepresentative(members: NormalizedListing[]): string {
  const ranked = [...members].sort((a, b) => {
    const ownerA = a.posterType === 'owner' ? 0 : 1;
    const ownerB = b.posterType === 'owner' ? 0 : 1;
    if (ownerA !== ownerB) return ownerA - ownerB;
    if (a.lastSeenDate !== b.lastSeenDate) return a.lastSeenDate < b.lastSeenDate ? 1 : -1;
    return a.listingId < b.listingId ? -1 : 1;
  });
  return ranked[0]!.listingId;
}
