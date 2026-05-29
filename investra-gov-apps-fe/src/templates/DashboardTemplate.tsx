/**
 * Dashboard Template
 *
 * Page-level layout shell for authenticated dashboard pages.
 * Composes Sidebar + TopNav + content area.
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from '@/components/organisms/navigation/TopNav';
import { Sidebar } from '@/components/organisms/navigation/Sidebar';

export function DashboardTemplate() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="ml-0 mt-16 flex-1 p-4 md:p-8 lg:ml-72">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
