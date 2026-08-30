import { resGroupKey } from './normalize';
import type { ClonePair, NormalizedListing, PipelineConfig, UnitCluster } from './types';

/**
 * Strict clone rule: the same physical unit cross-posted. Deliberately tight —
 * a loose rule chained 31 distinct Lakeview homes into one cluster during
 * exploration (over-cleaning manufactures scarcity), and a cross-society pair
 * (CP-0026/CP-0053) showed that rent+area+dates alone can rhyme by accident.
 */
const dayOrdinal = (s: string): number =>
  Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) / 86_400_000;

export function findClonePairs(
  listings: NormalizedListing[],
  config: PipelineConfig,
): { pairs: ClonePair[]; suspects: ClonePair[] } {
  const pairs: ClonePair[] = [];
  const suspects: ClonePair[] = [];
  const { cloneDateSlackDays: slack, cloneAreaSlackSf, cloneRentTolerance } = config;

  // Blocking for scale: clones must be posted within `slack` days of each
  // other, so sort by posted date and only compare inside that sliding
  // window. Identical results to the full O(n²) scan; near-linear on a
  // 27,000-row pull. Day ordinals are precomputed once — no date parsing in
  // the hot loop.
  const byPosted = [...listings].sort((a, b) =>
    a.postedDate === b.postedDate ? a.listingId.localeCompare(b.listingId) : a.postedDate < b.postedDate ? -1 : 1,
  );
  const posted = byPosted.map(l => dayOrdinal(l.postedDate));
  const seen = byPosted.map(l => dayOrdinal(l.lastSeenDate));
  const group = byPosted.map(l => resGroupKey(l.stem));

  for (let i = 0; i < byPosted.length; i++) {
    const a = byPosted[i]!;
    for (let j = i + 1; j < byPosted.length; j++) {
      if (posted[j]! - posted[i]! > slack) break;
      const b = byPosted[j]!;
      if (a.bhk !== b.bhk || Math.abs(seen[j]! - seen[i]!) > slack) continue;

      const areaClose =
        a.areaSqft !== null && b.areaSqft !== null && Math.abs(a.areaSqft - b.areaSqft) <= cloneAreaSlackSf;
      const depositExact = a.deposit !== null && b.deposit !== null && a.deposit === b.deposit;
      const rentClose = Math.abs(a.rent - b.rent) / Math.max(a.rent, b.rent) <= cloneRentTolerance;
      if (!((areaClose && (depositExact || rentClose)) || (depositExact && rentClose))) continue;

      const evidence = [`posted/last-seen within ${slack}d`];
      if (areaClose) evidence.push(`area within ${cloneAreaSlackSf}sf`);
      if (depositExact) evidence.push('deposit exactly equal');
      if (rentClose) evidence.push(`rent within ${cloneRentTolerance * 100}%`);

      const kind = group[i] === group[j] ? 'same-stem' : 'cross-stem';
      const [aId, bId] = a.listingId < b.listingId ? [a.listingId, b.listingId] : [b.listingId, a.listingId];
      (kind === 'same-stem' ? pairs : suspects).push({ aId, bId, kind, evidence });
    }
  }
  const stable = (x: ClonePair, y: ClonePair) => x.aId.localeCompare(y.aId) || x.bId.localeCompare(y.bId);
  return { pairs: pairs.sort(stable), suspects: suspects.sort(stable) };
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
