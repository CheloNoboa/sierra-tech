/**
 * =============================================================================
 * 📄 Helpers: Project Payload
 * Path: src/lib/projects/projectPayload.ts
 * =============================================================================
 *
 * ES:
 * Helpers centrales para normalizar el payload del módulo Projects.
 *
 * Objetivo:
 * - convertir input desconocido en estructuras estrictas y estables
 * - proteger UI / API / DB contra datos incompletos o inconsistentes
 * - mantener Projects separado del flujo operativo de Maintenance
 * - soportar compatibilidad con datos antiguos monolingües
 * - asegurar fechas como ISO string o null
 *
 * Reglas:
 * - este archivo es la fuente de verdad para normalización defensiva
 * - no debe inventar shapes distintos a src/types/project.ts
 * - todo array debe salir estable
 * - todo campo bilingüe debe salir con { es, en }
 * - storageKey se considera válido aunque url venga vacío
 *
 * Decisiones:
 * - Projects conserva fechas contractuales base
 * - Maintenance usa esas fechas, pero administra su propio schedule
 * - no se usa any
 * =============================================================================
 */

import type {
	LocalizedText,
	ProjectDocumentLanguage,
	ProjectDocumentLink,
	ProjectDocumentType,
	ProjectDocumentVisibility,
	ProjectEntity,
	ProjectImage,
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

function safeArray<T = unknown>(value: unknown): T[] {
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

	const text = normalizeString(value);
	if (!text) return null;

	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Contract helpers                                                           */
/* -------------------------------------------------------------------------- */

function calculateContractEndDate(
	start: string | null,
	durationMonths: number | null,
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
	if (value === "published" || value === "archived") return value;
	return "draft";
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

function normalizeDocumentVisibility(
	value: unknown,
): ProjectDocumentVisibility {
	if (value === "public" || value === "internal") return value;
	return "private";
}

function normalizeDocumentLanguage(value: unknown): ProjectDocumentLanguage {
	if (value === "es" || value === "en" || value === "both") return value;
	return "none";
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

function normalizeLocalizedTextWithLegacyString(value: unknown): LocalizedText {
	if (typeof value === "string") {
		const text = normalizeString(value);

		return {
			es: text,
			en: text,
		};
	}

	return normalizeLocalizedText(value);
}

function normalizeLocalizedStringArray(value: unknown): {
	es: string[];
	en: string[];
} {
	if (Array.isArray(value)) {
		const normalized = value.map(normalizeString).filter(Boolean);

		return {
			es: normalized,
			en: normalized,
		};
	}

	const source = isRecord(value) ? value : {};

	return {
		es: safeArray(source.es).map(normalizeString).filter(Boolean),
		en: safeArray(source.en).map(normalizeString).filter(Boolean),
	};
}

function normalizeProjectImage(value: unknown): ProjectImage | null {
	const source = isRecord(value) ? value : null;
	if (!source) return null;

	const url = normalizeString(source.url);
	const storageKey = normalizeString(source.storageKey);

	if (!url && !storageKey) return null;

	return {
		url,
		alt: normalizeLocalizedTextWithLegacyString(source.alt),
		storageKey,
	};
}

function normalizePublicSiteSettings(
	value: unknown,
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
	index: number,
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
		visibleToInternalOnly: normalizeBoolean(
			source.visibleToInternalOnly,
			false,
		),

		requiresAlert: normalizeBoolean(source.requiresAlert, false),
		alertDate: normalizeNullableIsoDate(source.alertDate),
		nextDueDate: normalizeNullableIsoDate(source.nextDueDate),
		maintenanceFrequency: normalizeString(source.maintenanceFrequency) || null,

		isCritical: normalizeBoolean(source.isCritical, false),
		sortOrder: normalizeNumber(source.sortOrder, index),
		notes: normalizeString(source.notes),
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

		serviceClassKey: "",
		serviceClassLabel: { es: "", en: "" },

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

		contractStartDate: null,
		contractDurationMonths: null,
		contractEndDate: null,

		technicalOverview: { es: "", en: "" },
		systemType: { es: "", en: "" },
		treatedMedium: { es: "", en: "" },
		technologyUsed: { es: [], en: [] },

		operationalNotes: "",
		internalNotes: "",

		locationLabel: "",
		isPublicLocationVisible: false,
	};
}

export function normalizeProjectWritePayload(value: unknown): ProjectPayload {
	const source = isRecord(value) ? value : {};

	const publicSiteSettings = normalizePublicSiteSettings(
		source.publicSiteSettings,
	);

	const contractStartDate = normalizeNullableIsoDate(source.contractStartDate);
	const contractDurationMonths = normalizeNullableNumber(
		source.contractDurationMonths,
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

		serviceClassKey: normalizeString(source.serviceClassKey),
		serviceClassLabel: normalizeLocalizedTextWithLegacyString(
			source.serviceClassLabel,
		),

		primaryClientId: normalizeString(source.primaryClientId) || null,
		clientDisplayName: normalizeString(source.clientDisplayName),
		clientEmail: normalizeString(source.clientEmail),

		coverImage: normalizeProjectImage(source.coverImage),
		gallery: safeArray(source.gallery)
			.map(normalizeProjectImage)
			.filter((item): item is ProjectImage => item !== null),

		publicSiteSettings,

		documents: safeArray(source.documents).map((item, index) =>
			normalizeDocumentLink(item, index),
		),

		contractStartDate,
		contractDurationMonths,
		contractEndDate:
			incomingEndDate ??
			calculateContractEndDate(contractStartDate, contractDurationMonths),

		technicalOverview: normalizeLocalizedText(source.technicalOverview),
		systemType: normalizeLocalizedTextWithLegacyString(source.systemType),
		treatedMedium: normalizeLocalizedTextWithLegacyString(source.treatedMedium),
		technologyUsed: normalizeLocalizedStringArray(source.technologyUsed),

		operationalNotes: normalizeString(source.operationalNotes),
		internalNotes: normalizeString(source.internalNotes),

		locationLabel: normalizeString(source.locationLabel),
		isPublicLocationVisible: normalizeBoolean(
			source.isPublicLocationVisible,
			false,
		),
	};
}

export function normalizeProjectEntity(value: unknown): ProjectEntity {
	const payload = normalizeProjectWritePayload(value);
	const source = isRecord(value) ? value : {};

	const rawId = source._id;
	const normalizedId =
		normalizeString(rawId) ||
		(rawId && typeof rawId === "object" && "toString" in rawId
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