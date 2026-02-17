/**
 * Auth Template
 *
 * Layout shell for authentication pages (login, register).
 * Centered card on a branded government background.
 */
import type { ReactNode } from 'react';

interface AuthTemplateProps {
  children: ReactNode;
}

export function AuthTemplate({ children }: AuthTemplateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#002C5F] to-[#001a38] px-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
