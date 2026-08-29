import { createContext, useContext, useMemo, useState } from 'react';
import csvText from '../../data/listings.csv?raw';
import { runPipeline } from '@pipeline/pipeline';
import { DEFAULT_CONFIG, type Override, type PipelineResult } from '@pipeline/types';

export interface PipelineStore {
  result: PipelineResult;
  overrides: Override[];
  addOverride: (o: Override) => void;
  clearOverrides: () => void;
}

export function usePipelineStore(): PipelineStore {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const result = useMemo(() => runPipeline(csvText, DEFAULT_CONFIG, overrides), [overrides]);
  return {
    result,
    overrides,
    addOverride: o => setOverrides(prev => [...prev.filter(p => p.listingId !== o.listingId), o]),
    clearOverrides: () => setOverrides([]),
  };
}

export const PipelineContext = createContext<PipelineStore | null>(null);

export function usePipeline(): PipelineStore {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('PipelineContext missing');
  return ctx;
}

export const inr = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const pct = (x: number): string => `${x > 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
