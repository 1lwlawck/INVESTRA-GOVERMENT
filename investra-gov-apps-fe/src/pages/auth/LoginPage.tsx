import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Eye, EyeOff, Lock, User, LogIn, ShieldCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GarudaEmblem } from "@/components/atoms/media/GarudaEmblem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/core/api/auth.api';

export function LoginView() {
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI0NDQyIgc3Ryb2tlLXdpZHRoPSIuNSIgb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
        <CardContent className="p-0">
          {/* Header Section */}
          <div className="bg-[#002C5F] pt-10 pb-6 px-8 text-center border-b-4 border-[#F9B233]">
            <div className="flex justify-center mb-4">
              <GarudaEmblem size={80} />
            </div>
            
            <h1 className="text-white text-2xl mb-2" style={{ fontWeight: 700 }}>
              INVESTRA
            </h1>
            
            <p className="text-white/90 text-sm mb-1" style={{ fontWeight: 500 }}>
              Investment Analytics Indonesia
            </p>
            
            <div className="inline-flex items-center gap-2 bg-[#F9B233] text-[#002C5F] px-4 py-2 rounded-full mt-3">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs" style={{ fontWeight: 600 }}>
                Sistem Analisis Ketimpangan Investasi
              </span>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-gray-50 p-8">
            <div className="text-center mb-6">
              <h2 className="text-[#002C5F] text-xl mb-2" style={{ fontWeight: 600 }}>
                Login Dashboard
              </h2>
              <p className="text-gray-600 text-sm" style={{ fontWeight: 400 }}>
                Masukkan kredensial Anda untuk mengakses sistem
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}


            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#002C5F]" style={{ fontWeight: 600 }}>
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-[#002C5F] focus:ring-[#002C5F]"
                    style={{ fontWeight: 400 }}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#002C5F]" style={{ fontWeight: 600 }}>
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-[#002C5F] focus:ring-[#002C5F]"
                    style={{ fontWeight: 400 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-[#002C5F] hover:bg-[#003D7A] text-white"
                style={{ fontWeight: 600 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Masuk ke Dashboard
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-white px-8 py-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500" style={{ fontWeight: 400 }}>
              © 2025 INVESTRA - Sistem Analisis Ketimpangan Investasi
            </p>
            <p className="text-xs text-gray-400 mt-1" style={{ fontWeight: 400 }}>
              Republik Indonesia
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-r from-[#002C5F] via-[#F9B233] to-[#002C5F]" />
    </div>
  );
}
