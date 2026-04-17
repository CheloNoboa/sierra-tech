/**
 * =============================================================================
 * 📄 Page: Not Found
 * Path: src/app/not-found.tsx
 * =============================================================================
 *
 * ES:
 *   Página pública 404 oficial de Sierra Tech.
 *
 *   Propósito:
 *   - reemplazar cualquier vista heredada o visual inconsistente
 *   - mantener una experiencia limpia y corporativa cuando la ruta no existe
 *   - ofrecer navegación clara de retorno
 * =============================================================================
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-lime-50 px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-700">
          Sierra Tech
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Página no encontrada
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-600">
          La ruta que intenta abrir no existe o ya no está disponible.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-lime-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-lime-700"
          >
            Ir al inicio
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ir a login
          </Link>
        </div>
      </div>
    </main>
  );
}