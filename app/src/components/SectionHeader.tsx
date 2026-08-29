import type { ReactNode } from 'react';
import Reveal from './Reveal';

interface Props {
  stage: string; // "01 · The pull" — the numeral is real pipeline order
  flow?: string; // what this stage did to the evidence, e.g. "86 rows in → 71 stay alive"
  title: ReactNode;
  lede?: ReactNode;
}

/** Chapter opening: an oversized hairline numeral (the pipeline is a real
 * sequence), the stage name, and the flow line — structure as information. */
export default function SectionHeader({ stage, flow, title, lede }: Props) {
  const [num, ...rest] = stage.split('·');
  const label = rest.join('·').trim();
  return (
    <Reveal>
      <header className="chapter-head">
        <div className="chapter-row">
          <div className="chapter-num" aria-hidden="true">{num?.trim()}</div>
          <div>
            <p className="eyebrow">
              {label || stage}
              {flow ? <span className="flow">{flow}</span> : null}
            </p>
            <h2 className="scene-title">{title}</h2>
            {lede ? <p className="scene-lede">{lede}</p> : null}
          </div>
        </div>
      </header>
    </Reveal>
  );
}
