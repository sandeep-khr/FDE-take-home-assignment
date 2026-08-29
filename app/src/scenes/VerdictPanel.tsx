import SectionHeader from '../components/SectionHeader';
import { inr, pct, usePipeline } from '../state';

/** Stage 6: the ask against the benchmark — under both readings, because the
 * data does not say which one is true. */
export default function VerdictPanel() {
  const { result } = usePipeline();
  const { subject } = result.config;
  const t1 = result.segments.find(s => s.segmentId === 'tier1')!;
  const readings = result.verdict.readings;

  return (
    <section className="scene" id="verdict">
      <SectionHeader
        stage="06 · The verdict"
        flow="one ambiguity flips the sign"
        title={
          <>
            Is ₹56,000 above market or below it? <em>Yes.</em>
          </>
        }
        lede={
          <>
            The landlord asks {inr(subject.baseRent)} base plus {inr(subject.maintenance)} society
            maintenance — {inr(subject.baseRent + subject.maintenance)} all-in. The scraped rents
            don&rsquo;t reliably say whether maintenance is inside them (Market-ops:
            &ldquo;listing rents are not always all-in&rdquo;). That single unknown puts the ask
            on <i>opposite sides</i> of the benchmark:
          </>
        }
      />
      <div className="readings">
        {readings.map(r => (
          <div key={r.assumption} className={`reading reading--${r.direction}`}>
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              {r.assumption === 'listings-all-in'
                ? 'If listing rents are all-in'
                : 'If listing rents are base rents'}
            </p>
            <b className="big">{pct(r.deviationPct)}</b>
            <p style={{ fontSize: 14, color: 'var(--ink-60)' }}>
              compare {inr(r.comparedAsk)} to the {inr(t1.weightedMedian ?? 0)} benchmark — the ask
              is <b>{r.direction}</b> market
            </p>
            <p style={{ fontSize: 13.5, marginTop: 10 }}>
              {r.assumption === 'listings-all-in'
                ? 'Negotiation reading: modest room against the ask; the verbal ₹54,000 alternative would put Flent clearly inside market.'
                : 'Acquisition reading: the base ask sits under the benchmark — but do not sign on this reading until maintenance-inclusion is verified.'}
            </p>
          </div>
        ))}
      </div>
      <div className="asterisks">
        {result.verdict.asterisks.map(a => (
          <p key={a}>* {a}</p>
        ))}
      </div>
      <p style={{ marginTop: 18 }}>
        <span className="chip" style={{ background: 'var(--pine-tint)', borderColor: 'color-mix(in srgb, var(--pine) 30%, transparent)', color: 'var(--pine-deep)' }}>
          Top data fix: capture maintenance-inclusion per listing at scrape time
        </span>
      </p>
    </section>
  );
}
