import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GLOSSARY } from './glossary';

interface TermTooltipProps {
  /** Key into GLOSSARY (e.g. "pca", "kmeans", "ipm"). */
  termKey: keyof typeof GLOSSARY;
  /** Visible label; defaults to the glossary term name. */
  children?: React.ReactNode;
  /** Color of the dotted underline + text accent. */
  accent?: string;
}

/**
 * Inline technical term with a plain-language tooltip.
 * Shown with a dotted underline so users know it is explainable.
 */
export function TermTooltip({ termKey, children, accent = '#ff7759' }: TermTooltipProps) {
  const entry = GLOSSARY[termKey];
  if (!entry) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="cursor-help underline decoration-dotted underline-offset-4"
            style={{ textDecorationColor: accent }}
            aria-label={`Penjelasan: ${entry.term}`}
          >
            {children ?? entry.term}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-left leading-relaxed">
          <span className="font-semibold">{entry.term}</span> — {entry.short}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
