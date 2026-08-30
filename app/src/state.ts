import { createContext, useContext, useMemo, useState } from 'react';
import packetCsv from '../../data/listings.csv?raw';
import { parseListingsCsv } from '@pipeline/csv';
import { normalizeListing } from '@pipeline/normalize';
import { runPipeline } from '@pipeline/pipeline';
import { DEFAULT_CONFIG, type Override, type PipelineResult } from '@pipeline/types';

export interface PipelineStore {
  result: PipelineResult;
  overrides: Override[];
  addOverride: (o: Override) => void;
  clearOverrides: () => void;
  /** null = the bundled case-packet pull; otherwise the uploaded file's name. */
  customFileName: string | null;
  loadError: string | null;
  /** Increments on every successful load — drives the pipeline theater. */
  loadNonce: number;
  /** Set the instant a file is accepted, before the heavy run — the theater
   * opens on this so the user never stares at a frozen page. */
  loadingFile: string | null;
  beginLoad: (fileName: string) => void;
  /** Listing whose full dossier is open in the side panel. */
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Run an uploaded CSV (same 13-column schema) through the same pipeline —
   * parsed entirely in the browser; nothing is transmitted anywhere. */
  loadCsv: (text: string, fileName: string) => void;
  resetToPacket: () => void;
}

export function usePipelineStore(): PipelineStore {
  const [csvText, setCsvText] = useState(packetCsv);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const result = useMemo(() => runPipeline(csvText, DEFAULT_CONFIG, overrides), [csvText, overrides]);
  return {
    result,
    overrides,
    addOverride: o => setOverrides(prev => [...prev.filter(p => p.listingId !== o.listingId), o]),
    clearOverrides: () => setOverrides([]),
    customFileName,
    loadError,
    loadNonce,
    loadingFile,
    beginLoad: fileName => {
      setLoadError(null);
      setLoadingFile(fileName);
      setSelectedId(null);
    },
    selectedId,
    select: setSelectedId,
    loadCsv: (text, fileName) => {
      try {
        // Cheap validation only — parse + normalize catch every throw path
        // (schema, numbers, dates, furnishing strings) in milliseconds. The
        // single full run happens once, in the memo below.
        parseListingsCsv(text).forEach(r => normalizeListing(r, DEFAULT_CONFIG));
        setCsvText(text);
        setCustomFileName(fileName);
        setOverrides([]);
        setLoadError(null);
        setLoadNonce(n => n + 1);
        setLoadingFile(null);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
        setLoadingFile(null);
      }
    },
    resetToPacket: () => {
      setCsvText(packetCsv);
      setCustomFileName(null);
      setOverrides([]);
      setLoadError(null);
      setLoadingFile(null);
    },
  };
}

/** Live funnel counts, derived from the current result (moves with overrides). */
export function funnelOf(result: PipelineResult) {
  const { listings, trust, segments } = result;
  const quarantined = (id: string) => trust[id]!.reasons.some(r => r.effect === 'quarantine');
  const has = (id: string, code: string) => trust[id]!.reasons.some(r => r.code === code);
  const credible = listings.filter(l => !quarantined(l.listingId));
  const alive = credible.filter(l => !has(l.listingId, 'stale-dead'));
  const units = alive.filter(l => !has(l.listingId, 'duplicate-copy'));
  const tier1 = segments.find(s => s.segmentId === 'tier1')!;
  return { raw: listings.length, credible: credible.length, alive: alive.length, units: units.length, tier1 };
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
