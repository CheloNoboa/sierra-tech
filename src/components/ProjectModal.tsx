"use client";

/**
 * =============================================================================
 * 📄 Component: ProjectModal
 * Path: src/components/ProjectModal.tsx
 * =============================================================================
 *
 * ES:
 * Modal administrativa oficial del módulo Projects para Sierra Tech.
 *
 * Objetivo:
 * - crear / editar proyectos con el contrato nuevo
 * - asociar el proyecto a una sola organización
 * - separar identidad, descripción, media, publicación, documentos
 *   y mantenimientos
 * - permitir archivos opcionales por mantenimiento
 * - mostrar preview de alertas programadas por mantenimiento
 *
 * Reglas:
 * - create/edit comparten el mismo formulario
 * - confirmación por cambios sin guardar
 * - upload real de media por helper admin
 * - upload real de documentos del proyecto por endpoint projects/upload
 * - una sola organización por proyecto
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import GlobalButton from "@/components/ui/GlobalButton";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";

import ProjectGalleryUploader from "@/components/ProjectGalleryUploader";
import ProjectImageUploader from "@/components/ProjectImageUploader";
import { uploadAdminFile } from "@/lib/adminUploadsClient";

import { useTranslation } from "@/hooks/useTranslation";

import {
  createEmptyProjectPayload,
  normalizeProjectEntity,
} from "@/lib/projects/projectPayload";

import type {
  MaintenanceFrequencyUnit,
  MaintenanceScheduleEntry,
  MaintenanceStatus,
  MaintenanceType,
  ProjectDocumentLink,
  ProjectDocumentType,
  ProjectDocumentVisibility,
  ProjectEntity,
  ProjectFileAttachment,
  ProjectImage,
  ProjectPayload,
  ProjectStatus,
} from "@/types/project";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type ProjectModalProps = {
  isOpen: boolean;
  projectId: string | null;
  onClose: () => void;
  onSaved: (savedProject: ProjectEntity) => void;
};

/* -------------------------------------------------------------------------- */
/* Local data types                                                           */
/* -------------------------------------------------------------------------- */

type RawOrganization = {
  _id?: string;
  name?: string;
  companyName?: string;
  commercialName?: string;
  legalName?: string;
  email?: string;
  primaryEmail?: string;
};

type OrganizationsResponse =
  | {
      ok: true;
      items?: RawOrganization[];
      organizations?: RawOrganization[];
      data?: RawOrganization[];
    }
  | {
      ok: false;
      error: string;
    };

type OrganizationOption = {
  id: string;
  label: string;
  email: string;
};

type ProjectUploadResponse =
  | {
      ok: true;
      item: {
        url: string;
        storageKey: string;
      };
    }
  | {
      ok: false;
      error: string;
    };


