import type { TrustReason } from '@pipeline/types';

const EFFECT_CLASS: Record<TrustReason['effect'], string> = {
  quarantine: 'tag--quarantine',
  exclude: 'tag--exclude',
  downweight: 'tag--downweight',
  note: 'tag--note',
};

export default function ReasonTag({ reason }: { reason: TrustReason }) {
  const cls = reason.code === 'human-override' ? 'tag--human' : EFFECT_CLASS[reason.effect];
  const detail =
    reason.expected && reason.actual
      ? `${reason.label}\nexpected: ${reason.expected}\nactual: ${reason.actual}`
      : reason.label;
  return (
    <span className={`tag ${cls}`} title={detail}>
      {reason.code}
    </span>
  );
}
