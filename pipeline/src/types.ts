/**
 * Shared domain types for the comp trust layer.
 *
 * Every tunable number in the system lives in PipelineConfig (rendered verbatim
 * in the app's Assumptions panel). Rule code must not carry magic numbers.
 */

export interface RawListing {
  listingId: string;
  source: string;
  postedDate: string; // YYYY-MM-DD as scraped
  lastSeenDate: string; // YYYY-MM-DD as scraped
  society: string; // as written on the platform
  locality: string; // as written on the platform
  bhk: number;
  furnishing: string; // as written on the platform
  areaSqft: number | null;
  rent: number; // monthly asking rent, INR
  deposit: number | null;
  photoCount: number;
  posterType: 'owner' | 'broker' | 'unknown';
}

export type FurnishingNorm = 'semi-furnished' | 'fully furnished' | 'unfurnished';

export interface NormalizedListing extends RawListing {
  furnishingNorm: FurnishingNorm;
  /** Normalized society name, phase kept as a suffix (e.g. "lakeviewres phase1"). */
  nameKey: string;
  /** nameKey without the phase suffix, spaces removed (e.g. "lakeviewres"). */
  stem: string;
  phase: string | null;
  /** Days between last_seen and the snapshot date. */
  daysDark: number;
  /** Days between posted and last_seen. Negative = impossible provenance. */
  liveWindowDays: number;
  rentPerSf: number | null;
}

export interface ClonePair {
  aId: string;
  bId: string;
  /** same-stem pairs feed dedup + alias bridges; cross-stem pairs only ever feed the human suspect queue. */
  kind: 'same-stem' | 'cross-stem';
  evidence: string[];
}

export interface UnitCluster {
  id: string;
  memberIds: string[];
  representativeId: string;
  rentMin: number;
  rentMax: number;
  nameKeys: string[];
}

export interface AliasDecision {
  /** res-stripped stem group key (e.g. "lakeview", "ferngrove"). */
  stem: string;
  nameKeys: string[];
  status: 'merged' | 'suspected' | 'distinct';
  independentBridges: number;
  note: string;
}

export interface AliasSuggestion {
  a: string;
  b: string;
  heuristic: 'compact-prefix' | 'token-abbrev';
}

export type ReasonEffect = 'quarantine' | 'exclude' | 'downweight' | 'note';

export interface TrustReason {
  code: string;
  label: string;
  effect: ReasonEffect;
}

export interface TrustDecision {
  listingId: string;
  grade: 'A' | 'B' | 'C' | 'D';
  weight: number;
  reasons: TrustReason[];
}

export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface SegmentEstimate {
  segmentId: string;
  label: string;
  contributingIds: string[];
  n: number;
  weightedMedian: number | null;
  unweightedMedian: number | null;
  range: [number, number] | null;
  /** Max movement of the weighted median when any single contributor is removed. */
  looSwing: number | null;
  distinctSources: number;
  medianAgeDays: number | null;
  confidence: Confidence;
  collectNext: string[];
}

export interface VerdictReading {
  assumption: 'listings-all-in' | 'listings-base';
  comparedAsk: number;
  deviationPct: number;
  direction: 'above' | 'below' | 'within';
}

export interface Verdict {
  benchmarkSegmentId: string;
  readings: VerdictReading[];
  asterisks: string[];
}

export interface Override {
  listingId: string;
  action: 'exclude' | 'reinstate';
  reason: string;
}

export interface PipelineResult {
  config: PipelineConfig;
  listings: NormalizedListing[];
  clonePairs: ClonePair[];
  unitClusters: UnitCluster[];
  suspects: ClonePair[];
  aliases: AliasDecision[];
  aliasSuggestions: AliasSuggestion[];
  trust: Record<string, TrustDecision>;
  segments: SegmentEstimate[];
  verdict: Verdict;
  overridesApplied: Override[];
}

export interface PipelineConfig {
  snapshotDate: string;
  staleExcludeAfterDays: number;
  staleGrayAfterDays: number;
  cloneDateSlackDays: number;
  cloneAreaSlackSf: number;
  cloneRentTolerance: number;
  aspirationalMinWindowDays: number;
  aspirationalMaxDaysDark: number;
  minIndependentBridgesToMerge: number;
  rentPerSfBounds: [number, number];
  bhkAreaBoundsSf: Record<number, [number, number]>;
  grayWeight: number;
  aspirationalWeight: number;
  ladder: {
    highMinN: number;
    highMinSources: number;
    highMaxLooSwing: number;
    highMaxMedianAgeDays: number;
    mediumMinN: number;
    mediumMaxLooSwing: number;
    lowMinN: number;
  };
  subject: {
    society: string;
    areaSqft: number;
    deposit: number;
    baseRent: number;
    maintenance: number;
    bhk: number;
    furnishing: FurnishingNorm;
    /** A same-society listing posted within this many days of the snapshot that
     * mirrors the subject's area and deposit is treated as the subject itself. */
    postedWithinDays: number;
  };
}

/** Ratified 2026-08-30 (see docs/specs/2026-08-30-comp-trust-layer-design.md). */
export const DEFAULT_CONFIG: PipelineConfig = {
  snapshotDate: '2026-08-18',
  staleExcludeAfterDays: 30,
  staleGrayAfterDays: 14,
  cloneDateSlackDays: 3,
  cloneAreaSlackSf: 25,
  cloneRentTolerance: 0.02,
  aspirationalMinWindowDays: 60,
  aspirationalMaxDaysDark: 14,
  minIndependentBridgesToMerge: 2,
  rentPerSfBounds: [25, 90],
  bhkAreaBoundsSf: { 1: [350, 900], 2: [650, 1500], 3: [900, 2200] },
  grayWeight: 0.5,
  aspirationalWeight: 0.5,
  ladder: {
    highMinN: 8,
    highMinSources: 3,
    highMaxLooSwing: 1000,
    highMaxMedianAgeDays: 45,
    mediumMinN: 4,
    mediumMaxLooSwing: 2500,
    lowMinN: 2,
  },
  subject: {
    society: 'Lakeview Residences',
    areaSqft: 1175,
    deposit: 280000,
    baseRent: 56000,
    maintenance: 5000,
    bhk: 2,
    furnishing: 'semi-furnished',
    postedWithinDays: 7,
  },
};
