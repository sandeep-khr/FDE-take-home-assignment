import { useEffect, useRef, useState } from 'react';
import { resGroupKey } from '@pipeline/normalize';
import type { NormalizedListing } from '@pipeline/types';
import SectionHeader from '../components/SectionHeader';
import { inr, usePipeline } from '../state';

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Stage 5: the median walk — what the number is after each honest step. */
export default function Estimate() {
  const { result } = usePipeline();
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setInView(true)),
      { threshold: 0.25 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const { listings, trust, segments, config } = result;
  const has = (l: NormalizedListing, code: string) =>
    trust[l.listingId]!.reasons.some(r => r.code === code);
  const quarantined = (l: NormalizedListing) =>
    trust[l.listingId]!.reasons.some(r => r.effect === 'quarantine');

  const s2 = listings.filter(l => l.bhk === 2);
  const s3 = s2.filter(l => !quarantined(l));
  const s4 = s3.filter(l => !has(l, 'stale-dead'));
  const s5 = s4.filter(l => !has(l, 'duplicate-copy'));
  const family = s5.filter(l => resGroupKey(l.stem) === 'lakeview');
  const t1 = segments.find(s => s.segmentId === 'tier1')!;
  const t2 = segments.find(s => s.segmentId === 'tier2-micromarket')!;
  const tier1Rows = listings.filter(l => t1.contributingIds.includes(l.listingId));

  const steps = [
    { label: 'Raw pull, everything', rows: listings },
    { label: '2BHK only', rows: s2 },
    { label: 'minus the quarantine', rows: s3 },
    { label: `alive within ${config.staleExcludeAfterDays}d`, rows: s4 },
    { label: 'one row per physical unit', rows: s5 },
    { label: 'Lakeview family, bridged names', rows: family },
    { label: 'Tier 1 · semi-furnished', rows: tier1Rows },
  ];

  const effectiveN = t1.contributingIds.reduce((s, id) => s + trust[id]!.weight, 0);
  const criteria = [
    { ok: effectiveN >= config.ladder.highMinN, text: `effective evidence ${effectiveN.toFixed(1)} ≥ ${config.ladder.highMinN} weighted rows` },
    { ok: t1.distinctSources >= config.ladder.highMinSources, text: `${t1.distinctSources} platforms ≥ ${config.ladder.highMinSources}` },
    { ok: (t1.looSwing ?? Infinity) < config.ladder.highMaxLooSwing, text: `leave-one-out swing ${inr(t1.looSwing ?? 0)} < ${inr(config.ladder.highMaxLooSwing)}` },
    { ok: (t1.medianAgeDays ?? Infinity) < config.ladder.highMaxMedianAgeDays, text: `median evidence age ${t1.medianAgeDays}d < ${config.ladder.highMaxMedianAgeDays}d` },
  ];

  return (
    <section className="scene" id="estimate">
      <SectionHeader
        stage="05 · The estimate"
        flow={`${listings.length} rows → ${t1.n} carry it`}
        title={
          <>
            The raw median was nearly right — <em>by accident.</em>
          </>
        }
        lede={
          <>
            This time the junk canceled out: a ₹12,000 error against a ₹1,85,000 error. Cleaning
            is not what moved the number — it is what makes the number <i>defensible</i>: an
            honest sample, a usable range, and protection on the next deal, where the junk
            won&rsquo;t be symmetric.
          </>
        }
      />
      <div ref={ref} className={`walk ${inView ? 'walk--in' : ''}`}>
        {steps.map(s => {
          const m = median(s.rows.map(r => r.rent));
          return (
            <div className="walk-row" key={s.label}>
              <span className="walk-label">
                <b>{s.label}</b>
              </span>
              <div className="walk-bar-track">
                <div className="walk-bar" style={{ width: `${(s.rows.length / listings.length) * 100}%` }}>
                  {s.rows.length}
                </div>
              </div>
              <span className="walk-median">
                {m !== null ? inr(m) : '—'}
                <span>median ask</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="benchmark-big">{t1.weightedMedian !== null ? inr(t1.weightedMedian) : '—'}</div>
      <p className="benchmark-meta">
        the Tier-1 ask benchmark — trust-weighted median of{' '}
        {t1.range ? `${inr(t1.range[0])}–${inr(t1.range[1])}` : '—'} · confidence{' '}
        <b style={{ color: 'var(--pine-deep)' }}>{t1.confidence.toUpperCase()}</b>, earned on all
        four criteria:
      </p>
      <ul className="criteria">
        {criteria.map(c => (
          <li key={c.text} style={{ color: c.ok ? 'inherit' : 'var(--brick)' }}>{c.text}</li>
        ))}
      </ul>
      <p className="benchmark-meta" style={{ marginTop: 26 }}>
        <b>Remove any single comp and the median moves {inr(t1.looSwing ?? 0)}</b> — the brief
        worried one bad listing can move an estimate by thousands; on this cleaned set, it cannot.
        And the wider micromarket corroborates rather than contradicts:{' '}
        {t2.unweightedMedian !== null ? inr(t2.unweightedMedian) : '—'} across {t2.n} units on{' '}
        {t2.distinctSources} platforms. Aspirational asks that sat unrented for months carry half
        weight, as ceiling evidence.
      </p>
    </section>
  );
}
