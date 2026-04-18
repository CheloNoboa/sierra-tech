/**
 * ===============================================================
 * ✅ src/app/api/privacy/route.ts
 * ---------------------------------------------------------------
 * API pública para obtener la Política de Privacidad por idioma.
 * ---------------------------------------------------------------
 * - No requiere autenticación
 * - Retorna un solo documento por idioma
 * - Sin ANY — Tipado estricto — ES/EN
 * ===============================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import PrivacyPolicy from "@/models/PrivacyPolicy";

/** Idiomas permitidos */
type Lang = "es" | "en";

/** Normaliza el idioma recibido */
function parseLang(value: string | null): Lang {
	const v = value?.toLowerCase();
	return v === "es" ? "es" : "en";
}

export async function GET(req: Request) {
	try {
		await connectToDB();

		const { searchParams } = new URL(req.url);
		const lang = parseLang(searchParams.get("lang"));

		const policy = await PrivacyPolicy.findOne({ lang }).lean();

		if (!policy) {
			return NextResponse.json(
				{
					error:
						lang === "es"
							? "No se encontró la política de privacidad para este idioma."
							: "Privacy policy not found for this language.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json(policy, { status: 200 });
	} catch (error) {
		console.error("❌ Error obteniendo política pública de privacidad:", error);
		return NextResponse.json(
			{
				error:
					"Internal server error / Error interno del servidor al obtener la política de privacidad.",
			},
			{ status: 500 },
		);
	}
}
