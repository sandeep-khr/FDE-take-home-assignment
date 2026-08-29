import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import { inr, usePipeline } from '../state';

/** Stage 1: the mess, shown whole. No grades yet — this is what walks in. */
export default function RawPull() {
  const { result } = usePipeline();
  const [source, setSource] = useState<string>('all');
  const sources = ['all', ...new Set(result.listings.map(l => l.source))];
  const rows = result.listings.filter(l => source === 'all' || l.source === source);
  const spellings = new Set(result.listings.map(l => l.society)).size;

  return (
    <section className="scene" id="raw">
      <SectionHeader
        stage="01 · The pull"
        flow={`${result.listings.length} rows · 4 platforms · ${spellings} society spellings`}
        title={
          <>
            Eighty-six rows of <em>maybe</em>.
          </>
        }
        lede={
          <>
            The raw export around the subject home, exactly as scraped. Same homes under different
            names, rents that may or may not include maintenance, listings that died in June and
            one that claims to have been seen before it was posted. A median over this table looks
            precise — that&rsquo;s the trap.
          </>
        }
      />
      <div className="stat-row">
        <div className="stat">
          <b>{result.listings.length}</b>
          <span>rows from 4 platforms</span>
        </div>
        <div className="stat">
          <b>{spellings}</b>
          <span>spellings for 6 societies</span>
        </div>
        <div className="stat">
          <b>₹12k–₹1.85L</b>
          <span>the "2BHK rent" range, before judgment</span>
        </div>
      </div>
      <details className="ledger-fold">
        <summary>
          Open the raw ledger
          <span className="hint">
            all {rows.length} rows, exactly as scraped — filter by platform inside
          </span>
        </summary>
        <div style={{ display: 'flex', gap: 8, padding: '14px 26px 4px', flexWrap: 'wrap' }}>
          {sources.map(s => (
            <button
              key={s}
              className="chip"
              onClick={() => setSource(s)}
              style={
                s === source
                  ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }
                  : undefined
              }
            >
              {s === 'all' ? `All ${result.listings.length}` : s}
            </button>
          ))}
        </div>
        <div className="ledger-scroll">
          <table className="ledger">
          <thead>
            <tr>
              <th>id</th>
              <th>source</th>
              <th>society, as written</th>
              <th>locality, as written</th>
              <th>config</th>
              <th className="num">area</th>
              <th className="num">rent</th>
              <th className="num">deposit</th>
              <th className="num">photos</th>
              <th>poster</th>
              <th>seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.listingId}>
                <td className="mono">{l.listingId}</td>
                <td>{l.source}</td>
                <td>{l.society}</td>
                <td>{l.locality}</td>
                <td>
                  {l.bhk}BHK · {l.furnishing}
                </td>
                <td className="num">{l.areaSqft ?? '—'}</td>
                <td className="num">{inr(l.rent)}</td>
                <td className="num">{l.deposit ? inr(l.deposit) : '—'}</td>
                <td className="num">{l.photoCount}</td>
                <td>{l.posterType}</td>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                  {l.postedDate} → {l.lastSeenDate}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
