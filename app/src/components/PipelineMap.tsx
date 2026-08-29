import { useRef } from 'react';
import { funnelOf, inr, pct, usePipeline } from '../state';

/**
 * The route map: how a CSV becomes a defensible number, with live counts.
 * Doubles as the "raw material goes in" proof — drop your own pull through
 * the exact same pipeline, parsed entirely in this browser tab.
 */
export default function PipelineMap() {
  const { result, customFileName, loadError, loadCsv, resetToPacket } = usePipeline();
  const fileRef = useRef<HTMLInputElement>(null);
  const f = funnelOf(result);
  const [allIn, base] = result.verdict.readings;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadCsv(String(reader.result ?? ''), file.name);
    reader.readAsText(file);
  };

  const nodes = [
    {
      href: '#raw',
      label: customFileName ?? 'listings.csv',
      value: `${f.raw} rows`,
      hint: customFileName ? 'your file, parsed locally' : 'verbatim case packet, sha-verified',
    },
    { href: '#trust', label: 'graded', value: `${f.credible} credible`, hint: 'impossible rows quarantined, with reasons' },
    { href: '#clusters', label: 'one home, one vote', value: `${f.units} units`, hint: 'cross-posts folded, spread kept' },
    { href: '#estimate', label: 'tier 1 evidence', value: `${f.tier1.n} earn weight`, hint: 'same society, same config' },
    {
      href: '#estimate',
      label: 'benchmark',
      value: f.tier1.weightedMedian !== null ? inr(f.tier1.weightedMedian) : 'insufficient',
      hint: f.tier1.band ? `banded ${inr(f.tier1.band[0])}–${inr(f.tier1.band[1])} · ${f.tier1.confidence}` : `confidence ${f.tier1.confidence}`,
    },
    {
      href: '#verdict',
      label: 'verdict',
      value: allIn && base ? `${pct(allIn.deviationPct)} / ${pct(base.deviationPct)}` : '—',
      hint: 'above or below market — one ambiguity flips the sign',
    },
  ];

  return (
    <div className="pipe-wrap">
      <div className="pipe">
        {nodes.map((n, i) => (
          <span key={n.label + i} className="pipe-step">
            {i > 0 && <span className="pipe-arrow" aria-hidden="true">→</span>}
            <a className="pipe-node" href={n.href}>
              <span className="pipe-label">{n.label}</span>
              <b className="pipe-value">{n.value}</b>
              <span className="pipe-hint">{n.hint}</span>
            </a>
          </span>
        ))}
      </div>
      <div className="pipe-tool">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          aria-label="Upload a listings CSV"
          onChange={e => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button className="btn btn--ghost btn--small" onClick={() => fileRef.current?.click()}>
          Run your own pull through this pipeline
        </button>
        {customFileName && (
          <button className="btn btn--small btn--human" onClick={resetToPacket}>
            Back to the case packet
          </button>
        )}
        <span className="pipe-note">
          same 13-column schema · parsed in your browser — nothing leaves this tab
        </span>
      </div>
      {loadError && (
        <p className="pipe-error" role="alert">
          Couldn&rsquo;t use that file: {loadError} The case-packet analysis is untouched.
        </p>
      )}
    </div>
  );
}
