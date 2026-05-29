import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Subtle scroll-driven parallax for an element.
 * The element drifts vertically by `range` pixels as the parent scrolls
 * through the viewport. Uses GSAP ScrollTrigger with `scrub: true` so
 * the motion is tied directly to scroll position (synced with Lenis).
 *
 * Returns a ref to attach to the target element.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(options?: {
  /** Total vertical drift in pixels (negative = moves up faster). Default -60. */
  range?: number;
  /** Scroll-sync smoothing in seconds, or true for direct sync. Default 0.5. */
  scrub?: number | boolean;
}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Skip parallax for users who prefer reduced motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const range = options?.range ?? -60;
    const scrub = options?.scrub ?? 0.5;

    const tween = gsap.to(node, {
      y: range,
      ease: 'none',
      scrollTrigger: {
        trigger: node,
        start: 'top bottom',
        end: 'bottom top',
        scrub,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [options?.range, options?.scrub]);

  return ref;
}
