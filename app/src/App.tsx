import csvText from '../../data/listings.csv?raw';
import { inr, pct, PipelineContext, usePipelineStore, type PipelineStore } from './state';
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

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
}

/** The funnel is derived from the live result, so a human override moves it. */
export function funnelOf(store: PipelineStore): FunnelStage[] {
  const { listings, trust, segments } = store.result;
  const two = listings.filter(l => l.bhk === 2);
  const has = (id: string, code: string) => trust[id]!.reasons.some(r => r.code === code);
  const quarantined = (id: string) => trust[id]!.reasons.some(r => r.effect === 'quarantine');
  const afterQ = two.filter(l => !quarantined(l.listingId));
  const alive = afterQ.filter(l => !has(l.listingId, 'stale-dead') && !has(l.listingId, 'human-override'));
  const units = alive.filter(l => !has(l.listingId, 'duplicate-copy'));
  const tier1 = segments.find(s => s.segmentId === 'tier1')!;
  return [
    { id: 'raw', label: 'raw', count: listings.length },
    { id: 'trust', label: 'credible', count: afterQ.length },
    { id: 'trust', label: 'alive', count: alive.length },
    { id: 'clusters', label: 'units', count: units.length },
    { id: 'estimate', label: 'tier 1', count: tier1.n },
  ];
}

function Ticker({ store }: { store: PipelineStore }) {
  const t1 = store.result.segments.find(s => s.segmentId === 'tier1')!;
  const [allIn, base] = store.result.verdict.readings;
  const items = (
    <>
      <span>
        Tier-1 ask benchmark <b>{t1.weightedMedian ? inr(t1.weightedMedian) : '—'}</b> · confidence{' '}
        <b>{t1.confidence.toUpperCase()}</b>
      </span>
      <span>
        <b>{t1.n}</b> of {store.result.listings.length} rows earn weight
      </span>
      <span>
        leave-one-out swing <b>{t1.looSwing !== null ? inr(t1.looSwing) : '—'}</b>
      </span>
      <span>
        the ask reads <b>{allIn ? pct(allIn.deviationPct) : '—'}</b> or <b>{base ? pct(base.deviationPct) : '—'}</b>{' '}
        depending on what listing rents include
      </span>
      <span>nothing deleted — every exclusion keeps its reason</span>
      <span>same inputs, same output · deterministic code over graded evidence</span>
    </>
  );
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {items}
        {items}
      </div>
    </div>
  );
}

function FunnelRail({ store }: { store: PipelineStore }) {
  const stages = funnelOf(store);
  const t1 = store.result.segments.find(s => s.segmentId === 'tier1')!;
  return (
    <nav className="rail" aria-label="Evidence funnel">
      <div className="rail-inner">
        <span className="rail-brand">
          Comp <em>Trust</em> Layer
        </span>
        <div className="rail-stages">
          {stages.map((s, i) => (
            <span key={`${s.id}-${s.label}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span className="rail-arrow">→</span>}
              <a className="rail-stage" href={`#${s.id}`}>
                <b>{s.count}</b> {s.label}
              </a>
            </span>
          ))}
        </div>
        <span className="rail-verdict">
          {t1.weightedMedian ? inr(t1.weightedMedian) : 'insufficient'} · {t1.confidence}
        </span>
      </div>
    </nav>
  );
}

export default function App() {
  const store = usePipelineStore();
  return (
    <PipelineContext.Provider value={store}>
      <Ticker store={store} />
      <FunnelRail store={store} />
      <main>
        <Hero csvText={csvText} />
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
            Deterministic pipeline · {Object.keys(store.result.trust).length} rows graded · no data invented
          </span>
        </div>
      </footer>
    </PipelineContext.Provider>
  );
}
