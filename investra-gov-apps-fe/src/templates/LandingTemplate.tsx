/**
 * Landing Template
 *
 * Full-width layout shell for public pages (landing, about).
 * No sidebar, full-screen content.
 */
import type { ReactNode } from 'react';

interface LandingTemplateProps {
  children: ReactNode;
}

export function LandingTemplate({ children }: LandingTemplateProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
