/**
 * =============================================================================
 * 📡 API Route: Admin Service By ID
 * Path: src/app/api/admin/services/[id]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para obtener, actualizar y eliminar un servicio
 *   específico del sitio público.
 *
 *   Métodos:
 *   - GET: obtiene un servicio por id
 *   - PUT: actualiza un servicio por id
 *   - DELETE: elimina un servicio por id
 *
 *   Seguridad:
 *   - Acceso permitido solo para admin y superadmin
 *
 *   Reglas:
 *   - slug único
 *   - status: draft | published
 *   - estructura bilingüe estable
 *   - attachments referencia documentos administrables
 *   - alineado al modelo final Service
 *
 *   Contrato de attachments:
 *   - attachments SIEMPRE usa:
 *     { documentId: string; title: string }
 *   - title no es opcional en el contrato del API
 *   - cualquier valor faltante se normaliza como cadena vacía
 *
 * EN:
 *   Administrative endpoint for reading, updating and deleting a specific
 *   public website service.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import Service from "@/models/Service";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AllowedRole = "admin" | "superadmin";
type ServiceStatus = "draft" | "published";

interface LocalizedText {
	es: string;
	en: string;
}

interface ServiceGalleryItem {
	url: string;
	alt: LocalizedText;
	order: number;
}

interface ServiceSeo {
	metaTitle: LocalizedText;
	metaDescription: LocalizedText;
	image: string;
}

interface ServiceTechnicalSpecs {
	capacity: LocalizedText;
	flowRate: LocalizedText;
	material: LocalizedText;
	application: LocalizedText;
	technology: LocalizedText;
}

interface ServiceAttachmentRef {
	documentId: string;
	title: string;
}

interface ServicePayload {
	title: LocalizedText;
	slug: string;
	category: string;
	summary: LocalizedText;
	description: LocalizedText;
	coverImage: string;
	gallery: ServiceGalleryItem[];
	technicalSpecs: ServiceTechnicalSpecs;
	order: number;
	featured: boolean;
	status: ServiceStatus;
	seo: ServiceSeo;
	attachments: ServiceAttachmentRef[];
	createdAt?: string;
	updatedAt?: string;
	updatedBy?: string;
	updatedByEmail?: string;
}

type AdminGuardResult =
	| { ok: true; role: AllowedRole; userName: string; userEmail: string }
	| { ok: false; response: NextResponse };

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = { es: "", en: "" };

const SERVICE_DEFAULTS: ServicePayload = {
	title: { es: "", en: "" },
	slug: "",
	category: "",
	summary: { es: "", en: "" },
	description: { es: "", en: "" },
	coverImage: "",
	gallery: [],
	technicalSpecs: {
		capacity: { es: "", en: "" },
		flowRate: { es: "", en: "" },
		material: { es: "", en: "" },
		application: { es: "", en: "" },
		technology: { es: "", en: "" },
	},
	order: 1,
	featured: false,
	status: "draft",
	seo: {
		metaTitle: { es: "", en: "" },
		metaDescription: { es: "", en: "" },
		image: "",
	},
	attachments: [],
	createdAt: "",
	updatedAt: "",
	updatedBy: "",
	updatedByEmail: "",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

function normalizeString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLocalizedText(
	value: unknown,
	fallback: LocalizedText = EMPTY_LOCALIZED_TEXT,
): LocalizedText {
	if (!value || typeof value !== "object") return fallback;

	const record = value as Record<string, unknown>;

	return {
		es: normalizeString(record.es, fallback.es),
		en: normalizeString(record.en, fallback.en),
	};
}

function normalizeSlug(value: unknown): string {
	return normalizeString(value)
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function normalizeStatus(value: unknown): ServiceStatus {
	return value === "published" ? "published" : "draft";
}

function normalizeGallery(value: unknown): ServiceGalleryItem[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item, index): ServiceGalleryItem | null => {
			if (!item || typeof item !== "object") return null;

			const record = item as Record<string, unknown>;
			const order = normalizeNumber(record.order, index + 1);

			return {
				url: normalizeString(record.url),
				alt: normalizeLocalizedText(record.alt),
				order: order >= 1 ? order : index + 1,
			};
		})
		.filter((item): item is ServiceGalleryItem => item !== null)
		.sort((a, b) => a.order - b.order)
		.map((item, index) => ({
			...item,
			order: index + 1,
		}));
}

function normalizeAttachments(value: unknown): ServiceAttachmentRef[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item): ServiceAttachmentRef | null => {
			if (!item || typeof item !== "object") return null;

			const record = item as Record<string, unknown>;
			const rawDocumentId = record.documentId;

			const documentId =
				typeof rawDocumentId === "string"
					? rawDocumentId.trim()
					: rawDocumentId &&
						  typeof rawDocumentId === "object" &&
						  "toString" in rawDocumentId
						? String(rawDocumentId).trim()
						: "";

			if (!documentId || !Types.ObjectId.isValid(documentId)) return null;

			return {
				documentId,
				title: normalizeString(record.title),
			};
		})
		.filter((item): item is ServiceAttachmentRef => item !== null);
}

function normalizeServicePayload(value: unknown): ServicePayload {
	if (!value || typeof value !== "object") {
		return structuredClone(SERVICE_DEFAULTS);
	}

	const record = value as Record<string, unknown>;
	const technicalSpecs = (record.technicalSpecs ?? {}) as Record<
		string,
		unknown
	>;
	const seo = (record.seo ?? {}) as Record<string, unknown>;

	return {
		title: normalizeLocalizedText(record.title),
		slug: normalizeSlug(record.slug),
		category: normalizeString(record.category),
		summary: normalizeLocalizedText(record.summary),
		description: normalizeLocalizedText(record.description),
		coverImage: normalizeString(record.coverImage),
		gallery: normalizeGallery(record.gallery),
		technicalSpecs: {
			capacity: normalizeLocalizedText(technicalSpecs.capacity),
			flowRate: normalizeLocalizedText(technicalSpecs.flowRate),
			material: normalizeLocalizedText(technicalSpecs.material),
			application: normalizeLocalizedText(technicalSpecs.application),
			technology: normalizeLocalizedText(technicalSpecs.technology),
		},
		order: Math.max(1, normalizeNumber(record.order, 1)),
		featured: normalizeBoolean(record.featured, false),
		status: normalizeStatus(record.status),
		seo: {
			metaTitle: normalizeLocalizedText(seo.metaTitle),
			metaDescription: normalizeLocalizedText(seo.metaDescription),
			image: normalizeString(seo.image),
		},
		attachments: normalizeAttachments(record.attachments),
		createdAt: normalizeString(record.createdAt),
		updatedAt: normalizeString(record.updatedAt),
		updatedBy: normalizeString(record.updatedBy),
		updatedByEmail: normalizeString(record.updatedByEmail),
	};
}

function toResponsePayload(doc: {
	title?: unknown;
	slug?: unknown;
	category?: unknown;
	summary?: unknown;
	description?: unknown;
	coverImage?: unknown;
	gallery?: unknown;
	technicalSpecs?: unknown;
	order?: unknown;
	featured?: unknown;
	status?: unknown;
	seo?: unknown;
	attachments?: unknown;
	createdAt?: Date | string;
	updatedAt?: Date | string;
	updatedBy?: unknown;
	updatedByEmail?: unknown;
}): ServicePayload {
	return normalizeServicePayload({
		title: doc.title,
		slug: doc.slug,
		category: doc.category,
		summary: doc.summary,
		description: doc.description,
		coverImage: doc.coverImage,
		gallery: doc.gallery,
		technicalSpecs: doc.technicalSpecs,
		order: doc.order,
		featured: doc.featured,
		status: doc.status,
		seo: doc.seo,
		attachments: doc.attachments,
		createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
		updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
		updatedBy: doc.updatedBy,
		updatedByEmail: doc.updatedByEmail,
	});
}

async function requireAdmin(): Promise<AdminGuardResult> {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					error_es: "Sesión no válida o expirada.",
					error_en: "Invalid or expired session.",
				},
				{ status: 401 },
			),
		};
	}

	const role = session.user.role;

	if (!isAllowedRole(role)) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					error_es: "No tienes permisos para acceder a este recurso.",
					error_en: "You do not have permission to access this resource.",
				},
				{ status: 403 },
			),
		};
	}

	return {
		ok: true,
		role,
		userName: typeof session.user.name === "string" ? session.user.name : "",
		userEmail: typeof session.user.email === "string" ? session.user.email : "",
	};
}

function validateObjectId(id: string): NextResponse | null {
	if (!Types.ObjectId.isValid(id)) {
		return NextResponse.json(
			{
				error_es: "ID de servicio no válido.",
				error_en: "Invalid service ID.",
			},
			{ status: 400 },
		);
	}

	return null;
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		const { id } = await context.params;
		const invalidIdResponse = validateObjectId(id);
		if (invalidIdResponse) return invalidIdResponse;

		await connectToDB();

		const doc = await Service.findById(id).lean();

		if (!doc) {
			return NextResponse.json(
				{
					error_es: "Servicio no encontrado.",
					error_en: "Service not found.",
				},
				{ status: 404 },
			);
		}

		const payload = toResponsePayload(doc);

		return NextResponse.json(payload, { status: 200 });
	} catch (error) {
		console.error("Error fetching admin service by id:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al obtener servicio.",
				error_en: "Internal error while fetching service.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		const { id } = await context.params;
		const invalidIdResponse = validateObjectId(id);
		if (invalidIdResponse) return invalidIdResponse;

		await connectToDB();

		const existingDoc = await Service.findById(id).lean();

		if (!existingDoc) {
			return NextResponse.json(
				{
					error_es: "Servicio no encontrado.",
					error_en: "Service not found.",
				},
				{ status: 404 },
			);
		}

		const body: unknown = await request.json().catch(() => null);
		const normalized = normalizeServicePayload(body);

		const safeTitleEs = normalized.title.es.trim();
		const safeTitleEn = normalized.title.en.trim();

		const safeSlug =
			normalized.slug ||
			normalizeSlug(safeTitleEs) ||
			normalizeSlug(safeTitleEn) ||
			`service-${Date.now()}`;

		const safeCategory = normalized.category.trim() || "general";

		if (normalized.status === "published") {
			if (!safeTitleEs && !safeTitleEn) {
				return NextResponse.json(
					{
						error_es: "El título del servicio es obligatorio para publicar.",
						error_en: "Service title is required to publish.",
					},
					{ status: 400 },
				);
			}

			if (!safeCategory) {
				return NextResponse.json(
					{
						error_es: "La categoría es obligatoria para publicar.",
						error_en: "Category is required to publish.",
					},
					{ status: 400 },
				);
			}
		}

		const duplicateSlug = await Service.findOne({
			slug: safeSlug,
			_id: { $ne: new Types.ObjectId(id) },
		}).lean();

		if (duplicateSlug) {
			return NextResponse.json(
				{
					error_es: "Ya existe otro servicio con ese slug.",
					error_en: "Another service already uses that slug.",
				},
				{ status: 409 },
			);
		}

		const updatedDoc = await Service.findByIdAndUpdate(
			id,
			{
				$set: {
					title: normalized.title,
					slug: safeSlug,
					category: safeCategory,
					summary: normalized.summary,
					description: normalized.description,
					coverImage: normalized.coverImage,
					gallery: normalized.gallery,
					technicalSpecs: normalized.technicalSpecs,
					order: normalized.order,
					featured: normalized.featured,
					status: normalized.status,
					seo: normalized.seo,
					attachments: normalized.attachments.map((item) => ({
						documentId: new Types.ObjectId(item.documentId),
						title: item.title,
					})),
					updatedBy: guard.userName,
					updatedByEmail: guard.userEmail,
				},
			},
			{
				new: true,
				runValidators: true,
			},
		).lean();

		if (!updatedDoc) {
			return NextResponse.json(
				{
					error_es: "No se pudo actualizar el servicio.",
					error_en: "Could not update service.",
				},
				{ status: 404 },
			);
		}

		const payload = toResponsePayload(updatedDoc);

		return NextResponse.json(payload, { status: 200 });
	} catch (error) {
		console.error("Error updating admin service by id:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al actualizar servicio.",
				error_en: "Internal error while updating service.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		const { id } = await context.params;
		const invalidIdResponse = validateObjectId(id);
		if (invalidIdResponse) return invalidIdResponse;

		await connectToDB();

		const deletedDoc = await Service.findByIdAndDelete(id).lean();

		if (!deletedDoc) {
			return NextResponse.json(
				{
					error_es: "Servicio no encontrado.",
					error_en: "Service not found.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{
				ok: true,
				message_es: "Servicio eliminado correctamente.",
				message_en: "Service deleted successfully.",
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error deleting admin service by id:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al eliminar servicio.",
				error_en: "Internal error while deleting service.",
			},
			{ status: 500 },
		);
	}
}
