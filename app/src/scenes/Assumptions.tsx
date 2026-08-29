import SectionHeader from '../components/SectionHeader';
import { usePipeline } from '../state';

/** Stage 9: every tunable number, on the record. None of them is Flent policy. */
export default function Assumptions() {
  const { result } = usePipeline();
  const c = result.config;
  const items: { key: string; value: string; why: string }[] = [
    { key: 'snapshotDate', value: c.snapshotDate, why: 'the packet’s evidence cut-off; staleness is measured against it' },
    { key: 'staleGrayAfterDays', value: `${c.staleGrayAfterDays} d`, why: 'younger sightings count in full' },
    { key: 'staleExcludeAfterDays', value: `${c.staleExcludeAfterDays} d`, why: 'darker than this = likely rented or withdrawn; out, with the reason kept' },
    { key: 'grayWeight', value: `× ${c.grayWeight}`, why: 'the 15–30 d gray zone counts at half' },
    { key: 'aspirationalMinWindowDays', value: `${c.aspirationalMinWindowDays} d`, why: 'live this long unrented = the market said no to the ask' },
    { key: 'aspirationalWeight', value: `× ${c.aspirationalWeight}`, why: 'refused asks count at half, as ceiling evidence' },
    { key: 'cloneDateSlackDays', value: `± ${c.cloneDateSlackDays} d`, why: 'cross-posts of one unit appear within days of each other' },
    { key: 'cloneAreaSlackSf', value: `± ${c.cloneAreaSlackSf} sf`, why: 'same unit, small listing-form noise' },
    { key: 'cloneRentTolerance', value: `± ${c.cloneRentTolerance * 100}%`, why: 'brokers pad the same unit’s rent slightly' },
    { key: 'minIndependentBridgesToMerge', value: `${c.minIndependentBridgesToMerge}`, why: 'independent cross-posted units needed before two spellings merge' },
    { key: 'rentPerSfBounds', value: `₹${c.rentPerSfBounds[0]}–₹${c.rentPerSfBounds[1]}/sf`, why: 'outside this band, a value error is likelier than a bargain' },
    { key: 'bhkAreaBoundsSf', value: Object.entries(c.bhkAreaBoundsSf).map(([b, [lo, hi]]) => `${b}BHK ${lo}–${hi}`).join(' · '), why: 'BHK and area must be able to both be true' },
    { key: 'ladder.spreadRatioCap', value: `× ${c.ladder.spreadRatioCap}`, why: 'a comp set disagreeing by more than 2× caps at LOW — ported from prior production comps validation (3× on sale prices, tightened for rentals)' },
    { key: 'bootstrap', value: `seed ${c.bootstrap.seed} · ${c.bootstrap.iterations} draws · P${c.bootstrap.lowerPct}–P${c.bootstrap.upperPct} · min n=${c.bootstrap.minN}`, why: 'deterministic dispersion band for the median; withheld below 5 rows because a tiny-sample band fakes precision' },
    { key: 'fastDelistMaxWindowDays', value: `${c.fastDelistMaxWindowDays} d`, why: 'dead listings that vanished this fast are shown as weak clearing evidence — display only, never in the math' },
  ];
  const ladder = [
    { key: 'high', value: `effN ≥ ${c.ladder.highMinN} ∧ sources ≥ ${c.ladder.highMinSources} ∧ swing < ₹${c.ladder.highMaxLooSwing.toLocaleString('en-IN')} ∧ age < ${c.ladder.highMaxMedianAgeDays}d` },
    { key: 'medium', value: `effN ≥ ${c.ladder.mediumMinN} ∧ swing < ₹${c.ladder.mediumMaxLooSwing.toLocaleString('en-IN')}` },
    { key: 'low', value: `effN ≥ ${c.ladder.lowMinN}` },
    { key: 'insufficient', value: 'anything thinner — the system says so instead of guessing' },
  ];

  return (
    <section className="scene" id="assumptions">
      <SectionHeader
        stage="09 · The assumptions"
        flow="every threshold, on the record"
        title={
          <>
            Chosen numbers, <em>not hidden ones.</em>
          </>
        }
        lede={
          <>
            None of these is Flent policy — the brief withholds production thresholds on purpose.
            Each is a labeled, defended choice rendered straight from the live config object:
            change one, and the same pipeline re-runs the same way for everyone.
          </>
        }
      />
      <div className="config-grid">
        {items.map(i => (
          <div key={i.key} className="config-item">
            <span className="mono" style={{ fontSize: 11, color: 'var(--pine)' }}>{i.key}</span>
            <b>{i.value}</b>
            <span>{i.why}</span>
          </div>
        ))}
      </div>
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, margin: '30px 0 12px' }}>
        The confidence ladder — all criteria must hold, on effective (weighted) evidence
      </h3>
      <div className="config-grid">
        {ladder.map(l => (
          <div key={l.key} className="config-item">
            <span className="mono" style={{ fontSize: 11, color: 'var(--pine)' }}>{l.key}</span>
            <b style={{ fontSize: 13 }}>{l.value}</b>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 22, fontSize: 14, color: 'var(--ink-60)', maxWidth: 640 }}>
        Subject deal, for reference: {c.subject.society} · {c.subject.bhk}BHK{' '}
        {c.subject.furnishing} · {c.subject.areaSqft} sf · ask ₹
        {c.subject.baseRent.toLocaleString('en-IN')} + ₹
        {c.subject.maintenance.toLocaleString('en-IN')} maintenance · deposit ₹
        {c.subject.deposit.toLocaleString('en-IN')}. Comparables are asking prices; the benchmark
        is an ask benchmark and says so wherever it appears.
      </p>
    </section>
  );
}
