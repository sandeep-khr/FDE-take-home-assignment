import type { PipelineConfig, SegmentEstimate, Verdict, VerdictReading } from './types';

/**
 * The verdict never picks a side on what listing rents include — that fact is
 * not in the data (Market-ops: "we do not capture maintenance reliably"), and
 * the two readings land on opposite sides of the benchmark. Showing both is
 * the honest output; resolving maintenance-inclusion is the top data fix.
 */
export function buildVerdict(segments: SegmentEstimate[], config: PipelineConfig): Verdict {
  const tier1 = segments.find(s => s.segmentId === 'tier1');
  if (!tier1) throw new Error('tier1 segment missing');
  const readings: VerdictReading[] = [];
  if (tier1.weightedMedian !== null) {
    const mk = (assumption: VerdictReading['assumption'], comparedAsk: number): VerdictReading => {
      const dev = (comparedAsk - tier1.weightedMedian!) / tier1.weightedMedian!;
      return {
        assumption,
        comparedAsk,
        deviationPct: dev,
        direction: Math.abs(dev) < 0.02 ? 'within' : dev > 0 ? 'above' : 'below',
      };
    };
    readings.push(mk('listings-all-in', config.subject.baseRent + config.subject.maintenance));
    readings.push(mk('listings-base', config.subject.baseRent));
  }
  return {
    benchmarkSegmentId: 'tier1',
    readings,
    asterisks: [
      'Comparables are asking prices, not achieved rents — an ask benchmark systematically overstates what tenants pay; calibrate against signed rents before treating it as market truth.',
      'Listing rents do not reliably state whether society maintenance is included; the two readings above bracket that ambiguity, and capturing maintenance-inclusion per listing is the single highest-value data fix.',
    ],
  };
}
