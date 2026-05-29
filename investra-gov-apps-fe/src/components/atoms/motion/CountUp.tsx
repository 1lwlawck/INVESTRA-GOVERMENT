import { useEffect, useRef, useState } from 'react';
import { useScrollReveal } from '@/hooks/ui/useScrollReveal';

interface CountUpProps {
  /** Final value to count up to. */
  value: number;
  /** Animation duration in ms. */
  duration?: number;
  className?: string;
  /** Optional suffix rendered after the number (e.g. " provinsi"). */
  suffix?: string;
}

/**
 * Counts a number up from 0 to `value` when it scrolls into view.
 * Uses requestAnimationFrame with an ease-out curve. Respects
 * prefers-reduced-motion (via useScrollReveal, which reveals instantly).
 */
export function CountUp({ value, duration = 1200, className, suffix }: CountUpProps) {
  const { ref, isVisible } = useScrollReveal<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isVisible || startedRef.current) return;
    startedRef.current = true;

    // Reduced-motion users get the final value immediately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
