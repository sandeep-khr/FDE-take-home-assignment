import DotGrid from '../components/DotGrid';
import { inr, usePipeline } from '../state';

export default function Hero() {
  const { result } = usePipeline();
  const t1 = result.segments.find(s => s.segmentId === 'tier1')!;

  return (
    <section className="hero" id="top">
      <div className="hero-inner">
        <p className="hero-case">
          <span>FLT-FDE-2026-01</span>
          <span>Lakeview Residences · 2BHK · semi-furnished</span>
          <span>evidence snapshot 18 Aug 2026</span>
        </p>
        <h1>
          Eighty&#8209;six listings walk in. <em>Twenty&#8209;one earn trust.</em>
        </h1>
        <p className="hero-sub">
          The market data lies — so grade it before you bet on it. This page takes the case
          packet&rsquo;s <b>86 raw listings</b> and turns them into a benchmark of{' '}
          <b>{t1.weightedMedian ? inr(t1.weightedMedian) : '—'}</b> a reviewer can interrogate row
          by row, and overturn. Every exclusion keeps its reason. Nothing enters the math
          invisibly.
        </p>
        <div className="hero-census">
          <DotGrid mode="raw" />
          <p className="hero-census-caption">
            the census: one cell per listing, CP-0001 → CP-0086 · they all look like evidence
            right now
          </p>
        </div>
        <p className="scroll-cue">scroll — the page is the pipeline ↓</p>
      </div>
    </section>
  );
}
