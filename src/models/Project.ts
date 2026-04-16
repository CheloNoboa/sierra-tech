/**
 * =============================================================================
 * 📄 Model: Project
 * Path: src/models/Project.ts
 * =============================================================================
 *
 * ES:
 *   Modelo oficial del módulo Projects.
 *
 *   Decisiones:
 *   - el contrato define la vigencia global del proyecto
 *   - los mantenimientos usan `schedule` como estructura persistida
 *   - si el usuario ya editó manualmente el schedule, el modelo lo respeta
 *   - si no existe schedule, el modelo lo genera automáticamente
 *   - `nextDueDate` se deriva desde el primer evento del schedule o desde la
 *     lógica de frecuencia cuando todavía no existe schedule manual
 * =============================================================================
 */

import mongoose, { Model, Schema, Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* Subschemas                                                                 */
/* -------------------------------------------------------------------------- */

const LocalizedTextSchema = new Schema(
  {
    es: { type: String, trim: true, default: "" },
    en: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const LocalizedStringArraySchema = new Schema(
  {
    es: { type: [String], default: [] },
    en: { type: [String], default: [] },
  },
  { _id: false }
);

const ProjectImageSchema = new Schema(
  {
    url: { type: String, trim: true, default: "" },
    alt: { type: LocalizedTextSchema, default: () => ({ es: "", en: "" }) },
    storageKey: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const ProjectFileAttachmentSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    storageKey: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const PublicSiteSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    showTitle: { type: Boolean, default: true },
    showSummary: { type: Boolean, default: true },
    showCoverImage: { type: Boolean, default: true },
    showGallery: { type: Boolean, default: true },
  },
  { _id: false }
);

const ProjectDocumentLinkSchema = new Schema(
  {
    documentId: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    documentType: {
      type: String,
      enum: [
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
      ],
      default: "other",
    },
    description: { type: String, trim: true, default: "" },
    visibility: {
      type: String,
      enum: ["public", "private", "internal"],
      default: "private",
    },
    language: {
      type: String,
      enum: ["none", "es", "en", "both"],
      default: "none",
    },
    documentDate: { type: Date, default: null },

    fileName: { type: String, trim: true, default: "" },
    fileUrl: { type: String, trim: true, default: "" },
    storageKey: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: null },

    version: { type: String, trim: true, default: "" },

    isPublic: { type: Boolean, default: false },
    visibleInPortal: { type: Boolean, default: true },
    visibleInPublicSite: { type: Boolean, default: false },
    visibleToInternalOnly: { type: Boolean, default: false },

    requiresAlert: { type: Boolean, default: false },
    alertDate: { type: Date, default: null },
    nextDueDate: { type: Date, default: null },
    maintenanceFrequency: { type: String, trim: true, default: null },

    isCritical: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const MaintenanceScheduleEntrySchema = new Schema(
  {
    eventId: { type: String, trim: true, required: true },
    cycleIndex: { type: Number, default: 0 },

    maintenanceDate: { type: Date, required: true },
    alertDate: { type: Date, default: null },

    alertStatus: {
      type: String,
      enum: ["pending", "emitted"],
      default: "pending",
    },

    maintenanceStatus: {
      type: String,
      enum: ["pending", "done", "overdue", "cancelled"],
      default: "pending",
    },

    channels: {
      type: [String],
      default: [],
    },

    recipients: {
      type: [String],
      default: [],
    },

    recipientEmail: { type: String, trim: true, default: "" },

    emittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedByClient: { type: Boolean, default: false },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const MaintenanceItemSchema = new Schema(
  {
    maintenanceType: {
      type: String,
      enum: [
        "preventive",
        "corrective",
        "cleaning",
        "inspection",
        "replacement",
        "other",
      ],
      default: "preventive",
    },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    frequencyValue: { type: Number, default: null },
    frequencyUnit: {
      type: String,
      enum: ["days", "weeks", "months", "years", null],
      default: null,
    },
    lastCompletedDate: { type: Date, default: null },
    nextDueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["scheduled", "completed", "overdue", "cancelled"],
      default: "scheduled",
    },
    notifyClient: { type: Boolean, default: true },
    notifyInternal: { type: Boolean, default: true },
    alertDaysBefore: { type: Number, default: 15 },
    isRecurring: { type: Boolean, default: true },
    instructions: { type: String, trim: true, default: "" },
    relatedDocumentIds: [{ type: String, trim: true }],
    attachments: { type: [ProjectFileAttachmentSchema], default: [] },
    notes: { type: String, trim: true, default: "" },
    schedule: { type: [MaintenanceScheduleEntrySchema], default: [] },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface MaintenanceScheduleEntryDocument {
  eventId: string;
  cycleIndex: number;
  maintenanceDate: Date;
  alertDate: Date | null;
  alertStatus: "pending" | "emitted";
  maintenanceStatus: "pending" | "done" | "overdue" | "cancelled";
  channels: Array<"platform" | "email">;
  recipients: Array<"client" | "internal">;
  recipientEmail: string;
  emittedAt: Date | null;
  completedAt: Date | null;
  completedByClient: boolean;
  note: string;
}

export interface MaintenanceItemDocument {
  maintenanceType:
    | "preventive"
    | "corrective"
    | "cleaning"
    | "inspection"
    | "replacement"
    | "other";
  title: string;
  description: string;
  frequencyValue: number | null;
  frequencyUnit: "days" | "weeks" | "months" | "years" | null;
  lastCompletedDate: Date | null;
  nextDueDate: Date | null;
  status: "scheduled" | "completed" | "overdue" | "cancelled";
  notifyClient: boolean;
  notifyInternal: boolean;
  alertDaysBefore: number | null;
  isRecurring: boolean;
  instructions: string;
  relatedDocumentIds: string[];
  attachments: Array<{
    name: string;
    url: string;
    storageKey: string;
    mimeType: string;
    size: number;
  }>;
  notes: string;
  schedule: MaintenanceScheduleEntryDocument[];
}

export interface ProjectDocument {
  _id: Types.ObjectId;
  slug: string;
  status: "draft" | "published" | "archived";
  visibility: "private" | "public";
  featured: boolean;
  sortOrder: number;

  title: { es: string; en: string };
  summary: { es: string; en: string };
  description: { es: string; en: string };

  primaryClientId: string | null;
  clientDisplayName: string;
  clientEmail: string;

  coverImage: { url: string; alt: { es: string; en: string }; storageKey: string } | null;
  gallery: { url: string; alt: { es: string; en: string }; storageKey: string }[];

  publicSiteSettings: {
    enabled: boolean;
    showTitle: boolean;
    showSummary: boolean;
    showCoverImage: boolean;
    showGallery: boolean;
  };

  documents: Array<{
    documentId: string;
    title: string;
    documentType:
      | "contract"
      | "planning"
      | "schedule"
      | "technical_design"
      | "plan"
      | "technical_report"
      | "technical_sheet"
      | "operation_manual"
      | "maintenance_manual"
      | "inspection_report"
      | "maintenance_report"
      | "delivery_record"
      | "certificate"
      | "warranty"
      | "invoice"
      | "permit"
      | "photo_evidence"
      | "other";
    description: string;
    visibility: "public" | "private" | "internal";
    language: "none" | "es" | "en" | "both";
    documentDate: Date | null;

    fileName: string;
    fileUrl: string;
    storageKey: string;
    mimeType: string;
    size: number | null;

    version: string;
    isPublic: boolean;
    visibleInPortal: boolean;
    visibleInPublicSite: boolean;
    visibleToInternalOnly: boolean;
    requiresAlert: boolean;
    alertDate: Date | null;
    nextDueDate: Date | null;
    maintenanceFrequency: string | null;
    isCritical: boolean;
    sortOrder: number;
    notes: string;
  }>;

  maintenanceItems: MaintenanceItemDocument[];

  contractStartDate: Date | null;
  contractDurationMonths: number | null;
  contractEndDate: Date | null;

  technicalOverview: { es: string; en: string };
  systemType: { es: string; en: string };
  treatedMedium: { es: string; en: string };
  technologyUsed: { es: string[]; en: string[] };
  operationalNotes: string;
  internalNotes: string;
  locationLabel: string;
  isPublicLocationVisible: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function normalizeDate(value: Date | null | undefined): Date | null {
  return isValidDate(value) ? new Date(value) : null;
}

function calculateContractEndDate(
  start: Date | null | undefined,
  durationMonths: number | null | undefined
): Date | null {
  if (!start || !durationMonths || durationMonths <= 0) return null;

  const base = new Date(start);
  if (Number.isNaN(base.getTime())) return null;

  const next = new Date(base);
  next.setMonth(next.getMonth() + durationMonths);

  return next;
}

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

const ProjectSchema = new Schema<ProjectDocument>(
  {
    slug: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
      index: true,
    },

    featured: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0, index: true },

    title: { type: LocalizedTextSchema, default: () => ({}) },
    summary: { type: LocalizedTextSchema, default: () => ({}) },
    description: { type: LocalizedTextSchema, default: () => ({}) },

    primaryClientId: { type: String, default: null, index: true },
    clientDisplayName: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    
    coverImage: { type: ProjectImageSchema, default: null },
    gallery: { type: [ProjectImageSchema], default: [] },

    publicSiteSettings: {
      type: PublicSiteSettingsSchema,
      default: () => ({
        enabled: false,
        showTitle: true,
        showSummary: true,
        showCoverImage: true,
        showGallery: true,
      }),
    },

    documents: { type: [ProjectDocumentLinkSchema], default: [] },
    maintenanceItems: { type: [MaintenanceItemSchema], default: [] },

    contractStartDate: { type: Date, default: null },
    contractDurationMonths: { type: Number, default: null },
    contractEndDate: { type: Date, default: null },

    technicalOverview: { type: LocalizedTextSchema, default: () => ({}) },
    systemType: { type: LocalizedTextSchema, default: () => ({}) },
    treatedMedium: { type: LocalizedTextSchema, default: () => ({}) },
    technologyUsed: {
      type: LocalizedStringArraySchema,
      default: () => ({ es: [], en: [] }),
    },
    operationalNotes: { type: String, trim: true, default: "" },
    internalNotes: { type: String, trim: true, default: "" },
    locationLabel: { type: String, trim: true, default: "" },
    isPublicLocationVisible: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "Projects",
  }
);

/* -------------------------------------------------------------------------- */
/* Hooks                                                                      */
/* -------------------------------------------------------------------------- */

ProjectSchema.pre("validate", function (next) {
  const publicEnabled = Boolean(this.publicSiteSettings?.enabled);

  if (this.status !== "archived") {
    this.status = publicEnabled ? "published" : "draft";
  }

  this.visibility = publicEnabled ? "public" : "private";

  this.contractEndDate = calculateContractEndDate(
    this.contractStartDate,
    this.contractDurationMonths
  );

  if (Array.isArray(this.documents)) {
    this.documents = this.documents.map((item, index) => ({
      ...item,
      sortOrder: index,
    })) as ProjectDocument["documents"];
  }

  if (Array.isArray(this.maintenanceItems)) {
    this.maintenanceItems = this.maintenanceItems.map((rawItem) => {
      const incomingSchedule = Array.isArray(rawItem.schedule)
        ? rawItem.schedule.map((entry) => ({
            ...entry,
            maintenanceDate: normalizeDate(entry.maintenanceDate) ?? new Date(),
            alertDate: normalizeDate(entry.alertDate),
            emittedAt: normalizeDate(entry.emittedAt),
            completedAt: normalizeDate(entry.completedAt),
          }))
        : [];

      return {
        ...rawItem,
        nextDueDate:
          normalizeDate(incomingSchedule[0]?.maintenanceDate) ??
          normalizeDate(rawItem.nextDueDate) ??
          null,
        schedule: incomingSchedule,
      };
    }) as ProjectDocument["maintenanceItems"];
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* Indexes                                                                    */
/* -------------------------------------------------------------------------- */

ProjectSchema.index({ status: 1, sortOrder: 1, updatedAt: -1 });
ProjectSchema.index({ primaryClientId: 1, updatedAt: -1 });
ProjectSchema.index({ contractStartDate: 1, contractEndDate: 1 });
ProjectSchema.index({ "maintenanceItems.nextDueDate": 1 });
ProjectSchema.index({ "maintenanceItems.schedule.alertDate": 1 });
ProjectSchema.index({ "maintenanceItems.schedule.alertStatus": 1 });
ProjectSchema.index({
  "maintenanceItems.schedule.maintenanceStatus": 1,
});

/* -------------------------------------------------------------------------- */
/* Model                                                                      */
/* -------------------------------------------------------------------------- */

const Project =
  (mongoose.models.Project as Model<ProjectDocument>) ||
  mongoose.model<ProjectDocument>("Project", ProjectSchema);

export default Project;