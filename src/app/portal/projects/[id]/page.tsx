/**
 * =============================================================================
 * 📄 Page: Client Portal Project Detail
 * Path: src/app/portal/projects/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 * Página oficial del detalle de proyecto para el portal cliente.
 *
 * Propósito:
 * - mostrar el detalle real de un proyecto visible para la organización
 * - reutilizar la capa compartida de lectura del portal
 * - presentar una base estable para documentos, mantenimientos y alertas
 *
 * Alcance de esta versión:
 * - consume la capa compartida de lectura del portal
 * - no implementa edición ni acciones operativas
 * - muestra estados vacíos útiles cuando aún no existan bloques con datos
 *
 * Decisiones:
 * - la carga se resuelve server-side para una primera versión estable
 * - la página usa exclusivamente el contrato PortalProjectDetail
 * - si el proyecto no existe o no pertenece a la organización, responde 404
 * - se corrige la densidad visual de las cards internas para evitar desbordes
 * - se formatean fechas visibles para no mostrar ISO crudo en la UI
 * - se humanizan estados, prioridades, tipos y frecuencias para evitar que el
 *   usuario vea claves técnicas del sistema
 *
 * EN:
 * Official project detail page for the client portal.
 * =============================================================================
 */

import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  FolderKanban,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPortalProjectDetailByOrganization } from "@/lib/portal/portalProjects";
import type {
  PortalAlertItem,
  PortalDocumentItem,
  PortalMaintenanceItem,
  PortalProjectDetail,
} from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface PortalProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatVisibleStatus(value: PortalProjectDetail["visibleStatus"]): string {
  switch (value) {
    case "active":
      return "Activo";
    case "follow_up":
      return "En seguimiento";
    case "completed":
      return "Completado";
    case "maintenance":
      return "Con mantenimiento";
    default:
      return "Proyecto";
  }
}

