import DotGrid from '../components/DotGrid';
import PipelineMap from '../components/PipelineMap';
import { inr, usePipeline } from '../state';

export default function Hero() {
  const { result, customFileName } = usePipeline();
  const t1 = result.segments.find(s => s.segmentId === 'tier1')!;
  const first = result.listings[0]?.listingId ?? '—';
  const last = result.listings.at(-1)?.listingId ?? '—';

  return (
    <section className="hero" id="top">
      <div className="hero-inner">
        <div className="hero-grid">
          <div className="hero-left">
            <p className="hero-case">
              <span>case · FLT-FDE-2026-01</span>
              <span>subject home · Lakeview Residences · 2BHK · semi-furnished</span>
              <span>evidence as of · 18 Aug 2026</span>
              {customFileName && <span>custom pull · {customFileName}</span>}
            </p>
            <h1>
              The market data lies. <em>Grade it before you bet on it.</em>
            </h1>
            <p className="hero-sub">
              A trust layer for scraped rental comps. It takes{' '}
              {customFileName ? (
                <>
                  your <b>{result.listings.length} raw listings</b>
                </>
              ) : (
                <>
                  the case packet&rsquo;s <b>86 raw listings</b>
                </>
              )}{' '}
              — {t1.n} earn weight — and produces a benchmark of{' '}
              <b>{t1.weightedMedian ? inr(t1.weightedMedian) : '—'}</b> a reviewer can interrogate
              row by row, and overturn. Every exclusion keeps its reason. Nothing enters the math
              invisibly.
            </p>
          </div>
          <div className="hero-right">
            <DotGrid mode="raw" />
            <p className="hero-census-caption">
              the census: one cell per listing, {first} → {last} · they all look like evidence
              right now
            </p>
          </div>
        </div>
        <PipelineMap />
        <p className="scroll-cue">scroll — the page is the pipeline ↓</p>
      </div>
    </section>
  );
}
