"use client";

/**
 * =============================================================================
 * 📄 Component: PortalFooter
 * Path: src/components/portal/PortalFooter.tsx
 * =============================================================================
 *
 * ES:
 * Footer discreto del portal cliente con branding de FuturaTech.
 *
 * Objetivo:
 * - mostrar crédito profesional sin invadir UI del cliente
 * - integrar logo + texto de forma elegante
 * - mantener estética corporativa
 *
 * Reglas:
 * - tamaño contenido (no protagonista)
 * - sin colores agresivos
 * - alineación limpia
 *
 * EN:
 * Lightweight footer with FuturaTech branding.
 * =============================================================================
 */

import Image from "next/image";

export default function PortalFooter() {
  return (
    <footer className="mt-6 rounded-2xl border border-border/80 bg-white/80 px-4 py-4 shadow-sm backdrop-blur">
      <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
        <span className="text-xs text-text-secondary">
          © {new Date().getFullYear()} Sierra Tech · Plataforma desarrollada por
        </span>

        <div className="flex items-center gap-2">
          <Image
            src="/images/LogoCortoFuturaTech.png"
            alt="FuturaTech"
            width={22}
            height={22}
            className="h-[22px] w-auto object-contain"
          />

          <span className="text-xs font-semibold text-text-primary">
            FuturaTech
          </span>
        </div>
      </div>
    </footer>
  );
}