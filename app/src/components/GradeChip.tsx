const LABELS: Record<string, string> = {
  A: 'A · counted',
  B: 'B · half weight',
  C: 'C · folded into cluster',
  D: 'D · out',
};

export default function GradeChip({ grade, compact = false }: { grade: 'A' | 'B' | 'C' | 'D'; compact?: boolean }) {
  return <span className={`chip grade grade--${grade}`}>{compact ? grade : LABELS[grade]}</span>;
}
