import { GLOSSARY } from './glossary';
import { TermTooltip } from './TermTooltip';

/**
 * Per-indicator display config for the public province card.
 * Bars use plausible national-scale references so the fill is meaningful
 * for a general audience (the public API does not return min/max ranges).
 * `glossaryKey` links the label to a plain-language explanation.
 * `higherIsBetter` drives the bar color (green = good, amber = watch).
 */
interface IndicatorMeta {
  glossaryKey?: keyof typeof GLOSSARY;
  /** Value that represents a "full" bar (100%). */
  scaleMax: number;
  /** Whether a higher value is the favorable direction. */
  higherIsBetter: boolean;
}

const INDICATOR_META: Record<string, IndicatorMeta> = {
  // Investment values: scaled to a generous cap (Rp 100 T) just for the bar.
  pmdnRp: { glossaryKey: 'pmdn', scaleMax: 100_000_000_000_000, higherIsBetter: true },
  fdiRp: { glossaryKey: 'pma', scaleMax: 100_000_000_000_000, higherIsBetter: true },
  pdrbPerKapita: { glossaryKey: 'pdrb', scaleMax: 200_000_000, higherIsBetter: true },
  ipm: { glossaryKey: 'ipm', scaleMax: 100, higherIsBetter: true },
  kemiskinan: { scaleMax: 30, higherIsBetter: false },
  aksesListrik: { scaleMax: 100, higherIsBetter: true },
  tpt: { glossaryKey: 'tpt', scaleMax: 15, higherIsBetter: false },
};

interface IndicatorRowProps {
  indicatorKey: string;
  label: string;
  value: number;
  formattedValue: string;
}

export function IndicatorRow({ indicatorKey, label, value, formattedValue }: IndicatorRowProps) {
  const meta = INDICATOR_META[indicatorKey];
  const pct = meta ? Math.max(4, Math.min(100, (value / meta.scaleMax) * 100)) : 0;
  // Favorable direction → green; unfavorable indicators → amber.
  const barColor = !meta ? '#93939f' : meta.higherIsBetter ? '#003c33' : '#ff7759';

  return (
    <div className="rounded-lg border border-[#f2f2f2] bg-white p-3">
      <p className="text-xs text-[#93939f]">
        {meta?.glossaryKey ? <TermTooltip termKey={meta.glossaryKey}>{label}</TermTooltip> : label}
      </p>
      <p className="mt-1 font-medium text-[#17171c]">{formattedValue}</p>
      {meta && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#eeece7]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  );
}
