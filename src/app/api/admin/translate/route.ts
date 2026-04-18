/**
 * 🌍 src/app/api/admin/translate/route.ts
 * ------------------------------------------------------------------
 * API interna para traducir texto entre inglés y español.
 * Tipado estricto, sin warnings.
 * ------------------------------------------------------------------
 */

import { NextResponse } from "next/server";

/* ------------------------------
   Tipos seguros para payload
------------------------------ */
interface TranslateRequest {
	text: string;
	sourceLang?: "es" | "en";
	targetLang: "es" | "en";
}

interface TranslateResponse {
	translated: string;
	method: "simulated";
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as TranslateRequest;

		const { text, targetLang } = body;

		if (!text || typeof text !== "string") {
			return NextResponse.json(
				{ message: "Texto vacío o inválido", translated: "" },
				{ status: 400 },
			);
		}

		// 🎯 Eliminado sourceLang para evitar el warning
		// Ya no lo extraemos si no lo usamos

		// 🌐 Traducción simulada
		const simulated = `[${targetLang}] ${text}`;

		const response: TranslateResponse = {
			translated: simulated,
			method: "simulated",
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("❌ Error en /api/admin/translate:", error);
		return NextResponse.json(
			{ message: "Error interno al traducir", translated: "" },
			{ status: 500 },
		);
	}
}
