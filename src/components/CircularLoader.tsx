"use client";

/**
 * ============================================================================
 * 📌 Component: CircularLoader — Sierra Tech Standard Loader
 * Path: src/components/ui/CircularLoader.tsx
 * ============================================================================
 *
 * ES:
 *   Loader circular estándar del sistema Sierra Tech.
 *
 *   ✔ Usa colores del sistema (brand + text tokens)
 *   ✔ Compatible con UI clara
 *   ✔ Sin colores hardcodeados legacy
 *
 * EN:
 *   Standard circular loader for Sierra Tech UI.
 * ============================================================================
 */

export default function CircularLoader() {
  return (
    <div className="flex items-center justify-center w-full py-10">
      <div className="relative h-12 w-12">
        {/* Glow suave corporativo */}
        <div className="absolute inset-0 rounded-full border-4 border-brand-primary/30 animate-pulse" />

        {/* Spinner */}
        <div className="h-full w-full rounded-full border-4 border-t-brand-primaryStrong border-r-brand-primary border-b-transparent border-l-transparent animate-spin" />
      </div>
    </div>
  );
}