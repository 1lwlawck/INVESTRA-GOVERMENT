import type { ReactNode } from 'react';
import { useScrollReveal } from '@/hooks/ui/useScrollReveal';

interface RevealProps {
  children: ReactNode;
  /** Optional delay in ms before the reveal animation starts. */
  delay?: number;
  className?: string;
  /** Render as a different element when needed (defaults to div). */
  as?: 'div' | 'section';
}

/**
 * Wraps content and fades + slides it up when it scrolls into view.
 * Cohere-style scroll reveal built on the native IntersectionObserver.
 */
export function Reveal({ children, delay = 0, className, as = 'div' }: RevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const Tag = as;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
