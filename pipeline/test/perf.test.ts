import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain-JS generator shared with the CLI script
import { generateSyntheticCsv } from '../../scripts/synth.mjs';
import { runPipeline } from '../src/pipeline';
import { DEFAULT_CONFIG } from '../src/types';

/** Scale check: Flent's real pull is ~27,000 listings. The pipeline must chew
 * a file that size fast enough to run in a reviewer's browser tab — this is
 * what makes the "run your own pull" claim honest. SYNTHETIC data, labeled. */
describe('scale (synthetic 27k)', () => {
  it('processes a 27,000-row pull in-browser time', () => {
    const csv = generateSyntheticCsv(27000, 20260818);
    const t0 = performance.now();
    const result = runPipeline(csv, DEFAULT_CONFIG);
    const ms = performance.now() - t0;
    // eslint-disable-next-line no-console
    console.log(`27k pipeline run: ${Math.round(ms)}ms`);
    expect(result.listings).toHaveLength(27000);
    expect(result.unitClusters.length).toBeGreaterThan(500); // the planted cross-posts got caught
    expect(result.segments.find(s => s.segmentId === 'tier1')!.n).toBeGreaterThan(50);
    expect(ms).toBeLessThan(15_000);
  });
});
