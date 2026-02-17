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
import { cn } from "@/shared/utils/cn.util";

import { GarudaEmblem } from "@/components/atoms/media/GarudaEmblem";
import { Button } from "@/components/ui/button";
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
    description: 'Ringkasan & Metrik'
  },
  {
    to: '/dashboard/dataset',
    end: false,
    label: 'Dataset Investasi',
    icon: Database,
    description: 'Data Default'
  },
  {
    to: '/dashboard/pca',
    end: false,
    label: 'Analisis PCA',
    icon: Network,
    description: 'Principal Component'
  },
  {
    to: '/dashboard/clustering',
    end: false,
    label: 'K-Means Clustering',
    icon: GitBranch,
    description: 'Klasifikasi Wilayah'
  },
  {
    to: '/dashboard/visualization',
    end: false,
    label: 'Visualisasi Data',
    icon: BarChart3,
    description: 'Grafik & Peta'
  },
  {
    to: '/dashboard/policy',
    end: false,
    label: 'Rekomendasi Kebijakan',
    icon: FileText,
    description: 'Strategi Regional'
  },
  {
    to: '/dashboard/about',
    end: false,
    label: 'Tentang Sistem',
    icon: Info,
    description: 'Informasi & Metodologi'
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
  const visibleMenuItems = menuItems.filter(
    (item) => !item.minRole || hasRole(user, item.minRole)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 shadow-sm z-50 transition-transform duration-300 ease-in-out",
        // Mobile: slide from left
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: always visible
        "lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo & Branding Area */}
          <div className="h-16 lg:h-20 flex items-center gap-3 px-6 border-b border-gray-100 shrink-0">
             <GarudaEmblem size={40} />
             <div className="flex flex-col">
                <h1 className="text-[#002C5F] text-lg leading-tight" style={{ fontWeight: 700 }}>
                  INVESTRA
                </h1>
                <span className="text-[10px] text-gray-500 font-medium">Investment Analytics</span>
             </div>
             {/* Mobile Close */}
             <Button
                onClick={() => setSidebarOpen(false)}
                className="ml-auto lg:hidden p-1 rounded-md hover:bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Sidebar Header */}
            {/* <div className="bg-linear-to-br from-[#002C5F] to-[#003D7A] text-white p-4 rounded-lg mb-4 shadow-md">
              <h3 className="text-sm opacity-90" style={{ fontWeight: 600 }}>Navigasi Menu</h3>
              <p className="text-xs opacity-75 mt-1" style={{ fontWeight: 400 }}>Pilih modul analisis</p>
            </div> */}

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    "w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-linear-to-r from-[#002C5F] to-[#003D7A] text-white shadow-md" 
                      : "hover:bg-[#F9B233]/10 hover:border hover:border-[#F9B233]/30 group"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon 
                        className={cn(
                          "h-5 w-5 shrink-0 mt-0.5 transition-colors",
                          isActive ? "text-[#F9B233]" : "text-[#002C5F] group-hover:text-[#F9B233]"
                        )} 
                      />
                      <div className="flex-1 text-left">
                        <div className={cn(
                          "text-sm transition-colors",
                          isActive ? "text-white" : "text-[#002C5F] group-hover:text-[#002C5F]"
                        )}
                        style={{ fontWeight: isActive ? 600 : 500 }}
                        >
                          {item.label}
                        </div>
                        <div className={cn(
                          "text-xs transition-colors mt-0.5",
                          isActive ? "text-gray-200" : "text-gray-600 group-hover:text-gray-700"
                        )}
                        style={{ fontWeight: 400 }}
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
          <div className="mt-6 p-4 bg-linear-to-br from-amber-50 to-yellow-50 border border-[#F9B233]/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>Status: Aktif</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed" style={{ fontWeight: 400 }}>
              Sistem analisis regional berbasis PCA dan K-Means untuk monitoring ketimpangan investasi antar provinsi
            </p>
          </div>
        </div>
        </div>
      </aside>
    </>
  );
}