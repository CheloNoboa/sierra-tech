/**
 * =============================================================================
 * 📡 API Route: Admin Project By ID
 * Path: src/app/api/admin/projects/[id]/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo para leer, actualizar y eliminar un proyecto.
 *
 * Responsabilidades:
 * - leer un proyecto por ID
 * - actualizar un proyecto existente usando documento Mongoose real
 * - eliminar un proyecto
 * - preservar metadata de documentos ya cargados
 * - limpiar campos legacy que ya no pertenecen a Projects
 *
 * Decisiones:
 * - PUT NO usa findByIdAndUpdate
 * - se usa existing.set + save()
 * - save() garantiza la ejecución de hooks del modelo Project
 * - Projects NO administra maintenanceItems ni schedules
 * - Maintenance vive en su propio módulo/modelo
 *
 * Regla crítica:
 * - si el frontend manda un documento existente con metadata de archivo vacía,
 *   se conserva la metadata ya persistida en DB
 * - si existe `maintenanceItems` legacy en MongoDB, se elimina explícitamente
 * =============================================================================
 */

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import {
	normalizeProjectEntity,
	normalizeProjectWritePayload,
} from "@/lib/projects/projectPayload";
import Project from "@/models/Project";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RouteContext = {
	params: Promise<{
		id: string;
	}>;
};

type NormalizedPayload = ReturnType<typeof normalizeProjectWritePayload>;

type ExistingProjectDocumentLike = {
	documentId?: string;
	documentDate?: Date | string | null;

	fileName?: string;
	fileUrl?: string;
	storageKey?: string;
	mimeType?: string;
	size?: number | null;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
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

function normalizeText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeNullableDateLike(value: unknown): string | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	}

	const text = normalizeText(value);
	if (!text) return null;

	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hasFileMetadata(value: {
	fileName?: string;
	fileUrl?: string;
	storageKey?: string;
	mimeType?: string;
	size?: number | null;
}): boolean {
	return (
		normalizeText(value.fileName).length > 0 ||
		normalizeText(value.fileUrl).length > 0 ||
		normalizeText(value.storageKey).length > 0 ||
		normalizeText(value.mimeType).length > 0 ||
		normalizeNullableNumber(value.size) !== null
	);
}

function buildExistingDocumentsMap(
	existingDocuments: ExistingProjectDocumentLike[],
): Map<string, ExistingProjectDocumentLike> {
	const map = new Map<string, ExistingProjectDocumentLike>();

	for (const item of existingDocuments) {
		const documentId = normalizeText(item.documentId);
		const fileUrl = normalizeText(item.fileUrl);
		const storageKey = normalizeText(item.storageKey);

		if (documentId) map.set(`id:${documentId}`, item);
		if (fileUrl) map.set(`fileUrl:${fileUrl}`, item);
		if (storageKey) map.set(`storageKey:${storageKey}`, item);
	}

	return map;
}

function resolveExistingDocumentMatch(
	item: NormalizedPayload["documents"][number],
	existingDocumentsMap: Map<string, ExistingProjectDocumentLike>,
): ExistingProjectDocumentLike | null {
	const documentId = normalizeText(item.documentId);
	if (documentId) {
		const found = existingDocumentsMap.get(`id:${documentId}`);
		if (found) return found;
	}

	const fileUrl = normalizeText(item.fileUrl);
	if (fileUrl) {
		const found = existingDocumentsMap.get(`fileUrl:${fileUrl}`);
		if (found) return found;
	}

	const storageKey = normalizeText(item.storageKey);
	if (storageKey) {
		const found = existingDocumentsMap.get(`storageKey:${storageKey}`);
		if (found) return found;
	}

	return null;
}

function mergeDocumentsWithExisting(
	nextDocuments: NormalizedPayload["documents"],
	existingDocumentsRaw: ExistingProjectDocumentLike[],
): NormalizedPayload["documents"] {
	const existingDocumentsMap = buildExistingDocumentsMap(existingDocumentsRaw);

	return nextDocuments.map((item, index) => {
		const existingMatch = resolveExistingDocumentMatch(
			item,
			existingDocumentsMap,
		);

		if (!existingMatch) {
			return {
				...item,
				sortOrder: index,
			};
		}

		const incomingHasFileData = hasFileMetadata(item);

		return {
			...item,

			documentId:
				normalizeText(item.documentId) ||
				normalizeText(existingMatch.documentId),

			documentDate:
				item.documentDate ??
				normalizeNullableDateLike(existingMatch.documentDate),

			fileName: incomingHasFileData
				? item.fileName
				: normalizeText(existingMatch.fileName),

			fileUrl: incomingHasFileData
				? item.fileUrl
				: normalizeText(existingMatch.fileUrl),

			storageKey: incomingHasFileData
				? item.storageKey
				: normalizeText(existingMatch.storageKey),

			mimeType: incomingHasFileData
				? item.mimeType
				: normalizeText(existingMatch.mimeType),

			size: incomingHasFileData
				? item.size
				: normalizeNullableNumber(existingMatch.size),

			sortOrder: index,
		};
	});
}

function buildProjectPersistencePayload(input: unknown): NormalizedPayload {
	const normalized = normalizeProjectWritePayload(input);

	const publicEnabled = Boolean(normalized.publicSiteSettings.enabled);

	const contractEndDate =
		normalized.contractEndDate ??
		calculateContractEndDate(
			normalized.contractStartDate,
			normalized.contractDurationMonths,
		);

	return {
		...normalized,

		status: publicEnabled
			? "published"
			: normalized.status === "archived"
				? "archived"
				: "draft",

		visibility: publicEnabled ? "public" : "private",

		contractEndDate,

		documents: normalized.documents.map((item, index) => ({
			...item,
			sortOrder: index,
		})),
	};
}

