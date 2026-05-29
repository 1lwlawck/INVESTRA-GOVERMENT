import {
  LayoutDashboard,
  Network,
  GitBranch,
  BarChart3,
  FileText,
  Info,
  X,
  Database,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/utils/cn.util';

import { GarudaEmblem } from '@/components/atoms/media/GarudaEmblem';
import { Button } from '@/components/ui/button';
import { useAuthStore, hasRole } from '@/stores/auth.store';
import type { UserRole } from '@/stores/auth.store';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const menuItems: Array<{
  to: string;
  end: boolean;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
  /** Minimum role required to see this menu item */
  minRole?: UserRole;
}> = [
  {
    to: '/dashboard',
    end: true,
    label: 'Dashboard Utama',
    icon: LayoutDashboard,
    description: 'Ringkasan & Metrik',
  },
  {
    to: '/dashboard/dataset',
    end: false,
    label: 'Dataset Investasi',
    icon: Database,
    description: 'Data Default',
  },
  {
    to: '/dashboard/pca',
    end: false,
    label: 'Analisis PCA',
    icon: Network,
    description: 'Principal Component',
  },
  {
    to: '/dashboard/clustering',
    end: false,
    label: 'K-Means Clustering',
    icon: GitBranch,
    description: 'Klasifikasi Wilayah',
  },
  {
    to: '/dashboard/visualization',
    end: false,
    label: 'Visualisasi Data',
    icon: BarChart3,
    description: 'Grafik & Peta',
  },
  {
    to: '/dashboard/policy',
    end: false,
    label: 'Rekomendasi Kebijakan',
    icon: FileText,
    description: 'Strategi Regional',
  },
  {
    to: '/dashboard/about',
    end: false,
    label: 'Tentang Sistem',
    icon: Info,
    description: 'Informasi & Metodologi',
  },
  {
    to: '/dashboard/users',
    end: false,
    label: 'Manajemen Pengguna',
    icon: Users,
    description: 'Kelola Akun & Hak Akses',
    minRole: 'superadmin',
  },
];

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const user = useAuthStore((state) => state.user);

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) => !item.minRole || hasRole(user, item.minRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-72 border-r border-[#d9d9dd] bg-white transition-transform duration-300 ease-in-out',
          // Mobile: slide from left
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible
          'lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo & Branding Area */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#f2f2f2] px-6">
            <GarudaEmblem size={36} />
            <div className="flex flex-col">
              <h1
                className="text-base font-semibold leading-tight tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                INVESTRA
              </h1>
              <span className="text-[10px] font-medium text-[#93939f]">Investment Analytics</span>
            </div>
            {/* Mobile Close */}
            <Button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto rounded-md p-1 text-[#93939f] hover:bg-[#eeece7] lg:hidden"
            >
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Sidebar Header */}
            {/* <div className="bg-linear-to-br from-[#002C5F] to-[#003D7A] text-white p-4 rounded-lg mb-4 shadow-md">
              <h3 className="text-sm opacity-90 font-semibold">Navigasi Menu</h3>
              <p className="text-xs opacity-75 mt-1 font-normal">Pilih modul analisis</p>
            </div> */}

            {/* Navigation Menu */}
            <nav className="space-y-0.5">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150',
                        isActive ? 'bg-[#17171c] text-white' : 'text-[#212121] hover:bg-[#eeece7]',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            'mt-0.5 size-4 shrink-0 transition-colors',
                            isActive
                              ? 'text-[#ff7759]'
                              : 'text-[#93939f] group-hover:text-[#17171c]',
                          )}
                        />
                        <div className="flex-1 text-left">
                          <div
                            className={cn(
                              'text-sm transition-colors',
                              isActive ? 'font-medium text-white' : 'font-normal text-[#212121]',
                            )}
                          >
                            {item.label}
                          </div>
                          <div
                            className={cn(
                              'mt-0.5 text-xs transition-colors',
                              isActive ? 'text-white/60' : 'text-[#93939f]',
                            )}
                          >
                            {item.description}
                          </div>
                        </div>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Footer Info */}
            <div className="mt-6 rounded-lg border border-[#d9d9dd] bg-[#edfce9] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-[#003c33]" />
                <span className="text-xs font-medium text-[#003c33]">Status: Aktif</span>
              </div>
              <p className="text-xs leading-relaxed text-[#212121]">
                Sistem analisis regional berbasis PCA dan K-Means untuk monitoring ketimpangan
                investasi antar provinsi
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
