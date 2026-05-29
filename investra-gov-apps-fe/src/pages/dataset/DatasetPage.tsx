import { useCallback, useEffect, useState, useRef } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  BarChart3,
  Download,
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle2,
  History,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { datasetApi, DatasetInfo, DatasetData, DatasetVersion } from '@/core/api/dataset.api';
import { useAuthStore, hasRole } from '@/stores/auth.store';
import { ApiError } from '@/core/api/http-client';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePageSkeleton } from '@/components/organisms/loading/PageSkeleton';

function snakeToCamelKey(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_match, group: string) => group.toUpperCase());
}

/** Human-readable column labels for the dataset preview table. */
const COLUMN_LABELS: Record<string, string> = {
  provinsi: 'Provinsi',
  year: 'Tahun',
  pmdn_rp: 'PMDN (Rp)',
  pmdnRp: 'PMDN (Rp)',
  fdi_rp: 'FDI (Rp)',
  fdiRp: 'FDI (Rp)',
  pdrb_per_kapita: 'PDRB per Kapita',
  pdrbPerKapita: 'PDRB per Kapita',
  ipm: 'IPM',
  kemiskinan: 'Kemiskinan (%)',
  akses_listrik: 'Akses Listrik (%)',
  aksesListrik: 'Akses Listrik (%)',
  tpt: 'TPT (%)',
};

/** Numeric columns that should NOT be locale-formatted (year is an identifier). */
const RAW_NUMBER_COLUMNS = new Set(['year', 'tahun']);

/** Currency columns get compact T/M formatting in the preview. */
const CURRENCY_COLUMNS = new Set(['pmdn_rp', 'pmdnRp', 'fdi_rp', 'fdiRp']);

/** Percentage columns get a trailing %. */
const PERCENT_COLUMNS = new Set(['kemiskinan', 'akses_listrik', 'aksesListrik', 'tpt']);

function formatColumnLabel(column: string): string {
  if (COLUMN_LABELS[column]) return COLUMN_LABELS[column];
  return column.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })} T`;
  }
  if (Math.abs(value) >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })} M`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })} jt`;
  }
  return `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

function formatCellValue(column: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value !== 'number') return String(value);
  if (RAW_NUMBER_COLUMNS.has(column)) return String(value);
  if (CURRENCY_COLUMNS.has(column)) return formatCompactCurrency(value);
  if (PERCENT_COLUMNS.has(column)) {
    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
  }
  // Default: locale-format with up to 2 decimals (avoids "...000,002" float drift).
  return value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

/** Numeric columns are right-aligned for readability; the province name column stays left. */
function isNumericColumn(column: string): boolean {
  return column !== 'provinsi' && column !== 'province';
}

