import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Plus, Pencil, Trash2, ShieldCheck, Shield, User as UserIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UserRole, User } from '@/stores/auth.store';
import { usersApi } from '@/core/api/users.api';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePageSkeleton } from '@/components/organisms/loading/PageSkeleton';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: typeof ShieldCheck }> = {
  superadmin: { label: 'Super Admin', color: '#DC2626', icon: ShieldCheck },
  admin: { label: 'Admin', color: '#002C5F', icon: Shield },
  user: { label: 'User', color: '#059669', icon: UserIcon },
};

export function UserManagementView() {
  useDocumentTitle('Manajemen User');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('user');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.list();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('user');
    setFormStatus('active');
    setEditingUser(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.fullName);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setFormStatus(user.isActive ? 'active' : 'inactive');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          fullName: formName,
          username: formUsername,
          email: formEmail,
          role: formRole,
          isActive: formStatus === 'active',
          ...(formPassword ? { password: formPassword } : {}),
        });
      } else {
        await usersApi.create({
          fullName: formName,
          username: formUsername,
          email: formEmail,
          password: formPassword,
          role: formRole,
          isActive: formStatus === 'active',
        });
      }
      setDialogOpen(false);
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengguna');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await usersApi.delete(id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna');
    }
  };

  const roleStats = {
    superadmin: users.filter((u) => u.role === 'superadmin').length,
    admin: users.filter((u) => u.role === 'admin').length,
    user: users.filter((u) => u.role === 'user').length,
  };

  if (loading) {
    return <TablePageSkeleton columnCount={8} rowCount={8} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C5F]">Manajemen Pengguna</h1>
          <p className="text-muted-foreground mt-1">
            Kelola akun pengguna dan hak akses sistem INVESTRA
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-[#002C5F] hover:bg-[#003D7A]">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Perbarui informasi pengguna.' : 'Isi data untuk menambah pengguna baru.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="Username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@investra.go.id" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{editingUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</Label>
                <Input id="password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editingUser ? '••••••••' : 'Masukkan password'} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as 'active' | 'inactive')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Batal</Button>
              <Button onClick={handleSave} className="bg-[#002C5F] hover:bg-[#003D7A]" disabled={!formName || !formUsername || !formEmail || (!editingUser && !formPassword) || saving}>
                {saving ? (
                  <span className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-sm" /> Menyimpan...</span>
                ) : (
                  editingUser ? 'Simpan Perubahan' : 'Tambah'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={role} className="border-l-4" style={{ borderLeftColor: cfg.color }}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{cfg.label}</p>
                  <p className="text-3xl font-bold text-[#002C5F]">{roleStats[role]}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <Icon className="h-6 w-6" style={{ color: cfg.color }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#002C5F]" />
            Daftar Pengguna
          </CardTitle>
          <CardDescription>Total {users.length} pengguna terdaftar dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Diperbarui</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, idx) => {
                  const roleCfg = ROLE_CONFIG[user.role];
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell className="text-gray-600">{user.username}</TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-white text-xs"
                          style={{ backgroundColor: roleCfg.color }}
                        >
                          {roleCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}
                          className={user.isActive ? 'bg-green-500 text-white' : ''}>
                          {user.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">{new Date(user.updatedAt).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                            <Pencil className="h-4 w-4 text-[#002C5F]" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus pengguna <strong>{user.fullName}</strong>?
                                  Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#002C5F]">Matriks Hak Akses</CardTitle>
          <CardDescription>Pemetaan akses fitur berdasarkan role pengguna</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fitur</TableHead>
                  <TableHead className="text-center">
                    <span className="text-[#059669]">User</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-[#002C5F]">Admin</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-[#DC2626]">Super Admin</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { fitur: 'Halaman Landing / Publik', user: true, admin: true, superadmin: true },
                  { fitur: 'Dashboard Utama', user: false, admin: true, superadmin: true },
                  { fitur: 'Dataset Investasi', user: false, admin: true, superadmin: true },
                  { fitur: 'Analisis PCA', user: false, admin: true, superadmin: true },
                  { fitur: 'K-Means Clustering', user: false, admin: true, superadmin: true },
                  { fitur: 'Visualisasi Data', user: false, admin: true, superadmin: true },
                  { fitur: 'Rekomendasi Kebijakan', user: false, admin: true, superadmin: true },
                  { fitur: 'Tentang Sistem', user: false, admin: true, superadmin: true },
                  { fitur: 'Manajemen Pengguna', user: false, admin: false, superadmin: true },
                ].map((row) => (
                  <TableRow key={row.fitur}>
                    <TableCell className="font-medium">{row.fitur}</TableCell>
                    <TableCell className="text-center text-lg">{row.user ? '✅' : '❌'}</TableCell>
                    <TableCell className="text-center text-lg">{row.admin ? '✅' : '❌'}</TableCell>
                    <TableCell className="text-center text-lg">{row.superadmin ? '✅' : '❌'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
