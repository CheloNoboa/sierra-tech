/**
 * =============================================================================
 * 📄 Page: Client Portal Alerts
 * Path: src/app/portal/alerts/page.tsx
 * =============================================================================
 *
 * ES:
 * Página oficial de Alertas para el portal cliente de Sierra Tech.
 *
 * Propósito:
 * - centralizar la lectura de alertas relevantes para la organización
 * - mostrar mantenimientos próximos, alertas vencidas, documentos por vencer
 *   y otros avisos autorizados
 * - reutilizar la capa compartida de lectura de alertas del portal
 *
 * Alcance de esta versión:
 * - usa sesión autenticada server-side
 * - consume datos reales derivados del módulo Projects
 * - incorpora filtros simples y útiles para lectura consolidada
 * - prioriza claridad, acción y confianza
 *
 * Decisiones:
 * - la sección de alertas se concibe como una vista consolidada
 * - los mantenimientos también alimentan esta vista
 * - los filtros viven en la URL para permitir navegación y recarga consistente
 * - no se crean componentes extraídos fuera de esta pantalla si no son
 *   claramente útiles aquí mismo
 * - la experiencia debe ayudar al cliente a decidir qué revisar primero
 *
 * EN:
 * Official Alerts page for the Sierra Tech client portal.
 * =============================================================================
 */

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  FileWarning,
  ShieldAlert,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPortalAlertsByOrganization } from "@/lib/portal/portalAlerts";
import type { PortalAlertItem } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface PortalAlertsPageProps {
  searchParams?: Promise<{
    type?: string;
    priority?: string;
    projectId?: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeFilterValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

function formatAlertType(value: PortalAlertItem["type"]): string {
  switch (value) {
    case "maintenance_upcoming":
      return "Mantenimiento próximo";
    case "maintenance_overdue":
      return "Mantenimiento vencido";
    case "document_expiring":
      return "Documento por vencer";
    case "warranty_expiring":
      return "Garantía por vencer";
    case "scheduled_review":
      return "Revisión programada";
    case "critical":
      return "Crítica";
    default:
      return "Alerta";
  }
}

function formatAlertPriority(value: PortalAlertItem["priority"]): string {
  switch (value) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
    default:
      return "—";
  }
}

function formatActionLabel(item: PortalAlertItem): string {
  switch (item.action) {
    case "view_document":
      return "Revisar documentos";
    case "contact_support":
      return "Ir a soporte";
    case "view_project":
    default:
      return "Revisar proyecto";
  }
}

function getActionHref(item: PortalAlertItem): string {
  switch (item.action) {
    case "view_document":
      return "/portal/documents";
    case "contact_support":
      return "/portal/support";
    case "view_project":
    default:
      return item.projectId ? `/portal/projects/${item.projectId}` : "/portal/projects";
  }
}

function matchesTypeFilter(item: PortalAlertItem, type: string): boolean {
  if (!type || type === "all") return true;
  return item.type === type;
}

function matchesPriorityFilter(
  item: PortalAlertItem,
  priority: string
): boolean {
  if (!priority || priority === "all") return true;
  return item.priority === priority;
}

function matchesProjectFilter(item: PortalAlertItem, projectId: string): boolean {
  if (!projectId || projectId === "all") return true;
  return (item.projectId ?? "") === projectId;
}

function getUniqueProjectOptions(items: PortalAlertItem[]): Array<{
  projectId: string;
  projectTitle: string;
}> {
  const map = new Map<string, string>();

  for (const item of items) {
    const projectId = item.projectId?.trim() ?? "";
    const projectTitle = item.projectTitle?.trim() ?? "";

    if (!projectId || !projectTitle) continue;
    if (!map.has(projectId)) {
      map.set(projectId, projectTitle);
    }
  }

  return Array.from(map.entries())
    .map(([projectId, projectTitle]) => ({ projectId, projectTitle }))
    .sort((a, b) =>
      a.projectTitle.localeCompare(b.projectTitle, "es", {
        sensitivity: "base",
      })
    );
}

function getPriorityPillClasses(priority: PortalAlertItem["priority"]): string {
  switch (priority) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "low":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getAlertCardClasses(priority: PortalAlertItem["priority"]): string {
  switch (priority) {
    case "high":
      return "border-red-200 bg-gradient-to-br from-white via-white to-red-50/60";
    case "medium":
      return "border-amber-200 bg-gradient-to-br from-white via-white to-amber-50/50";
    case "low":
    default:
      return "border-border bg-white";
  }
}

/* -------------------------------------------------------------------------- */
/* UI                                                                         */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
        {icon}
      </div>

      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function EmptyAlertsState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
      <p className="text-sm font-medium text-text-primary">
        Aún no hay alertas disponibles
      </p>
      <p className="mt-2 text-sm leading-7 text-text-secondary">
        Cuando Sierra Tech publique mantenimientos próximos, vencimientos
        documentales o avisos relevantes para tu organización, aparecerán aquí
        de forma consolidada.
      </p>
    </div>
  );
}

