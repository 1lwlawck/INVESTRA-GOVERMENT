import { useNavigate } from 'react-router-dom';
import { User, Bell, LogOut, Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GarudaEmblem } from "@/components/atoms/media/GarudaEmblem";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from '@/stores/auth.store';

interface TopNavProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function TopNav({ sidebarOpen, setSidebarOpen }: TopNavProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  return (
    <nav className="fixed top-0 left-0 right-0 lg:left-72 h-16 lg:h-20 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 lg:px-8 z-40 shadow-sm transition-all duration-300">
      {/* Left: Hamburger + Government Emblem + Branding (Mobile Only) */}
      <div className="flex items-center gap-2 lg:hidden">
        {/* Mobile Hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[#002C5F] hover:bg-[#002C5F]/10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <GarudaEmblem size={40} />
        
        <div className="border-l-2 border-[#F9B233] pl-2">
          <div className="flex items-center gap-2">
            <h1 className="text-[#002C5F] text-base leading-tight" style={{ fontWeight: 700 }}>
              INVESTRA
            </h1>
          </div>
        </div>
      </div>

      {/* Center: Dashboard Title */}
      <div className="hidden xl:block text-center">
        {/* <div className="bg-linear-to-r from-[#002C5F] to-[#003D7A] text-white px-6 py-2 rounded-lg shadow-md">
          <h2 className="text-lg" style={{ fontWeight: 600 }}>
            Dashboard Analisis Ketimpangan Investasi
          </h2>
          <p className="text-xs opacity-90 mt-0.5" style={{ fontWeight: 400 }}>
            Sistem Monitoring PCA & K-Means Clustering
          </p>
        </div> */}
      </div>
      
      {/* Right: Controls */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-600 hover:text-[#002C5F]"
        >
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[#DC2626] text-white text-xs">
            3
          </Badge>
        </Button>
        
        {/* User Profile with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-2 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#002C5F] text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm text-[#002C5F]" style={{ fontWeight: 600 }}>{user?.fullName || 'Guest'}</p>
                <p className="text-xs" style={{
                  fontWeight: 600,
                  color: user?.role === 'superadmin' ? '#DC2626' : user?.role === 'admin' ? '#002C5F' : '#059669'
                }}>
                  {user?.role === 'superadmin' ? 'SUPER ADMIN' : user?.role === 'admin' ? 'ADMIN' : 'USER'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel style={{ fontWeight: 600 }}>Akun Saya</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem style={{ fontWeight: 500 }}>
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="text-red-600 focus:text-red-600"
              style={{ fontWeight: 600 }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
