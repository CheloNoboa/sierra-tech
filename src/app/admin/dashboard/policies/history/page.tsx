/**
 * ============================================================================
 * ✅ Page: Admin Policies History
 * Path: src/app/admin/dashboard/policies/history/page.tsx
 * ============================================================================
 *
 * ES:
 *   Pantalla administrativa para consultar el historial consolidado de cambios
 *   de políticas institucionales.
 *
 *   Fuentes incluidas:
 *   - PrivacyPolicy
 *   - TermsPolicy
 *   - CookiePolicy
 *
 *   Responsabilidades:
 *   - Validar acceso administrativo desde sesión activa.
 *   - Consultar el endpoint unificado de historial.
 *   - Mostrar estados de carga, acceso restringido, vacío y resultados.
 *   - Presentar una vista consistente con el sistema visual de Sierra Tech.
 *
 *   Reglas:
 *   - Acceso permitido solo para roles: admin, superadmin.
 *   - La fuente de verdad es /api/admin/policies/history.
 *   - La página no modifica datos; solo consulta y presenta historial.
 *
 * EN:
 *   Administrative page used to review the unified change history of
 *   institutional policy documents.
 *
 *   Included sources:
 *   - PrivacyPolicy
 *   - TermsPolicy
 *   - CookiePolicy
 *
 *   Responsibilities:
 *   - Validate admin access from the active session.
 *   - Fetch the unified history endpoint.
 *   - Render loading, restricted, empty and success states.
 *   - Keep a stable UI aligned with the Sierra Tech design system.
 *
 *   Rules:
 *   - Access allowed only for: admin, superadmin.
 *   - Source of truth: /api/admin/policies/history.
 *   - This page is read-only and does not mutate data.
 * ============================================================================
 */

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import {
  Cookie,
  FileText,
  History as HistoryIcon,
  Scale,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type AllowedRole = "admin" | "superadmin";
type PolicyType = "Privacy" | "Terms" | "Cookies";

interface PolicyChange {
  _id: string;
  policyType: PolicyType;
  lang: Locale;
  lastModifiedBy: string;
  lastModifiedEmail: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const POLICY_ICONS: Record<PolicyType, ReactNode> = {
  Privacy: <FileText className="h-4 w-4 text-brand-primaryStrong" />,
  Terms: <Scale className="h-4 w-4 text-brand-primaryStrong" />,
  Cookies: <Cookie className="h-4 w-4 text-brand-primaryStrong" />,
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
  return role === "admin" || role === "superadmin";
}

function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

function isPolicyType(value: unknown): value is PolicyType {
  return value === "Privacy" || value === "Terms" || value === "Cookies";
}

function isPolicyChange(value: unknown): value is PolicyChange {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  return (
    typeof record._id === "string" &&
    isPolicyType(record.policyType) &&
    isLocale(record.lang) &&
    typeof record.lastModifiedBy === "string" &&
    typeof record.lastModifiedEmail === "string" &&
    typeof record.updatedAt === "string"
  );
}

function normalizePolicyChanges(payload: unknown): PolicyChange[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter(isPolicyChange);
}

function getPolicyLabel(policyType: PolicyType, locale: Locale): string {
  if (locale === "en") return policyType;

  if (policyType === "Privacy") return "Privacidad";
  if (policyType === "Terms") return "Términos";
  return "Cookies";
}

function getDateTimeLabel(value: string, locale: Locale): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function PoliciesHistoryPage() {
  const { locale } = useTranslation();
  const lang: Locale = locale === "es" ? "es" : "en";
  const { data: session, status } = useSession();
  const toast = useToast();

  const [records, setRecords] = useState<PolicyChange[]>([]);
  const [loading, setLoading] = useState(true);

  const role = session?.user?.role;
  const hasAccess = isAllowedRole(role);

  const pageTitle = useMemo(
    () => (lang === "es" ? "Historial de Cambios" : "Change History"),
    [lang]
  );

  const pageSubtitle = useMemo(
    () =>
      lang === "es"
        ? "Consulta el historial unificado de modificaciones en políticas institucionales."
        : "Review the unified change history of institutional policy documents.",
    [lang]
  );

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch("/api/admin/policies/history", {
          method: "GET",
          headers: {
            "accept-language": lang,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const payload: unknown = await response.json().catch(() => null);
        const normalized = normalizePolicyChanges(payload);

        setRecords(normalized);
      } catch (error) {
        console.error("[PoliciesHistoryPage] Failed to load history:", error);

        toast.error(
          lang === "es"
            ? "No se pudo cargar el historial de políticas."
            : "Could not load policy history."
        );

        setRecords([]);
      } finally {
        setLoading(false);
      }
    }

    if (status !== "authenticated" || !hasAccess) {
      setLoading(false);
      return;
    }

    void loadHistory();
  }, [lang, status, hasAccess, toast]);

  /* ------------------------------------------------------------------------ */
  /* Session loading                                                          */
  /* ------------------------------------------------------------------------ */

  if (status === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es" ? "Cargando sesión..." : "Loading session..."}
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Access guard                                                             */
  /* ------------------------------------------------------------------------ */

  if (!hasAccess) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
          {lang === "es"
            ? "Acceso restringido a administradores."
            : "Admin access only."}
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Data loading                                                             */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es" ? "Cargando historial..." : "Loading history..."}
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Main render                                                              */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="space-y-6">
      <AdminPageHeader
        icon={<HistoryIcon className="h-6 w-6 text-brand-primaryStrong" />}
        title={pageTitle}
        subtitle={pageSubtitle}
      />

      {records.length === 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-text-secondary">
            {lang === "es"
              ? "No existe historial registrado."
              : "No history records found."}
          </p>
        </section>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft text-text-primary">
                <th className="w-14 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">
                  {lang === "es" ? "Política" : "Policy"}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {lang === "es" ? "Idioma" : "Lang"}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {lang === "es" ? "Modificado por" : "Modified by"}
                </th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">
                  {lang === "es" ? "Fecha" : "Date"}
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record, index) => (
                <tr
                  key={record._id}
                  className="border-b border-border text-text-secondary transition hover:bg-surface-soft"
                >
                  <td className="px-4 py-3">{index + 1}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-soft">
                        {POLICY_ICONS[record.policyType]}
                      </span>
                      <span className="font-medium text-text-primary">
                        {getPolicyLabel(record.policyType, lang)}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex min-w-[48px] justify-center rounded-full border border-border bg-surface-soft px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-text-primary">
                      {record.lang}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-text-primary">
                    {record.lastModifiedBy || "—"}
                  </td>

                  <td className="px-4 py-3">{record.lastModifiedEmail || "—"}</td>

                  <td className="px-4 py-3">
                    {getDateTimeLabel(record.updatedAt, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}