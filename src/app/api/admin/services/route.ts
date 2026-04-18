/**
 * =============================================================================
 * 📡 API Route: Admin Services
 * Path: src/app/api/admin/services/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para listar servicios, crear servicios y guardar
 *   la cabecera global de la página pública /services.
 *
 *   Métodos:
 *   - GET: lista servicios
 *   - POST: crea un servicio
 *   - PUT: guarda la cabecera global en la colección ServicesPage
 *
 *   Seguridad:
 *   - Acceso permitido solo para admin y superadmin
 *
 *   Reglas:
 *   - slug único
 *   - order manual
 *   - status: draft | published
 *   - estructura bilingüe estable
 *   - alineado al modelo final Service
 *   - permite drafts incompletos con defaults seguros
 *   - la cabecera global acepta campos vacíos y no debe romper el flujo
 *
 *   Contrato de attachments:
 *   - attachments SIEMPRE usa:
 *     { documentId: string; title: string }
 *   - title no es opcional en el contrato del API
 *   - si llega vacío, se normaliza a ""
 *
 * EN:
 *   Administrative endpoint for listing services, creating services, and
 *   saving the global header for the public /services page.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import Service from "@/models/Service";
import ServicesPage from "@/models/ServicesPage";

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

/**
 * Cabecera global de la página pública /services.
 * Se persiste en la colección ServicesPage.
 */
interface ServicePageHeader {
	eyebrow: LocalizedText;
	title: LocalizedText;
	subtitle: LocalizedText;
	primaryCtaLabel: LocalizedText;
	primaryCtaHref: string;
	secondaryCtaLabel: LocalizedText;
	secondaryCtaHref: string;
}

interface ServicePayload {
	_id?: string;
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

const EMPTY_PAGE_HEADER: ServicePageHeader = {
	eyebrow: { es: "", en: "" },
	title: { es: "", en: "" },
	subtitle: { es: "", en: "" },
	primaryCtaLabel: { es: "", en: "" },
	primaryCtaHref: "",
	secondaryCtaLabel: { es: "", en: "" },
	secondaryCtaHref: "",
};

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

function normalizePageHeader(value: unknown): ServicePageHeader {
	if (!value || typeof value !== "object") {
		return structuredClone(EMPTY_PAGE_HEADER);
	}

	const record = value as Record<string, unknown>;

	return {
		eyebrow: normalizeLocalizedText(record.eyebrow),
		title: normalizeLocalizedText(record.title),
		subtitle: normalizeLocalizedText(record.subtitle),
		primaryCtaLabel: normalizeLocalizedText(record.primaryCtaLabel),
		primaryCtaHref: normalizeString(record.primaryCtaHref),
		secondaryCtaLabel: normalizeLocalizedText(record.secondaryCtaLabel),
		secondaryCtaHref: normalizeString(record.secondaryCtaHref),
	};
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
		_id: normalizeString(record._id),
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
	_id?: unknown;
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
		_id:
			typeof doc._id === "string"
				? doc._id
				: doc._id instanceof Types.ObjectId
					? doc._id.toString()
					: "",
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

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		await connectToDB();

		const { searchParams } = new URL(request.url);

		const status = searchParams.get("status");
		const category = searchParams.get("category");
		const featured = searchParams.get("featured");
		const q = normalizeString(searchParams.get("q"));

		const query: Record<string, unknown> = {};

		if (status === "draft" || status === "published") {
			query.status = status;
		}

		if (category) {
			query.category = category.trim();
		}

		if (featured === "true") {
			query.featured = true;
		} else if (featured === "false") {
			query.featured = false;
		}

		if (q) {
			query.$or = [
				{ slug: { $regex: q, $options: "i" } },
				{ category: { $regex: q, $options: "i" } },
				{ "title.es": { $regex: q, $options: "i" } },
				{ "title.en": { $regex: q, $options: "i" } },
				{ "summary.es": { $regex: q, $options: "i" } },
				{ "summary.en": { $regex: q, $options: "i" } },
			];
		}

		const [serviceDocs, pageDoc] = await Promise.all([
			Service.find(query).sort({ order: 1, createdAt: -1 }).lean(),
			ServicesPage.findOne().lean(),
		]);

		const services = serviceDocs.map((doc) => toResponsePayload(doc));
		const pageHeader = normalizePageHeader(pageDoc?.header);

		return NextResponse.json(
			{
				ok: true,
				data: {
					services,
					page: {
						header: pageHeader,
					},
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error fetching admin services:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al obtener servicios.",
				error_en: "Internal error while fetching services.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		await connectToDB();

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

		if (normalized.status === "published" && !safeTitleEs && !safeTitleEn) {
			return NextResponse.json(
				{
					error_es: "El título del servicio es obligatorio para publicar.",
					error_en: "Service title is required to publish.",
				},
				{ status: 400 },
			);
		}

		const existing = await Service.findOne({ slug: safeSlug }).lean();

		if (existing) {
			return NextResponse.json(
				{
					error_es: "Ya existe un servicio con ese slug.",
					error_en: "A service with that slug already exists.",
				},
				{ status: 409 },
			);
		}

		const doc = await Service.create({
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
		});

		const payload = toResponsePayload(doc.toObject());

		return NextResponse.json(payload, { status: 201 });
	} catch (error) {
		console.error("Error creating admin service:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al crear servicio.",
				error_en: "Internal error while creating service.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		await connectToDB();

		const body: unknown = await request.json().catch(() => null);
		const record =
			body && typeof body === "object" ? (body as Record<string, unknown>) : {};

		const normalizedHeader = normalizePageHeader(
			record.pageHeader ?? record.header,
		);

		let pageDoc = await ServicesPage.findOne();

		if (!pageDoc) {
			pageDoc = new ServicesPage({});
		}

		pageDoc.header = normalizedHeader;
		await pageDoc.save();

		return NextResponse.json(
			{
				ok: true,
				data: {
					header: pageDoc.header,
					updatedAt: pageDoc.updatedAt,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error updating services header:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al guardar la cabecera de servicios.",
				error_en: "Internal error while saving services header.",
			},
			{ status: 500 },
		);
	}
}
