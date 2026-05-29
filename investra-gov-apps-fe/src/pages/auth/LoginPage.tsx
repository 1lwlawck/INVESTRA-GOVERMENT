import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Eye, EyeOff, Lock, User, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GarudaEmblem } from '@/components/atoms/media/GarudaEmblem';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/core/api/auth.api';

const DISPLAY_FONT = "'Space Grotesk', 'Inter', sans-serif";

export function LoginPage() {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({ username, password });
      login(response.user, response.token);
      // user biasa tidak boleh akses dashboard
      if (response.user.role === 'user') {
        navigate('/', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2">
      {/* Left: brand panel — Cohere deep-green band */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#003c33] p-12 lg:flex">
        <a
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm text-white/70 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Kembali ke beranda
        </a>

        <div>
          <div className="mb-8 flex items-center gap-3">
            <GarudaEmblem size={48} />
            <div>
              <p className="text-lg font-semibold text-white" style={{ fontFamily: DISPLAY_FONT }}>
                INVESTRA
              </p>
              <p className="text-xs text-white/60">Portal Analisis Investasi Wilayah</p>
            </div>
          </div>
          <h1
            className="text-[clamp(2rem,3.5vw,3rem)] font-normal leading-[1.1] tracking-[-0.02em] text-white"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Masuk ke ruang
            <br />
            kerja pengelola.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
            Kelola dataset, jalankan analisis PCA dan K-Means, serta tinjau hasil clustering
            investasi antar provinsi Indonesia.
          </p>
        </div>

        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} INVESTRA &middot; Republik Indonesia
        </p>
      </div>

      {/* Right: login form — white canvas */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile-only brand (left panel hidden on small screens) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <GarudaEmblem size={40} />
            <div>
              <p className="font-semibold text-[#17171c]" style={{ fontFamily: DISPLAY_FONT }}>
                INVESTRA
              </p>
              <p className="text-xs text-[#93939f]">Portal Analisis Investasi Wilayah</p>
            </div>
          </div>

          <div className="mb-8">
            <p
              className="mb-3 text-[13px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
              style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
            >
              Login Pengelola
            </p>
            <h2
              className="text-[clamp(1.5rem,3vw,2rem)] font-normal tracking-[-0.02em] text-[#17171c]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Selamat datang kembali
            </h2>
            <p className="mt-2 text-sm text-[#616161]">
              Masukkan kredensial Anda untuk mengakses dashboard.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5 border-[#b30000] bg-red-50">
              <AlertDescription className="text-[#b30000]">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-[13px] font-medium uppercase tracking-wider text-[#93939f]"
              >
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#93939f]" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 rounded-lg border-[#d9d9dd] pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[13px] font-medium uppercase tracking-wider text-[#93939f]"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#93939f]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-lg border-[#d9d9dd] pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93939f] transition hover:text-[#17171c]"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="h-12 w-full rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Skeleton className="size-4 rounded-sm" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="size-5" />
                  Masuk ke Dashboard
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-[#93939f]">
            Sistem Analisis Ketimpangan Investasi &middot; Akses terbatas untuk pengelola.
          </p>
        </div>
      </div>
    </div>
  );
}
