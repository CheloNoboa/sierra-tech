/**
 * =============================================================================
 * 📡 API Route: Public Services
 * Path: src/app/api/public/services/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público para construir la página /services.
 *
 *   Responsabilidades:
 *   - Obtener servicios publicados
 *   - Obtener configuración global de la página de servicios
 *   - Obtener las featured cards definidas en HomeSettings
 *   - Devolver un contrato estable y seguro para el front público
 *
 *   Contrato:
 *   - ok
 *   - data.page.header
 *   - data.page.featuredCards
 *   - data.services
 *
 *   Reglas:
 *   - Solo expone servicios publicados
 *   - Ordena servicios por order ascendente
 *   - Las featured cards se leen desde HomeSettings
 *   - Solo devuelve cards habilitadas
 *   - Ordena cards por order ascendente
 *   - Si no existen documentos de configuración, devuelve estructuras vacías seguras
 *   - Nunca obliga al front a resolver nulls profundos
 *
 * EN:
 *   Public endpoint used to build the /services page.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import Service from "@/models/Service";
import ServicesPage from "@/models/ServicesPage";
import HomeSettings from "@/models/HomeSettings";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LocalizedText {
	es: string;
	en: string;
}

interface ServicesPageHeader {
	eyebrow: LocalizedText;
	title: LocalizedText;
	subtitle: LocalizedText;
	primaryCtaLabel: LocalizedText;
	primaryCtaHref: string;
	secondaryCtaLabel: LocalizedText;
	secondaryCtaHref: string;
}

interface FeaturedCard {
	id: string;
	title: LocalizedText;
	description: LocalizedText;
	order: number;
	enabled: boolean;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = { es: "", en: "" };

const EMPTY_PAGE_HEADER: ServicesPageHeader = {
	eyebrow: { es: "", en: "" },
	title: { es: "", en: "" },
	subtitle: { es: "", en: "" },
	primaryCtaLabel: { es: "", en: "" },
	primaryCtaHref: "",
	secondaryCtaLabel: { es: "", en: "" },
	secondaryCtaHref: "",
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
	if (!value || typeof value !== "object") return fallback;

	const record = value as Record<string, unknown>;

	return {
		es: normalizeString(record.es, fallback.es),
		en: normalizeString(record.en, fallback.en),
	};
}

function normalizePageHeader(value: unknown): ServicesPageHeader {
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

function normalizeFeaturedCard(value: unknown): FeaturedCard {
	if (!value || typeof value !== "object") {
		return {
			id: "",
			title: { es: "", en: "" },
			description: { es: "", en: "" },
			order: 0,
			enabled: false,
		};
	}

	const record = value as Record<string, unknown>;

	return {
		id: normalizeString(record.id),
		title: normalizeLocalizedText(record.title),
		description: normalizeLocalizedText(record.description),
		order: normalizeNumber(record.order, 0),
		enabled: normalizeBoolean(record.enabled, false),
	};
}

function normalizeFeaturedCards(value: unknown): FeaturedCard[] {
	if (!Array.isArray(value)) return [];

	return value
		.map(normalizeFeaturedCard)
		.filter((card) => card.enabled && card.id.trim().length > 0)
		.sort((a, b) => a.order - b.order);
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
	try {
		await connectToDB();

		const [services, page, homeSettings] = await Promise.all([
			Service.find({ status: "published" }).sort({ order: 1 }).lean(),
			ServicesPage.findOne().lean(),
			HomeSettings.findOne().lean(),
		]);

		return NextResponse.json(
			{
				ok: true,
				data: {
					page: {
						header: normalizePageHeader(page?.header),
						featuredCards: normalizeFeaturedCards(homeSettings?.featuredCards),
					},
					services: services ?? [],
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Public services error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Error loading services",
			},
			{ status: 500 },
		);
	}
}
