import { useNavigate } from 'react-router-dom';
import { User, Bell, LogOut, Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GarudaEmblem } from '@/components/atoms/media/GarudaEmblem';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';

const DISPLAY_FONT = "'Space Grotesk', 'Inter', sans-serif";

const ROLE_COLORS: Record<string, string> = {
  superadmin: '#ff7759',
  admin: '#003c33',
  user: '#93939f',
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
};

interface TopNavProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function TopNav({ sidebarOpen, setSidebarOpen }: TopNavProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const roleColor = ROLE_COLORS[user?.role ?? 'user'] ?? '#93939f';
  const roleLabel = ROLE_LABELS[user?.role ?? 'user'] ?? 'User';

  return (
    <nav className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#d9d9dd] bg-white/95 px-3 backdrop-blur transition-all duration-300 sm:px-4 lg:left-72 lg:h-16 lg:px-8">
      {/* Left: mobile hamburger + brand */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-[#17171c] hover:bg-[#eeece7]"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
        <GarudaEmblem size={36} />
        <p className="text-sm font-semibold text-[#17171c]" style={{ fontFamily: DISPLAY_FONT }}>
          INVESTRA
        </p>
      </div>

      {/* Spacer on desktop */}
      <div className="hidden lg:block" />

      {/* Right: bell + user */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#93939f] hover:text-[#17171c]"
        >
          <Bell className="size-5" />
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#ff7759] text-[10px] font-medium text-white">
            3
          </span>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full border border-[#d9d9dd] bg-white py-1.5 pl-1.5 pr-3 transition hover:border-[#93939f]"
            >
              <Avatar className="size-7">
                <AvatarFallback
                  className="text-xs text-white"
                  style={{ backgroundColor: roleColor }}
                >
                  {user?.fullName?.[0]?.toUpperCase() ?? <User className="size-3" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-xs font-medium text-[#17171c]">{user?.fullName || 'Guest'}</p>
                <p className="text-[11px]" style={{ color: roleColor }}>
                  {roleLabel}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#d9d9dd]">
            <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-[#93939f]">
              Akun Saya
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#f2f2f2]" />
            <DropdownMenuItem className="rounded-lg text-[#212121]">
              <User className="mr-2 size-4 text-[#93939f]" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#f2f2f2]" />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="rounded-lg text-[#ff7759] focus:text-[#ff7759]"
            >
              <LogOut className="mr-2 size-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