/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function serializeForm(values: ProjectPayload): string {
  return JSON.stringify(values);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function uniq(values: string[]): string[] {
  return Array.from(
    new Set(values.map((item) => normalizeString(item)).filter(Boolean))
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toDateInputValue(value: string | null): string {
  return extractIsoDateOnly(value);
}

function toNullableIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = parseDateOnly(trimmed);
  return date ? formatDateOnly(date) : null;
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapOrganizationLabel(item: RawOrganization): string {
  return (
    normalizeString(item.commercialName) ||
    normalizeString(item.legalName) ||
    normalizeString(item.companyName) ||
    normalizeString(item.name) ||
    normalizeString(item.primaryEmail) ||
    normalizeString(item.email) ||
    "Sin nombre"
  );
}

function createLocalDocumentId(): string {
  return `project-doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferTitleFromFileName(fileName: string): string {
  const clean = normalizeString(fileName);
  if (!clean) return "";

  const withoutExtension = clean.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[-_]+/g, " ").trim();
}

function createEmptyDocumentLink(): ProjectDocumentLink {
  return {
    documentId: createLocalDocumentId(),
    title: "",
    documentType: "other",
    description: "",
    visibility: "private",
    language: "none",
    documentDate: new Date().toISOString(),

    fileName: "",
    fileUrl: "",
    storageKey: "",
    mimeType: "",
    size: null,

    version: "",
    isPublic: false,
    visibleInPortal: true,
    visibleInPublicSite: false,
    visibleToInternalOnly: false,
    requiresAlert: false,
    alertDate: null,
    nextDueDate: null,
    maintenanceFrequency: null,
    isCritical: false,
    sortOrder: 0,
    notes: "",
  };
}

function createEmptyMaintenanceItem(): ProjectPayload["maintenanceItems"][number] {
  return {
    maintenanceType: "preventive" as MaintenanceType,
    title: "",
    description: "",
    frequencyValue: null,
    frequencyUnit: "months" as MaintenanceFrequencyUnit,
    lastCompletedDate: null,
    nextDueDate: null,
    status: "scheduled" as MaintenanceStatus,
    notifyClient: true,
    notifyInternal: true,
    alertDaysBefore: 15,
    isRecurring: true,
    instructions: "",
    relatedDocumentIds: [],
    attachments: [],
    notes: "",
    schedule: [],
  };
}

function getProjectStatusTone(
  status: ProjectStatus
): "neutral" | "warning" | "success" {
  if (status === "published") return "success";
  if (status === "archived") return "neutral";
  return "warning";
}

function getProjectStatusLabel(
  status: ProjectStatus,
  locale: "es" | "en"
): string {
  if (locale === "en") {
    if (status === "published") return "Published";
    if (status === "archived") return "Archived";
    return "Draft";
  }

  if (status === "published") return "Publicado";
  if (status === "archived") return "Archivado";
  return "Borrador";
}

function getBadgeClasses(tone: "neutral" | "warning" | "success"): string {
  if (tone === "success") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "warning") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-border bg-surface text-text-secondary";
}

function resolveDocumentTypeLabel(
  value: ProjectDocumentType,
  locale: "es" | "en"
): string {
  const mapEs: Record<ProjectDocumentType, string> = {
    contract: "Contrato",
    planning: "Planificación",
    schedule: "Cronograma",
    technical_design: "Diseño técnico",
    plan: "Plano",
    technical_report: "Informe técnico",
    technical_sheet: "Ficha técnica",
    operation_manual: "Manual de operación",
    maintenance_manual: "Manual de mantenimiento",
    inspection_report: "Informe de inspección",
    maintenance_report: "Informe de mantenimiento",
    delivery_record: "Acta de entrega",
    certificate: "Certificado",
    warranty: "Garantía",
    invoice: "Factura",
    permit: "Permiso",
    photo_evidence: "Evidencia fotográfica",
    other: "Otro",
  };

  const mapEn: Record<ProjectDocumentType, string> = {
    contract: "Contract",
    planning: "Planning",
    schedule: "Schedule",
    technical_design: "Technical design",
    plan: "Plan",
    technical_report: "Technical report",
    technical_sheet: "Technical sheet",
    operation_manual: "Operation manual",
    maintenance_manual: "Maintenance manual",
    inspection_report: "Inspection report",
    maintenance_report: "Maintenance report",
    delivery_record: "Delivery record",
    certificate: "Certificate",
    warranty: "Warranty",
    invoice: "Invoice",
    permit: "Permit",
    photo_evidence: "Photo evidence",
    other: "Other",
  };

  return locale === "en" ? mapEn[value] : mapEs[value];
}

function resolveMaintenanceTypeLabel(
  value: MaintenanceType,
  locale: "es" | "en"
): string {
  const mapEs: Record<MaintenanceType, string> = {
    preventive: "Preventivo",
    corrective: "Correctivo",
    cleaning: "Limpieza",
    inspection: "Inspección",
    replacement: "Reemplazo",
    other: "Otro",
  };

  const mapEn: Record<MaintenanceType, string> = {
    preventive: "Preventive",
    corrective: "Corrective",
    cleaning: "Cleaning",
    inspection: "Inspection",
    replacement: "Replacement",
    other: "Other",
  };

  return locale === "en" ? mapEn[value] : mapEs[value];
}

function resolveMaintenanceStatusLabel(
  value: MaintenanceStatus,
  locale: "es" | "en"
): string {
  const mapEs: Record<MaintenanceStatus, string> = {
    scheduled: "Programado",
    completed: "Completado",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };

  const mapEn: Record<MaintenanceStatus, string> = {
    scheduled: "Scheduled",
    completed: "Completed",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };

  return locale === "en" ? mapEn[value] : mapEs[value];
}

function getMaintenanceStatusClasses(status: MaintenanceStatus): string {
  if (status === "completed") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "overdue") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "cancelled") {
    return "border border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border border-amber-200 bg-amber-50 text-amber-700";
}

function formatHumanDate(
  value: string | null,
  locale: "es" | "en"
): string {
  if (!value) return locale === "es" ? "Sin fecha" : "No date";

  const date = parseDateOnly(value);
  if (!date) {
    return locale === "es" ? "Sin fecha" : "No date";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function addMonthsToIsoDate(
  startDate: string | null,
  durationMonths: number | null
): string | null {
  if (!startDate || !durationMonths || durationMonths <= 0) return null;

  const date = parseDateOnly(startDate);
  if (!date) return null;

  const next = new Date(date);
  next.setMonth(next.getMonth() + durationMonths);

  return formatDateOnly(next);
}

function addFrequencyToIsoDate(
  baseDate: string | null,
  frequencyValue: number | null,
  frequencyUnit: MaintenanceFrequencyUnit | null
): string | null {
  if (
    !baseDate ||
    !frequencyValue ||
    frequencyValue <= 0 ||
    !frequencyUnit
  ) {
    return null;
  }

  const date = parseDateOnly(baseDate);
  if (!date) return null;

  const next = new Date(date);

  if (frequencyUnit === "days") {
    next.setDate(next.getDate() + frequencyValue);
    return formatDateOnly(next);
  }

  if (frequencyUnit === "weeks") {
    next.setDate(next.getDate() + frequencyValue * 7);
    return formatDateOnly(next);
  }

  if (frequencyUnit === "months") {
    next.setMonth(next.getMonth() + frequencyValue);
    return formatDateOnly(next);
  }

  next.setFullYear(next.getFullYear() + frequencyValue);
  return formatDateOnly(next);
}

function extractIsoDateOnly(value: string | null): string {
  if (!value) return "";

  if (value.includes("T")) {
    return value.slice(0, 10);
  }

  return value.slice(0, 10);
}

function parseDateOnly(value: string | null): Date | null {
  const dateOnly = extractIsoDateOnly(value);
  if (!dateOnly) return null;

  const [yearText, monthText, dayText] = dateOnly.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function hasContractStartedBeforeToday(contractStartDate: string | null): boolean {
  const contractDate = extractIsoDateOnly(contractStartDate);
  if (!contractDate) return false;

  const today = new Date();
  const todayDateOnly = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return contractDate < todayDateOnly;
}

function resolveMaintenanceAnchorDate(
  contractStartDate: string | null,
  lastCompletedDate: string | null
): string | null {
  if (!contractStartDate) return null;

  const contractStartedBeforeToday =
    hasContractStartedBeforeToday(contractStartDate);

  if (contractStartedBeforeToday && lastCompletedDate) {
    const completedDate = new Date(lastCompletedDate);
    if (!Number.isNaN(completedDate.getTime())) {
      return lastCompletedDate;
    }
  }

  return contractStartDate;
}

function resolveProjectClientEmail(
  formValue: ProjectPayload,
  selectedOrganizationEmail?: string
): string {
  return (
    normalizeString(formValue.clientEmail) ||
    normalizeString(selectedOrganizationEmail) ||
    ""
  );
}

function rebuildMaintenanceItems(
  formValue: ProjectPayload,
  selectedOrganizationEmail?: string,
  options?: {
    forceRegenerateSchedule?: boolean;
  }
): ProjectPayload["maintenanceItems"] {
  const resolvedClientEmail = resolveProjectClientEmail(
    formValue,
    selectedOrganizationEmail
  );

  const forceRegenerateSchedule = Boolean(options?.forceRegenerateSchedule);

  return formValue.maintenanceItems.map((item, index) => {
    const nextSchedule =
      forceRegenerateSchedule || item.schedule.length === 0
        ? generateSchedulePreview(
            item,
            index,
            formValue.contractStartDate,
            formValue.contractEndDate,
            resolvedClientEmail
          )
        : item.schedule.map((entry) => ({
            ...entry,
            recipientEmail:
              normalizeString(entry.recipientEmail) || resolvedClientEmail,
          }));

    return {
      ...item,
      nextDueDate: nextSchedule[0]?.maintenanceDate ?? null,
      schedule: nextSchedule,
    };
  });
}

function generateSchedulePreview(
  item: ProjectPayload["maintenanceItems"][number],
  maintenanceIndex: number,
  contractStartDate: string | null,
  contractEndDate: string | null,
  clientEmail: string
): MaintenanceScheduleEntry[] {
  if (item.status === "cancelled") return [];

  if (!item.frequencyValue || item.frequencyValue <= 0 || !item.frequencyUnit) {
    return [];
  }

  const anchorDate = resolveMaintenanceAnchorDate(
    contractStartDate,
    item.lastCompletedDate
  );

  if (!anchorDate) return [];

  const recipients: Array<"client" | "internal"> = [];
  if (item.notifyClient) recipients.push("client");
  if (item.notifyInternal) recipients.push("internal");
  if (recipients.length === 0) return [];

  const channels: Array<"platform" | "email"> = ["platform", "email"];

  const dates: string[] = [];
  let cursor = addFrequencyToIsoDate(
    anchorDate,
    item.frequencyValue,
    item.frequencyUnit
  );
  let guard = 0;

  while (cursor && guard < 120) {
    const cursorDate = parseDateOnly(cursor);
    const endDate = parseDateOnly(contractEndDate);

    if (cursorDate && endDate && cursorDate > endDate) break;

    dates.push(cursor);

    if (!item.isRecurring) break;

    cursor = addFrequencyToIsoDate(
      cursor,
      item.frequencyValue,
      item.frequencyUnit
    );

    guard += 1;
  }

  return dates.map((maintenanceDate, cycleIndex) => {
    const alertDate =
      item.alertDaysBefore && item.alertDaysBefore > 0
        ? (() => {
            const date = parseDateOnly(maintenanceDate);
            if (!date) return null;
            date.setDate(date.getDate() - item.alertDaysBefore);
            return formatDateOnly(date);
          })()
        : null;

    return {
      eventId: `preview-${maintenanceIndex}-${cycleIndex}-${maintenanceDate}`,
      cycleIndex,
      maintenanceDate,
      alertDate,
      alertStatus:
        alertDate && (() => {
          const alert = parseDateOnly(alertDate);
          if (!alert) return false;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          return alert.getTime() <= today.getTime();
        })()
          ? "emitted"
          : "pending",
      maintenanceStatus:
        item.status === "completed"
          ? "done"
          : item.status === "cancelled"
            ? "cancelled"
            : (() => {
                const maintenance = parseDateOnly(maintenanceDate);
                if (!maintenance) return "pending";

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                return maintenance.getTime() < today.getTime()
                  ? "overdue"
                  : "pending";
              })(),
      channels,
      recipients,
      recipientEmail: item.notifyClient ? clientEmail.trim() : "",
      emittedAt: null,
      completedAt: null,
      completedByClient: false,
      note: "",
    };
  });
}

function resolveScheduleMaintenanceStatusLabel(
  value: "pending" | "done" | "overdue" | "cancelled",
  locale: "es" | "en"
): string {
  const mapEs = {
    pending: "Pendiente",
    done: "Realizado",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };

  const mapEn = {
    pending: "Pending",
    done: "Done",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };

  return locale === "en" ? mapEn[value] : mapEs[value];
}

function resolveChannelsLabel(
  values: Array<"platform" | "email">,
  locale: "es" | "en"
): string {
  if (values.length === 0) return "—";

  return values
    .map((value) => {
      if (value === "platform") {
        return locale === "es" ? "Plataforma" : "Platform";
      }

      return locale === "es" ? "Correo" : "Email";
    })
    .join(" + ");
}

function resolveRecipientsLabel(
  values: Array<"client" | "internal">,
  locale: "es" | "en"
): string {
  if (values.length === 0) return "—";

  return values
    .map((value) => {
      if (value === "client") {
        return locale === "es" ? "Cliente" : "Client";
      }

      return locale === "es" ? "Interno" : "Internal";
    })
    .join(" + ");
}

function inferMaintenanceCardTitle(
  item: ProjectPayload["maintenanceItems"][number],
  locale: "es" | "en"
): string {
  const explicitTitle = item.title.trim();
  if (explicitTitle) return explicitTitle;

  const baseType = resolveMaintenanceTypeLabel(item.maintenanceType, locale);

  if (item.frequencyValue && item.frequencyUnit) {
    const unit =
      locale === "es"
        ? item.frequencyUnit === "days"
          ? "días"
          : item.frequencyUnit === "weeks"
            ? "semanas"
            : item.frequencyUnit === "months"
              ? "meses"
              : "años"
        : item.frequencyUnit;

    return `${baseType} · ${item.frequencyValue} ${unit}`;
  }

  return baseType;
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
/* -------------------------------------------------------------------------- */

function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <label className="text-xs font-medium text-text-secondary">{children}</label>
      {hint ? <span className="text-[11px] text-text-muted">{hint}</span> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-soft p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
          ) : null}
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProjectModal({
  isOpen,
  projectId,
  onClose,
  onSaved,
}: ProjectModalProps) {
  const { locale } = useTranslation();
  const safeLocale: "es" | "en" = locale === "en" ? "en" : "es";
  const toast = useToast();

  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const isEditing = Boolean(projectId);

  const t = useMemo(
    () => ({
      createTitle: safeLocale === "es" ? "Crear proyecto" : "Create project",
      editTitle: safeLocale === "es" ? "Editar proyecto" : "Edit project",
      subtitle:
        safeLocale === "es"
          ? "Gestión documental y publicación controlada del proyecto."
          : "Document management and controlled project publication.",

      loadingProject:
        safeLocale === "es" ? "Cargando proyecto..." : "Loading project...",

      identity: safeLocale === "es" ? "Identidad del proyecto" : "Project identity",
      identityNote:
        safeLocale === "es"
          ? "Datos base del proyecto, organización asociada y estado administrativo."
          : "Base project data, linked organization and administrative status.",

      description:
        safeLocale === "es" ? "Descripción del proyecto" : "Project description",
      descriptionNote:
        safeLocale === "es"
          ? "Contexto descriptivo completo del proyecto en ambos idiomas."
          : "Full descriptive project context in both languages.",

      media: safeLocale === "es" ? "Portada y galería" : "Cover and gallery",
      mediaNote:
        safeLocale === "es"
          ? "Activos visuales administrados por upload real."
          : "Visual assets handled through real uploads.",

      publication:
        safeLocale === "es" ? "Publicación pública" : "Public publication",
      publicationNote:
        safeLocale === "es"
          ? "La salida pública se limita a nombre, resumen, portada y galería."
          : "Public output is limited to name, summary, cover and gallery.",

      documents:
        safeLocale === "es" ? "Documentos del proyecto" : "Project documents",
      documentsNote:
        safeLocale === "es"
          ? "Carga directa de documentos del proyecto con metadata mínima y clara."
          : "Direct upload of project documents with a minimal and clear metadata set.",

      maintenance:
        safeLocale === "es" ? "Mantenimientos" : "Maintenance",
      maintenanceNote:
        safeLocale === "es"
          ? "Define frecuencia, vigencia y alertas programadas para el cliente y la plataforma."
          : "Define frequency, validity and scheduled alerts for client and platform.",

      cancel: safeLocale === "es" ? "Cancelar" : "Cancel",
      save: safeLocale === "es" ? "Guardar" : "Save",
      saving: safeLocale === "es" ? "Guardando..." : "Saving...",

      addDocument: safeLocale === "es" ? "Agregar documento" : "Add document",
      addMaintenance:
        safeLocale === "es" ? "Agregar mantenimiento" : "Add maintenance",
      remove: safeLocale === "es" ? "Quitar" : "Remove",
      uploadDocument:
        safeLocale === "es" ? "Subir documento" : "Upload document",
      replaceDocument:
        safeLocale === "es" ? "Reemplazar documento" : "Replace document",
      openDocument:
        safeLocale === "es" ? "Abrir archivo" : "Open file",
      currentFile:
        safeLocale === "es" ? "Archivo actual" : "Current file",
      noFileLoaded:
        safeLocale === "es" ? "No hay archivo cargado." : "No file uploaded yet.",

      noDocuments:
        safeLocale === "es"
          ? "No hay documentos asociados."
          : "There are no linked documents.",
      noMaintenance:
        safeLocale === "es"
          ? "No hay mantenimientos registrados."
          : "There are no maintenance records.",

      loadError:
        safeLocale === "es"
          ? "No se pudo cargar el proyecto."
          : "Could not load project.",
      createdOk:
        safeLocale === "es"
          ? "Proyecto creado correctamente."
          : "Project created successfully.",
      updatedOk:
        safeLocale === "es"
          ? "Proyecto actualizado correctamente."
          : "Project updated successfully.",
      genericError:
        safeLocale === "es" ? "Error al guardar." : "Error saving.",
      uploadError:
        safeLocale === "es"
          ? "No se pudo subir el archivo."
          : "Could not upload the file.",

      organizationsLoadError:
        safeLocale === "es"
          ? "No se pudieron cargar las organizaciones."
          : "Could not load organizations.",

      unsavedTitle:
        safeLocale === "es" ? "Cambios sin guardar" : "Unsaved changes",
      unsavedMessage:
        safeLocale === "es"
          ? "Tienes cambios sin guardar. ¿Salir sin guardar?"
          : "You have unsaved changes. Leave without saving?",
      unsavedCancel:
        safeLocale === "es" ? "Seguir editando" : "Keep editing",
      unsavedConfirm:
        safeLocale === "es" ? "Salir sin guardar" : "Leave without saving",

      contract:
        safeLocale === "es" ? "Contrato base" : "Base contract",
      contractNote:
        safeLocale === "es"
          ? "Define inicio y duración del contrato para calcular su vigencia y programar mantenimientos."
          : "Define contract start date and duration to calculate validity and schedule maintenance.",
      contractStartDate:
        safeLocale === "es" ? "Inicio del contrato" : "Contract start date",
      contractDurationMonths:
        safeLocale === "es"
          ? "Duración en meses"
          : "Duration in months",
      contractEndDate:
        safeLocale === "es" ? "Fin calculado" : "Calculated end date",
    }),
    [safeLocale]
  );

  const [form, setForm] = useState<ProjectPayload>(createEmptyProjectPayload());
  const [initialSnapshot, setInitialSnapshot] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationsError, setOrganizationsError] = useState("");

  const [uploadingDocumentIndex, setUploadingDocumentIndex] = useState<number | null>(null);

  const hasChanges = serializeForm(form) !== initialSnapshot;

  function sanitizeProjectPayload(nextValue: ProjectPayload): ProjectPayload {
    const isPublic = Boolean(nextValue.publicSiteSettings.enabled);

    return {
      ...nextValue,
      status: isPublic ? "published" : "draft",
      visibility: isPublic ? "public" : "private",
      featured: Boolean(nextValue.featured),
      contractEndDate: addMonthsToIsoDate(
        nextValue.contractStartDate,
        nextValue.contractDurationMonths
      ),
    };
  }

  function patch<K extends keyof ProjectPayload>(
    key: K,
    value: ProjectPayload[K]
  ) {
    setForm((current) => {
      const nextForm = sanitizeProjectPayload({
        ...current,
        [key]: value,
      });

      const mustRegenerateSchedule =
        key === "contractStartDate" ||
        key === "contractDurationMonths" ||
        key === "clientEmail" ||
        key === "primaryClientId";

      return {
        ...nextForm,
        maintenanceItems:
          key === "maintenanceItems"
            ? (value as ProjectPayload["maintenanceItems"])
            : rebuildMaintenanceItems(
                nextForm,
                selectedOrganization?.email ?? "",
                {
                  forceRegenerateSchedule: mustRegenerateSchedule,
                }
              ),
      };
    });
  }

  function isFormValid(): boolean {
    return (
      form.slug.trim().length > 0 &&
      form.title.es.trim().length > 0 &&
      form.title.en.trim().length > 0 &&
      form.summary.es.trim().length > 0 &&
      form.summary.en.trim().length > 0 &&
      form.description.es.trim().length > 0 &&
      form.description.en.trim().length > 0 &&
      form.contractStartDate !== null &&
      form.contractDurationMonths !== null &&
      form.contractDurationMonths > 0 &&
      form.contractEndDate !== null &&
      normalizeString(form.primaryClientId).length > 0
    );
  }

  const canSave = hasChanges && isFormValid() && !saving && !loading;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadInitial() {
      if (!projectId) {
        const empty = sanitizeProjectPayload(createEmptyProjectPayload());
        setForm(empty);
        setInitialSnapshot(serializeForm(empty));
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(`/api/admin/projects/${projectId}`, {
          cache: "no-store",
        });

        const json = (await res.json().catch(() => null)) as
          | { ok: true; item: ProjectEntity }
          | { ok: false; error: string }
          | null;

        if (cancelled) return;

        if (!res.ok || !json || !json.ok) {
          toastRef.current.error(
            json && !json.ok ? json.error : "Error loading project"
          );

          const empty = sanitizeProjectPayload(createEmptyProjectPayload());
          setForm(empty);
          setInitialSnapshot(serializeForm(empty));
          return;
        }

        const normalized = sanitizeProjectPayload(
          normalizeProjectEntity(json.item)
        );

        const normalizedWithMaintenance = {
          ...normalized,
          maintenanceItems: rebuildMaintenanceItems(
            normalized,
            normalized.clientEmail || "",
            {
              forceRegenerateSchedule: false,
            }
          ),
        };

        setForm(normalizedWithMaintenance);
        setInitialSnapshot(serializeForm(normalizedWithMaintenance));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadOrganizations() {
      try {
        setOrganizationsLoading(true);
        setOrganizationsError("");

        const response = await fetch("/api/admin/organizations", {
          method: "GET",
          cache: "no-store",
        });

        const json = (await response.json().catch(() => null)) as
          | OrganizationsResponse
          | null;

        if (!response.ok || !json || !json.ok) {
          throw new Error(
            json && !json.ok ? json.error : t.organizationsLoadError
          );
        }

        if (cancelled) return;

        const source = safeArray(json.items ?? json.organizations ?? json.data);

        const mapped = source
          .map((item) => ({
            id: normalizeString(item._id),
            label: mapOrganizationLabel(item),
            email:
              normalizeString((item as RawOrganization & { primaryEmail?: string }).primaryEmail) ||
              normalizeString(item.email),
          }))
          .filter((item) => item.id.length > 0);

        const deduped = Array.from(
          new Map(mapped.map((item) => [item.id, item])).values()
        );

        setOrganizations(deduped);
      } catch (error) {
        if (cancelled) return;

        setOrganizations([]);
        setOrganizationsError(
          error instanceof Error ? error.message : t.organizationsLoadError
        );
      } finally {
        if (!cancelled) {
          setOrganizationsLoading(false);
        }
      }
    }

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [isOpen, t.organizationsLoadError]);

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.id === form.primaryClientId) ?? null,
    [organizations, form.primaryClientId]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedOrganization) return;

    setForm((current) => {
      if (current.clientEmail) return current;

      const nextForm = sanitizeProjectPayload({
        ...current,
        clientDisplayName:
          normalizeString(current.clientDisplayName) ||
          normalizeString(selectedOrganization.label),
        clientEmail:
          normalizeString(current.clientEmail) ||
          normalizeString(selectedOrganization.email),
      });

      return {
        ...nextForm,
        maintenanceItems: rebuildMaintenanceItems(
          nextForm,
          selectedOrganization.email,
          {
            forceRegenerateSchedule: false,
          }
        ),
      };
    });
  }, [isOpen, selectedOrganization]);

  async function handleSave() {
    if (saving || loading) return;

    const basePrepared = sanitizeProjectPayload({
      ...form,
      clientDisplayName:
        normalizeString(form.clientDisplayName) ||
        normalizeString(selectedOrganization?.label) ||
        "",
      clientEmail:
        normalizeString(form.clientEmail) ||
        normalizeString(selectedOrganization?.email) ||
        "",
    });

    const prepared: ProjectPayload = {
      ...basePrepared,
      maintenanceItems: rebuildMaintenanceItems(
        basePrepared,
        selectedOrganization?.email,
        {
          forceRegenerateSchedule: false,
        }
      ),
    };

    if (
      !(
        prepared.slug.trim().length > 0 &&
        prepared.title.es.trim().length > 0 &&
        prepared.title.en.trim().length > 0 &&
        prepared.summary.es.trim().length > 0 &&
        prepared.summary.en.trim().length > 0 &&
        prepared.description.es.trim().length > 0 &&
        prepared.description.en.trim().length > 0 &&
        prepared.contractStartDate !== null &&
        prepared.contractDurationMonths !== null &&
        prepared.contractDurationMonths > 0 &&
        prepared.contractEndDate !== null &&
        normalizeString(prepared.primaryClientId).length > 0
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const endpoint = isEditing
        ? `/api/admin/projects/${projectId}`
        : "/api/admin/projects";

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prepared),
      });

      const json = (await response.json().catch(() => null)) as
        | { ok: true; item: ProjectEntity }
        | { ok: false; error: string; details?: string[] }
        | null;

      if (!response.ok || !json || !json.ok) {
        const detailText =
          json && !json.ok && Array.isArray(json.details) && json.details.length > 0
            ? ` ${json.details.join(" ")}`
            : "";

        toastRef.current.error(
          json && !json.ok ? `${json.error}${detailText}`.trim() : t.genericError
        );
        return;
      }

      const savedEntity = normalizeProjectEntity(json.item);
      const normalizedSaved = sanitizeProjectPayload(savedEntity);

      setForm(normalizedSaved);
      setInitialSnapshot(serializeForm(normalizedSaved));

      toastRef.current.success(isEditing ? t.updatedOk : t.createdOk);
      onSaved(savedEntity);
      setShowUnsaved(false);
    } finally {
      setSaving(false);
    }
  }

  async function uploadProjectAsset(
    file: File,
    scope: "projects/covers" | "projects/gallery" = "projects/covers"
  ): Promise<{
    url: string;
    alt?: string;
    storageKey?: string;
  }> {
    const result = await uploadAdminFile(file, scope);

    if (!result.ok || !result.file) {
      throw new Error(result.message || t.uploadError);
    }

    return {
      url: result.file.fileKey,
      storageKey: result.file.fileKey,
      alt: "",
    };
  }

  async function uploadProjectDocument(file: File): Promise<{
    fileUrl: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/projects/upload", {
      method: "POST",
      body: formData,
    });

    const json = (await response.json().catch(() => null)) as
      | ProjectUploadResponse
      | null;

    if (!response.ok || !json || !json.ok) {
      throw new Error(json && !json.ok ? json.error : t.uploadError);
    }

    return {
      fileUrl: json.item.url,
      storageKey: json.item.storageKey,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    };
  }

  async function uploadMaintenanceFiles(
    files: FileList | File[]
  ): Promise<ProjectFileAttachment[]> {
    const fileArray = Array.from(files);

    const uploaded = await Promise.all(
      fileArray.map(async (file) => {
        const result = await uploadAdminFile(file, "projects/maintenance");

        if (!result.ok || !result.file) {
          throw new Error(result.message || t.uploadError);
        }

        return {
          name: result.file.originalName || result.file.fileName,
          url: result.file.fileKey,
          storageKey: result.file.fileKey,
          mimeType: result.file.mimeType,
          size: result.file.sizeBytes,
        } satisfies ProjectFileAttachment;
      })
    );

    return uploaded;
  }

  function requestClose() {
    if (hasChanges) {
      setShowUnsaved(true);
      return;
    }

    onClose();
  }

  function addDocument() {
    patch("documents", [
      ...form.documents,
      {
        ...createEmptyDocumentLink(),
        sortOrder: form.documents.length,
      },
    ]);
  }

  function removeDocument(index: number) {
    patch(
      "documents",
      form.documents
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          sortOrder: itemIndex,
        }))
    );
  }

  function patchDocument<K extends keyof ProjectDocumentLink>(
    index: number,
    key: K,
    value: ProjectDocumentLink[K]
  ) {
    patch(
      "documents",
      form.documents.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }

  async function handleDocumentFileSelected(
    index: number,
    file: File | null
  ): Promise<void> {
    if (!file) return;

    try {
      setUploadingDocumentIndex(index);

      const uploaded = await uploadProjectDocument(file);

      patch(
        "documents",
        form.documents.map((item, itemIndex) => {
          if (itemIndex !== index) return item;

          const nextTitle = item.title.trim()
            ? item.title
            : inferTitleFromFileName(uploaded.fileName);

          return {
            ...item,
            title: nextTitle,
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            storageKey: uploaded.storageKey,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            documentDate: item.documentDate ?? new Date().toISOString(),
          };
        })
      );
    } catch (error) {
      toastRef.current.error(error instanceof Error ? error.message : t.uploadError);
    } finally {
      setUploadingDocumentIndex(null);
    }
  }

  function addMaintenanceItem() {
    patch("maintenanceItems", [
      ...form.maintenanceItems,
      createEmptyMaintenanceItem(),
    ]);
  }

  function removeMaintenanceItem(index: number) {
    patch(
      "maintenanceItems",
      form.maintenanceItems.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function patchMaintenance<
    K extends keyof ProjectPayload["maintenanceItems"][number]
  >(
    index: number,
    key: K,
    value: ProjectPayload["maintenanceItems"][number][K]
  ) {
    setForm((current) => {
      const nextMaintenanceItems = current.maintenanceItems.map((item, itemIndex) =>
        itemIndex === index
          ? ({
              ...item,
              [key]: value,
            } as ProjectPayload["maintenanceItems"][number])
          : item
      );

      const nextForm = sanitizeProjectPayload({
        ...current,
        maintenanceItems: nextMaintenanceItems,
      });

      const mustRegenerateSchedule =
        key === "frequencyValue" ||
        key === "frequencyUnit" ||
        key === "lastCompletedDate" ||
        key === "alertDaysBefore" ||
        key === "isRecurring" ||
        key === "notifyClient" ||
        key === "notifyInternal" ||
        key === "status";

      return {
        ...nextForm,
        maintenanceItems: rebuildMaintenanceItems(
          nextForm,
          selectedOrganization?.email,
          {
            forceRegenerateSchedule: mustRegenerateSchedule,
          }
        ),
      };
    });
  }

  function setMaintenanceRelatedDocuments(index: number, nextIds: string[]) {
    patchMaintenance(index, "relatedDocumentIds", uniq(nextIds));
  }

  function addMaintenanceAttachments(
    index: number,
    items: ProjectFileAttachment[]
  ) {
    patchMaintenance(index, "attachments", [
      ...form.maintenanceItems[index].attachments,
      ...items,
    ]);
  }

  function removeMaintenanceAttachment(
    maintenanceIndex: number,
    attachmentIndex: number
  ) {
    patchMaintenance(
      maintenanceIndex,
      "attachments",
      form.maintenanceItems[maintenanceIndex].attachments.filter(
        (_, index) => index !== attachmentIndex
      )
    );
  }

  function patchMaintenanceScheduleDate(
    maintenanceIndex: number,
    scheduleIndex: number,
    maintenanceDate: string | null
  ) {
    if (!maintenanceDate) return;

    setForm((current) => {
      const item = current.maintenanceItems[maintenanceIndex];
      if (!item) return current;

      const resolvedClientEmail =
        normalizeString(current.clientEmail) ||
        normalizeString(selectedOrganization?.email) ||
        "";

      const baseSchedule =
        item.schedule.length > 0
          ? item.schedule
          : generateSchedulePreview(
              item,
              maintenanceIndex,
              current.contractStartDate,
              current.contractEndDate,
              resolvedClientEmail
            );

      const nextSchedule = baseSchedule.map((entry, index) => {
        if (index !== scheduleIndex) return entry;

        const nextAlertDate =
          item.alertDaysBefore && item.alertDaysBefore > 0
            ? (() => {
                const date = parseDateOnly(maintenanceDate);
                if (!date) return null;
                date.setDate(date.getDate() - item.alertDaysBefore);
                return formatDateOnly(date);
              })()
            : null;

        return {
          ...entry,
          maintenanceDate,
          alertDate: nextAlertDate,
          recipientEmail:
            normalizeString(entry.recipientEmail) || resolvedClientEmail,
        };
      });

      const nextMaintenanceItems = current.maintenanceItems.map(
        (currentItem, currentIndex) =>
          currentIndex === maintenanceIndex
            ? {
                ...currentItem,
                schedule: nextSchedule,
                nextDueDate: nextSchedule[0]?.maintenanceDate ?? null,
              }
            : currentItem
      );

      const nextForm = sanitizeProjectPayload({
        ...current,
        maintenanceItems: nextMaintenanceItems,
      });

      return {
        ...nextForm,
        maintenanceItems: nextForm.maintenanceItems.map((maintenanceItem, idx) =>
          idx === maintenanceIndex ? nextMaintenanceItems[maintenanceIndex] : maintenanceItem
        ),
      };
    });
  }

  if (!isOpen) return null;

  const modalStatusTone = getProjectStatusTone(form.status);
  const modalStatusLabel = getProjectStatusLabel(form.status, safeLocale);
  const contractStartedBeforeToday =
    Boolean(form.contractStartDate) &&
    hasContractStartedBeforeToday(form.contractStartDate);

  return (
    <>
      <GlobalModal
        open={isOpen}
        onClose={requestClose}
        title=""
        size="xl"
        showCloseButton={false}
        footer={
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-muted">
              {safeLocale === "es"
                ? "Los cambios se guardan sobre el contrato actual del proyecto."
                : "Changes are saved against the current project contract."}
            </p>

            <div className="flex flex-wrap justify-end gap-3">
              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                onClick={requestClose}
              >
                {t.cancel}
              </GlobalButton>

              <GlobalButton
                variant="primary"
                size="sm"
                className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
                disabled={!canSave}
                onClick={() => void handleSave()}
              >
                {saving ? t.saving : t.save}
              </GlobalButton>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="py-8 text-sm text-text-secondary">
            {t.loadingProject}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-text-primary">
                      {isEditing ? t.editTitle : t.createTitle}
                    </h2>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClasses(
                        modalStatusTone
                      )}`}
                    >
                      {modalStatusLabel}
                    </span>
                  </div>

                  <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                    {t.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 xl:justify-end">
                  <GlobalButton
                    variant="primary"
                    size="sm"
                    className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
                    disabled={!canSave}
                    onClick={() => void handleSave()}
                  >
                    {saving ? t.saving : t.save}
                  </GlobalButton>

                  <GlobalButton
                    variant="secondary"
                    size="sm"
                    className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                    onClick={requestClose}
                  >
                    {t.cancel}
                  </GlobalButton>
                </div>
              </div>
            </div>

            <SectionCard title={t.identity} subtitle={t.identityNote}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div>
                    <FieldLabel>Slug</FieldLabel>
                    <div className="flex gap-2">
                      <input
                        value={form.slug}
                        onChange={(e) => patch("slug", slugify(e.currentTarget.value))}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patch(
                            "slug",
                            slugify(form.title.es || form.title.en || form.slug)
                          )
                        }
                        className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-text-primary hover:bg-surface-soft"
                      >
                        {safeLocale === "es" ? "Generar" : "Generate"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>
                      {safeLocale === "es" ? "Organización" : "Organization"}
                    </FieldLabel>
                    <select
                      value={form.primaryClientId ?? ""}
                      onChange={(e) => {
                        const nextId = e.currentTarget.value || null;
                        const selected =
                          organizations.find((item) => item.id === nextId) ?? null;

                        setForm((current) => {
                          const nextForm = sanitizeProjectPayload({
                            ...current,
                            primaryClientId: nextId,
                            clientDisplayName: selected?.label || "",
                            clientEmail: selected?.email || "",
                          });

                          return {
                            ...nextForm,
                            maintenanceItems: rebuildMaintenanceItems(
                              nextForm,
                              selected?.email,
                              {
                                forceRegenerateSchedule: true,
                              }
                            ),
                          };
                        });
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    >
                      <option value="">
                        {safeLocale === "es"
                          ? "Seleccionar organización"
                          : "Select organization"}
                      </option>

                      {organizations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    {organizationsLoading ? (
                      <p className="mt-1.5 text-xs text-text-muted">
                        {safeLocale === "es"
                          ? "Cargando organizaciones..."
                          : "Loading organizations..."}
                      </p>
                    ) : organizationsError ? (
                      <p className="mt-1.5 text-xs text-status-error">
                        {organizationsError}
                      </p>
                    ) : selectedOrganization ? (
                      <p className="mt-1.5 text-xs text-text-muted">
                        {selectedOrganization.email || selectedOrganization.id}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                  <div>
                    <FieldLabel>{t.contractStartDate}</FieldLabel>
                    <input
                      type="date"
                      value={toDateInputValue(form.contractStartDate)}
                      onChange={(e) => {
                        const nextStartDate = toNullableIsoDate(e.currentTarget.value);

                        setForm((current) => {
                          const nextForm = sanitizeProjectPayload({
                            ...current,
                            contractStartDate: nextStartDate,
                          });

                          return {
                            ...nextForm,
                            maintenanceItems: rebuildMaintenanceItems(
                              nextForm,
                              selectedOrganization?.email,
                              {
                                forceRegenerateSchedule: true,
                              }
                            ),
                          };
                        });
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>

                  <div>
                    <FieldLabel>{t.contractDurationMonths}</FieldLabel>
                    <input
                      type="number"
                      min={1}
                      value={form.contractDurationMonths ?? ""}
                      onChange={(e) => {
                        const nextDuration = toNullableNumber(e.currentTarget.value);

                        setForm((current) => {
                          const nextForm = sanitizeProjectPayload({
                            ...current,
                            contractDurationMonths: nextDuration,
                          });

                          return {
                            ...nextForm,
                            maintenanceItems: rebuildMaintenanceItems(
                              nextForm,
                              selectedOrganization?.email,
                              {
                                forceRegenerateSchedule: true,
                              }
                            ),
                          };
                        });
                      }}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>

                  <div>
                    <FieldLabel>{t.contractEndDate}</FieldLabel>
                    <input
                      type="date"
                      value={toDateInputValue(form.contractEndDate)}
                      disabled
                      className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-sm text-text-muted outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div>
                    <FieldLabel>Título (ES)</FieldLabel>
                    <input
                      value={form.title.es}
                      onChange={(e) =>
                        patch("title", {
                          ...form.title,
                          es: e.currentTarget.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>

                  <div>
                    <FieldLabel>Title (EN)</FieldLabel>
                    <input
                      value={form.title.en}
                      onChange={(e) =>
                        patch("title", {
                          ...form.title,
                          en: e.currentTarget.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div>
                    <FieldLabel>Resumen (ES)</FieldLabel>
                    <textarea
                      rows={4}
                      value={form.summary.es}
                      onChange={(e) =>
                        patch("summary", {
                          ...form.summary,
                          es: e.currentTarget.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>

                  <div>
                    <FieldLabel>Summary (EN)</FieldLabel>
                    <textarea
                      rows={4}
                      value={form.summary.en}
                      onChange={(e) =>
                        patch("summary", {
                          ...form.summary,
                          en: e.currentTarget.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t.description} subtitle={t.descriptionNote}>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div>
                  <FieldLabel>Descripción (ES)</FieldLabel>
                  <textarea
                    rows={9}
                    value={form.description.es}
                    onChange={(e) =>
                      patch("description", {
                        ...form.description,
                        es: e.currentTarget.value,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>

                <div>
                  <FieldLabel>Description (EN)</FieldLabel>
                  <textarea
                    rows={9}
                    value={form.description.en}
                    onChange={(e) =>
                      patch("description", {
                        ...form.description,
                        en: e.currentTarget.value,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t.media} subtitle={t.mediaNote}>
              <div className="grid gap-6 xl:grid-cols-2">
                <ProjectImageUploader
                  label={safeLocale === "es" ? "Portada principal" : "Main cover"}
                  value={form.coverImage}
                  onChange={(nextValue: ProjectImage | null) =>
                    patch("coverImage", nextValue)
                  }
                  onUpload={(file) => uploadProjectAsset(file, "projects/covers")}
                />

                <ProjectGalleryUploader
                  label={safeLocale === "es" ? "Galería" : "Gallery"}
                  value={form.gallery}
                  onChange={(nextValue: ProjectImage[]) => patch("gallery", nextValue)}
                  onUpload={(file) => uploadProjectAsset(file, "projects/gallery")}
                />
              </div>
            </SectionCard>

            <SectionCard title={t.publication} subtitle={t.publicationNote}>
              <div className="space-y-4">
                <label className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={form.publicSiteSettings.enabled}
                  onChange={(e) => {
                  const checked = e.currentTarget.checked;

                  setForm((current) => {
                    const nextForm = sanitizeProjectPayload({
                      ...current,
                      publicSiteSettings: {
                        ...current.publicSiteSettings,
                        enabled: checked,
                      },
                    });

                    return {
                      ...nextForm,
                      maintenanceItems: rebuildMaintenanceItems(
                        nextForm,
                        selectedOrganization?.email,
                        {
                          forceRegenerateSchedule: false,
                        }
                      ),
                    };
                  });
                }}
                    className="h-4 w-4"
                  />
                  <span>
                    {safeLocale === "es"
                      ? "Este proyecto podrá mostrarse en el sitio público"
                      : "This project can be shown on the public website"}
                  </span>
                </label>

                <label className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => patch("featured", e.currentTarget.checked)}
                    className="h-4 w-4"
                  />
                  <span>
                    {safeLocale === "es"
                      ? "Marcar como proyecto destacado"
                      : "Mark as featured project"}
                  </span>
                </label>

                {form.publicSiteSettings.enabled ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-700">
                      {safeLocale === "es"
                        ? "Contenido público habilitado"
                        : "Public content enabled"}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800">
                        {safeLocale === "es" ? "Nombre del proyecto" : "Project name"}
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800">
                        {safeLocale === "es" ? "Resumen" : "Summary"}
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800">
                        {safeLocale === "es" ? "Portada" : "Cover image"}
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800">
                        {safeLocale === "es" ? "Galería" : "Gallery"}
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-emerald-700">
                      {safeLocale === "es"
                        ? "Esta versión pública no expone descripción larga, organización, documentos internos ni mantenimientos."
                        : "This public version does not expose long description, organization, internal documents or maintenance data."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
                    {safeLocale === "es"
                      ? "La publicación pública está desactivada."
                      : "Public publication is disabled."}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title={t.documents}
              subtitle={t.documentsNote}
              actions={
                <GlobalButton
                  variant="secondary"
                  size="sm"
                  className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                  onClick={addDocument}
                >
                  {t.addDocument}
                </GlobalButton>
              }
            >
              <div className="space-y-4">
                {form.documents.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
                    {t.noDocuments}
                  </div>
                ) : (
                  form.documents.map((item, index) => {
                    const isUploadingThisDocument = uploadingDocumentIndex === index;

                    return (
                      <div
                        key={`${item.documentId || "new"}-${index}`}
                        className="rounded-2xl border border-border bg-surface p-4"
                      >
                        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary">
                              {safeLocale === "es"
                                ? `Documento #${index + 1}`
                                : `Document #${index + 1}`}
                            </p>
                            <p className="mt-1 text-xs text-text-muted">
                              {item.title ||
                                (safeLocale === "es" ? "Sin título" : "Untitled")}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="rounded-xl border border-status-error bg-surface px-3 py-2 text-xs text-status-error hover:bg-surface-soft"
                          >
                            {t.remove}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          <div className="xl:col-span-2 rounded-xl border border-border bg-surface-soft p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                                  {t.currentFile}
                                </p>
                                <div className="mt-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary">
                                  {item.fileName ||
                                    item.storageKey ||
                                    item.fileUrl ||
                                    t.noFileLoaded}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.svg"
                                    className="hidden"
                                    disabled={isUploadingThisDocument}
                                    onChange={async (e) => {
                                      const input = e.currentTarget;
                                      const file = input.files?.[0] ?? null;

                                      try {
                                        await handleDocumentFileSelected(index, file);
                                      } finally {
                                        input.value = "";
                                      }
                                    }}
                                  />
                                  {isUploadingThisDocument
                                    ? t.saving
                                    : item.fileUrl
                                      ? t.replaceDocument
                                      : t.uploadDocument}
                                </label>

                                {(item.fileUrl || item.storageKey) ? (
                                  <a
                                    href={item.fileUrl || item.storageKey}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft"
                                  >
                                    {t.openDocument}
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Título" : "Title"}
                            </FieldLabel>
                            <input
                              value={item.title}
                              onChange={(e) =>
                                patchDocument(index, "title", e.currentTarget.value)
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es"
                                ? "Tipo documental"
                                : "Document type"}
                            </FieldLabel>
                            <select
                              value={item.documentType}
                              onChange={(e) =>
                                patchDocument(
                                  index,
                                  "documentType",
                                  e.currentTarget.value as ProjectDocumentType
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            >
                              <option value="contract">
                                {resolveDocumentTypeLabel("contract", safeLocale)}
                              </option>
                              <option value="planning">
                                {resolveDocumentTypeLabel("planning", safeLocale)}
                              </option>
                              <option value="schedule">
                                {resolveDocumentTypeLabel("schedule", safeLocale)}
                              </option>
                              <option value="technical_design">
                                {resolveDocumentTypeLabel("technical_design", safeLocale)}
                              </option>
                              <option value="plan">
                                {resolveDocumentTypeLabel("plan", safeLocale)}
                              </option>
                              <option value="technical_report">
                                {resolveDocumentTypeLabel("technical_report", safeLocale)}
                              </option>
                              <option value="technical_sheet">
                                {resolveDocumentTypeLabel("technical_sheet", safeLocale)}
                              </option>
                              <option value="operation_manual">
                                {resolveDocumentTypeLabel("operation_manual", safeLocale)}
                              </option>
                              <option value="maintenance_manual">
                                {resolveDocumentTypeLabel("maintenance_manual", safeLocale)}
                              </option>
                              <option value="inspection_report">
                                {resolveDocumentTypeLabel("inspection_report", safeLocale)}
                              </option>
                              <option value="maintenance_report">
                                {resolveDocumentTypeLabel("maintenance_report", safeLocale)}
                              </option>
                              <option value="delivery_record">
                                {resolveDocumentTypeLabel("delivery_record", safeLocale)}
                              </option>
                              <option value="certificate">
                                {resolveDocumentTypeLabel("certificate", safeLocale)}
                              </option>
                              <option value="warranty">
                                {resolveDocumentTypeLabel("warranty", safeLocale)}
                              </option>
                              <option value="invoice">
                                {resolveDocumentTypeLabel("invoice", safeLocale)}
                              </option>
                              <option value="permit">
                                {resolveDocumentTypeLabel("permit", safeLocale)}
                              </option>
                              <option value="photo_evidence">
                                {resolveDocumentTypeLabel("photo_evidence", safeLocale)}
                              </option>
                              <option value="other">
                                {resolveDocumentTypeLabel("other", safeLocale)}
                              </option>
                            </select>
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Visibilidad" : "Visibility"}
                            </FieldLabel>
                            <select
                              value={item.visibility}
                              onChange={(e) =>
                                patchDocument(
                                  index,
                                  "visibility",
                                  e.currentTarget.value as ProjectDocumentVisibility
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            >
                              <option value="public">
                                {safeLocale === "es" ? "Público" : "Public"}
                              </option>
                              <option value="private">
                                {safeLocale === "es" ? "Privado" : "Private"}
                              </option>
                              <option value="internal">
                                {safeLocale === "es" ? "Interno" : "Internal"}
                              </option>
                            </select>
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Idioma" : "Language"}
                            </FieldLabel>
                            <select
                              value={item.language}
                              onChange={(e) =>
                                patchDocument(
                                  index,
                                  "language",
                                  e.currentTarget.value as ProjectDocumentLink["language"]
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            >
                              <option value="none">
                                {safeLocale === "es" ? "No aplica" : "N/A"}
                              </option>
                              <option value="es">ES</option>
                              <option value="en">EN</option>
                              <option value="both">
                                {safeLocale === "es" ? "Ambos" : "Both"}
                              </option>
                            </select>
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es"
                                ? "Fecha del documento"
                                : "Document date"}
                            </FieldLabel>
                            <input
                              type="date"
                              value={toDateInputValue(item.documentDate)}
                              onChange={(e) =>
                                patchDocument(
                                  index,
                                  "documentDate",
                                  toNullableIsoDate(e.currentTarget.value)
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Versión" : "Version"}
                            </FieldLabel>
                            <input
                              value={item.version}
                              onChange={(e) =>
                                patchDocument(index, "version", e.currentTarget.value)
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div className="xl:col-span-2">
                            <FieldLabel>
                              {safeLocale === "es" ? "Descripción" : "Description"}
                            </FieldLabel>
                            <textarea
                              rows={3}
                              value={item.description}
                              onChange={(e) =>
                                patchDocument(
                                  index,
                                  "description",
                                  e.currentTarget.value
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div className="xl:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={item.visibleInPortal}
                                onChange={(e) =>
                                  patchDocument(
                                    index,
                                    "visibleInPortal",
                                    e.currentTarget.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                              <span>
                                {safeLocale === "es"
                                  ? "Visible en portal"
                                  : "Visible in portal"}
                              </span>
                            </label>

                            <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={item.visibleInPublicSite}
                                onChange={(e) => {
                                  const checked = e.currentTarget.checked;

                                  patch(
                                    "documents",
                                    form.documents.map((doc, docIndex) =>
                                      docIndex === index
                                        ? {
                                            ...doc,
                                            visibleInPublicSite: checked,
                                            isPublic: checked,
                                          }
                                        : doc
                                    )
                                  );
                                }}
                                className="h-4 w-4"
                              />
                              <span>
                                {safeLocale === "es"
                                  ? "Visible en sitio público"
                                  : "Visible in public site"}
                              </span>
                            </label>

                            <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={item.isCritical}
                                onChange={(e) =>
                                  patchDocument(
                                    index,
                                    "isCritical",
                                    e.currentTarget.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                              <span>
                                {safeLocale === "es"
                                  ? "Documento crítico"
                                  : "Critical document"}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>

            <SectionCard
              title={t.maintenance}
              subtitle={t.maintenanceNote}
              actions={
                <GlobalButton
                  variant="secondary"
                  size="sm"
                  className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                  onClick={addMaintenanceItem}
                >
                  {t.addMaintenance}
                </GlobalButton>
              }
            >
              <div className="space-y-5">
                {form.maintenanceItems.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
                    {t.noMaintenance}
                  </div>
                ) : (
                  form.maintenanceItems.map((item, index) => {
                    const generatedSchedule = generateSchedulePreview(
                      item,
                      index,
                      form.contractStartDate,
                      form.contractEndDate,
                      form.clientEmail || selectedOrganization?.email || ""
                    );

                    const previewSchedule =
                      item.schedule.length > 0
                        ? item.schedule.map((entry) => ({
                            ...entry,
                            recipientEmail:
                              entry.recipientEmail?.trim() ||
                              form.clientEmail ||
                              selectedOrganization?.email ||
                              "",
                          }))
                        : generatedSchedule;

                    const cardTitle = inferMaintenanceCardTitle(item, safeLocale);

                    return (
                      <div
                        key={`maintenance-${index}`}
                        className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
                      >
                        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-text-primary">
                                {safeLocale === "es"
                                  ? `Mantenimiento #${index + 1}`
                                  : `Maintenance #${index + 1}`}
                              </p>

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getMaintenanceStatusClasses(
                                  item.status
                                )}`}
                              >
                                {resolveMaintenanceStatusLabel(item.status, safeLocale)}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-text-primary">
                              {cardTitle}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="inline-flex rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] text-text-secondary">
                                {safeLocale === "es" ? "Próxima fecha:" : "Next due:"}{" "}
                                <span className="ml-1 font-medium text-text-primary">
                                  {formatHumanDate(
                                    item.nextDueDate ||
                                      (previewSchedule.length > 0 ? previewSchedule[0].maintenanceDate : null),
                                    safeLocale
                                  )}
                                </span>
                              </span>

                              <span className="inline-flex rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] text-text-secondary">
                                {safeLocale === "es" ? "Programación:" : "Schedule:"}{" "}
                                <span className="ml-1 font-medium text-text-primary">
                                  {previewSchedule.length}
                                </span>
                              </span>

                              <span className="inline-flex rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] text-text-secondary">
                                {safeLocale === "es" ? "Cliente:" : "Client:"}{" "}
                                <span className="ml-1 font-medium text-text-primary">
                                  {item.notifyClient
                                    ? safeLocale === "es"
                                      ? "Sí"
                                      : "Yes"
                                    : safeLocale === "es"
                                      ? "No"
                                      : "No"}
                                </span>
                              </span>

                              <span className="inline-flex rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] text-text-secondary">
                                {safeLocale === "es" ? "Interno:" : "Internal:"}{" "}
                                <span className="ml-1 font-medium text-text-primary">
                                  {item.notifyInternal
                                    ? safeLocale === "es"
                                      ? "Sí"
                                      : "Yes"
                                    : safeLocale === "es"
                                      ? "No"
                                      : "No"}
                                </span>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeMaintenanceItem(index)}
                            className="rounded-xl border border-status-error bg-surface px-3 py-2 text-xs text-status-error hover:bg-surface-soft"
                          >
                            {t.remove}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Título" : "Title"}
                            </FieldLabel>
                            <input
                              value={item.title}
                              onChange={(e) =>
                                patchMaintenance(index, "title", e.currentTarget.value)
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Tipo" : "Type"}
                            </FieldLabel>
                            <select
                              value={item.maintenanceType}
                              onChange={(e) =>
                                patchMaintenance(
                                  index,
                                  "maintenanceType",
                                  e.currentTarget.value as MaintenanceType
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            >
                              <option value="preventive">
                                {safeLocale === "es" ? "Preventivo" : "Preventive"}
                              </option>
                              <option value="corrective">
                                {safeLocale === "es" ? "Correctivo" : "Corrective"}
                              </option>
                              <option value="cleaning">
                                {safeLocale === "es" ? "Limpieza" : "Cleaning"}
                              </option>
                              <option value="inspection">
                                {safeLocale === "es" ? "Inspección" : "Inspection"}
                              </option>
                              <option value="replacement">
                                {safeLocale === "es" ? "Reemplazo" : "Replacement"}
                              </option>
                              <option value="other">
                                {safeLocale === "es" ? "Otro" : "Other"}
                              </option>
                            </select>
                          </div>

                          <div className="xl:col-span-2">
                            <FieldLabel>
                              {safeLocale === "es"
                                ? "Descripción / nota"
                                : "Description / note"}
                            </FieldLabel>
                            <textarea
                              rows={3}
                              value={item.description}
                              onChange={(e) =>
                                patchMaintenance(
                                  index,
                                  "description",
                                  e.currentTarget.value
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Frecuencia" : "Frequency"}
                            </FieldLabel>
                            <input
                              type="number"
                              value={item.frequencyValue ?? ""}
                              onChange={(e) =>
                                patchMaintenance(
                                  index,
                                  "frequencyValue",
                                  toNullableNumber(e.currentTarget.value)
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Unidad" : "Unit"}
                            </FieldLabel>
                            <select
                              value={item.frequencyUnit ?? "months"}
                              onChange={(e) =>
                                patchMaintenance(
                                  index,
                                  "frequencyUnit",
                                  e.currentTarget.value as MaintenanceFrequencyUnit
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            >
                              <option value="days">
                                {safeLocale === "es" ? "Días" : "Days"}
                              </option>
                              <option value="weeks">
                                {safeLocale === "es" ? "Semanas" : "Weeks"}
                              </option>
                              <option value="months">
                                {safeLocale === "es" ? "Meses" : "Months"}
                              </option>
                              <option value="years">
                                {safeLocale === "es" ? "Años" : "Years"}
                              </option>
                            </select>
                          </div>

                          {contractStartedBeforeToday ? (
                            <div>
                              <FieldLabel>
                                {safeLocale === "es"
                                  ? "Último realizado"
                                  : "Last completed"}
                              </FieldLabel>
                              <input
                                type="date"
                                value={toDateInputValue(item.lastCompletedDate)}
                                onChange={(e) =>
                                  patchMaintenance(
                                    index,
                                    "lastCompletedDate",
                                    toNullableIsoDate(e.currentTarget.value)
                                  )
                                }
                                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                              />
                            </div>
                          ) : null}

                          <div>
                            <FieldLabel>
                              {safeLocale === "es" ? "Estado" : "Status"}
                            </FieldLabel>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                patchMaintenance(
                                  index,
                                  "status",
                                  e.currentTarget.value as MaintenanceStatus
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            >
                              <option value="scheduled">
                                {safeLocale === "es" ? "Programado" : "Scheduled"}
                              </option>
                              <option value="completed">
                                {safeLocale === "es" ? "Completado" : "Completed"}
                              </option>
                              <option value="overdue">
                                {safeLocale === "es" ? "Vencido" : "Overdue"}
                              </option>
                              <option value="cancelled">
                                {safeLocale === "es" ? "Cancelado" : "Cancelled"}
                              </option>
                            </select>
                          </div>

                          <div>
                            <FieldLabel
                              hint={
                                safeLocale === "es"
                                  ? "Se usa para alertas previas"
                                  : "Used for pre-alerts"
                              }
                            >
                              {safeLocale === "es"
                                ? "Días previos de alerta"
                                : "Alert days before"}
                            </FieldLabel>
                            <input
                              type="number"
                              value={item.alertDaysBefore ?? ""}
                              onChange={(e) =>
                                patchMaintenance(
                                  index,
                                  "alertDaysBefore",
                                  toNullableNumber(e.currentTarget.value)
                                )
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>

                          <div className="xl:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-3 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={item.notifyClient}
                                onChange={(e) =>
                                  patchMaintenance(
                                    index,
                                    "notifyClient",
                                    e.currentTarget.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                              <span>
                                {safeLocale === "es"
                                  ? "Notificar cliente"
                                  : "Notify client"}
                              </span>
                            </label>

                            <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-3 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={item.notifyInternal}
                                onChange={(e) =>
                                  patchMaintenance(
                                    index,
                                    "notifyInternal",
                                    e.currentTarget.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                              <span>
                                {safeLocale === "es"
                                  ? "Notificar interno"
                                  : "Notify internal"}
                              </span>
                            </label>

                            <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-3 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={item.isRecurring}
                                onChange={(e) =>
                                  patchMaintenance(
                                    index,
                                    "isRecurring",
                                    e.currentTarget.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                              <span>
                                {safeLocale === "es" ? "Recurrente" : "Recurring"}
                              </span>
                            </label>
                          </div>

                          <div className="xl:col-span-2 rounded-2xl border border-border bg-surface-soft p-4">
                            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-text-primary">
                                  {safeLocale === "es"
                                    ? "Programación de mantenimiento"
                                    : "Maintenance schedule"}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {safeLocale === "es"
                                    ? "Vista previa de ciclos, avisos y destinatarios según frecuencia y vigencia del contrato."
                                    : "Preview of cycles, alerts and recipients based on frequency and contract validity."}
                                </p>
                              </div>

                              <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary">
                                {safeLocale === "es" ? "Total:" : "Total:"}{" "}
                                <span className="font-semibold text-text-primary">
                                  {previewSchedule.length}
                                </span>
                              </div>
                            </div>

                            {previewSchedule.length === 0 ? (
                              <div className="rounded-xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
                                {safeLocale === "es"
                                  ? "No hay programación generada todavía. Define frecuencia o próxima fecha y los días previos de aviso."
                                  : "No schedule generated yet. Define frequency or next due date and alert days before."}
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-surface-soft">
                                    <tr className="text-left text-xs uppercase tracking-[0.06em] text-text-muted">
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Ciclo" : "Cycle"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Mantenimiento" : "Maintenance"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Aviso" : "Alert"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Canales" : "Channels"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Destinatarios" : "Recipients"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Correo" : "Email"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Alerta emitida" : "Alert sent"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Cliente realizó" : "Client completed"}
                                      </th>
                                      <th className="px-3 py-3">
                                        {safeLocale === "es" ? "Estado" : "Status"}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {previewSchedule.map((event, scheduleIndex) => (
                                      <tr
                                        key={event.eventId}
                                        className="border-t border-border bg-surface"
                                      >
                                        <td className="px-3 py-3 text-text-primary">
                                          {safeLocale === "es"
                                            ? `Ciclo ${event.cycleIndex + 1}`
                                            : `Cycle ${event.cycleIndex + 1}`}
                                        </td>
                                        <td className="px-3 py-3 text-text-primary">
                                          <input
                                            type="date"
                                            value={toDateInputValue(event.maintenanceDate)}
                                            onChange={(e) =>
                                              patchMaintenanceScheduleDate(
                                                index,
                                                scheduleIndex,
                                                toNullableIsoDate(e.currentTarget.value)
                                              )
                                            }
                                            className="w-full min-w-[150px] rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                                          />
                                        </td>
                                        <td className="px-3 py-3 text-text-primary">
                                          {formatHumanDate(event.alertDate, safeLocale)}
                                        </td>
                                        <td className="px-3 py-3 text-text-primary">
                                          {resolveChannelsLabel(event.channels, safeLocale)}
                                        </td>
                                        <td className="px-3 py-3 text-text-primary">
                                          {resolveRecipientsLabel(event.recipients, safeLocale)}
                                        </td>
                                        <td className="px-3 py-3 text-text-secondary">
                                          {event.recipientEmail.trim() || "—"}
                                        </td>
                                        <td className="px-3 py-3 text-text-primary">
                                          <input
                                            type="checkbox"
                                            checked={event.alertStatus === "emitted"}
                                            readOnly
                                            className="h-4 w-4"
                                          />
                                        </td>
                                        <td className="px-3 py-3 text-text-primary">
                                          <input
                                            type="checkbox"
                                            checked={event.completedByClient}
                                            readOnly
                                            className="h-4 w-4"
                                          />
                                        </td>
                                        <td className="px-3 py-3 text-text-primary">
                                          {resolveScheduleMaintenanceStatusLabel(
                                            event.maintenanceStatus,
                                            safeLocale
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          <div className="xl:col-span-2">
                            <FieldLabel
                              hint={
                                safeLocale === "es"
                                  ? "Opcional · uno o varios"
                                  : "Optional · one or more"
                              }
                            >
                              {safeLocale === "es"
                                ? "Documentos relacionados"
                                : "Related documents"}
                            </FieldLabel>

                            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                              {form.documents.length === 0 ? (
                                <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
                                  {safeLocale === "es"
                                    ? "Primero carga documentos al proyecto para vincularlos aquí."
                                    : "Upload project documents first so they can be linked here."}
                                </div>
                              ) : (
                                form.documents.map((doc) => {
                                  const checked = item.relatedDocumentIds.includes(
                                    doc.documentId
                                  );

                                  return (
                                    <label
                                      key={`${doc.documentId}-${doc.title}`}
                                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-3"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-text-primary">
                                          {doc.title ||
                                            (safeLocale === "es"
                                              ? "Documento"
                                              : "Document")}
                                        </p>
                                        <p className="truncate text-xs text-text-muted">
                                          {resolveDocumentTypeLabel(
                                            doc.documentType,
                                            safeLocale
                                          )}
                                        </p>
                                      </div>

                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const nextIds = e.currentTarget.checked
                                            ? [
                                                ...item.relatedDocumentIds,
                                                doc.documentId,
                                              ]
                                            : item.relatedDocumentIds.filter(
                                                (id) => id !== doc.documentId
                                              );

                                          setMaintenanceRelatedDocuments(
                                            index,
                                            nextIds
                                          );
                                        }}
                                        className="h-4 w-4"
                                      />
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="xl:col-span-2">
                            <FieldLabel
                              hint={
                                safeLocale === "es"
                                  ? "Uno o varios"
                                  : "One or more"
                              }
                            >
                              {safeLocale === "es"
                                ? "Archivos opcionales del mantenimiento"
                                : "Optional maintenance files"}
                            </FieldLabel>

                            <div className="rounded-2xl border border-dashed border-border bg-surface p-4">
                              <input
                                type="file"
                                multiple
                                onChange={async (e) => {
                                  const files = e.currentTarget.files;
                                  if (!files || files.length === 0) return;

                                  try {
                                    const uploaded = await uploadMaintenanceFiles(files);
                                    addMaintenanceAttachments(index, uploaded);
                                    e.currentTarget.value = "";
                                  } catch (error) {
                                    toastRef.current.error(
                                      error instanceof Error
                                        ? error.message
                                        : t.uploadError
                                    );
                                  }
                                }}
                                className="block w-full text-sm text-text-primary file:mr-4 file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-text-primary hover:file:bg-brand-primaryStrong hover:file:text-white"
                              />

                              {item.attachments.length === 0 ? (
                                <div className="mt-3 rounded-xl border border-border bg-surface-soft px-3 py-3 text-sm text-text-muted">
                                  {safeLocale === "es"
                                    ? "No hay archivos cargados para este mantenimiento."
                                    : "No files uploaded for this maintenance item."}
                                </div>
                              ) : (
                                <div className="mt-4 space-y-2">
                                  {item.attachments.map((attachment, attachmentIndex) => (
                                    <div
                                      key={`${attachment.url}-${attachmentIndex}`}
                                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-3"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-text-primary">
                                          {attachment.name || "Archivo"}
                                        </p>
                                        <p className="truncate text-xs text-text-muted">
                                          {attachment.mimeType || "file"} · {attachment.size} bytes
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeMaintenanceAttachment(index, attachmentIndex)
                                        }
                                        className="rounded-xl border border-status-error bg-surface px-3 py-2 text-xs text-status-error hover:bg-surface-soft"
                                      >
                                        {t.remove}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="xl:col-span-2">
                            <FieldLabel>
                              {safeLocale === "es" ? "Notas" : "Notes"}
                            </FieldLabel>
                            <textarea
                              rows={3}
                              value={item.notes}
                              onChange={(e) =>
                                patchMaintenance(index, "notes", e.currentTarget.value)
                              }
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </GlobalModal>

      <GlobalUnsavedChangesConfirm
        open={showUnsaved}
        title={t.unsavedTitle}
        message={t.unsavedMessage}
        cancelLabel={t.unsavedCancel}
        confirmLabel={t.unsavedConfirm}
        onCancel={() => setShowUnsaved(false)}
        onConfirm={() => {
          setShowUnsaved(false);
          onClose();
        }}
      />
    </>
  );
}