import { inr } from '../state';
import { usePipeline } from '../state';

export default function Hero({ csvText }: { csvText: string }) {
  const { result } = usePipeline();
  const t1 = result.segments.find(s => s.segmentId === 'tier1')!;
  const quarantined = Object.values(result.trust).filter(t =>
    t.reasons.some(r => r.effect === 'quarantine'),
  ).length;
  const specimen = csvText.split('\n').slice(0, 30).join('\n');

  return (
    <section className="hero" id="top">
      <div className="hero-inner">
        <pre className="hero-specimen" aria-hidden="true">
          {specimen}
        </pre>
        <div className="hero-kicker">
          <span className="chip mono">FLT-FDE-2026-01</span>
          <span className="chip">Lakeview Residences · 2BHK · semi-furnished</span>
          <span className="chip">Evidence snapshot · 18 Aug 2026</span>
        </div>
        <h1>
          The market data lies.
          <br />
          <em>Grade it</em> before you bet on it.
        </h1>
        <p className="hero-sub">
          A trust layer for scraped rental comps. It starts from the case packet&rsquo;s{' '}
          <b>86 raw listings</b>, gives every row a grade and a written reason, and ends at a
          benchmark a reviewer can interrogate listing by listing — and overturn. Nothing is
          deleted. Nothing enters the math invisibly.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <b>{result.listings.length}</b>
            <span>raw rows in</span>
          </div>
          <div className="stat stat--pine">
            <b>{t1.n}</b>
            <span>earn weight in tier 1</span>
          </div>
          <div className="stat stat--brick">
            <b>{quarantined}</b>
            <span>quarantined, with reasons</span>
          </div>
          <div className="stat stat--pine">
            <b>{t1.weightedMedian ? inr(t1.weightedMedian) : '—'}</b>
            <span>ask benchmark · {t1.confidence} confidence</span>
          </div>
        </div>
      </div>
    </section>
  );
}
