import type { ReactNode } from 'react';

interface Props {
  stage: string; // e.g. "Stage 3 · Trust"
  flow?: string; // e.g. "81 rows in → 71 stay alive"
  title: ReactNode;
  lede?: ReactNode;
}

/** Scene header: the eyebrow names the pipeline stage; the flow chip states
 * what the stage did to the row count — structure as information. */
export default function SectionHeader({ stage, flow, title, lede }: Props) {
  return (
    <header className="scene-head">
      <p className="eyebrow">
        {stage}
        {flow ? <span className="flow">{flow}</span> : null}
      </p>
      <h2 className="scene-title">{title}</h2>
      {lede ? <p className="scene-lede">{lede}</p> : null}
    </header>
  );
}
