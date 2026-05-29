import { useEffect, useRef, type ReactNode } from 'react';
import { ReactLenis } from 'lenis/react';
import type { LenisRef } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps the app in Lenis smooth scrolling and syncs it with GSAP's ticker
 * and ScrollTrigger. Pattern from the official Lenis React docs:
 * https://github.com/darkroomengineering/lenis/blob/main/packages/react/README.md
 *
 * autoRaf is disabled so Lenis advances on GSAP's ticker (single RAF loop),
 * which keeps ScrollTrigger animations perfectly in sync with the smooth scroll.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef | null>(null);

  useEffect(() => {
    // Respect reduced-motion: skip smooth scroll + ticker wiring entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    function update(time: number) {
      // GSAP ticker time is in seconds; Lenis.raf expects milliseconds.
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    const lenis = lenisRef.current?.lenis;
    lenis?.on('scroll', ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(update);
      lenis?.off('scroll', ScrollTrigger.update);
    };
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1 }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
