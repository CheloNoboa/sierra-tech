"use client";

/**
 * =============================================================================
 * ✅ src/components/PageSuspense.tsx
 * =============================================================================
 * Wrapper genérico para páginas que necesitan Suspense
 * (por uso de useSearchParams, useRouter, etc.)
 * -----------------------------------------------------------------------------
 * ES:
 * - Encapsula un fallback estándar mientras se resuelve el contenido.
 * - Alineado con el sistema visual de Sierra Tech.
 * - Evita loaders con estilos legacy.
 *
 * EN:
 * - Generic Suspense wrapper for pages that depend on navigation hooks.
 * - Aligned with the Sierra Tech design system.
 * - Prevents legacy loading visuals.
 * =============================================================================
 */

import { Suspense, type ReactNode } from "react";

interface PageSuspenseProps {
  children: ReactNode;
  fallbackText?: string;
}

export default function PageSuspense({
  children,
  fallbackText = "Cargando...",
}: PageSuspenseProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
          {fallbackText}
        </div>
      }
    >
      {children}
    </Suspense>
  );
}