import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { inr, pct, usePipeline } from '../state';

/**
 * The processing theater: when a file lands, replay what the pipeline just did
 * to it, stage by stage, with the real numbers. The work is already done (it
 * takes milliseconds-to-seconds); the pacing exists so a human can follow the
 * route. Honest theater — every figure shown is from the actual result.
 */
export default function PipelineTheater() {
  const { result, customFileName, loadNonce } = usePipeline();
  const [openFor, setOpenFor] = useState(0);
  const canShow = typeof matchMedia !== 'undefined';
  const reduce = canShow && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (loadNonce > 0 && canShow) setOpenFor(loadNonce);
  }, [loadNonce, canShow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenFor(0);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const stages = useMemo(() => {
    const t = Object.values(result.trust);
    const quarantined = t.filter(d => d.reasons.some(r => r.effect === 'quarantine')).length;
    const dead = t.filter(d => d.reasons.some(r => r.code === 'stale-dead')).length;
    const half = t.filter(d => d.grade === 'B').length;
    const copies = t.filter(d => d.grade === 'C').length;
    const spellings = new Set(result.listings.map(l => l.society)).size;
    const families = new Set(result.listings.map(l => l.stem)).size;
    const t1 = result.segments.find(s => s.segmentId === 'tier1')!;
    const [allIn, base] = result.verdict.readings;
    return [
      { k: '01 · parse', text: '13 columns verified, blanks kept as blanks', v: `${result.listings.length.toLocaleString('en-IN')} row${result.listings.length === 1 ? '' : 's'}` },
      { k: '02 · normalize', text: `${spellings} society spelling${spellings === 1 ? '' : 's'} resolved toward ${families} name${families === 1 ? '' : 's'}; dates become staleness`, v: `${families} name${families === 1 ? '' : 's'}` },
      { k: '03 · grade', text: `${quarantined} quarantined · ${dead} stale-dead · ${half} at half weight — every one with a written reason`, v: `${(quarantined + dead).toLocaleString('en-IN')} out` },
      { k: '04 · one home, one vote', text: `${copies.toLocaleString('en-IN')} broker cross-posts folded into their physical units`, v: `${result.unitClusters.length.toLocaleString('en-IN')} clusters` },
      { k: '05 · estimate', text: t1.weightedMedian !== null ? `tier 1: ${t1.n} rows earn weight${t1.band ? ` · banded ${inr(t1.band[0])}–${inr(t1.band[1])}` : ''} · ${t1.confidence.toUpperCase()}` : `tier 1: ${t1.n} rows — not enough to state a number`, v: t1.weightedMedian !== null ? inr(t1.weightedMedian) : 'refused' },
      { k: '06 · verdict', text: 'the ask against the benchmark, under both maintenance readings', v: allIn && base ? `${pct(allIn.deviationPct)} / ${pct(base.deviationPct)}` : '—' },
    ];
  }, [result]);

  const open = openFor > 0;
  const step = reduce ? 0 : 0.62;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="theater"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpenFor(0)}
        >
          <motion.div
            className="theater-card"
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            onClick={e => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              your file, through the pipeline
            </p>
            <h3 className="theater-title">
              <span className="mono">{customFileName ?? 'listings.csv'}</span> — here is what just
              happened to it
            </h3>
            <div className="theater-progress">
              <motion.div
                className="theater-progress-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: reduce ? 0 : stages.length * step + 0.4, ease: 'linear' }}
              />
            </div>
            <div className="theater-stages">
              {stages.map((s, i) => (
                <motion.div
                  key={s.k}
                  className="t-stage"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.3 + i * step, duration: reduce ? 0 : 0.4 }}
                >
                  <span className="t-k">{s.k}</span>
                  <span className="t-text">{s.text}</span>
                  <motion.b
                    className="t-v"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: reduce ? 0 : 0.45 + i * step, type: 'spring', stiffness: 300, damping: 18 }}
                  >
                    {s.v}
                  </motion.b>
                </motion.div>
              ))}
            </div>
            <motion.div
              className="theater-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.5 + stages.length * step }}
            >
              <a className="btn" href="#raw" onClick={() => setOpenFor(0)}>
                Explore the evidence ↓
              </a>
              <button className="btn btn--ghost" onClick={() => setOpenFor(0)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
