import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runPipeline } from '../src/pipeline';
import { DEFAULT_CONFIG } from '../src/types';
import { csvText } from './helpers';

const result = runPipeline(csvText, DEFAULT_CONFIG);

describe('verdict', () => {
  it('benchmarks against tier1 and exposes the sign flip', () => {
    expect(result.verdict.benchmarkSegmentId).toBe('tier1');
    const allIn = result.verdict.readings.find(r => r.assumption === 'listings-all-in')!;
    const base = result.verdict.readings.find(r => r.assumption === 'listings-base')!;
    expect(allIn.comparedAsk).toBe(61000);
    expect(base.comparedAsk).toBe(56000);
    expect(allIn.deviationPct).toBeGreaterThan(0); // ₹61k vs ₹59.5k → above
    expect(base.deviationPct).toBeLessThan(0); // ₹56k vs ₹59.5k → below
    expect(allIn.direction).toBe('above');
    expect(base.direction).toBe('below');
  });
  it('always carries the two honesty asterisks', () => {
    expect(result.verdict.asterisks.some(a => /asking prices/i.test(a))).toBe(true);
    expect(result.verdict.asterisks.some(a => /maintenance/i.test(a))).toBe(true);
  });
});

describe('runPipeline', () => {
  it('is deterministic', () => {
    expect(runPipeline(csvText, DEFAULT_CONFIG)).toEqual(runPipeline(csvText, DEFAULT_CONFIG));
  });

  it('carries every listing, annotated — nothing deleted', () => {
    expect(result.listings).toHaveLength(86);
    expect(Object.keys(result.trust)).toHaveLength(86);
  });

  it('override excluding a tier1 comp recomputes the segment', () => {
    const o = runPipeline(csvText, DEFAULT_CONFIG, [
      { listingId: 'CP-0018', action: 'exclude', reason: 'reviewer: suspect broker relist' },
    ]);
    expect(o.segments.find(s => s.segmentId === 'tier1')!.n).toBe(20);
    expect(o.trust['CP-0018']!.reasons.map(r => r.code)).toContain('human-override');
    expect(o.trust['CP-0018']!.weight).toBe(0);
    expect(o.overridesApplied).toHaveLength(1);
  });

  it('override reinstating a quarantined row brings it back at full weight', () => {
    const o = runPipeline(csvText, DEFAULT_CONFIG, [
      { listingId: 'CP-0083', action: 'reinstate', reason: 'reviewer: verified the luxury ask is real' },
    ]);
    expect(o.trust['CP-0083']!.weight).toBe(1);
    expect(o.segments.find(s => s.segmentId === 'furnished-lakeview')!.n).toBe(5);
  });
});

describe('golden run', () => {
  // Regenerate deliberately with: npm run golden  (then eyeball the diff before committing)
  it('matches the reviewed golden fixture', () => {
    const url = new URL('./fixtures/golden-run.json', import.meta.url);
    if (process.env['GOLDEN'] === '1') {
      mkdirSync(fileURLToPath(new URL('./fixtures/', import.meta.url)), { recursive: true });
      writeFileSync(url, JSON.stringify(result, null, 2) + '\n');
      return;
    }
    if (!existsSync(url)) {
      throw new Error('golden fixture missing — generate with: npm run golden (then eyeball it)');
    }
    const golden = JSON.parse(readFileSync(url, 'utf8'));
    expect(JSON.parse(JSON.stringify(result))).toEqual(golden);
  });
});
