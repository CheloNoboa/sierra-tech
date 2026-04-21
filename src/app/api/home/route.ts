/**
 * =============================================================================
 * 📡 API Route: Public Home
 * Path: src/app/api/home/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público para exponer el contenido visible de la portada.
 *
 *   Responsabilidad:
 *   - entregar únicamente contenido del módulo Home
 *   - reflejar lo persistido en HomeSettings
 *   - no inventar contenido visible cuando la base aún no tiene datos
 *
 *   Reglas:
 *   - solo lectura pública
 *   - no usa contratos duplicados locales
 *   - reutiliza el contrato compartido del Home
 *   - reutiliza la normalización centralizada del módulo Home
 *   - si no existe configuración, devuelve estructura vacía estable
 *   - no modifica datos
 *   - Leadership Section mantiene el mismo patrón de asset estructurado que
 *     el resto de imágenes del Home
 *
 * EN:
 *   Public endpoint used to expose visible home-page content.
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import { HOME_DEFAULTS } from "@/lib/home/home.defaults";
import { normalizeHomePayload } from "@/lib/home/home.normalize";
import HomeSettings from "@/models/HomeSettings";
import type { HomePayload } from "@/types/home";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convierte el documento persistido en un payload público estable.
 *
 * Regla:
 * - nunca expone datos crudos del modelo sin normalización
 * - garantiza que el frontend público consuma siempre el contrato oficial
 */
function toPublicPayload(
	doc: {
		hero?: unknown;
		highlightPanel?: unknown;
		featuredCards?: unknown;
		coverageSection?: unknown;
		aboutSection?: unknown;
		partnerSection?: unknown;
		leadershipSection?: unknown;
		whyChooseUs?: unknown;
		mapSection?: unknown;
		updatedAt?: Date | string;
		updatedBy?: string;
		updatedByEmail?: string;
	} | null,
): HomePayload {
	if (!doc) {
		return normalizeHomePayload(HOME_DEFAULTS);
	}

	return normalizeHomePayload({
		hero: doc.hero,
		highlightPanel: doc.highlightPanel,
		featuredCards: doc.featuredCards,
		coverageSection: doc.coverageSection,
		aboutSection: doc.aboutSection,
		partnerSection: doc.partnerSection,
		leadershipSection: doc.leadershipSection,
		whyChooseUs: doc.whyChooseUs,
		mapSection: doc.mapSection,
		updatedBy: doc.updatedBy ?? "",
		updatedByEmail: doc.updatedByEmail ?? "",
		updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
	});
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
	try {
		await connectToDB();

		const doc = await HomeSettings.findOne({}).lean();
		const payload = toPublicPayload(doc);

		return NextResponse.json(payload, { status: 200 });
	} catch (error) {
		console.error("Error fetching public home content:", error);

		return NextResponse.json(normalizeHomePayload(HOME_DEFAULTS), {
			status: 200,
		});
	}
}