/**
 * =============================================================================
 * ✅ src/app/terms/page.tsx
 * =============================================================================
 * Página pública de Términos de Servicio.
 *
 * Propósito:
 * - Consultar la política pública por idioma.
 * - Consultar la última fecha de actualización.
 * - Renderizar contenido, estado vacío o error sin romper el layout público.
 *
 * Reglas:
 * - La ausencia de política NO debe tratarse como error visual.
 * - El layout institucional siempre debe mantenerse.
 * - El estado vacío debe mostrarse con una presentación neutra y profesional.
 * =============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { Scale, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import PolicyLayout from "@/layout/PolicyLayout";
import { ROUTES } from "@/constants/routes";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Lang = "es" | "en";

type Section = {
  heading: string;
  content: string;
};

type PolicyData = {
  lang: Lang;
  title: string;
  sections: Section[];
  isEmpty?: boolean;
};

type LastUpdateResponse = {
  date: string | null;
  isEmpty?: boolean;
  message?: string;
  error?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getFallbackTitle(locale: Lang): string {
  return locale === "es" ? "Términos de Servicio" : "Terms of Service";
}

function isValidPolicyData(value: unknown): value is PolicyData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PolicyData>;

  return (
    (candidate.lang === "es" || candidate.lang === "en") &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.sections)
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function TermsPage() {
  const { locale } = useTranslation();
  const lang: Lang = locale === "es" ? "es" : "en";

  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasServerError, setHasServerError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setHasServerError(false);

        const [policyRes, updateRes] = await Promise.all([
          fetch(ROUTES.API.TERMS_PUBLIC(lang)),
          fetch(ROUTES.API.TERMS_LAST_UPDATE(lang)),
        ]);

        /* ------------------------------------------------------ */
        /* Public policy                                           */
        /* ------------------------------------------------------ */
        if (policyRes.ok) {
          const policyData: unknown = await policyRes.json();

          if (isValidPolicyData(policyData)) {
            setPolicy(policyData);
          } else {
            setPolicy(null);
          }
        } else if (policyRes.status >= 500) {
          setHasServerError(true);
          setPolicy(null);
        } else {
          /**
           * 404 o ausencia de contenido:
           * se trata como estado vacío, no como error.
           */
          setPolicy(null);
        }

        /* ------------------------------------------------------ */
        /* Last update                                             */
        /* ------------------------------------------------------ */
        if (updateRes.ok) {
          const updData = (await updateRes.json()) as LastUpdateResponse;

          if (updData.date) {
            const date = new Date(updData.date);

            setLastUpdate(
              date.toLocaleDateString(lang, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            );
          } else {
            setLastUpdate(null);
          }
        } else if (updateRes.status >= 500) {
          setHasServerError(true);
          setLastUpdate(null);
        } else {
          setLastUpdate(null);
        }
      } catch (error) {
        console.error("❌ Error cargando Terms:", error);
        setHasServerError(true);
        setPolicy(null);
        setLastUpdate(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [lang]);

  const pageTitle = policy?.title?.trim() || getFallbackTitle(lang);
  const hasSections = !!policy && policy.sections.length > 0;
  const isEmptyState = !loading && !hasServerError && !policy;
  const isEmptyContentState = !!policy && policy.sections.length === 0;

  if (loading) {
    return (
      <PolicyLayout title={getFallbackTitle(lang)}>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
            {lang === "es" ? "Cargando..." : "Loading..."}
          </div>
        </div>
      </PolicyLayout>
    );
  }

  return (
    <PolicyLayout
      title={pageTitle}
      updatedLabelDate={lastUpdate || undefined}
    >
      {hasServerError ? (
        <div className="mx-auto flex min-h-[36vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-text-secondary" />
            <h2 className="mb-2 text-xl font-semibold text-text-primary">
              {lang === "es"
                ? "No fue posible cargar esta página"
                : "This page could not be loaded"}
            </h2>
            <p className="text-text-secondary">
              {lang === "es"
                ? "Ocurrió un problema al consultar los términos de servicio. Inténtalo nuevamente en unos minutos."
                : "There was a problem loading the terms of service. Please try again in a few minutes."}
            </p>
          </div>
        </div>
      ) : isEmptyState ? (
        <div className="mx-auto flex min-h-[36vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
            <Scale className="mx-auto mb-4 h-10 w-10 text-text-secondary" />
            <h2 className="mb-2 text-xl font-semibold text-text-primary">
              {lang === "es"
                ? "Contenido en actualización"
                : "Content is being updated"}
            </h2>
            <p className="mx-auto max-w-xl leading-relaxed text-text-secondary">
              {lang === "es"
                ? "Estamos actualizando los Términos de Servicio. Muy pronto esta información estará disponible."
                : "We are updating the Terms of Service. This information will be available soon."}
            </p>
          </div>
        </div>
      ) : hasSections ? (
        policy.sections.map((sec, index) => (
          <section key={`${sec.heading}-${index}`}>
            <h2 className="mb-2 text-xl font-semibold text-text-primary">
              {sec.heading}
            </h2>
            <p className="leading-relaxed text-text-secondary">
              {sec.content}
            </p>
          </section>
        ))
      ) : isEmptyContentState ? (
        <div className="mx-auto flex min-h-[28vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
            <Scale className="mx-auto mb-4 h-10 w-10 text-text-secondary" />
            <h2 className="mb-2 text-xl font-semibold text-text-primary">
              {lang === "es"
                ? "Aún no hay contenido publicado"
                : "No content has been published yet"}
            </h2>
            <p className="mx-auto max-w-xl leading-relaxed text-text-secondary">
              {lang === "es"
                ? "Los Términos de Servicio existen, pero todavía no tienen contenido visible para este idioma."
                : "The Terms of Service exist, but they do not have visible content for this language yet."}
            </p>
          </div>
        </div>
      ) : null}
    </PolicyLayout>
  );
}