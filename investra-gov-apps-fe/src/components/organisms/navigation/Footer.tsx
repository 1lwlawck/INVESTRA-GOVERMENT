import { GarudaEmblem } from "@/components/atoms/media/GarudaEmblem";

export function Footer() {
  return (
    <footer className="mt-16 pt-8 pb-6 border-t-2 border-[#F9B233]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <GarudaEmblem size={48} />
          <div>
            <p className="text-[#002C5F]" style={{ fontWeight: 700 }}>
              INVESTRA
            </p>
            <p className="text-sm text-gray-600 mt-1" style={{ fontWeight: 500 }}>
              Investment Analytics Indonesia
            </p>
          </div>
        </div>

        <div className="text-center md:text-right">
          <p className="text-sm text-gray-600" style={{ fontWeight: 500 }}>
            Dashboard Analisis Ketimpangan Investasi Regional
          </p>
          <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: 400 }}>
            © 2025 Pemerintah Indonesia. Hak Cipta Dilindungi.
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500" style={{ fontWeight: 400 }}>
          Sistem ini dikembangkan untuk mendukung pengambilan keputusan berbasis data dalam mengatasi ketimpangan investasi antar wilayah di Indonesia
        </p>
      </div>
    </footer>
  );
}