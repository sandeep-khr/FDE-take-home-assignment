import type { NormalizedListing } from '@pipeline/types';
import SectionHeader from '../components/SectionHeader';
import { inr, usePipeline } from '../state';

function weaknesses(l: NormalizedListing): string[] {
  const out: string[] = [];
  if (l.liveWindowDays > 60) out.push(`listed ${l.liveWindowDays} days without renting — the market keeps refusing this ask`);
  if (l.liveWindowDays <= 2) out.push(`${l.liveWindowDays} day(s) old — an ask nobody has tested yet`);
  if (l.photoCount === 0) out.push('zero photos');
  if (l.daysDark > 14) out.push(`not seen for ${l.daysDark} days`);
  if (l.deposit !== null && l.deposit >= 5 * l.rent) out.push(`deposit ${(l.deposit / l.rent).toFixed(0)}× the rent`);
  if (out.length === 0) out.push('survives the rules — but alone it is an ask, not a market');
  return out;
}

/** The inversion moment: the system saying no, staged as the page's one
 * dramatic shift. A refusal is a first-class product state, not an error. */
export default function FailureCase() {
  const { result } = usePipeline();
  const byId = new Map(result.listings.map(l => [l.listingId, l]));
  const f = result.segments.find(s => s.segmentId === 'furnished-lakeview')!;
  const b3 = result.segments.find(s => s.segmentId === 'bhk3')!;
  const effN = f.contributingIds.reduce((s, id) => s + result.trust[id]!.weight, 0);

  return (
    <div className="invert-band" id="failure">
      <div className="scene" style={{ paddingTop: 0 }}>
        <SectionHeader
          stage="07 · When the evidence runs out"
          flow={`${f.n} survivors · ${f.confidence.toUpperCase()} confidence`}
          title={
            <>
              Asked what this home lists at <em>once furnished,</em> the system refuses to guess.
            </>
          }
          lede={
            <>
              This is the segment the ₹72,000 tenant-revenue hypothesis would love to lean on —
              and exactly where a dashboard median would be most dangerous. Four rows survive the
              rules. Look at them.
            </>
          }
        />
        <div className="card-grid" style={{ marginBottom: 40 }}>
          {f.contributingIds.map(id => {
            const l = byId.get(id)!;
            return (
              <div key={id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="mono-id mono">{id}</span>
                  <b className="mono">{inr(l.rent)}</b>
                </div>
                <p className="facts">
                  {l.society} · {l.areaSqft ?? '—'}sf · {l.source} · {l.posterType}
                </p>
                {weaknesses(l).map(w => (
                  <p key={w} className="weak">▲ {w}</p>
                ))}
              </div>
            );
          })}
        </div>

        <h3 className="refusal-title">
          Not enough good evidence. <em>Here is what to collect.</em>
        </h3>
        <p style={{ margin: '14px 0 4px', fontSize: 15.5, color: 'rgba(250,247,240,0.75)', maxWidth: 700 }}>
          Confidence <b style={{ color: '#e9c98f' }}>{f.confidence.toUpperCase()}</b> — {f.n} rows
          but only {effN.toFixed(1)} weighted, spread{' '}
          {f.range ? `${inr(f.range[0])}–${inr(f.range[1])}` : '—'}. The system reports the sample
          and the spread instead of pretending a median.
        </p>
        <ul className="collect">
          {f.collectNext.map(c => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <div className="card" style={{ marginTop: 48 }}>
          <p style={{ fontSize: 15.5 }}>
            <b>The coda:</b> ask this pull for a 3BHK benchmark and the honest answer is{' '}
            <b>N = {b3.n}</b>. The only 3BHK row in 86 was the subject home itself, mislabeled by
            a broker and quarantined as circular evidence. <i>{b3.collectNext[0]}</i>
          </p>
        </div>
      </div>
    </div>
  );
}
