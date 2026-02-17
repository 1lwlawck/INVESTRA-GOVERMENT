import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Terjadi kesalahan saat memuat halaman.';
}

export function RouteErrorView() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="mb-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <h1 className="text-base font-semibold">Terjadi Kesalahan</h1>
        </div>

        <p className="mb-4 text-sm text-red-700">{message}</p>
        <p className="mb-6 text-xs text-red-600">
          Coba muat ulang halaman. Jika masih terjadi, lakukan hard refresh (Ctrl+F5).
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-md bg-[#002C5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#003D7A]"
        >
          <RefreshCw className="h-4 w-4" />
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
