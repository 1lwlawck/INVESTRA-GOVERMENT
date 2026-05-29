import { useEffect, useState } from 'react';

export interface Chapter {
  /** Anchor id of the section this chapter points to. */
  id: string;
  /** Two-digit chapter number, e.g. "01". */
  num: string;
  /** Short chapter title. */
  title: string;
}

interface ChapterRailProps {
  chapters: Chapter[];
}

/**
 * Sticky vertical chapter navigation on the left edge of the report.
 * Highlights the active chapter as the user scrolls (IntersectionObserver),
 * and scrolls smoothly to a chapter on click. Hidden below lg and while the
 * hero (above the first chapter) is in view.
 */
export function ChapterRail({ chapters }: ChapterRailProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sections = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the top that is intersecting.
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (intersecting[0]) {
          setActiveId(intersecting[0].target.id);
          setVisible(true);
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));

    // Hide the rail once the user is back at the very top (hero).
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [chapters]);

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Navigasi bab"
      className={`fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 transition-opacity duration-300 lg:flex ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {chapters.map((c) => {
        const isActive = c.id === activeId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => handleClick(c.id)}
            className="group flex items-center gap-3 py-1 text-left"
          >
            <span
              className="h-px transition-all duration-300"
              style={{
                width: isActive ? 28 : 14,
                backgroundColor: isActive ? '#17171c' : '#d9d9dd',
              }}
            />
            <span
              className={`text-[11px] font-medium uppercase tracking-wider transition-colors ${
                isActive ? 'text-[#17171c]' : 'text-[#93939f] group-hover:text-[#616161]'
              }`}
              style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
            >
              {c.num} {c.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
