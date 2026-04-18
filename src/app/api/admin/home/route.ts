/**
 * =============================================================================
 * 📡 API Route: Admin Home
 * Path: src/app/api/admin/home/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para consultar y actualizar la configuración
 *   estructurada de la página de inicio pública.
 *
 *   Métodos:
 *   - GET: devuelve la configuración Home actual
 *   - PUT: actualiza o crea la configuración Home global
 *
 *   Seguridad:
 *   - Acceso permitido solo para admin y superadmin
 *
 *   Reglas:
 *   - Se maneja una sola entidad global de Home.
 *   - GET garantiza existencia de documento global.
 *   - PUT normaliza estructura y persiste el payload completo.
 *   - La respuesta siempre mantiene contrato estable para la UI admin.
 *   - El botón de ubicación del bloque de cobertura se controla mediante una
 *     bandera explícita independiente del mapa embebido.
 *   - Los bloques institucionales adicionales del Home también se administran
 *     desde esta misma entidad global.
 *   - Partner Section soporta múltiples partners.
 *
 * EN:
 *   Administrative endpoint for reading and updating the structured public
 *   home page configuration.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import { HOME_DEFAULTS } from "@/lib/home/home.defaults";
import {
	normalizeHomePayload,
	normalizeString,
} from "@/lib/home/home.normalize";
import HomeSettings from "@/models/HomeSettings";
import type { AllowedRole, HomePayload } from "@/types/home";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AdminGuardResult =
	| { ok: true; userName: string; userEmail: string }
	| { ok: false; response: NextResponse };

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

function toResponsePayload(
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
		userName: normalizeString(session.user.name),
		userEmail: normalizeString(session.user.email),
	};
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		await connectToDB();

		let doc = await HomeSettings.findOne({});

		if (!doc) {
			doc = await HomeSettings.create({
				hero: HOME_DEFAULTS.hero,
				highlightPanel: HOME_DEFAULTS.highlightPanel,
				featuredCards: HOME_DEFAULTS.featuredCards,
				coverageSection: HOME_DEFAULTS.coverageSection,
				aboutSection: HOME_DEFAULTS.aboutSection,
				partnerSection: HOME_DEFAULTS.partnerSection,
				leadershipSection: HOME_DEFAULTS.leadershipSection,
				whyChooseUs: HOME_DEFAULTS.whyChooseUs,
				mapSection: HOME_DEFAULTS.mapSection,
				updatedBy: "",
				updatedByEmail: "",
			});
		}

		const payload = toResponsePayload(doc.toObject());

		return NextResponse.json(payload, { status: 200 });
	} catch (error) {
		console.error("Error fetching admin home config:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al obtener la configuración de Home.",
				error_en: "Internal error while fetching Home configuration.",
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

		if (!body || typeof body !== "object") {
			return NextResponse.json(
				{
					error_es: "Payload inválido.",
					error_en: "Invalid payload.",
				},
				{ status: 400 },
			);
		}

		const normalized = normalizeHomePayload(body);

		const update = {
			hero: normalized.hero,
			highlightPanel: normalized.highlightPanel,
			featuredCards: normalized.featuredCards,
			coverageSection: normalized.coverageSection,
			aboutSection: normalized.aboutSection,
			partnerSection: normalized.partnerSection,
			leadershipSection: normalized.leadershipSection,
			whyChooseUs: normalized.whyChooseUs,
			mapSection: normalized.mapSection,
			updatedBy: guard.userName,
			updatedByEmail: guard.userEmail,
		};

		const doc = await HomeSettings.findOneAndUpdate(
			{},
			{ $set: update },
			{
				new: true,
				upsert: true,
				setDefaultsOnInsert: true,
			},
		).lean();

		const payload = toResponsePayload(doc);

		return NextResponse.json(payload, { status: 200 });
	} catch (error) {
		console.error("Error saving admin home config:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al guardar la configuración de Home.",
				error_en: "Internal error while saving Home configuration.",
			},
			{ status: 500 },
		);
	}
}
