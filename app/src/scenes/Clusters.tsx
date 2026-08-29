import SectionHeader from '../components/SectionHeader';
import { inr, usePipeline } from '../state';

/** Stage 3: one home, one vote. Cross-posts collapse; near-misses go to a human. */
export default function Clusters() {
  const { result } = usePipeline();
  const byId = new Map(result.listings.map(l => [l.listingId, l]));
  const suspect = result.suspects[0];

  return (
    <section className="scene" id="clusters">
      <SectionHeader
        stage="03 · One home, one vote"
        flow={`${result.unitClusters.length} clusters · ${result.unitClusters.reduce((s, c) => s + c.memberIds.length - 1, 0)} copies folded`}
        title={
          <>
            The same flat, posted four times, <em>is one comp.</em>
          </>
        }
        lede={
          <>
            Two rows merge only when the evidence is overwhelming: same society family, same
            dates, same floor area, and an identical deposit or a near-identical rent. The spread
            of rents <i>inside</i> a cluster is kept — it&rsquo;s a live measure of broker markup.
          </>
        }
      />
      <div className="card-grid">
        {result.unitClusters.map(c => {
          const members = c.memberIds.map(id => byId.get(id)!);
          const spreadPct = ((c.rentMax - c.rentMin) / c.rentMin) * 100;
          return (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <b style={{ fontSize: 13.5 }}>{members[0]!.society}</b>
                <span className="chip mono" style={{ fontSize: 11 }}>
                  {c.rentMin === c.rentMax
                    ? inr(c.rentMin)
                    : `${inr(c.rentMin)}–${inr(c.rentMax)} · +${spreadPct.toFixed(1)}%`}
                </span>
              </div>
              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 6 }}>
                {members.map(m => {
                  const kept = m.listingId === c.representativeId;
                  return (
                    <li
                      key={m.listingId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        fontSize: 13,
                        color: kept ? 'var(--ink)' : 'var(--ink-40)',
                      }}
                    >
                      <span className="mono">
                        {kept ? '● ' : '○ '}
                        {m.listingId} · {m.source} · {m.posterType}
                      </span>
                      <span className="mono">{inr(m.rent)}</span>
                    </li>
                  );
                })}
              </ul>
              <p style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 10 }}>
                kept {c.representativeId}
                {byId.get(c.representativeId)!.posterType === 'owner'
                  ? ' — owner-posted beats broker copies'
                  : ' — freshest sighting of this unit'}
              </p>
            </div>
          );
        })}
      </div>

      {suspect && (
        <div
          className="card"
          style={{ marginTop: 26, borderColor: 'color-mix(in srgb, var(--brass) 55%, transparent)', background: 'linear-gradient(180deg,#fffdf8,var(--brass-tint))' }}
        >
          <p className="eyebrow" style={{ color: '#7c4d13', marginBottom: 10 }}>
            The suspect queue · machine does not decide this one
          </p>
          <p style={{ fontSize: 15, maxWidth: 760 }}>
            <b className="mono">{suspect.aId}</b> ({byId.get(suspect.aId)!.society},{' '}
            {inr(byId.get(suspect.aId)!.rent)}, dep {inr(byId.get(suspect.aId)!.deposit ?? 0)}) and{' '}
            <b className="mono">{suspect.bId}</b> ({byId.get(suspect.bId)!.society},{' '}
            {inr(byId.get(suspect.bId)!.rent)}, dep {inr(byId.get(suspect.bId)!.deposit ?? 0)}) were
            posted the same week with rhyming rents and areas — but the deposits and societies
            disagree. Different homes that rhyme. Auto-merging them would have destroyed a real
            comp, so cross-society near-clones only ever land here, for a person.
          </p>
        </div>
      )}
    </section>
  );
}
