/**
 * =============================================================================
 * 📄 Helpers: Project Payload
 * Path: src/lib/projects/projectPayload.ts
 * =============================================================================
 *
 * ES:
 *   Helpers centrales para normalizar el payload del módulo Projects.
 *
 *   Objetivo:
 *   - convertir input desconocido en estructuras estrictas y estables
 *   - proteger UI / API / DB contra datos incompletos o inconsistentes
 *   - alinear el payload con el contrato nuevo de mantenimientos basado en
 *     `schedule` como única fuente estructurada de programación
 *
 * Reglas:
 * - este archivo es la fuente de verdad para normalización defensiva
 * - no debe inventar shapes distintos a los definidos en src/types/project.ts
 * - todo campo de fecha debe salir como ISO string o null
 * - todo array debe salir estable, aunque el input venga corrupto
 * =============================================================================
 */

import type {
  LocalizedText,
  MaintenanceAlertStatus,
  MaintenanceExecutionStatus,
  MaintenanceFrequencyUnit,
  MaintenanceScheduleEntry,
  MaintenanceStatus,
  MaintenanceType,
  ProjectDocumentLanguage,
  ProjectDocumentLink,
  ProjectDocumentType,
  ProjectDocumentVisibility,
  ProjectEntity,
  ProjectFileAttachment,
  ProjectImage,
  ProjectMaintenanceItem,
  ProjectPayload,
  ProjectPublicSiteSettings,
  ProjectStatus,
  ProjectVisibility,
} from "@/types/project";