function buildValidationErrors(payload: NormalizedPayload): string[] {
	const errors: string[] = [];

	if (!payload.slug) errors.push("Slug is required.");
	if (!payload.title.es) errors.push("Title ES is required.");
	if (!payload.title.en) errors.push("Title EN is required.");
	if (!payload.summary.es) errors.push("Summary ES is required.");
	if (!payload.summary.en) errors.push("Summary EN is required.");
	if (!payload.description.es) errors.push("Description ES is required.");
	if (!payload.description.en) errors.push("Description EN is required.");
	if (!payload.primaryClientId) errors.push("Organization is required.");

	if (!payload.contractStartDate) {
		errors.push("Contract start date is required.");
	}

	if (
		payload.contractDurationMonths === null ||
		!Number.isFinite(payload.contractDurationMonths) ||
		payload.contractDurationMonths <= 0
	) {
		errors.push("Contract duration months must be greater than 0.");
	}

	if (!payload.contractEndDate) {
		errors.push("Contract end date is required.");
	}

	return errors;
}

async function removeLegacyProjectFields(projectId: string): Promise<void> {
	await Project.collection.updateOne(
		{ _id: new mongoose.Types.ObjectId(projectId) },
		{
			$unset: {
				maintenanceItems: "",
			},
		},
	);
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(_: Request, context: RouteContext) {
	try {
		await connectToDB();

		const { id } = await context.params;
		const normalizedId = id.trim();

		if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
			return NextResponse.json(
				{ ok: false, error: "Invalid project id." },
				{ status: 400 },
			);
		}

		const item = await Project.findById(normalizedId).lean();

		if (!item) {
			return NextResponse.json(
				{ ok: false, error: "Project not found." },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			ok: true,
			item: normalizeProjectEntity(item),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error ? error.message : "Error loading project.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(req: Request, context: RouteContext) {
	try {
		await connectToDB();

		const { id } = await context.params;
		const normalizedId = id.trim();

		if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
			return NextResponse.json(
				{ ok: false, error: "Invalid project id." },
				{ status: 400 },
			);
		}

		const existing = await Project.findById(normalizedId);

		if (!existing) {
			return NextResponse.json(
				{ ok: false, error: "Project not found." },
				{ status: 404 },
			);
		}

		const body = (await req.json().catch(() => null)) as unknown;
		const payload = buildProjectPersistencePayload(body);
		const validationErrors = buildValidationErrors(payload);

		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					ok: false,
					error: "Validation error.",
					details: validationErrors,
				},
				{ status: 400 },
			);
		}

		const duplicateSlug = await Project.findOne({
			slug: payload.slug,
			_id: { $ne: normalizedId },
		})
			.select("_id")
			.lean();

		if (duplicateSlug) {
			return NextResponse.json(
				{ ok: false, error: "Slug already exists." },
				{ status: 409 },
			);
		}

		const existingDocumentsSource = Array.isArray(existing.documents)
			? (existing.documents as unknown as ExistingProjectDocumentLike[])
			: [];

		const mergedDocuments = mergeDocumentsWithExisting(
			payload.documents,
			existingDocumentsSource,
		);

		existing.set({
			slug: payload.slug,

			status: payload.status,
			visibility: payload.visibility,

			featured: payload.featured,
			sortOrder: payload.sortOrder,

			title: payload.title,
			summary: payload.summary,
			description: payload.description,

			serviceClassKey: payload.serviceClassKey,
			serviceClassLabel: payload.serviceClassLabel,

			primaryClientId: payload.primaryClientId,
			clientDisplayName:
				payload.clientDisplayName || existing.clientDisplayName || "",
			clientEmail: payload.clientEmail || existing.clientEmail || "",

			coverImage: payload.coverImage,
			gallery: payload.gallery,

			publicSiteSettings: {
				...(existing.publicSiteSettings
					? (existing.publicSiteSettings as unknown as Record<string, unknown>)
					: {}),
				...payload.publicSiteSettings,
			},

			documents: mergedDocuments,

			contractStartDate: payload.contractStartDate,
			contractDurationMonths: payload.contractDurationMonths,
			contractEndDate: payload.contractEndDate,

			technicalOverview: payload.technicalOverview,
			systemType: payload.systemType,
			treatedMedium: payload.treatedMedium,
			technologyUsed: payload.technologyUsed,

			operationalNotes: payload.operationalNotes,
			internalNotes: payload.internalNotes,

			locationLabel: payload.locationLabel,
			isPublicLocationVisible: payload.isPublicLocationVisible,
		});

		existing.markModified("documents");
		existing.markModified("publicSiteSettings");

		await existing.save({ validateBeforeSave: true });
		await removeLegacyProjectFields(normalizedId);

		const updated = await Project.findById(normalizedId).lean();

		return NextResponse.json({
			ok: true,
			item: normalizeProjectEntity(updated ?? existing.toObject()),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error ? error.message : "Error updating project.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(_: Request, context: RouteContext) {
	try {
		await connectToDB();

		const { id } = await context.params;
		const normalizedId = id.trim();

		if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
			return NextResponse.json(
				{ ok: false, error: "Invalid project id." },
				{ status: 400 },
			);
		}

		const deleted = await Project.findByIdAndDelete(normalizedId).lean();

		if (!deleted) {
			return NextResponse.json(
				{ ok: false, error: "Project not found." },
				{ status: 404 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error ? error.message : "Error deleting project.",
			},
			{ status: 500 },
		);
	}
}