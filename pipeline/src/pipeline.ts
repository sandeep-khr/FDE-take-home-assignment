import { decideAliases, suggestAliases } from './aliases';
import { buildUnitClusters, findClonePairs } from './clones';
import { parseListingsCsv } from './csv';
import { buildSegments } from './estimate';
import { normalizeListing } from './normalize';
import { assessTrust } from './trust';
import type { Override, PipelineConfig, PipelineResult, TrustDecision } from './types';
import { buildVerdict } from './verdict';

/**
 * Raw CSV text in → fully annotated, deterministic result out. Human overrides
 * are applied after the automatic trust pass and re-run the arithmetic, so the
 * machine's reasons and the reviewer's reasons both stay on the record.
 */
export function runPipeline(
  csvText: string,
  config: PipelineConfig,
  overrides: Override[] = [],
): PipelineResult {
  const listings = parseListingsCsv(csvText).map(r => normalizeListing(r, config));
  const { pairs, suspects } = findClonePairs(listings, config);
  const unitClusters = buildUnitClusters(listings, pairs);
  const duplicateCopyIds = new Set(
    unitClusters.flatMap(c => c.memberIds.filter(id => id !== c.representativeId)),
  );
  const aliases = decideAliases(listings, unitClusters, config);
  const aliasSuggestions = suggestAliases(listings);

  const trust: Record<string, TrustDecision> = {};
  for (const l of listings) trust[l.listingId] = assessTrust(l, { config, duplicateCopyIds });

  for (const o of overrides) {
    const existing = trust[o.listingId];
    if (!existing) continue;
    const label = `reviewer ${o.action === 'exclude' ? 'excluded' : 'reinstated'}: ${o.reason}`;
    if (o.action === 'exclude') {
      trust[o.listingId] = {
        ...existing,
        grade: 'D',
        weight: 0,
        reasons: [...existing.reasons, { code: 'human-override', label, effect: 'exclude' }],
      };
    } else {
      trust[o.listingId] = {
        ...existing,
        grade: 'A',
        weight: 1,
        reasons: [...existing.reasons, { code: 'human-override', label, effect: 'note' }],
      };
    }
  }

  const segments = buildSegments(listings, trust, aliases, config);
  const verdict = buildVerdict(segments, config);

  return {
    config,
    listings,
    clonePairs: pairs,
    unitClusters,
    suspects,
    aliases,
    aliasSuggestions,
    trust,
    segments,
    verdict,
    overridesApplied: overrides,
  };
}