function formatMaintenanceStatus(value: PortalMaintenanceItem["status"]): string {
  switch (value) {
    case "scheduled":
      return "Programado";
    case "upcoming":
      return "Próximo";
    case "overdue":
      return "Vencido";
    case "completed":
      return "Completado";
    default:
      return "—";
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

function formatDocumentType(value: PortalDocumentItem["type"]): string {
  switch (value) {
    case "contract":
      return "Contrato";
    case "planning":
      return "Planificación";
    case "schedule":
      return "Cronograma";
    case "technical_design":
      return "Diseño técnico";
    case "plan":
      return "Plan";
    case "technical_report":
      return "Reporte técnico";
    case "technical_sheet":
      return "Ficha técnica";
    case "operation_manual":
      return "Manual de operación";
    case "maintenance_manual":
      return "Manual de mantenimiento";
    case "inspection_report":
      return "Reporte de inspección";
    case "maintenance_report":
      return "Reporte de mantenimiento";
    case "delivery_record":
      return "Acta de entrega";
    case "certificate":
      return "Certificado";
    case "warranty":
      return "Garantía";
    case "invoice":
      return "Factura";
    case "permit":
      return "Permiso";
    case "photo_evidence":
      return "Evidencia fotográfica";
    case "other":
      return "Otro";
    default:
      return "Documento";
  }
}

function formatFrequency(
  value: number | null | undefined,
  unit: PortalMaintenanceItem["frequencyUnit"]
): string {
  if (!value || !unit) {
    return "—";
  }

  switch (unit) {
    case "days":
      return value === 1 ? "1 día" : `${value} días`;
    case "weeks":
      return value === 1 ? "1 semana" : `${value} semanas`;
    case "months":
      return value === 1 ? "1 mes" : `${value} meses`;
    case "years":
      return value === 1 ? "1 año" : `${value} años`;
    default:
      return "—";
  }
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCompactText(value: string | null | undefined): string {
  const safe = value?.trim() ?? "";
  return safe.length > 0 ? safe : "—";
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                 */
/* -------------------------------------------------------------------------- */

function EmptyStateBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-2 text-sm leading-7 text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function MetaTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="mt-2 whitespace-normal break-all text-sm font-semibold leading-6 text-text-primary">
        {value}
      </p>
    </div>
  );
}

function DocumentsBlock({ documents }: { documents: PortalDocumentItem[] }) {
  if (documents.length === 0) {
    return (
      <EmptyStateBlock
        title="Aún no hay documentos asociados visibles"
        description="Cuando existan archivos autorizados para este proyecto, se mostrarán aquí de forma organizada."
      />
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {documents.map((document) => (
        <article
          key={document.documentId}
          className="rounded-2xl border border-border bg-surface px-5 py-5"
        >
          <div className="min-w-0 space-y-2">
            <h3 className="break-words text-lg font-semibold text-text-primary">
              {document.title}
            </h3>

            <p className="break-words text-sm leading-7 text-text-secondary">
              {document.description ?? "Documento visible asociado a este proyecto."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetaTile label="Tipo" value={formatDocumentType(document.type)} />

            <MetaTile
                label="Fecha relevante"
                value={formatDateLabel(document.expiresAt ?? document.documentDate)}
            />

            <div className="flex items-end">
                {document.fileUrl ? (
                <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
                >
                    <FileText className="h-4 w-4" />
                    Ver documento
                </a>
                ) : (
                <MetaTile
                    label="Archivo"
                    value={formatCompactText(document.fileName)}
                />
                )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function MaintenanceBlock({
  maintenanceItems,
}: {
  maintenanceItems: PortalMaintenanceItem[];
}) {
  if (maintenanceItems.length === 0) {
    return (
      <EmptyStateBlock
        title="Aún no hay mantenimientos visibles"
        description="Cuando Sierra Tech publique actividades de mantenimiento asociadas a este proyecto, aparecerán aquí."
      />
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {maintenanceItems.map((item) => (
        <article
          key={item.maintenanceId}
          className="rounded-2xl border border-border bg-surface px-5 py-5"
        >
          <div className="min-w-0 space-y-2">
            <h3 className="break-words text-lg font-semibold text-text-primary">
              {item.title}
            </h3>

            <p className="break-words text-sm leading-7 text-text-secondary">
              {item.description ?? "Mantenimiento visible asociado al proyecto."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetaTile
              label="Estado"
              value={formatMaintenanceStatus(item.status)}
            />

            <MetaTile
              label="Próxima fecha"
              value={formatDateLabel(item.nextDueDate)}
            />

            <MetaTile
              label="Frecuencia"
              value={formatFrequency(item.frequencyValue, item.frequencyUnit)}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function AlertsBlock({ alerts }: { alerts: PortalAlertItem[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyStateBlock
        title="Aún no hay alertas visibles para este proyecto"
        description="Cuando existan vencimientos, mantenimientos próximos o avisos relevantes, aparecerán aquí."
      />
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {alerts.map((alert) => (
        <article
          key={alert.alertId}
          className="rounded-2xl border border-border bg-surface px-5 py-5"
        >
          <div className="min-w-0 space-y-2">
            <h3 className="break-words text-lg font-semibold text-text-primary">
              {alert.title}
            </h3>

            <p className="break-words text-sm leading-7 text-text-secondary">
              {alert.description}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetaTile label="Tipo" value={formatAlertType(alert.type)} />

            <MetaTile
              label="Prioridad"
              value={formatAlertPriority(alert.priority)}
            />

            <MetaTile
              label="Fecha"
              value={formatDateLabel(alert.dueDate)}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PortalProjectDetailPage({
  params,
}: PortalProjectDetailPageProps) {
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

  const { id } = await params;

  const project = await getPortalProjectDetailByOrganization({
    organizationId: user.organizationId,
    projectId: id,
    organizationName: user.organizationName ?? null,
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
              Detalle del proyecto
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
              {project.title}
            </h1>

            <p className="text-base leading-8 text-text-secondary">
              {project.description}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Estado visible
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {formatVisibleStatus(project.visibleStatus)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/portal/projects"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a proyectos
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
            <FolderKanban className="h-5 w-5" />
          </div>

          <p className="text-sm font-medium text-text-secondary">
            Sistema / categoría visible
          </p>
          <p className="mt-3 break-words text-2xl font-bold text-text-primary">
            {formatCompactText(project.category)}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Clasificación visible del proyecto.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
            <FileText className="h-5 w-5" />
          </div>

          <p className="text-sm font-medium text-text-secondary">
            Documentos
          </p>
          <p className="mt-3 text-2xl font-bold text-text-primary">
            {project.documents.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Archivos autorizados asociados a este proyecto.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
            <TriangleAlert className="h-5 w-5" />
          </div>

          <p className="text-sm font-medium text-text-secondary">
            Alertas activas
          </p>
          <p className="mt-3 text-2xl font-bold text-text-primary">
            {project.alerts.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Avisos relevantes vinculados al proyecto.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
            <Wrench className="h-5 w-5" />
          </div>

          <p className="text-sm font-medium text-text-secondary">
            Mantenimientos
          </p>
          <p className="mt-3 text-2xl font-bold text-text-primary">
            {project.maintenanceItems.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Actividades programadas y fechas relevantes del proyecto.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Resumen general
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Información principal del proyecto
              </h2>

              <p className="text-sm leading-7 text-text-secondary">
                {project.summary}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetaTile
                label="Organización"
                value={formatCompactText(project.organizationName)}
              />

              <MetaTile
                label="Fecha del proyecto"
                value={formatDateLabel(project.projectDate)}
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Documentación asociada
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Documentos del proyecto
              </h2>

              <p className="text-sm leading-7 text-text-secondary">
                Aquí se listan los contratos, reportes, manuales, garantías y
                demás documentos autorizados específicamente para este proyecto.
              </p>
            </div>

            <DocumentsBlock documents={project.documents} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Seguimiento
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Mantenimientos del proyecto
              </h2>

              <p className="text-sm leading-7 text-text-secondary">
                Esta área muestra las actividades de mantenimiento programadas,
                próximas fechas y adjuntos relacionados cuando existan datos
                visibles para la organización.
              </p>
            </div>

            <MaintenanceBlock maintenanceItems={project.maintenanceItems} />
          </section>

          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Alertas relacionadas
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Alertas del proyecto
              </h2>

              <p className="text-sm leading-7 text-text-secondary">
                Aquí se concentran avisos como mantenimientos próximos,
                vencimientos documentales y otras alertas vinculadas a este
                proyecto específico.
              </p>
            </div>

            <AlertsBlock alerts={project.alerts} />
          </section>
        </div>
      </section>
    </div>
  );
}