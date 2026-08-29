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

/** Stage 7: the required failure case, designed as a first-class state. */
export default function FailureCase() {
  const { result } = usePipeline();
  const byId = new Map(result.listings.map(l => [l.listingId, l]));
  const f = result.segments.find(s => s.segmentId === 'furnished-lakeview')!;
  const b3 = result.segments.find(s => s.segmentId === 'bhk3')!;

  return (
    <section className="scene" id="failure">
      <SectionHeader
        stage="07 · When the evidence runs out"
        flow={`${f.n} survivors · ${(f.confidence || '').toUpperCase()} confidence`}
        title={
          <>
            Asked what this home lists at <em>once furnished,</em> the system refuses to guess.
          </>
        }
        lede={
          <>
            This is the segment the ₹72,000 tenant-revenue hypothesis would love to lean on — and
            exactly where a dashboard median would be most dangerous. Four rows survive the rules.
            Look at them.
          </>
        }
      />
      <div className="card-grid" style={{ marginBottom: 24 }}>
        {f.contributingIds.map(id => {
          const l = byId.get(id)!;
          return (
            <div key={id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="mono" style={{ fontWeight: 600 }}>{id}</span>
                <b className="mono">{inr(l.rent)}</b>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-60)', margin: '6px 0 10px' }}>
                {l.society} · {l.areaSqft ?? '—'}sf · {l.source} · {l.posterType}
              </p>
              {weaknesses(l).map(w => (
                <p key={w} style={{ fontSize: 13.5, color: '#7c4d13' }}>
                  ▲ {w}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      <div className="refusal">
        <h3>
          Not enough good evidence. <em>Here is what to collect.</em>
        </h3>
        <p style={{ margin: '10px 0 4px', fontSize: 14.5, color: 'var(--ink-60)' }}>
          Confidence: <b style={{ color: '#7c4d13' }}>{f.confidence.toUpperCase()}</b> — {f.n} rows,
          only {f.contributingIds.reduce((s, id) => s + result.trust[id]!.weight, 0).toFixed(1)}{' '}
          weighted, spread {f.range ? `${inr(f.range[0])}–${inr(f.range[1])}` : '—'}. The system
          reports the spread and the sample instead of pretending a median.
        </p>
        <ul className="collect">
          {f.collectNext.map(c => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <p style={{ fontSize: 14.5 }}>
          <b>The coda:</b> ask this pull for a 3BHK benchmark and the honest answer is{' '}
          <b>N = {b3.n}</b>. The only 3BHK row in 86 was the subject home itself, mislabeled by a
          broker and quarantined as circular evidence. <i>{b3.collectNext[0]}</i>
        </p>
      </div>
    </section>
  );
}
