"use client";

/**
 * =============================================================================
 * 📌 Page: SeedSecurityPage
 * Path: src/app/admin/dashboard/system/seed-security/page.tsx
 * =============================================================================
 *
 * ES:
 * - Interfaz exclusiva de superadmin para ejecutar el seeder oficial de seguridad.
 * - Permite recrear:
 *   - permisos oficiales
 *   - roles oficiales
 *   - sincronización entre roles y permisos
 * - No altera usuarios existentes.
 *
 * Responsabilidades:
 * - Restringir visualmente el acceso a superadmin.
 * - Ejecutar el endpoint administrativo del seeder.
 * - Informar progreso y resultado mediante toast global.
 *
 * Reglas:
 * - Solo `superadmin` puede usar esta pantalla.
 * - La ejecución se realiza vía `POST /api/admin/seed/security`.
 * - La página no implementa la lógica del seeder; solo dispara la acción.
 *
 * EN:
 * - Superadmin-only interface to run the official security seeder.
 * - Recreates official permissions, roles and role-permission sync.
 * - Existing users are not modified.
 * =============================================================================
 */

import { useState } from "react";
import { AlertTriangle, PlayCircle, DatabaseBackup } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/GlobalToastProvider";
import GlobalButton from "@/components/ui/GlobalButton";

export default function SeedSecurityPage() {
  const { locale } = useTranslation();
  const { data: session } = useSession();
  const { success, error, info } = useToast();

  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------------------------
   * Access guard
   * ------------------------------------------------------------------------- */
  if (session?.user?.role !== "superadmin") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
          {locale === "es"
            ? "Acceso denegado. Solo el Superadmin puede acceder."
            : "Access denied. Only Superadmin is allowed."}
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------------------------
   * Run seeder
   * ------------------------------------------------------------------------- */
  const handleSeed = async () => {
    setLoading(true);

    info(locale === "es" ? "Ejecutando seeder..." : "Running seeder...");

    try {
      const res = await fetch("/api/admin/seed/security", { method: "POST" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        error(
          data?.error ||
            (locale === "es" ? "Error ejecutando seeder." : "Seeder error.")
        );
        return;
      }

      success(
        locale === "es"
          ? "Seeder ejecutado correctamente."
          : "Seeder executed successfully."
      );
    } catch {
      error(locale === "es" ? "Error interno." : "Internal error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-soft">
              <DatabaseBackup className="text-brand-primaryStrong" size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
                {locale === "es"
                  ? "Ejecutar Seeder de Seguridad"
                  : "Run Security Seeder"}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary md:text-base">
                {locale === "es"
                  ? "Esta acción recrea permisos oficiales, roles oficiales y la sincronización entre ambos, sin modificar usuarios existentes."
                  : "This action recreates official permissions, official roles and role-permission synchronization without modifying existing users."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Warning + action */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="rounded-2xl border border-status-warning/30 bg-surface-soft p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
              <AlertTriangle className="text-status-warning" size={20} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                {locale === "es"
                  ? "Advertencia importante"
                  : "Important warning"}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {locale === "es"
                  ? "Se eliminarán los roles y permisos actuales para reemplazarlos por los valores oficiales definidos por el sistema."
                  : "Current roles and permissions will be removed and replaced with the official values defined by the system."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-start">
          <GlobalButton
            variant="danger"
            size="md"
            loading={loading}
            leftIcon={<PlayCircle size={18} />}
            className="border border-status-error bg-surface text-status-error hover:bg-surface-soft"
            onClick={() => void handleSeed()}
          >
            {loading
              ? locale === "es"
                ? "Ejecutando..."
                : "Running..."
              : locale === "es"
                ? "Ejecutar Seeder"
                : "Run Seeder"}
          </GlobalButton>
        </div>
      </section>
    </main>
  );
}