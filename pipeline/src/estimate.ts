import { nameKeyOf, resGroupKey } from './normalize';
import type {
  AliasDecision,
  Confidence,
  NormalizedListing,
  PipelineConfig,
  SegmentEstimate,
  TrustDecision,
} from './types';

/**
 * Lower weighted median: the first value (ascending) whose cumulative weight
 * reaches half the total. Deterministic; no interpolation between rents.
 */
export function weightedMedian(items: { value: number; weight: number }[]): number | null {
  const live = items.filter(i => i.weight > 0);
  if (live.length === 0) return null;
  const sorted = [...live].sort((a, b) => a.value - b.value);
  const half = sorted.reduce((s, i) => s + i.weight, 0) / 2;
  let cum = 0;
  for (const i of sorted) {
    cum += i.weight;
    if (cum >= half) return i.value;
  }
  return sorted[sorted.length - 1]!.value;
}

interface SegmentDef {
  segmentId: string;
  label: string;
  member: (l: NormalizedListing) => boolean;
  collectNext: string[];
}

/**
 * Confidence rides on the *weight* of evidence, not the row count: half-weight
 * ceiling/gray rows should not buy full confidence. All criteria of a level
 * must hold (AND), else the estimate degrades to the next level.
 */
export function confidenceOf(
  effectiveN: number,
  distinctSources: number,
  looSwing: number | null,
  medianAgeDays: number | null,
  spreadRatio: number | null,
  ladder: PipelineConfig['ladder'],
): Confidence {
  const swing = looSwing ?? Number.POSITIVE_INFINITY;
  const age = medianAgeDays ?? Number.POSITIVE_INFINITY;
  // Spread guardrail ported from prior production comps validation (3× ceiling
  // on sale prices; tightened to 2× for rentals): a set that disagrees this
  // much about one segment cannot claim better than LOW, whatever its size.
  const spreadBlown = spreadRatio !== null && spreadRatio > ladder.spreadRatioCap;
  if (
    !spreadBlown &&
    effectiveN >= ladder.highMinN &&
    distinctSources >= ladder.highMinSources &&
    swing < ladder.highMaxLooSwing &&
    age < ladder.highMaxMedianAgeDays
  ) {
    return 'high';
  }
  if (!spreadBlown && effectiveN >= ladder.mediumMinN && swing < ladder.mediumMaxLooSwing) return 'medium';
  if (effectiveN >= ladder.lowMinN) return 'low';
  return 'insufficient';
}

/** Deterministic PRNG (mulberry32) — a fixed seed keeps runs reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded-bootstrap percentile band for the weighted median. This is sample
 * dispersion — what the surviving comps disagree by — NOT forecast error;
 * calibrating it against signed rents (an FSD-style band) is roadmap work.
 */
export function bootstrapBand(
  items: { value: number; weight: number }[],
  cfg: PipelineConfig['bootstrap'],
): [number, number] | null {
  const live = items.filter(i => i.weight > 0);
  if (live.length < cfg.minN) return null; // a 4-row bootstrap band reads as precision it hasn't earned
  const rand = mulberry32(cfg.seed);
  const medians: number[] = [];
  for (let b = 0; b < cfg.iterations; b++) {
    const sample = Array.from({ length: live.length }, () => live[Math.floor(rand() * live.length)]!);
    const m = weightedMedian(sample);
    if (m !== null) medians.push(m);
  }
  medians.sort((a, b) => a - b);
  const at = (p: number) => medians[Math.min(medians.length - 1, Math.max(0, Math.floor((p / 100) * medians.length)))]!;
  return [at(cfg.lowerPct), at(cfg.upperPct)];
}

