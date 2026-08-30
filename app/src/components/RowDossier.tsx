import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import GradeChip from './GradeChip';
import { inr, usePipeline } from '../state';

/**
 * The deterministic answer to "why was this property flagged?" — click any
 * row anywhere and get its complete dossier straight from the pipeline
 * result: raw fields, derived values, every rule that fired with what it
 * expected vs what it saw, cluster role, segment role, and the disagree
 * button. No model in the loop; nothing here can be misremembered.
 */
export default function RowDossier() {
  const { result, selectedId, select, addOverride, overrides } = usePipeline();
  const [reason, setReason] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && select(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select]);

  useEffect(() => setReason(''), [selectedId]);

  const l = result.listings.find(x => x.listingId === selectedId);
  const t = l ? result.trust[l.listingId] : undefined;
  const cluster = l ? result.unitClusters.find(c => c.memberIds.includes(l.listingId)) : undefined;
  const suspect = l ? result.suspects.find(s => s.aId === l.listingId || s.bId === l.listingId) : undefined;
  const overridden = l ? overrides.some(o => o.listingId === l.listingId) : false;
  const nextAction: 'exclude' | 'reinstate' = t && t.weight > 0 ? 'exclude' : 'reinstate';

  return (
    <AnimatePresence>
      {l && t && (
        <motion.aside
          className="dossier"
          initial={{ x: 480, opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 480, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          aria-label={`Dossier for ${l.listingId}`}
        >
          <div className="dossier-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: 2 }}>row dossier</p>
              <h3 className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{l.listingId}</h3>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <GradeChip grade={t.grade} />
              <button className="btn btn--ghost btn--small" onClick={() => select(null)} aria-label="Close dossier">
                ✕
              </button>
            </div>
          </div>

          <p className="dossier-line">
            {l.society} · {l.locality} · {l.bhk}BHK {l.furnishingNorm} ·{' '}
            {l.areaSqft ? `${l.areaSqft} sf` : 'area not stated'} · {inr(l.rent)}
            {l.deposit ? ` · dep ${inr(l.deposit)}` : ' · no deposit stated'}
          </p>
          <p className="dossier-line dim">
            {l.source} · {l.posterType} · {l.photoCount} photo{l.photoCount === 1 ? '' : 's'} · live{' '}
            {l.postedDate} → {l.lastSeenDate} · dark {l.daysDark}d · window {l.liveWindowDays}d
            {l.rentPerSf ? ` · ₹${l.rentPerSf.toFixed(1)}/sf` : ''}
          </p>

          <h4 className="dossier-h">{`Weight in the math: ×${t.weight}`}</h4>
          {t.reasons.length === 0 ? (
            <p className="dossier-line">Clean — no rule fired. Counts in full.</p>
          ) : (
            t.reasons.map(r => (
              <div key={r.code + r.label} className="dossier-reason">
                <p className="dossier-reason-code">
                  <span className={`tag tag--${r.code === 'human-override' ? 'human' : r.effect}`}>{r.code}</span>
                  <span className="dim"> {r.effect}</span>
                </p>
                <p className="dossier-line">{r.label}</p>
                {r.expected && (
                  <p className="dossier-ea">
                    <b>expected</b> {r.expected}
                    <br />
                    <b>actual</b> {r.actual}
                  </p>
                )}
                {r.involvedFields && (
                  <p className="dossier-ea dim">
                    fields examined:{' '}
                    {Object.entries(r.involvedFields)
                      .map(([k, v]) => `${k}=${v ?? '—'}`)
                      .join(' · ')}
                  </p>
                )}
              </div>
            ))
          )}

          {cluster && (
            <>
              <h4 className="dossier-h">Physical unit</h4>
              <p className="dossier-line">
                One of {cluster.memberIds.length} cross-posts of the same unit (
                {cluster.memberIds.join(', ')}). Kept representative:{' '}
                <b className="mono">{cluster.representativeId}</b>
                {cluster.rentMin !== cluster.rentMax &&
                  ` · rent spread ${inr(cluster.rentMin)}–${inr(cluster.rentMax)} across posts`}
                .
              </p>
            </>
          )}
          {suspect && (
            <>
              <h4 className="dossier-h">Suspect queue</h4>
              <p className="dossier-line">
                Near-clone of <b className="mono">{suspect.aId === l.listingId ? suspect.bId : suspect.aId}</b>{' '}
                across different societies — the machine refuses to decide this one; a human does.
              </p>
            </>
          )}

          <h4 className="dossier-h">Role in the estimates</h4>
          {result.segments.map(s => {
            const contributes = s.contributingIds.includes(l.listingId);
            return (
              <p key={s.segmentId} className="dossier-line">
                <b>{s.label}:</b>{' '}
                {contributes
                  ? `counted at ×${t.weight}`
                  : t.weight === 0
                    ? 'not counted (weight 0)'
                    : 'not in this segment'}
              </p>
            );
          })}

          <h4 className="dossier-h">Disagree with the machine</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              aria-label={`Dossier reason for ${l.listingId}`}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="your reason — required"
              style={{ font: 'inherit', fontSize: 13, padding: '6px 10px', border: '1px solid var(--rule)', borderRadius: 8, flex: 1, minWidth: 160 }}
            />
            <button
              className="btn btn--human btn--small"
              disabled={reason.trim() === ''}
              onClick={() => {
                addOverride({ listingId: l.listingId, action: nextAction, reason: reason.trim() });
                setReason('');
              }}
            >
              {overridden ? `re-${nextAction}` : nextAction}
            </button>
          </div>
          <p className="dossier-line dim" style={{ marginTop: 8 }}>
            Overrides re-run the pipeline live; your call and reason land in{' '}
            <a href="#human" onClick={() => select(null)}>
              the override log (section 08 · The human)
            </a>
            .
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
