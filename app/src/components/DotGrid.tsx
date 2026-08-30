import { usePipeline } from '../state';

/**
 * The census of 86 — the page's signature. Every listing is one cell, in
 * listing order, for the whole story: neutral in the raw chapter, judged in
 * the grade chapter. Hover any cell for its identity and reasons.
 */
const MAX_CELLS = 860; // ten packets' worth — beyond this, rendering a cell per row stops informing

export default function DotGrid({ mode }: { mode: 'raw' | 'graded' }) {
  const { result, overrides } = usePipeline();
  const shown = result.listings.slice(0, MAX_CELLS);
  const hidden = result.listings.length - shown.length;
  return (
    <div>
      <div className="dots">
        {shown.map(l => {
          const t = result.trust[l.listingId]!;
          const overridden = overrides.some(o => o.listingId === l.listingId);
          const cls =
            mode === 'raw'
              ? 'dot'
              : `dot dot--${t.grade.toLowerCase()}${overridden ? ' dot--human' : ''}`;
          const title =
            mode === 'raw'
              ? `${l.listingId} · ${l.society} · ₹${l.rent.toLocaleString('en-IN')}`
              : `${l.listingId} · grade ${t.grade} · weight ${t.weight} · ${
                  t.reasons.map(r => r.code).join(', ') || 'clean'
                }`;
          return <span key={l.listingId} className={cls} title={title} />;
        })}
      </div>
      {hidden > 0 && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-45)', marginTop: 10 }}>
          + {hidden.toLocaleString('en-IN')} more rows — every one still graded in the math; run
          `npm run audit` for the full trace
        </p>
      )}
      {mode === 'graded' && (
        <div className="census-legend">
          <span><i style={{ background: 'var(--pine)' }} /> counted in full</span>
          <span><i style={{ background: 'var(--brass)' }} /> half weight</span>
          <span><i style={{ background: 'var(--ink)', opacity: 0.16 }} /> folded duplicate</span>
          <span><i style={{ background: 'var(--brick)' }} /> out, with reason</span>
          <span><i style={{ background: 'transparent', outline: '2px solid var(--lav-deep)', outlineOffset: 1 }} /> your override</span>
        </div>
      )}
    </div>
  );
}
