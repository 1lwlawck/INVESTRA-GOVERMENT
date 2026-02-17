import { useEffect, useState, useRef } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Database, BarChart3, Download, Upload, FileUp,
  AlertCircle, CheckCircle2, History, RotateCcw, ChevronDown, ChevronUp,
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

export function DatasetView() {
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
  const [activating, setActivating] = useState<number | null>(null);

  // Upload state
  const user = useAuthStore((s) => s.user);
  const isSuperadmin = hasRole(user, 'superadmin');
  const isAdmin = hasRole(user, 'admin');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadYear, setUploadYear] = useState<number>(2023);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDataset();
  }, []);

  const loadDataset = async () => {
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
          id: 0,
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
        if (isAdmin && versions.length === 0) {
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
  };

  const loadVersions = async () => {
    try {
      setVersionsLoading(true);
      const res = await datasetApi.listVersions();
      setVersions(res.versions);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setVersionsLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && versions.length === 0) {
      loadVersions();
    }
  };

  const handleActivate = async (versionId: number) => {
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
      const result = await datasetApi.uploadCSV(uploadFile, uploadYear);
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
        <Alert className={notification.startsWith('Error') ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
          <AlertDescription>{notification}</AlertDescription>
        </Alert>
      )}

      {noActiveDataset && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Belum Ada Dataset Aktif</AlertTitle>
          <AlertDescription className="text-amber-700">
            {isSuperadmin
              ? 'Upload file CSV untuk membuat dataset pertama.'
              : 'Minta superadmin untuk upload dataset pertama.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dataset Investasi</h1>
          <p className="text-muted-foreground">
            Dataset investasi per provinsi di Indonesia
          </p>
        </div>
        <div className="flex gap-2">
          {/* Version History toggle (admin+) */}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={toggleHistory}
              className="border-[#002C5F] text-[#002C5F]"
            >
              <History className="mr-2 h-4 w-4" />
              Riwayat
              {showHistory ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
            </Button>
          )}

          {isSuperadmin && (
            <Dialog open={uploadOpen} onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) {
                setUploadFile(null);
                setUploadError(null);
                setUploadSuccess(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-[#002C5F]">Upload Dataset CSV</DialogTitle>
                  <DialogDescription>
                    Upload file CSV yang sudah melalui proses ETL.
                    Data akan disimpan sebagai <strong>versi baru</strong> — data lama tetap tersimpan.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Required columns info */}
                  <Alert className="bg-blue-50 border-[#002C5F]">
                    <AlertCircle className="h-4 w-4 text-[#002C5F]" />
                    <AlertTitle className="text-[#002C5F] text-sm">Kolom Wajib</AlertTitle>
                    <AlertDescription className="text-xs">
                      <code>provinsi, pmdn_rp, fdi_rp, pdrb_per_kapita, ipm, kemiskinan, akses_listrik, tpt</code>
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
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <FileUp className="h-3 w-3" />
                        {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* Year input */}
                  <div className="space-y-2">
                    <Label htmlFor="year">Tahun Data</Label>
                    <Input
                      id="year"
                      type="number"
                      min={2000}
                      max={2100}
                      value={uploadYear}
                      onChange={(e) => setUploadYear(Number(e.target.value))}
                      className="w-32"
                    />
                  </div>

                  {/* Error */}
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Upload Gagal</AlertTitle>
                      <AlertDescription className="whitespace-pre-line text-xs max-h-40 overflow-y-auto">
                        {uploadError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success */}
                  {uploadSuccess && (
                    <Alert className="bg-green-50 border-green-500">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-700">Berhasil</AlertTitle>
                      <AlertDescription className="text-green-600">{uploadSuccess}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadFile || uploading}
                    className="bg-[#002C5F] hover:bg-[#003D7A]"
                  >
                    {uploading ? (
                      <>
                        <Skeleton className="mr-2 h-4 w-4 rounded-sm" />
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Versi Baru
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button onClick={handleDownload} variant="outline" disabled={noActiveDataset}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={handleAnalyze} disabled={noActiveDataset}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analyze
          </Button>
        </div>
      </div>

      {/* Version History Panel (collapsible) */}
      {showHistory && isAdmin && (
        <Card className="border-[#002C5F]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#002C5F] flex items-center gap-2">
                <History className="h-5 w-5" />
                Riwayat Versi Dataset
              </CardTitle>
              <Badge variant="secondary">{versions.length} versi</Badge>
            </div>
            <CardDescription>
              Setiap upload CSV membuat versi baru. Data lama tetap tersimpan untuk audit dan rollback.
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
              <p className="text-sm text-muted-foreground py-2">Belum ada riwayat versi.</p>
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
                      <TableRow key={v.id} className={v.isActive ? 'bg-green-50' : ''}>
                        <TableCell className="font-mono font-bold">v{v.version}</TableCell>
                        <TableCell>{v.year}</TableCell>
                        <TableCell>{v.rowCount}</TableCell>
                        <TableCell>
                          {v.uploadedBy
                            ? v.uploadedBy.fullName
                            : <span className="text-muted-foreground">System</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(v.createdAt).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-30">
                          {v.originalFilename || '-'}
                        </TableCell>
                        <TableCell>
                          {v.isActive ? (
                            <Badge className="bg-green-500">Aktif</Badge>
                          ) : (
                            <Badge variant="secondary">Arsip</Badge>
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
                                className="text-xs"
                              >
                                {activating === v.id ? (
                                  <Skeleton className="h-3 w-3 rounded-sm" />
                                ) : (
                                  <>
                                    <RotateCcw className="h-3 w-3 mr-1" />
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Provinsi</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datasetInfo.rowCount}</div>
            <p className="text-xs text-muted-foreground">
              Provinsi di Indonesia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indikator</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datasetInfo.columnCount}</div>
            <p className="text-xs text-muted-foreground">
              Kolom data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Versi & Tahun</CardTitle>
            <Badge variant="secondary">
              {datasetInfo.version > 0 ? `v${datasetInfo.version}` : 'Belum Ada'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {datasetInfo.version > 0 ? datasetInfo.year : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {datasetInfo.version > 0
                ? `Dataset versi ${datasetInfo.version}`
                : 'Menunggu dataset pertama'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {datasetInfo.isActive ? (
              <Badge className="bg-green-500">Aktif</Badge>
            ) : (
              <Badge className="bg-amber-500">Belum Aktif</Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {datasetInfo.isActive ? 'Ready' : 'Pending'}
            </div>
            <p className="text-xs text-muted-foreground">
              {datasetInfo.uploadedBy
                ? `Diupload oleh ${datasetInfo.uploadedBy.fullName}`
                : 'Belum ada uploader'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dataset Description */}
      <Card>
        <CardHeader>
          <CardTitle>Deskripsi Dataset</CardTitle>
          <CardDescription>
            {datasetInfo.description || 'Belum ada deskripsi dataset.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-semibold">Kolom Data:</h4>
            <div className="flex flex-wrap gap-2">
              {datasetInfo.columns.map((column) => (
                <Badge key={column} variant="outline">
                  {column}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Data</CardTitle>
          <CardDescription>
            {datasetInfo.version > 0
              ? `Pratinjau 10 baris pertama dari dataset (v${datasetInfo.version})`
              : 'Belum ada data untuk ditampilkan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {datasetData.columns.length > 0 ? (
                    datasetData.columns.map((column) => (
                      <TableHead key={column}>
                        {column.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </TableHead>
                    ))
                  ) : (
                    <TableHead>Informasi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasetData.data.length > 0 ? (
                  datasetData.data.map((row, index) => (
                    <TableRow key={index}>
                      {datasetData.columns.map((column) => (
                        <TableCell key={column}>
                          {(() => {
                            const directValue = row[column];
                            const camelValue = row[snakeToCamelKey(column)];
                            const cellValue = directValue ?? camelValue;

                            if (typeof cellValue === 'number') {
                              return cellValue.toLocaleString('id-ID');
                            }
                            if (cellValue === null || cellValue === undefined || cellValue === '') {
                              return '-';
                            }
                            return String(cellValue);
                          })()}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(datasetData.columns.length, 1)}
                      className="text-muted-foreground"
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
