import { useRef, useState } from 'react';
import { usePipeline } from '../state';

const SCHEMA = [
  'listing_id', 'source', 'posted_date', 'last_seen_date', 'society', 'locality',
  'bhk', 'furnishing', 'area_sqft', 'rent', 'deposit', 'photo_count', 'poster_type',
];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The tool's front door: drop any listings pull in the packet's schema and it
 * runs through the exact same pipeline, entirely in this browser tab.
 * Validation is loud and specific; a bad file never touches the analysis.
 */
export default function UploadZone() {
  const { customFileName, loadError, loadCsv, beginLoad, resetToPacket } = usePipeline();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fetchingSample, setFetchingSample] = useState(false);

  const runSample = async () => {
    setLocalError(null);
    setFetchingSample(true);
    beginLoad('synthetic-27000.csv (sample)');
    try {
      const res = await fetch('/synthetic-27000.csv');
      if (!res.ok) throw new Error(`sample not found (${res.status})`);
      const text = await res.text();
      setTimeout(() => loadCsv(text, 'synthetic-27000.csv (sample)'), 80);
    } catch (e) {
      setLocalError(`Couldn't fetch the sample: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFetchingSample(false);
    }
  };

  const takeFile = (file: File | undefined | null) => {
    setLocalError(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setLocalError(`"${file.name}" is not a .csv file — export your pull as CSV first.`);
      return;
    }
    if (file.size === 0) {
      setLocalError(`"${file.name}" is empty.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError(
        `"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB — the in-browser cap is 10 MB (~90,000 rows).`,
      );
      return;
    }
    beginLoad(file.name); // theater opens NOW, before the heavy run
    const reader = new FileReader();
    // The parse itself is synchronous and can take seconds at 27k rows — the
    // short defer lets the browser paint the "running…" modal first.
    reader.onload = () => setTimeout(() => loadCsv(String(reader.result ?? ''), file.name), 80);
    reader.readAsText(file);
  };

  const error = localError ?? loadError;

  return (
    <div className="zone-wrap">
      <div
        className={`zone ${dragging ? 'zone--drag' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload a listings CSV to run it through this pipeline"
        onClick={() => fileRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          takeFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          aria-label="Upload a listings CSV"
          onChange={e => {
            takeFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <div className="zone-icon" aria-hidden="true">
          ⇪
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="zone-title">
            Drop your own <span className="mono">listings.csv</span> here — watch it go through
            the same pipeline
          </p>
          <p className="zone-sub">
            or click to browse · parsed in your browser, nothing leaves this tab · up to 10 MB
            (Flent&rsquo;s full 27,000-row pull runs in seconds)
          </p>
          <p className="zone-schema">
            needs the packet&rsquo;s 13 columns:{' '}
            {SCHEMA.map(c => (
              <code key={c}>{c}</code>
            ))}
          </p>
          <p className="zone-sample" onClick={e => e.stopPropagation()}>
            no pull handy?{' '}
            <button className="zone-sample-btn" onClick={runSample} disabled={fetchingSample}>
              {fetchingSample ? 'loading the sample…' : 'run the 27,000-row synthetic sample'}
            </button>{' '}
            · <a href="/synthetic-27000.csv" download>download it</a> · SYN-labeled, generated —
            never case evidence
          </p>
        </div>
      </div>
      {error && (
        <p className="pipe-error" role="alert">
          {localError ? error : <>Couldn&rsquo;t use that file: {error} The current analysis is untouched.</>}
        </p>
      )}
      {customFileName && (
        <p className="zone-loaded">
          analyzing <b className="mono">{customFileName}</b> — judged under the case deal&rsquo;s
          configuration (Lakeview 2BHK subject, same thresholds)
          <button className="btn btn--human btn--small" style={{ marginLeft: 12 }} onClick={resetToPacket}>
            Back to the case packet
          </button>
        </p>
      )}
    </div>
  );
}