export function buildSegments(
  listings: NormalizedListing[],
  trust: Record<string, TrustDecision>,
  aliases: AliasDecision[],
  config: PipelineConfig,
): SegmentEstimate[] {
  const subjectGroup = resGroupKey(nameKeyOf(config.subject.society).stem);
  const subjectNameKey = nameKeyOf(config.subject.society).nameKey;
  const familyMerged = aliases.some(a => a.stem === subjectGroup && a.status === 'merged');
  const inFamily = (l: NormalizedListing) =>
    familyMerged ? resGroupKey(l.stem) === subjectGroup : l.nameKey === subjectNameKey;

  const defs: SegmentDef[] = [
    {
      segmentId: 'tier1',
      label: 'Same society · 2BHK · semi-furnished',
      member: l => inFamily(l) && l.bhk === config.subject.bhk && l.furnishingNorm === config.subject.furnishing,
      collectNext: [
        'Call the two freshest surviving listings to confirm they are live and whether rent includes maintenance.',
        'Ask the society facilities group for recent closed rents.',
      ],
    },
    {
      segmentId: 'tier2-micromarket',
      label: 'Wider micromarket · 2BHK · semi-furnished',
      member: l => l.bhk === config.subject.bhk && l.furnishingNorm === config.subject.furnishing,
      collectNext: ['Verify the nearest non-Lakeview comps before leaning on this tier.'],
    },
    {
      segmentId: 'furnished-lakeview',
      label: 'Same society · 2BHK · fully furnished',
      member: l => inFamily(l) && l.bhk === config.subject.bhk && l.furnishingNorm === 'fully furnished',
      collectNext: [
        'Call CP-0005 and CP-0012 to confirm the asks are live and get an all-in number.',
        'Pull Flent’s own furnished 2BHK lettings in adjacent micromarkets as a floor/ceiling check.',
        'Ask Demand for furnished-room enquiry evidence before pricing rooms off this segment.',
      ],
    },
    {
      segmentId: 'bhk3',
      label: 'Any 3BHK in the pull',
      member: l => l.bhk === 3,
      collectNext: [
        'There is no usable 3BHK evidence in this pull — the only row was the subject’s own mislabeled cross-post.',
        'Request a fresh 3BHK pull before answering any 3BHK question.',
      ],
    },
  ];

  return defs.map(def => {
    const members = listings.filter(def.member);
    const contributing = members.filter(l => (trust[l.listingId]?.weight ?? 0) > 0);
    const items = contributing.map(l => ({ value: l.rent, weight: trust[l.listingId]!.weight }));
    const wMedian = weightedMedian(items);
    const rents = contributing.map(l => l.rent).sort((a, b) => a - b);
    const unweighted =
      rents.length === 0
        ? null
        : rents.length % 2 === 1
          ? rents[(rents.length - 1) / 2]!
          : (rents[rents.length / 2 - 1]! + rents[rents.length / 2]!) / 2;
    let looSwing: number | null = null;
    if (contributing.length >= 2 && wMedian !== null) {
      looSwing = 0;
      for (let i = 0; i < items.length; i++) {
        const without = items.filter((_, j) => j !== i);
        const m = weightedMedian(without);
        if (m !== null) looSwing = Math.max(looSwing, Math.abs(m - wMedian));
      }
    }
    const effectiveN = items.reduce((s, i) => s + i.weight, 0);
    const distinctSources = new Set(contributing.map(l => l.source)).size;
    const darks = contributing.map(l => l.daysDark).sort((a, b) => a - b);
    const medianAgeDays =
      darks.length === 0
        ? null
        : darks.length % 2 === 1
          ? darks[(darks.length - 1) / 2]!
          : (darks[darks.length / 2 - 1]! + darks[darks.length / 2]!) / 2;
    let mad: number | null = null;
    if (wMedian !== null && rents.length > 0) {
      const dev = rents.map(r => Math.abs(r - wMedian)).sort((a, b) => a - b);
      mad =
        dev.length % 2 === 1
          ? dev[(dev.length - 1) / 2]!
          : (dev[dev.length / 2 - 1]! + dev[dev.length / 2]!) / 2;
    }
    const band = bootstrapBand(items, config.bootstrap);
    const range: [number, number] | null = rents.length ? [rents[0]!, rents[rents.length - 1]!] : null;
    const spreadRatio = range && range[0] > 0 ? range[1] / range[0] : null;
    const confidence = confidenceOf(effectiveN, distinctSources, looSwing, medianAgeDays, spreadRatio, config.ladder);
    return {
      segmentId: def.segmentId,
      label: def.label,
      contributingIds: contributing.map(l => l.listingId),
      n: contributing.length,
      weightedMedian: wMedian,
      unweightedMedian: unweighted,
      range,
      looSwing,
      mad,
      band,
      spreadRatio,
      distinctSources,
      medianAgeDays,
      confidence,
      collectNext: confidence === 'high' || confidence === 'medium' ? [] : def.collectNext,
    };
  });
}
