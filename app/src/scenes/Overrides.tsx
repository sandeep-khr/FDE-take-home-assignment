import SectionHeader from '../components/SectionHeader';
import { inr, usePipeline } from '../state';

/** Stage 8: the human's page. Overrides re-run the pipeline and stay on the record. */
export default function Overrides() {
  const { result, overrides, clearOverrides } = usePipeline();
  const t1 = result.segments.find(s => s.segmentId === 'tier1')!;

  return (
    <section className="scene" id="human">
      <SectionHeader
        stage="08 · The human"
        flow={`${overrides.length} override${overrides.length === 1 ? '' : 's'} on the record`}
        title={
          <>
            Disagree with the machine. <em>It recomputes in front of you.</em>
          </>
        }
        lede={
          <>
            BOSS recommends; a named human signs. Every ✕ and ↺ in the grade board re-runs the
            same deterministic pipeline with your call layered on top — the funnel, the benchmark
            and this log all move together, and your reason is stored next to the machine&rsquo;s.
          </>
        }
      />
      {overrides.length === 0 ? (
        <div className="card" style={{ borderStyle: 'dashed' }}>
          <p style={{ fontSize: 15 }}>
            No overrides yet. Try one: hit <b>✕</b> on any counted row in{' '}
            <a href="#trust">the grade board</a> — say why — and watch tier 1 shrink from{' '}
            <b className="mono">{t1.n}</b> while the benchmark holds or moves. That stability
            (or movement) is itself evidence.
          </p>
        </div>
      ) : (
        <>
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>listing</th>
                  <th>action</th>
                  <th>your reason</th>
                  <th>authored by</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map(o => (
                  <tr key={o.listingId}>
                    <td className="mono" style={{ fontWeight: 600 }}>{o.listingId}</td>
                    <td>{o.action}</td>
                    <td>{o.reason}</td>
                    <td>
                      <span className="tag tag--human">human-override</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <span className="chip" style={{ background: 'var(--lav)', color: 'var(--lav-deep)', borderColor: 'transparent', fontSize: 13 }}>
              With your calls: tier 1 = {t1.n} rows · benchmark{' '}
              {t1.weightedMedian !== null ? inr(t1.weightedMedian) : 'insufficient'} · {t1.confidence}
            </span>
            <button className="btn btn--ghost btn--small" onClick={clearOverrides}>
              Clear overrides
            </button>
          </div>
        </>
      )}
    </section>
  );
}
