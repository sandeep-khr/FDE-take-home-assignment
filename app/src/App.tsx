import { useEffect, useRef } from 'react';
import { PipelineContext, usePipelineStore } from './state';
import Hero from './scenes/Hero';
import RawPull from './scenes/RawPull';
import TrustBoard from './scenes/TrustBoard';
import Clusters from './scenes/Clusters';
import AliasMap from './scenes/AliasMap';
import Estimate from './scenes/Estimate';
import VerdictPanel from './scenes/VerdictPanel';
import FailureCase from './scenes/FailureCase';
import Overrides from './scenes/Overrides';
import Assumptions from './scenes/Assumptions';

/** A 3px reading-progress line — the page's only fixed element. */
function Progress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div ref={ref} className="progress" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />;
}

export default function App() {
  const store = usePipelineStore();
  return (
    <PipelineContext.Provider value={store}>
      <Progress />
      <main>
        <Hero />
        <RawPull />
        <TrustBoard />
        <Clusters />
        <AliasMap />
        <Estimate />
        <VerdictPanel />
        <FailureCase />
        <Overrides />
        <Assumptions />
      </main>
      <footer className="coda">
        <div className="coda-inner">
          <span>
            Flent FDE take-home · Problem 1 · case FLT-FDE-2026-01 · evidence snapshot 18 Aug 2026
          </span>
          <span>
            Deterministic pipeline · {Object.keys(store.result.trust).length} rows graded · no data
            invented
          </span>
        </div>
      </footer>
    </PipelineContext.Provider>
  );
}
