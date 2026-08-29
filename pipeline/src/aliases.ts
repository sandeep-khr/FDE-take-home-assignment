import { resGroupKey } from './normalize';
import type { AliasDecision, AliasSuggestion, NormalizedListing, PipelineConfig, UnitCluster } from './types';

/**
 * Alias policy: spellings merge only on listing evidence. A "bridge" is a
 * physical-unit cluster whose cross-posts span two different name variants —
 * empirical proof the variants co-refer. String similarity alone never merges
 * anything; it only produces suggestions for a human to confirm.
 */
export function decideAliases(
  listings: NormalizedListing[],
  clusters: UnitCluster[],
  config: PipelineConfig,
): AliasDecision[] {
  const groups = new Map<string, Set<string>>(); // resGroupKey -> nameKeys seen
  for (const l of listings) {
    const key = resGroupKey(l.stem);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(l.nameKey);
  }
  const nameKeyOfListing = new Map(listings.map(l => [l.listingId, l.nameKey]));
  const groupOfListing = new Map(listings.map(l => [l.listingId, resGroupKey(l.stem)]));

  const decisions: AliasDecision[] = [];
  for (const [stem, nameKeySet] of groups) {
    if (nameKeySet.size < 2) continue; // single spelling — nothing to decide
    let bridges = 0;
    for (const c of clusters) {
      if (groupOfListing.get(c.memberIds[0]!) !== stem) continue;
      const spanned = new Set(c.memberIds.map(id => nameKeyOfListing.get(id)!));
      if (spanned.size >= 2) bridges++;
    }
    const status: AliasDecision['status'] =
      bridges >= config.minIndependentBridgesToMerge ? 'merged' : bridges >= 1 ? 'suspected' : 'distinct';
    const note =
      status === 'merged'
        ? `${bridges} independent cross-posted units bridge these spellings — treated as one society.`
        : status === 'suspected'
          ? `Only ${bridges} bridging unit — likely the same society, but a human confirms before the math merges them.`
          : 'Spellings share a family shape but no listing evidence links them — kept separate.';
    decisions.push({ stem, nameKeys: [...nameKeySet].sort(), status, independentBridges: bridges, note });
  }
  return decisions.sort((a, b) => a.stem.localeCompare(b.stem));
}

/**
 * String-similarity suggestions across *different* family groups. Two cheap,
 * inspectable heuristics; deliberately conservative (shared 5-char prefix and
 * comparable lengths) so unrelated societies never pair up.
 */
export function suggestAliases(listings: NormalizedListing[]): AliasSuggestion[] {
  const stems = [...new Set(listings.map(l => l.stem))].sort();
  const out: AliasSuggestion[] = [];
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const a = stems[i]!;
      const b = stems[j]!;
      if (resGroupKey(a) === resGroupKey(b)) continue; // already handled by decideAliases
      const [short, long] = a.length <= b.length ? [a, b] : [b, a];
      if (short.slice(0, 5) !== long.slice(0, 5)) continue;
      if (short.length < 0.6 * long.length) continue;
      if (long.startsWith(short)) {
        out.push({ a, b, heuristic: 'compact-prefix' });
      } else if (isSubsequence(short, long)) {
        out.push({ a, b, heuristic: 'token-abbrev' });
      }
    }
  }
  return out;
}

function isSubsequence(short: string, long: string): boolean {
  let i = 0;
  for (const ch of long) {
    if (ch === short[i]) i++;
    if (i === short.length) return true;
  }
  return i === short.length;
}
