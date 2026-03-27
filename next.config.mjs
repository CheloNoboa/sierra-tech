/**
 * ⚙️ Configuración principal de Next.js (Next 15+)
 * ------------------------------------------------------------------
 * - Corrige ubicación de `outputFileTracingRoot`
 * - Traducciones manejadas por cliente (useTranslation)
 * - Sin imágenes externas (solo /public/images)
 * - Elimina warning de múltiples lockfiles
 * - FIX PDFKIT: evita bundling en vendor-chunks
 * ------------------------------------------------------------------
 */

import path from "path";
import { fileURLToPath } from "url";

/**
 * __dirname no existe en ESM,
 * lo reconstruimos manualmente.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 📸 Configuración de imágenes locales
  images: {
    domains: [],
  },

  // 🧭 Root real del proyecto (corrige warning de workspace)
  outputFileTracingRoot: path.join(__dirname),

  /**
   * ✅ FIX DEFINITIVO (PDFKit en Route Handlers)
   *
   * Evita que Next bundlee pdfkit dentro de vendor-chunks,
   * lo que provoca error:
   *
   *   ENOENT Helvetica.afm
   *
   * Forzamos carga directa desde node_modules.
   */
  serverExternalPackages: ["pdfkit", "fontkit"],
};

export default nextConfig;