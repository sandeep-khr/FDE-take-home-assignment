import type { CSSProperties } from 'react';
import SectionHeader from '../components/SectionHeader';
import { usePipeline } from '../state';

/** Stage 4: names merge on listing evidence, never on spelling alone. */
export default function AliasMap() {
  const { result } = usePipeline();
  const spellingsOf = (nameKeys: string[]) => {
    const set = new Set<string>();
    for (const l of result.listings) if (nameKeys.includes(l.nameKey)) set.add(l.society);
    return [...set].sort();
  };
  const styleFor: Record<string, CSSProperties> = {
    merged: { borderColor: 'color-mix(in srgb, var(--pine) 40%, transparent)' },
    suspected: { borderStyle: 'dashed', borderColor: 'color-mix(in srgb, var(--brass) 60%, transparent)' },
    distinct: {},
  };

  return (
    <section className="scene" id="alias">
      <SectionHeader
        stage="04 · Names"
        flow={`${result.aliases.length} decisions · ${result.aliasSuggestions.length} string-similar suggestions`}
        title={
          <>
            &ldquo;Lake View Residency&rdquo; <em>is</em> &ldquo;Lakeview Residences.&rdquo;
            Proven, not assumed.
          </>
        }
        lede={
          <>
            When the same physical unit shows up under two spellings, those spellings co-refer —
            that&rsquo;s a bridge. Two independent bridges merge the names for the math. One
            bridge is a suspicion for a human. Zero bridges: the names stay apart, however similar
            they look, because merging spellings manufactures sample size.
          </>
        }
      />
      <div className="card-grid">
        {result.aliases.map(a => (
          <div key={a.stem} className="card" style={styleFor[a.status]}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'baseline' }}>
              <b style={{ textTransform: 'capitalize' }}>{a.stem} family</b>
              <span className={`chip ${a.status === 'merged' ? 'grade--A' : 'grade--B'}`}>
                {a.status} · {a.independentBridges} bridge{a.independentBridges === 1 ? '' : 's'}
              </span>
            </div>
            <div style={{ margin: '12px 0 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {spellingsOf(a.nameKeys).map(s => (
                <span key={s} className="chip" style={{ fontWeight: 500 }}>
                  {s}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-60)' }}>{a.note}</p>
          </div>
        ))}

        <div className="card">
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'baseline' }}>
            <b>String-similar only</b>
            <span className="chip">no listing evidence</span>
          </div>
          <div style={{ margin: '12px 0 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.aliasSuggestions.map(s => (
              <span key={`${s.a}~${s.b}`} className="chip" style={{ borderStyle: 'dotted', fontWeight: 500 }}>
                {s.a} ↔ {s.b}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-60)' }}>
            Shown as suggestions for the review queue. They do not touch the math until a person
            confirms them — v1 keeps that queue in the execution plan.
          </p>
        </div>
      </div>
    </section>
  );
}
