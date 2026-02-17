import { useEffect } from 'react';

const BASE_TITLE = 'Investra';

/**
 * Sets the document title on mount and restores the base title on unmount.
 *
 * @param title – page-specific title segment, e.g. "Dashboard"
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