export function DatasetPage() {
  useDocumentTitle('Dataset');
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [datasetData, setDatasetData] = useState<DatasetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [noActiveDataset, setNoActiveDataset] = useState(false);

  // Version history state
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  // Upload state
  const user = useAuthStore((s) => s.user);
  const isSuperadmin = hasRole(user, 'superadmin');
  const isAdmin = hasRole(user, 'admin');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionsLoadedRef = useRef(false);

  const loadVersions = useCallback(async () => {
    try {
      setVersionsLoading(true);
      const res = await datasetApi.listVersions();
      setVersions(res.versions);
      versionsLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  const loadDataset = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoActiveDataset(false);

      const info = await datasetApi.getDefaultDatasetInfo();
      setDatasetInfo(info);

      const data = await datasetApi.getDefaultDatasetSample(10);
      setDatasetData(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ACTIVE_DATASET') {
        setNoActiveDataset(true);
        setDatasetInfo({
          id: '',
          code: 'DTS000',
          version: 0,
          name: 'Belum ada dataset aktif',
          description: 'Upload file CSV untuk membuat dataset pertama.',
          year: new Date().getFullYear(),
          isActive: false,
          createdAt: new Date().toISOString(),
          originalFilename: null,
          checksum: null,
          rowCount: 0,
          uploadedBy: null,
          columnCount: 0,
          columns: [],
        });
        setDatasetData({
          data: [],
          columns: [],
          totalRows: 0,
          page: 1,
          pageSize: 0,
          totalPages: 0,
        });
        setNotification('Belum ada dataset aktif.');
        setTimeout(() => setNotification(null), 4000);
        if (isAdmin && !versionsLoadedRef.current) {
          loadVersions();
        }
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load dataset';
      setError(errorMessage);
      setNotification(`Error: ${errorMessage}`);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, loadVersions]);

  useEffect(() => {
    loadDataset();
  }, [loadDataset]);

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && !versionsLoadedRef.current) {
      loadVersions();
    }
  };

  const handleActivate = async (versionId: string) => {
    if (activating) return;
    setActivating(versionId);
    try {
      await datasetApi.activateVersion(versionId);
      setNotification('Dataset version berhasil diaktifkan. Memuat ulang data...');
      setTimeout(() => setNotification(null), 3000);
      // Refresh everything
      await loadDataset();
      await loadVersions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengaktifkan versi';
      setNotification(`Error: ${msg}`);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setActivating(null);
    }
  };

  const handleAnalyze = () => {
    if (noActiveDataset) {
      setNotification('Belum ada dataset aktif. Upload CSV terlebih dahulu.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setNotification('Analysis started. Dataset analysis has been initiated.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDownload = () => {
    if (noActiveDataset) {
      setNotification('Belum ada dataset aktif untuk diunduh.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    const link = document.createElement('a');
    link.href = '/dataset/investasi_per_provinsi_2023.csv';
    link.download = 'investasi_per_provinsi_2023.csv';
    link.click();

    setNotification('Download started. Dataset download has been initiated.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const result = await datasetApi.uploadCSV(uploadFile);
      setUploadSuccess(result.message);
      // Refresh dataset view after successful upload
      await loadDataset();
      if (showHistory) await loadVersions();
      // Close dialog after brief delay
      setTimeout(() => {
        setUploadOpen(false);
        setUploadFile(null);
        setUploadSuccess(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <TablePageSkeleton columnCount={8} rowCount={8} />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!datasetInfo || !datasetData) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>Dataset is not available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert
          className={
            notification.startsWith('Error')
              ? 'rounded-xl border border-[#ff7759] bg-[#fff1ed] text-[#17171c]'
              : 'rounded-xl border border-[#003c33] bg-[#edfce9] text-[#003c33]'
          }
        >
          <AlertDescription>{notification}</AlertDescription>
        </Alert>
      )}

      {noActiveDataset && (
        <Alert className="rounded-xl border border-[#ff7759] bg-[#fff1ed]">
          <AlertCircle className="size-4 text-[#ff7759]" />
          <AlertTitle className="text-[#17171c]">Belum Ada Dataset Aktif</AlertTitle>
          <AlertDescription className="text-[#616161]">
            {isSuperadmin
              ? 'Upload file CSV untuk membuat dataset pertama.'
              : 'Minta superadmin untuk upload dataset pertama.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p
            className="mb-2 text-xs uppercase tracking-[0.18em] text-[#ff7759]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
          >
            Data Source
          </p>
          <h1
            className="text-3xl font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Dataset Investasi
          </h1>
          <p className="text-[#616161]">Dataset investasi per provinsi di Indonesia</p>
        </div>
        <div className="flex gap-2">
          {/* Version History toggle (admin+) */}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={toggleHistory}
              className="rounded-full border-[#d9d9dd] text-[#17171c] hover:border-[#93939f] hover:bg-[#f7f6f3]"
            >
              <History className="mr-2 size-4" />
              Riwayat
              {showHistory ? (
                <ChevronUp className="ml-1 size-4" />
              ) : (
                <ChevronDown className="ml-1 size-4" />
              )}
            </Button>
          )}

          {isSuperadmin && (
            <Dialog
              open={uploadOpen}
              onOpenChange={(open) => {
                setUploadOpen(open);
                if (!open) {
                  setUploadFile(null);
                  setUploadError(null);
                  setUploadSuccess(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-full border-[#d9d9dd] text-[#17171c] hover:border-[#93939f] hover:bg-[#f7f6f3]"
                >
                  <Upload className="mr-2 size-4" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-[#d9d9dd] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle
                    className="font-normal tracking-tight text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    Upload Dataset CSV
                  </DialogTitle>
                  <DialogDescription>
                    Upload file CSV yang sudah melalui proses ETL. Data akan disimpan sebagai{' '}
                    <strong>versi baru</strong> — data lama tetap tersimpan.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Required columns info */}
                  <Alert className="rounded-xl border border-[#003c33] bg-[#edfce9]">
                    <AlertCircle className="size-4 text-[#003c33]" />
                    <AlertTitle className="text-sm text-[#003c33]">Kolom Wajib</AlertTitle>
                    <AlertDescription className="text-xs text-[#003c33]">
                      <code>
                        provinsi, year, pmdn_rp, fdi_rp, pdrb_per_kapita, ipm, kemiskinan,
                        akses_listrik, tpt
                      </code>
                      <span className="mt-1 ml-1 block text-[#616161]">
                        Mode panel mewajibkan kolom <code>year</code> untuk setiap baris (data
                        multi-tahun).
                      </span>
                    </AlertDescription>
                  </Alert>

                  {/* File input */}
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">File CSV</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="csv-file"
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="cursor-pointer"
                      />
                    </div>
                    {uploadFile && (
                      <p className="text-sm text-[#616161] flex items-center gap-1">
                        <FileUp className="size-3" />
                        {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* Error */}
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Upload Gagal</AlertTitle>
                      <AlertDescription className="whitespace-pre-line text-xs max-h-40 overflow-y-auto">
                        {uploadError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success */}
                  {uploadSuccess && (
                    <Alert className="rounded-xl border border-[#003c33] bg-[#edfce9]">
                      <CheckCircle2 className="size-4 text-[#003c33]" />
                      <AlertTitle className="text-[#003c33]">Berhasil</AlertTitle>
                      <AlertDescription className="text-[#003c33]">
                        {uploadSuccess}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadOpen(false)}
                    disabled={uploading}
                    className="rounded-full border-[#d9d9dd] text-[#17171c] hover:border-[#93939f] hover:bg-[#f7f6f3]"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadFile || uploading}
                    className="rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]"
                  >
                    {uploading ? (
                      <>
                        <Skeleton className="mr-2 size-4 rounded-sm" />
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 size-4" />
                        Upload Versi Baru
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button
            onClick={handleDownload}
            variant="outline"
            disabled={noActiveDataset}
            className="rounded-full border-[#d9d9dd] text-[#17171c] hover:border-[#93939f] hover:bg-[#f7f6f3]"
          >
            <Download className="mr-2 size-4" />
            Download
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={noActiveDataset}
            className="rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]"
          >
            <BarChart3 className="mr-2 size-4" />
            Analyze
          </Button>
        </div>
      </div>

      {/* Version History Panel (collapsible) */}
      {showHistory && isAdmin && (
        <Card className="rounded-2xl border border-[#d9d9dd] bg-white shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle
                className="flex items-center gap-2 font-normal tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                <History className="size-5 text-[#003c33]" />
                Riwayat Versi Dataset
              </CardTitle>
              <Badge className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs text-[#212121]">
                {versions.length} versi
              </Badge>
            </div>
            <CardDescription className="text-[#616161]">
              Setiap upload CSV membuat versi baru. Data lama tetap tersimpan untuk audit dan
              rollback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {versionsLoading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : versions.length === 0 ? (
              <p className="py-2 text-sm text-[#93939f]">Belum ada riwayat versi.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Versi</TableHead>
                      <TableHead>Tahun</TableHead>
                      <TableHead>Baris</TableHead>
                      <TableHead>Diupload Oleh</TableHead>
                      <TableHead>Tanggal Upload</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      {isSuperadmin && <TableHead className="text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.id} className={v.isActive ? 'bg-[#edfce9]' : ''}>
                        <TableCell className="font-mono font-medium text-[#17171c]">
                          v{v.version}
                        </TableCell>
                        <TableCell>{v.year}</TableCell>
                        <TableCell>{v.rowCount}</TableCell>
                        <TableCell>
                          {v.uploadedBy ? (
                            v.uploadedBy.fullName
                          ) : (
                            <span className="text-[#93939f]">System</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(v.createdAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-[#616161] truncate max-w-30">
                          {v.originalFilename || '-'}
                        </TableCell>
                        <TableCell>
                          {v.isActive ? (
                            <Badge className="rounded-full bg-[#003c33] px-2.5 py-0.5 text-xs text-white">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs text-[#212121]">
                              Arsip
                            </Badge>
                          )}
                        </TableCell>
                        {isSuperadmin && (
                          <TableCell className="text-right">
                            {!v.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActivate(v.id)}
                                disabled={activating === v.id}
                                className="rounded-full border-[#d9d9dd] text-xs text-[#17171c] hover:border-[#93939f] hover:bg-[#f7f6f3]"
                              >
                                {activating === v.id ? (
                                  <Skeleton className="size-3 rounded-sm" />
                                ) : (
                                  <>
                                    <RotateCcw className="size-3 mr-1" />
                                    Aktifkan
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dataset Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-[#d9d9dd] bg-white shadow-none transition-colors hover:border-[#93939f]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#616161]">Total Provinsi</CardTitle>
            <Database className="size-4 text-[#003c33]" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-normal text-[#17171c]"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              {datasetInfo.rowCount}
            </div>
            <p className="text-xs text-[#93939f]">Provinsi di Indonesia</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#d9d9dd] bg-white shadow-none transition-colors hover:border-[#93939f]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#616161]">Indikator</CardTitle>
            <BarChart3 className="size-4 text-[#003c33]" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-normal text-[#17171c]"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              {datasetInfo.columnCount}
            </div>
            <p className="text-xs text-[#93939f]">Kolom data</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#d9d9dd] bg-white shadow-none transition-colors hover:border-[#93939f]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#616161]">Versi & Tahun</CardTitle>
            <Badge className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs text-[#212121]">
              {datasetInfo.version > 0 ? `v${datasetInfo.version}` : 'Belum Ada'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-normal text-[#17171c]"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              {datasetInfo.version > 0 ? datasetInfo.year : '-'}
            </div>
            <p className="text-xs text-[#93939f]">
              {datasetInfo.version > 0
                ? `Dataset versi ${datasetInfo.version}`
                : 'Menunggu dataset pertama'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#d9d9dd] bg-white shadow-none transition-colors hover:border-[#93939f]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#616161]">Status</CardTitle>
            {datasetInfo.isActive ? (
              <Badge className="rounded-full bg-[#003c33] px-2.5 py-0.5 text-xs text-white">
                Aktif
              </Badge>
            ) : (
              <Badge className="rounded-full bg-[#ff7759] px-2.5 py-0.5 text-xs text-white">
                Belum Aktif
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-normal text-[#17171c]"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              {datasetInfo.isActive ? 'Ready' : 'Pending'}
            </div>
            <p className="text-xs text-[#93939f]">
              {datasetInfo.uploadedBy
                ? `Diupload oleh ${datasetInfo.uploadedBy.fullName}`
                : 'Belum ada uploader'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dataset Description */}
      <Card className="rounded-2xl border border-[#d9d9dd] bg-white shadow-none">
        <CardHeader>
          <CardTitle
            className="font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Deskripsi Dataset
          </CardTitle>
          <CardDescription className="text-[#616161]">
            {datasetInfo.description || 'Belum ada deskripsi dataset.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-medium text-[#17171c]">Kolom Data:</h4>
            <div className="flex flex-wrap gap-2">
              {datasetInfo.columns.map((column) => (
                <Badge
                  key={column}
                  className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs text-[#212121]"
                >
                  {column}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Table */}
      <Card className="rounded-2xl border border-[#d9d9dd] bg-white shadow-none">
        <CardHeader>
          <CardTitle
            className="font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Sample Data
          </CardTitle>
          <CardDescription className="text-[#616161]">
            {datasetInfo.version > 0
              ? `Pratinjau 10 baris pertama dari dataset (v${datasetInfo.version})`
              : 'Belum ada data untuk ditampilkan'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#f2f2f2] bg-[#f7f6f3]">
                  {datasetData.columns.length > 0 ? (
                    datasetData.columns.map((column) => (
                      <TableHead
                        key={column}
                        className={`py-3 text-[11px] font-medium uppercase tracking-wider text-[#93939f] ${
                          isNumericColumn(column) ? 'text-right' : 'text-left'
                        }`}
                      >
                        {formatColumnLabel(column)}
                      </TableHead>
                    ))
                  ) : (
                    <TableHead className="text-[#93939f]">Informasi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasetData.data.length > 0 ? (
                  datasetData.data.map((row, index) => (
                    <TableRow
                      key={index}
                      className="border-b border-[#f2f2f2] transition-colors hover:bg-[#f7f6f3]"
                    >
                      {datasetData.columns.map((column) => {
                        const directValue = row[column];
                        const camelValue = row[snakeToCamelKey(column)];
                        const cellValue = directValue ?? camelValue;
                        return (
                          <TableCell
                            key={column}
                            className={`py-3 text-sm text-[#212121] ${
                              isNumericColumn(column)
                                ? 'text-right font-mono tabular-nums'
                                : 'font-medium'
                            }`}
                          >
                            {formatCellValue(column, cellValue)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(datasetData.columns.length, 1)}
                      className="py-8 text-center text-[#93939f]"
                    >
                      Belum ada data sampel.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
