/**
 * =============================================================================
 * 📡 API Route: Public Service Detail
 * Path: src/app/api/public/services/[slug]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público para construir la página de detalle de un servicio.
 *
 *   Responsabilidades:
 *   - Buscar un servicio público por slug
 *   - Exponer solo servicios publicados
 *   - Devolver un contrato estable y seguro para el front público
 *   - Normalizar estructuras anidadas para evitar nulls profundos
 *
 *   Contrato:
 *   - ok
 *   - data.service
 *
 *   Reglas:
 *   - Solo devuelve servicios con status "published"
 *   - El slug se normaliza antes de consultar
 *   - gallery se devuelve ordenada por order ascendente
 *   - technicalSpecs mantiene forma estable aunque sus valores estén vacíos
 *   - attachments se devuelve siempre como arreglo
 *   - Si el servicio no existe, responde 404
 *
 * EN:
 *   Public endpoint used to build a single public service detail page.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import Service from "@/models/Service";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface RouteContext {
	params: Promise<{
		slug: string;
	}>;
}

interface LocalizedText {
	es: string;
	en: string;
}

interface ServiceGalleryItem {
	url: string;
	alt: LocalizedText;
	order: number;
}

interface ServiceAttachmentRef {
	documentId: string;
	title: string;
}

interface ServiceTechnicalSpecs {
	capacity: LocalizedText;
	flowRate: LocalizedText;
	material: LocalizedText;
	application: LocalizedText;
	technology: LocalizedText;
}

interface PublicServiceDetail {
	_id: string;
	slug: string;
	title: LocalizedText;
	summary: LocalizedText;
	description: LocalizedText;
	category: string;
	featured: boolean;
	order: number;
	coverImage: string;
	gallery: ServiceGalleryItem[];
	technicalSpecs: ServiceTechnicalSpecs;
	attachments: ServiceAttachmentRef[];
	seo: {
		metaTitle: LocalizedText;
		metaDescription: LocalizedText;
		image: string;
	};
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = { es: "", en: "" };

const EMPTY_TECHNICAL_SPECS: ServiceTechnicalSpecs = {
	capacity: { es: "", en: "" },
	flowRate: { es: "", en: "" },
	material: { es: "", en: "" },
	application: { es: "", en: "" },
	technology: { es: "", en: "" },
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizeLocalizedText(
	value: unknown,
	fallback: LocalizedText = EMPTY_LOCALIZED_TEXT,
): LocalizedText {
	if (!value || typeof value !== "object") {
		return { ...fallback };
	}

	const record = value as Record<string, unknown>;

	return {
		es: normalizeString(record.es, fallback.es),
		en: normalizeString(record.en, fallback.en),
	};
}

function normalizeGallery(value: unknown): ServiceGalleryItem[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item) => {
			const record =
				item && typeof item === "object"
					? (item as Record<string, unknown>)
					: null;

			return {
				url: normalizeString(record?.url),
				alt: normalizeLocalizedText(record?.alt),
				order: normalizeNumber(record?.order, 0),
			};
		})
		.filter((item) => item.url.trim().length > 0)
		.sort((a, b) => a.order - b.order);
}

function normalizeAttachments(value: unknown): ServiceAttachmentRef[] {
	if (!Array.isArray(value)) return [];

	return value.map((item) => {
		const record =
			item && typeof item === "object"
				? (item as Record<string, unknown>)
				: null;

		const rawDocumentId = record?.documentId;

		return {
			documentId:
				typeof rawDocumentId === "string"
					? rawDocumentId
					: rawDocumentId &&
						  typeof rawDocumentId === "object" &&
						  "_id" in rawDocumentId
						? normalizeString(
								(rawDocumentId as Record<string, unknown>)._id,
								"",
							)
						: "",
			title: normalizeString(record?.title),
		};
	});
}

function normalizeTechnicalSpecs(value: unknown): ServiceTechnicalSpecs {
	if (!value || typeof value !== "object") {
		return structuredClone(EMPTY_TECHNICAL_SPECS);
	}

	const record = value as Record<string, unknown>;

	return {
		capacity: normalizeLocalizedText(record.capacity),
		flowRate: normalizeLocalizedText(record.flowRate),
		material: normalizeLocalizedText(record.material),
		application: normalizeLocalizedText(record.application),
		technology: normalizeLocalizedText(record.technology),
	};
}

function normalizeSeo(value: unknown): PublicServiceDetail["seo"] {
	if (!value || typeof value !== "object") {
		return {
			metaTitle: { es: "", en: "" },
			metaDescription: { es: "", en: "" },
			image: "",
		};
	}

	const record = value as Record<string, unknown>;

	return {
		metaTitle: normalizeLocalizedText(record.metaTitle),
		metaDescription: normalizeLocalizedText(record.metaDescription),
		image: normalizeString(record.image),
	};
}

function normalizeService(value: unknown): PublicServiceDetail {
	const record =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};

	return {
		_id: normalizeString(record._id),
		slug: normalizeString(record.slug),
		title: normalizeLocalizedText(record.title),
		summary: normalizeLocalizedText(record.summary),
		description: normalizeLocalizedText(record.description),
		category: normalizeString(record.category),
		featured: normalizeBoolean(record.featured, false),
		order: normalizeNumber(record.order, 0),
		coverImage: normalizeString(record.coverImage),
		gallery: normalizeGallery(record.gallery),
		technicalSpecs: normalizeTechnicalSpecs(record.technicalSpecs),
		attachments: normalizeAttachments(record.attachments),
		seo: normalizeSeo(record.seo),
	};
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(_: Request, context: RouteContext) {
	try {
		await connectToDB();

		const params = await context.params;
		const slug = params.slug?.trim().toLowerCase();

		if (!slug) {
			return NextResponse.json(
				{
					ok: false,
					message: "Missing service slug",
				},
				{ status: 400 },
			);
		}

		const service = await Service.findOne({
			slug,
			status: "published",
		}).lean();

		if (!service) {
			return NextResponse.json(
				{
					ok: false,
					message: "Service not found",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{
				ok: true,
				data: {
					service: normalizeService(service),
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Public service detail error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Error loading service detail",
			},
			{ status: 500 },
		);
	}
}