function EmptyFilterResultsState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
      <p className="text-sm font-medium text-text-primary">
        No encontramos alertas con esos filtros
      </p>
      <p className="mt-2 text-sm leading-7 text-text-secondary">
        Ajusta el tipo, la prioridad o el proyecto para encontrar más
        resultados.
      </p>
    </div>
  );
}

function FilterBar({
  type,
  priority,
  projectId,
  projectOptions,
}: {
  type: string;
  priority: string;
  projectId: string;
  projectOptions: Array<{
    projectId: string;
    projectTitle: string;
  }>;
}) {
  return (
    <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
      <form className="grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(220px,0.8fr)_minmax(260px,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <label
            htmlFor="portal-alerts-type"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
          >
            Tipo de alerta
          </label>

          <select
            id="portal-alerts-type"
            name="type"
            defaultValue={type || "all"}
            className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
          >
            <option value="all">Todas</option>
            <option value="maintenance_upcoming">Mantenimiento próximo</option>
            <option value="maintenance_overdue">Mantenimiento vencido</option>
            <option value="document_expiring">Documento por vencer</option>
            <option value="warranty_expiring">Garantía por vencer</option>
            <option value="scheduled_review">Revisión programada</option>
            <option value="critical">Crítica</option>
          </select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="portal-alerts-priority"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
          >
            Prioridad
          </label>

          <select
            id="portal-alerts-priority"
            name="priority"
            defaultValue={priority || "all"}
            className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
          >
            <option value="all">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="portal-alerts-project"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
          >
            Proyecto
          </label>

          <select
            id="portal-alerts-project"
            name="projectId"
            defaultValue={projectId || "all"}
            className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
          >
            <option value="all">Todos los proyectos</option>
            {projectOptions.map((option) => (
              <option key={option.projectId} value={option.projectId}>
                {option.projectTitle}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:self-end">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-primary px-6 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
          >
            Aplicar
          </button>

          <Link
            href="/portal/alerts"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-white px-6 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
          >
            Limpiar
          </Link>
        </div>
      </form>
    </section>
  );
}

function AlertCard({ item }: { item: PortalAlertItem }) {
  const actionHref = getActionHref(item);
  const actionLabel = formatActionLabel(item);

  return (
    <article
      className={`rounded-[28px] border p-6 shadow-sm ${getAlertCardClasses(item.priority)}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primaryStrong">
              {formatAlertType(item.type)}
            </span>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getPriorityPillClasses(
                item.priority
              )}`}
            >
              Prioridad {formatAlertPriority(item.priority)}
            </span>
          </div>

          <h2 className="break-words text-xl font-bold tracking-tight text-text-primary">
            {item.title}
          </h2>

          <p className="break-words text-sm leading-7 text-text-secondary">
            {item.description}
          </p>
        </div>

        <div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
          <TriangleAlert className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Proyecto
          </p>
          <p className="mt-2 break-words text-sm font-semibold text-text-primary">
            {item.projectTitle?.trim() || "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Tipo
          </p>
          <p className="mt-2 break-words text-sm font-semibold text-text-primary">
            {formatAlertType(item.type)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Fecha relevante
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary">
            {formatDateLabel(item.dueDate ?? item.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>

        {item.projectId && item.action !== "view_project" ? (
          <Link
            href={`/portal/projects/${item.projectId}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
          >
            Ver proyecto
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PortalAlertsPage({
  searchParams,
}: PortalAlertsPageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  /**
   * Defensa adicional server-side.
   * El middleware ya protege /portal, pero la página no debe continuar si
   * la sesión cliente no es válida.
   */
  if (
    !user ||
    user.userType !== "client" ||
    user.status !== "active" ||
    !user.organizationId
  ) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const type = normalizeFilterValue(resolvedSearchParams.type) || "all";
  const priority = normalizeFilterValue(resolvedSearchParams.priority) || "all";
  const projectId = normalizeFilterValue(resolvedSearchParams.projectId) || "all";

  const alertsData = await getPortalAlertsByOrganization(user.organizationId);
  const projectOptions = getUniqueProjectOptions(alertsData.items);

  const filteredItems = alertsData.items.filter((item) => {
    return (
      matchesTypeFilter(item, type) &&
      matchesPriorityFilter(item, priority) &&
      matchesProjectFilter(item, projectId)
    );
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
            Alertas y seguimiento
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Alertas de la organización
          </h1>

          <p className="text-base leading-8 text-text-secondary">
            Aquí se concentran los avisos relevantes visibles para tu
            organización: mantenimientos próximos o vencidos, documentos por
            vencer, revisiones programadas y cualquier otra alerta autorizada
            por Sierra Tech para seguimiento privado.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Alertas activas"
          value={alertsData.summary.totalAlerts}
          description="Avisos visibles y pendientes de revisión."
          icon={<TriangleAlert className="h-5 w-5" />}
        />

        <SummaryCard
          title="Mantenimientos próximos"
          value={alertsData.summary.upcomingMaintenances}
          description="Actividades con fecha cercana dentro del portal."
          icon={<Wrench className="h-5 w-5" />}
        />

        <SummaryCard
          title="Documentos con fecha crítica"
          value={alertsData.summary.expiringDocuments}
          description="Contratos, garantías u otros archivos con seguimiento."
          icon={<FileWarning className="h-5 w-5" />}
        />

        <SummaryCard
          title="Prioridad alta"
          value={alertsData.summary.highPriorityAlerts}
          description="Alertas que requieren atención más inmediata."
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </section>

      <FilterBar
        type={type}
        priority={priority}
        projectId={projectId}
        projectOptions={projectOptions}
      />

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
              Vista consolidada
            </p>

            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Alertas visibles para la organización
            </h2>

            <p className="max-w-3xl text-sm leading-7 text-text-secondary">
              Aquí puedes revisar primero lo más urgente y luego el resto de
              avisos visibles, con acceso directo al proyecto, documentos o
              soporte según corresponda.
            </p>
          </div>

          {alertsData.items.length === 0 ? (
            <EmptyAlertsState />
          ) : filteredItems.length === 0 ? (
            <EmptyFilterResultsState />
          ) : (
            <div className="mt-6 space-y-4">
              {filteredItems.map((item) => (
                <AlertCard key={item.alertId} item={item} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Lectura rápida
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Cómo interpretar esta vista
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Prioridad alta: conviene revisarla primero.
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Mantenimiento vencido: requiere seguimiento más inmediato.
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Documento por vencer: ayuda a anticipar renovaciones o revisión.
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Cada alerta muestra proyecto relacionado, fecha y acción sugerida.
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Contexto general
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Alcance visible en portal
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border bg-surface px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Proyectos con alertas
                </p>
                <p className="mt-2 text-2xl font-bold text-text-primary">
                  {alertsData.relatedProjectsCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Proyectos que actualmente generan alertas visibles en el portal.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Mantenimientos vencidos
                </p>
                <p className="mt-2 text-2xl font-bold text-text-primary">
                  {alertsData.summary.overdueAlerts}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Elementos que requieren especial atención dentro del seguimiento.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}