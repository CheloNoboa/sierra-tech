/**
 * ===============================================================
 * ✅ src/app/admin/dashboard/page.tsx
 * ---------------------------------------------------------------
 * Dashboard principal del panel administrativo.
 *
 * ES:
 * - Valida acceso usando permisos de sesión.
 * - Requiere `system.dashboard.view` o rol `superadmin`.
 * - Muestra estado de carga, acceso denegado o contenido principal.
 * - Alineado con el sistema visual de Sierra Tech.
 *
 * EN:
 * - Main admin dashboard page.
 * - Access is validated through session permissions.
 * - Requires `system.dashboard.view` or `superadmin` fallback.
 * - Shows loading, denied state or main dashboard content.
 * ===============================================================
 */

"use client";

import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";
import { ShieldCheck, LayoutDashboard } from "lucide-react";

export default function AdminDashboardPage() {
  const { locale } = useTranslation();
  const { data: session, status } = useSession();

  /* ===========================================================
   * Loading state
   * =========================================================== */
  if (status === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {locale === "es" ? "Cargando sesión..." : "Loading session..."}
        </div>
      </main>
    );
  }

  /* ===========================================================
   * Unauthenticated state
   * =========================================================== */
  if (!session || !session.user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
          {locale === "es"
            ? "No autorizado. Inicia sesión."
            : "Unauthorized. Please log in."}
        </div>
      </main>
    );
  }

  const user = session.user as {
    role?: string;
    permissions?: string[];
    name?: string | null;
  };

  const role = user.role ?? "user";
  const permissions = user.permissions ?? [];

  /* ===========================================================
   * Permission validation
   * =========================================================== */
  const canViewDashboard =
    permissions.includes("system.dashboard.view") || role === "superadmin";

  if (!canViewDashboard) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
          {locale === "es"
            ? "Acceso denegado. No tienes permisos para acceder al panel administrativo."
            : "Access denied. You are not allowed to access the admin panel."}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Welcome header */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-soft">
              <ShieldCheck className="text-brand-primaryStrong" size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
                {locale === "es"
                  ? "Panel de Administración"
                  : "Admin Dashboard"}
              </h1>

              <p className="mt-1 text-sm text-text-secondary">
                {locale === "es"
                  ? `Bienvenido, ${user.name || "usuario"} (rol: ${role}).`
                  : `Welcome, ${user.name || "user"} (role: ${role}).`}
              </p>

              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary md:text-base">
                {locale === "es"
                  ? "Este es tu panel principal. Desde aquí puedes administrar el sistema según tus permisos asignados."
                  : "This is your main panel. From here you can manage the system according to your assigned permissions."}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-secondary">
            <LayoutDashboard size={16} className="text-brand-primaryStrong" />
            <span>
              {locale === "es" ? "Vista principal" : "Main overview"}
            </span>
          </div>
        </div>
      </section>

      {/* Placeholder cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-text-primary">
            {locale === "es" ? "Estado del sistema" : "System status"}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {locale === "es"
              ? "Espacio reservado para indicadores, accesos rápidos o métricas generales del panel."
              : "Reserved space for indicators, quick actions or general admin metrics."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-text-primary">
            {locale === "es" ? "Accesos rápidos" : "Quick actions"}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {locale === "es"
              ? "Aquí pueden incorporarse atajos a módulos frecuentes del sistema."
              : "Frequent system module shortcuts can be placed here."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-semibold text-text-primary">
            {locale === "es" ? "Actividad reciente" : "Recent activity"}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {locale === "es"
              ? "Bloque preparado para futura integración de eventos o historial operativo."
              : "Prepared block for future integration of events or operational history."}
          </p>
        </div>
      </section>
    </main>
  );
}