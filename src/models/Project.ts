/**
 * =============================================================================
 * 📄 Model: Project
 * Path: src/models/Project.ts
 * =============================================================================
 *
 * ES:
 * Modelo oficial del módulo Projects.
 *
 * Objetivo:
 * - persistir proyectos como entidades documental-operativas
 * - conservar identidad, cliente, publicación, documentos, media y clasificación
 * - mantener fechas contractuales base para que Maintenance las use
 *
 * Decisiones:
 * - Projects NO administra mantenimientos embebidos como flujo operativo
 * - Maintenance vive en su propio módulo/modelo
 * - serviceClassKey guarda la clave estable de ServiceClass
 * - serviceClassLabel guarda snapshot bilingüe para lectura rápida
 * - la publicación pública se controla desde publicSiteSettings.enabled
 * - el modelo elimina `maintenanceItems` legacy en cada guardado
 * - no se usa any
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
	{ _id: false },
);

const LocalizedStringArraySchema = new Schema(
	{
		es: { type: [String], default: [] },
		en: { type: [String], default: [] },
	},
	{ _id: false },
);

const ProjectImageSchema = new Schema(
	{
		url: { type: String, trim: true, default: "" },
		alt: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		storageKey: { type: String, trim: true, default: "" },
	},
	{ _id: false },
);

const PublicSiteSettingsSchema = new Schema(
	{
		enabled: { type: Boolean, default: false },
		showTitle: { type: Boolean, default: true },
		showSummary: { type: Boolean, default: true },
		showCoverImage: { type: Boolean, default: true },
		showGallery: { type: Boolean, default: true },
	},
	{ _id: false },
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
	{ _id: false },
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

	serviceClassKey: string;
	serviceClassLabel: { es: string; en: string };

	primaryClientId: string | null;
	clientDisplayName: string;
	clientEmail: string;

	coverImage: {
		url: string;
		alt: { es: string; en: string };
		storageKey: string;
	} | null;

	gallery: Array<{
		url: string;
		alt: { es: string; en: string };
		storageKey: string;
	}>;

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
/* Internal legacy shape                                                      */
/* -------------------------------------------------------------------------- */

type ProjectDocumentWithLegacyFields = ProjectDocument & {
	maintenanceItems?: unknown;
};

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function calculateContractEndDate(
	start: Date | null | undefined,
	durationMonths: number | null | undefined,
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

		title: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		summary: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		description: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		serviceClassKey: {
			type: String,
			trim: true,
			default: "",
			index: true,
		},

		serviceClassLabel: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		primaryClientId: {
			type: String,
			default: null,
			index: true,
		},

		clientDisplayName: {
			type: String,
			trim: true,
			default: "",
		},

		clientEmail: {
			type: String,
			trim: true,
			default: "",
		},

		coverImage: {
			type: ProjectImageSchema,
			default: null,
		},

		gallery: {
			type: [ProjectImageSchema],
			default: [],
		},

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

		documents: {
			type: [ProjectDocumentLinkSchema],
			default: [],
		},

		contractStartDate: {
			type: Date,
			default: null,
		},

		contractDurationMonths: {
			type: Number,
			default: null,
		},

		contractEndDate: {
			type: Date,
			default: null,
		},

		technicalOverview: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		systemType: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		treatedMedium: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		technologyUsed: {
			type: LocalizedStringArraySchema,
			default: () => ({ es: [], en: [] }),
		},

		operationalNotes: {
			type: String,
			trim: true,
			default: "",
		},

		internalNotes: {
			type: String,
			trim: true,
			default: "",
		},

		locationLabel: {
			type: String,
			trim: true,
			default: "",
		},

		isPublicLocationVisible: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
		collection: "Projects",
		strict: true,
	},
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
		this.contractDurationMonths,
	);

	if (Array.isArray(this.documents)) {
		this.documents = this.documents.map((item, index) => ({
			...item,
			sortOrder: index,
		})) as ProjectDocument["documents"];
	}

	const legacyDocument = this as ProjectDocumentWithLegacyFields;

	if ("maintenanceItems" in legacyDocument) {
		legacyDocument.maintenanceItems = undefined;
		this.set("maintenanceItems", undefined, { strict: false });
		this.markModified("maintenanceItems");
	}

	next();
});

/* -------------------------------------------------------------------------- */
/* Indexes                                                                    */
/* -------------------------------------------------------------------------- */

ProjectSchema.index({ status: 1, sortOrder: 1, updatedAt: -1 });
ProjectSchema.index({ primaryClientId: 1, updatedAt: -1 });
ProjectSchema.index({ contractStartDate: 1, contractEndDate: 1 });
ProjectSchema.index({ serviceClassKey: 1, status: 1, updatedAt: -1 });

/* -------------------------------------------------------------------------- */
/* Model                                                                      */
/* -------------------------------------------------------------------------- */

const Project =
	(mongoose.models.Project as Model<ProjectDocument>) ||
	mongoose.model<ProjectDocument>("Project", ProjectSchema);

export default Project;