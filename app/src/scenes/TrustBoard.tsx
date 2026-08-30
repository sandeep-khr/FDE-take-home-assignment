import { useState } from 'react';
import DotGrid from '../components/DotGrid';
import GradeChip from '../components/GradeChip';
import ReasonTag from '../components/ReasonTag';
import SectionHeader from '../components/SectionHeader';
import { inr, usePipeline } from '../state';


/** Stage 2: every row graded, every grade explained, every call reversible. */
export default function TrustBoard() {
  const { result, addOverride, overrides } = usePipeline();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const quarantined = result.listings.filter(l =>
    result.trust[l.listingId]!.reasons.some(r => r.effect === 'quarantine'),
  );
  const tally = { A: 0, B: 0, C: 0, D: 0 };
  for (const t of Object.values(result.trust)) tally[t.grade]++;
  const MAX_ROWS = 500;
  const sorted = [...result.listings].sort((a, b) => {
    const ga = result.trust[a.listingId]!.grade;
    const gb = result.trust[b.listingId]!.grade;
    return ga === gb ? a.listingId.localeCompare(b.listingId) : ga.localeCompare(gb);
  });
  const byGradeThenId = sorted.slice(0, MAX_ROWS);
  const hiddenRows = sorted.length - byGradeThenId.length;

  const confirm = (listingId: string, action: 'exclude' | 'reinstate') => {
    addOverride({ listingId, action, reason: reason.trim() });
    setExpanded(null);
    setReason('');
  };

  return (
    <section className="scene" id="trust">
      <SectionHeader
        stage="02 · The grade"
        flow={`A ${tally.A} · B ${tally.B} · C ${tally.C} · D ${tally.D}`}
        title={
          <>
            Every row gets a grade — <em>and a sentence.</em>
          </>
        }
        lede={
          <>
            Deterministic rules, visible thresholds, plain-language reasons. Grades A and B carry
            the estimate; C rows are folded into their duplicate cluster; D rows are out — but
            never deleted. Disagree with any call: the ✕ and ↺ controls re-run the arithmetic in
            front of you.
          </>
        }
      />

      <div style={{ margin: '10px 0 50px' }}>
        <DotGrid mode="graded" />
      </div>

      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 400, margin: '0 0 18px', textWrap: 'balance' }}>
        The quarantine, first — {quarantined.length === 5 ? 'five' : quarantined.length} row
        {quarantined.length === 1 ? '' : 's'} whose values cannot all be true
      </h3>
      {quarantined.length === 0 && (
        <p className="scene-lede" style={{ marginBottom: 40 }}>
          Nothing in this pull tripped a quarantine rule — every row's values could at least all
          be true at once.
        </p>
      )}
      <div className="card-grid" style={{ marginBottom: 44 }}>
        {quarantined.map(l => {
          const t = result.trust[l.listingId]!;
          const story = t.reasons.find(r => r.effect === 'quarantine')!;
          return (
            <div key={l.listingId} className="card case-file">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span className="mono-id">{l.listingId}</span>
                <GradeChip grade="D" compact />
              </div>
              <p className="facts">
                {l.society} · {l.bhk}BHK · {l.areaSqft ?? '—'}sf · {inr(l.rent)}
                {l.deposit ? <> · dep {inr(l.deposit)}</> : null}
              </p>
              <p className="story">{story.label}</p>
              {t.reasons.some(r => r.code === 'subject-echo') && (
                <p style={{ fontSize: 13.5, marginTop: 10, color: '#7e241c', fontWeight: 600 }}>
                  The deepest trap in the pull: the subject deal itself, cross-posted by a broker
                  with the wrong BHK. Count it, and the landlord&rsquo;s ask validates itself.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <details className="ledger-fold" open>
        <summary>
          Open the graded ledger — and disagree with it
          <span className="hint">every grade, weight and reason · ✕ / ↺ re-run the math with your call</span>
        </summary>
        <div className="ledger-scroll">
          <table className="ledger">
          <thead>
            <tr>
              <th>id</th>
              <th>grade</th>
              <th className="num">weight</th>
              <th>society</th>
              <th className="num">rent</th>
              <th>why</th>
              <th>you</th>
            </tr>
          </thead>
          <tbody>
            {byGradeThenId.map(l => {
              const t = result.trust[l.listingId]!;
              const dim = t.weight === 0;
              const overridden = overrides.some(o => o.listingId === l.listingId);
              const isOpen = expanded === l.listingId;
              const nextAction: 'exclude' | 'reinstate' = t.weight > 0 ? 'exclude' : 'reinstate';
              return (
                <tr key={l.listingId} className={dim ? 'row-dim' : undefined}>
                  <td className="mono keep-color" style={{ fontWeight: 600 }}>{l.listingId}</td>
                  <td className="keep-color"><GradeChip grade={t.grade} compact /></td>
                  <td className="num">{t.weight}</td>
                  <td>{l.society}</td>
                  <td className="num">{inr(l.rent)}</td>
                  <td style={{ maxWidth: 420 }}>
                    {t.reasons.length === 0 ? (
                      <span className="tag tag--note">clean</span>
                    ) : (
                      t.reasons.map(r => <ReasonTag key={r.code + r.label} reason={r} />)
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {isOpen ? (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <input
                          aria-label={`Reason for ${l.listingId}`}
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="your reason — required"
                          style={{
                            font: 'inherit',
                            fontSize: 12,
                            padding: '3px 8px',
                            border: '1px solid var(--rule)',
                            borderRadius: 8,
                            width: 180,
                          }}
                        />
                        <button
                          className="btn btn--human btn--small"
                          aria-label={`Confirm override ${l.listingId}`}
                          disabled={reason.trim() === ''}
                          onClick={() => confirm(l.listingId, nextAction)}
                        >
                          {nextAction}
                        </button>
                      </span>
                    ) : (
                      <button
                        className={`btn btn--small ${overridden ? 'btn--human' : 'btn--ghost'}`}
                        aria-label={`${nextAction === 'exclude' ? 'Exclude' : 'Reinstate'} ${l.listingId}`}
                        onClick={() => {
                          setExpanded(l.listingId);
                          setReason('');
                        }}
                      >
                        {overridden ? 'overridden' : nextAction === 'exclude' ? '✕' : '↺'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
          {hiddenRows > 0 && (
            <p className="mono" style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--ink-45)' }}>
              showing the first {byGradeThenId.length} of {sorted.length.toLocaleString('en-IN')}{' '}
              graded rows — every row is graded and counted; `npm run audit` prints them all
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