/* -------------------------------------------------------------------------- */
/* Base helpers                                                               */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeNullableIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toISOString" in value &&
    typeof value.toISOString === "function"
  ) {
    try {
      const iso = value.toISOString();
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Contract helpers                                                           */
/* -------------------------------------------------------------------------- */

function calculateContractEndDate(
  start: string | null,
  durationMonths: number | null
): string | null {
  if (!start || !durationMonths || durationMonths <= 0) return null;

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return null;

  const next = new Date(date);
  next.setMonth(next.getMonth() + durationMonths);

  return next.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Enum normalizers                                                           */
/* -------------------------------------------------------------------------- */

function normalizeProjectStatus(value: unknown): ProjectStatus {
  return value === "published" || value === "archived" ? value : "draft";
}

function normalizeProjectVisibility(value: unknown): ProjectVisibility {
  return value === "public" ? "public" : "private";
}

function normalizeDocumentType(value: unknown): ProjectDocumentType {
  const allowed: readonly ProjectDocumentType[] = [
    "contract",
    "planning",
    "schedule",
    "technical_design",
    "plan",
    "technical_report",
    "technical_sheet",
    "operation_manual",
    "maintenance_manual",
    "inspection_report",
    "maintenance_report",
    "delivery_record",
    "certificate",
    "warranty",
    "invoice",
    "permit",
    "photo_evidence",
    "other",
  ];

  return allowed.includes(value as ProjectDocumentType)
    ? (value as ProjectDocumentType)
    : "other";
}

function normalizeDocumentVisibility(value: unknown): ProjectDocumentVisibility {
  if (value === "public" || value === "internal") return value;
  return "private";
}

function normalizeDocumentLanguage(value: unknown): ProjectDocumentLanguage {
  if (value === "es" || value === "en" || value === "both") return value;
  return "none";
}

function normalizeMaintenanceType(value: unknown): MaintenanceType {
  if (
    value === "preventive" ||
    value === "corrective" ||
    value === "cleaning" ||
    value === "inspection" ||
    value === "replacement"
  ) {
    return value;
  }

  return "other";
}

function normalizeMaintenanceStatus(value: unknown): MaintenanceStatus {
  if (value === "completed" || value === "overdue" || value === "cancelled") {
    return value;
  }

  return "scheduled";
}

function normalizeFrequencyUnit(value: unknown): MaintenanceFrequencyUnit | null {
  if (
    value === "days" ||
    value === "weeks" ||
    value === "months" ||
    value === "years"
  ) {
    return value;
  }

  return null;
}

function normalizeAlertStatus(value: unknown): MaintenanceAlertStatus {
  return value === "emitted" ? "emitted" : "pending";
}

function normalizeExecutionStatus(value: unknown): MaintenanceExecutionStatus {
  if (value === "done" || value === "overdue" || value === "cancelled") {
    return value;
  }

  return "pending";
}

/* -------------------------------------------------------------------------- */
/* Object normalizers                                                         */
/* -------------------------------------------------------------------------- */

function normalizeLocalizedText(value: unknown): LocalizedText {
  const source = isRecord(value) ? value : {};

  return {
    es: normalizeString(source.es),
    en: normalizeString(source.en),
  };
}

function normalizeProjectImage(value: unknown): ProjectImage | null {
  const source = isRecord(value) ? value : null;
  if (!source) return null;

  const url = normalizeString(source.url);
  if (!url) return null;

  return {
    url,
    alt: normalizeString(source.alt),
    storageKey: normalizeString(source.storageKey),
  };
}

function normalizeProjectAttachment(
  value: unknown
): ProjectFileAttachment | null {
  const source = isRecord(value) ? value : null;
  if (!source) return null;

  const url = normalizeString(source.url);
  if (!url) return null;

  return {
    name: normalizeString(source.name),
    url,
    storageKey: normalizeString(source.storageKey),
    mimeType: normalizeString(source.mimeType),
    size: normalizeNumber(source.size, 0),
  };
}

function normalizePublicSiteSettings(
  value: unknown
): ProjectPublicSiteSettings {
  const source = isRecord(value) ? value : {};

  return {
    enabled: normalizeBoolean(source.enabled, false),
    showTitle: normalizeBoolean(source.showTitle, true),
    showSummary: normalizeBoolean(source.showSummary, true),
    showCoverImage: normalizeBoolean(source.showCoverImage, true),
    showGallery: normalizeBoolean(source.showGallery, true),
  };
}

function normalizeDocumentLink(
  value: unknown,
  index: number
): ProjectDocumentLink {
  const source = isRecord(value) ? value : {};

  return {
    documentId: normalizeString(source.documentId),
    title: normalizeString(source.title),
    documentType: normalizeDocumentType(source.documentType),
    description: normalizeString(source.description),
    visibility: normalizeDocumentVisibility(source.visibility),
    language: normalizeDocumentLanguage(source.language),
    documentDate: normalizeNullableIsoDate(source.documentDate),

    fileName: normalizeString(source.fileName),
    fileUrl: normalizeString(source.fileUrl),
    storageKey: normalizeString(source.storageKey),
    mimeType: normalizeString(source.mimeType),
    size: normalizeNullableNumber(source.size),

    version: normalizeString(source.version),
    isPublic: normalizeBoolean(source.isPublic, false),
    visibleInPortal: normalizeBoolean(source.visibleInPortal, true),
    visibleInPublicSite: normalizeBoolean(source.visibleInPublicSite, false),
    visibleToInternalOnly: normalizeBoolean(source.visibleToInternalOnly, false),

    requiresAlert: normalizeBoolean(source.requiresAlert, false),
    alertDate: normalizeNullableIsoDate(source.alertDate),
    nextDueDate: normalizeNullableIsoDate(source.nextDueDate),
    maintenanceFrequency: normalizeString(source.maintenanceFrequency) || null,

    isCritical: normalizeBoolean(source.isCritical, false),
    sortOrder: normalizeNumber(source.sortOrder, index),
    notes: normalizeString(source.notes),
  };
}

function normalizeMaintenanceScheduleEntry(
  value: unknown,
  index: number
): MaintenanceScheduleEntry {
  const source = isRecord(value) ? value : {};

  const channels = safeArray<unknown>(source.channels).filter(
    (item): item is "platform" | "email" =>
      item === "platform" || item === "email"
  );

  const recipients = safeArray<unknown>(source.recipients).filter(
    (item): item is "client" | "internal" =>
      item === "client" || item === "internal"
  );

  return {
    eventId: normalizeString(source.eventId) || `event-${index}`,
    cycleIndex: normalizeNumber(source.cycleIndex, index),
    maintenanceDate:
      normalizeNullableIsoDate(source.maintenanceDate) ??
      new Date().toISOString(),
    alertDate: normalizeNullableIsoDate(source.alertDate),
    alertStatus: normalizeAlertStatus(source.alertStatus),
    maintenanceStatus: normalizeExecutionStatus(source.maintenanceStatus),
    channels,
    recipients,
    recipientEmail: normalizeString(source.recipientEmail),
    emittedAt: normalizeNullableIsoDate(source.emittedAt),
    completedAt: normalizeNullableIsoDate(source.completedAt),
    completedByClient: normalizeBoolean(source.completedByClient, false),
    note: normalizeString(source.note),
  };
}

function normalizeMaintenanceItem(value: unknown): ProjectMaintenanceItem {
  const source = isRecord(value) ? value : {};

  return {
    maintenanceType: normalizeMaintenanceType(source.maintenanceType),
    title: normalizeString(source.title),
    description: normalizeString(source.description),
    frequencyValue: normalizeNullableNumber(source.frequencyValue),
    frequencyUnit: normalizeFrequencyUnit(source.frequencyUnit),
    lastCompletedDate: normalizeNullableIsoDate(source.lastCompletedDate),
    nextDueDate: normalizeNullableIsoDate(source.nextDueDate),
    status: normalizeMaintenanceStatus(source.status),
    notifyClient: normalizeBoolean(source.notifyClient, true),
    notifyInternal: normalizeBoolean(source.notifyInternal, true),
    alertDaysBefore: normalizeNullableNumber(source.alertDaysBefore),
    isRecurring: normalizeBoolean(source.isRecurring, true),
    instructions: normalizeString(source.instructions),
    relatedDocumentIds: safeArray(source.relatedDocumentIds)
      .map(normalizeString)
      .filter(Boolean),
    attachments: safeArray(source.attachments)
      .map(normalizeProjectAttachment)
      .filter((item): item is ProjectFileAttachment => item !== null),
    notes: normalizeString(source.notes),
    schedule: safeArray(source.schedule).map(normalizeMaintenanceScheduleEntry),
  };
}

/* -------------------------------------------------------------------------- */
/* Public helpers                                                             */
/* -------------------------------------------------------------------------- */

export function createEmptyProjectPayload(): ProjectPayload {
  return {
    slug: "",
    status: "draft",
    visibility: "private",
    featured: false,
    sortOrder: 0,

    title: { es: "", en: "" },
    summary: { es: "", en: "" },
    description: { es: "", en: "" },

    primaryClientId: null,
    clientDisplayName: "",
    clientEmail: "",

    coverImage: null,
    gallery: [],

    publicSiteSettings: {
      enabled: false,
      showTitle: true,
      showSummary: true,
      showCoverImage: true,
      showGallery: true,
    },

    documents: [],
    maintenanceItems: [],

    contractStartDate: null,
    contractDurationMonths: null,
    contractEndDate: null,

    technicalOverview: { es: "", en: "" },
    systemType: "",
    treatedMedium: "",
    technologyUsed: [],
    operationalNotes: "",
    internalNotes: "",
    locationLabel: "",
    isPublicLocationVisible: false,
  };
}

export function normalizeProjectWritePayload(value: unknown): ProjectPayload {
  const source = isRecord(value) ? value : {};

  const publicSiteSettings = normalizePublicSiteSettings(
    source.publicSiteSettings
  );

  const contractStartDate = normalizeNullableIsoDate(source.contractStartDate);
  const contractDurationMonths = normalizeNullableNumber(
    source.contractDurationMonths
  );
  const incomingEndDate = normalizeNullableIsoDate(source.contractEndDate);

  return {
    slug: normalizeString(source.slug),
    status: normalizeProjectStatus(source.status),
    visibility: publicSiteSettings.enabled
      ? "public"
      : normalizeProjectVisibility(source.visibility),
    featured: normalizeBoolean(source.featured, false),
    sortOrder: normalizeNumber(source.sortOrder, 0),

    title: normalizeLocalizedText(source.title),
    summary: normalizeLocalizedText(source.summary),
    description: normalizeLocalizedText(source.description),

    primaryClientId: normalizeString(source.primaryClientId) || null,
    clientDisplayName: normalizeString(source.clientDisplayName),
    clientEmail: normalizeString(source.clientEmail),

    coverImage: normalizeProjectImage(source.coverImage),
    gallery: safeArray(source.gallery)
      .map(normalizeProjectImage)
      .filter((item): item is ProjectImage => item !== null),

    publicSiteSettings,

    documents: safeArray(source.documents).map((item, index) =>
      normalizeDocumentLink(item, index)
    ),

    maintenanceItems: safeArray(source.maintenanceItems).map(
      normalizeMaintenanceItem
    ),

    contractStartDate,
    contractDurationMonths,
    contractEndDate:
      incomingEndDate ??
      calculateContractEndDate(contractStartDate, contractDurationMonths),

    technicalOverview: normalizeLocalizedText(source.technicalOverview),
    systemType: normalizeString(source.systemType),
    treatedMedium: normalizeString(source.treatedMedium),
    technologyUsed: safeArray(source.technologyUsed)
      .map(normalizeString)
      .filter(Boolean),
    operationalNotes: normalizeString(source.operationalNotes),
    internalNotes: normalizeString(source.internalNotes),
    locationLabel: normalizeString(source.locationLabel),
    isPublicLocationVisible: normalizeBoolean(
      source.isPublicLocationVisible,
      false
    ),
  };
}

export function normalizeProjectEntity(value: unknown): ProjectEntity {
  const payload = normalizeProjectWritePayload(value);
  const source = isRecord(value) ? value : {};

  const rawId = source._id;
  const normalizedId =
    normalizeString(rawId) ||
    (isRecord(rawId) && typeof rawId.toString === "function"
      ? normalizeString(rawId.toString())
      : "");

  return {
    ...payload,
    _id: normalizedId,
    createdAt:
      normalizeNullableIsoDate(source.createdAt) ?? new Date().toISOString(),
    updatedAt:
      normalizeNullableIsoDate(source.updatedAt) ?? new Date().toISOString(),
  };
}