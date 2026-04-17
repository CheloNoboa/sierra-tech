"use client";

/**
 * =============================================================================
 * 📄 Page: Global Error
 * Path: src/app/global-error.tsx
 * =============================================================================
 *
 * ES:
 *   Pantalla global de error para Sierra Tech.
 *
 *   Propósito:
 *   - evitar pantallas heredadas o inconsistentes en errores no controlados
 *   - mantener una salida visual estable y corporativa
 *   - permitir reintento sin exponer detalles técnicos al usuario final
 * =============================================================================
 */

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="m-0 min-h-screen bg-gradient-to-br from-white via-slate-50 to-lime-50 text-slate-900">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-700">
              Sierra Tech
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Ocurrió un error inesperado
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-600">
              No se pudo completar la operación en este momento. Puede intentar
              nuevamente.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center rounded-2xl bg-lime-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-lime-700"
              >
                Reintentar
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                Ir al inicio
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}