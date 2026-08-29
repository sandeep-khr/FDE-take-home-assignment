import { nameKeyOf, resGroupKey } from './normalize';
import type { NormalizedListing, PipelineConfig, TrustDecision, TrustReason } from './types';

export interface TrustContext {
  config: PipelineConfig;
  /** Cluster members that are not the representative. */
  duplicateCopyIds: Set<string>;
}

/**
 * The trust rule engine. Rules are legible, ordered, and every effect carries a
 * reason a reviewer can quote back. Weak signals annotate; they never move the
 * math — that separation is the point.
 */
export function assessTrust(l: NormalizedListing, ctx: TrustContext): TrustDecision {
  const { config } = ctx;
  const reasons: TrustReason[] = [];
  type Detail = Pick<TrustReason, 'expected' | 'actual' | 'involvedFields'>;
  const emit =
    (effect: TrustReason['effect']) =>
    (code: string, label: string, detail?: Detail) =>
      reasons.push({ code, label, effect, ...detail });
  const q = emit('quarantine');
  const x = emit('exclude');
  const dw = emit('downweight');
  const note = emit('note');

  // --- quarantine: rows whose values cannot all be true -------------------
  if (l.liveWindowDays < 0) {
    q('impossible-dates', `last seen ${l.lastSeenDate} before posted ${l.postedDate} — provenance broken`, {
      expected: 'last_seen_date on or after posted_date',
      actual: `last seen ${l.lastSeenDate}, posted ${l.postedDate}`,
      involvedFields: { posted_date: l.postedDate, last_seen_date: l.lastSeenDate },
    });
  }
  const [psfLo, psfHi] = config.rentPerSfBounds;
  if (l.rentPerSf !== null && (l.rentPerSf < psfLo || l.rentPerSf > psfHi)) {
    q('impossible-price', `₹${l.rentPerSf.toFixed(1)}/sf outside the credible ₹${psfLo}–₹${psfHi}/sf band — error or non-comparable`, {
      expected: `rent per sqft within ₹${psfLo}–₹${psfHi}`,
      actual: `₹${l.rentPerSf.toFixed(1)}/sf`,
      involvedFields: { rent: l.rent, area_sqft: l.areaSqft },
    });
  }
  const bounds = config.bhkAreaBoundsSf[l.bhk];
  if (l.areaSqft !== null && bounds && (l.areaSqft < bounds[0] || l.areaSqft > bounds[1])) {
    q('bhk-area-mislabel', `${l.bhk}BHK at ${l.areaSqft}sf sits outside ${bounds[0]}–${bounds[1]}sf — an attribute is wrong`, {
      expected: `${l.bhk}BHK area within ${bounds[0]}–${bounds[1]}sf`,
      actual: `${l.areaSqft}sf`,
      involvedFields: { bhk: l.bhk, area_sqft: l.areaSqft },
    });
  }
  const subjectStem = resGroupKey(nameKeyOf(config.subject.society).stem);
  const echo =
    resGroupKey(l.stem) === subjectStem &&
    l.areaSqft !== null &&
    Math.abs(l.areaSqft - config.subject.areaSqft) <= config.cloneAreaSlackSf &&
    l.deposit === config.subject.deposit &&
    daysFromSnapshot(l.postedDate, config.snapshotDate) <= config.subject.postedWithinDays;
  if (echo) {
    q('subject-echo', 'matches the subject deal’s area, deposit and timing — the deal must not benchmark against its own listing', {
      expected: 'not the subject property itself',
      actual: `same family, ${l.areaSqft}sf ≈ subject ${config.subject.areaSqft}sf, deposit = subject ₹${config.subject.deposit.toLocaleString('en-IN')}, posted ${l.postedDate}`,
      involvedFields: { society: l.society, area_sqft: l.areaSqft, deposit: l.deposit, posted_date: l.postedDate },
    });
  }

  // --- exclusions ---------------------------------------------------------
  if (l.daysDark > config.staleExcludeAfterDays) {
    x('stale-dead', `not seen for ${l.daysDark}d (> ${config.staleExcludeAfterDays}d) — likely rented or withdrawn`, {
      expected: `seen within ${config.staleExcludeAfterDays}d of the ${config.snapshotDate} snapshot`,
      actual: `last seen ${l.lastSeenDate} (${l.daysDark}d dark)`,
      involvedFields: { last_seen_date: l.lastSeenDate },
    });
  }
  if (ctx.duplicateCopyIds.has(l.listingId)) {
    x('duplicate-copy', 'cross-post of a unit already counted — its cluster representative carries the evidence', {
      expected: 'one row per physical unit',
      actual: 'non-representative member of a clone cluster',
      involvedFields: { society: l.society, area_sqft: l.areaSqft, rent: l.rent, deposit: l.deposit },
    });
  }

  // --- downweights --------------------------------------------------------
  if (l.daysDark > config.staleGrayAfterDays && l.daysDark <= config.staleExcludeAfterDays) {
    dw('stale-gray', `not seen for ${l.daysDark}d (${config.staleGrayAfterDays}–${config.staleExcludeAfterDays}d gray zone) — half weight`, {
      expected: `seen within ${config.staleGrayAfterDays}d for full weight`,
      actual: `${l.daysDark}d dark`,
      involvedFields: { last_seen_date: l.lastSeenDate },
    });
  }
  if (l.liveWindowDays > config.aspirationalMinWindowDays && l.daysDark <= config.aspirationalMaxDaysDark) {
    dw('aspirational-ask', `listed ${l.liveWindowDays}d without renting — the market has refused this ask; treated as ceiling evidence at half weight`, {
      expected: `filled or delisted within ${config.aspirationalMinWindowDays}d`,
      actual: `live ${l.liveWindowDays}d and still listed ${l.daysDark}d ago`,
      involvedFields: { posted_date: l.postedDate, last_seen_date: l.lastSeenDate, rent: l.rent },
    });
  }

  // --- weak signals: annotate only ---------------------------------------
  if (l.photoCount <= 2) note('few-photos', `${l.photoCount} photo(s) — thin listing`);
  if (l.posterType === 'unknown') note('unknown-poster', 'poster type unknown');
  if (l.deposit !== null && l.deposit === 3 * l.rent) note('deposit-template', 'deposit is exactly 3.0× rent — template smell');
  if (l.areaSqft === null) note('blank-area', 'area not stated — similarity checks are weaker');

  // --- grade and weight ---------------------------------------------------
  const quarantined = reasons.some(r => r.effect === 'quarantine');
  const staleDead = reasons.some(r => r.code === 'stale-dead');
  const dupCopy = reasons.some(r => r.code === 'duplicate-copy');
  let grade: TrustDecision['grade'];
  let weight: number;
  if (quarantined || staleDead) {
    grade = 'D';
    weight = 0;
  } else if (dupCopy) {
    grade = 'C';
    weight = 0;
  } else {
    const downs = reasons.filter(r => r.effect === 'downweight');
    weight = downs.reduce(
      (w, r) => w * (r.code === 'stale-gray' ? config.grayWeight : config.aspirationalWeight),
      1,
    );
    grade = downs.length > 0 ? 'B' : 'A';
  }
  return { listingId: l.listingId, grade, weight, reasons };
}

function daysFromSnapshot(date: string, snapshot: string): number {
  const p = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((p(snapshot) - p(date)) / 86_400_000);
}
