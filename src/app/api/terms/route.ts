/**
 * ✅ src/app/api/terms/route.ts
 * -------------------------------------------------------------------
 * API pública para obtener los Términos de Servicio por idioma.
 * -------------------------------------------------------------------
 * - No requiere autenticación.
 * - Retorna solo un documento (no el array completo).
 * - Respuestas bilingües (ES / EN)
 * -------------------------------------------------------------------
 */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import TermsPolicy from "@/models/TermsPolicy";

export async function GET(req: Request) {
	try {
		await connectToDB();

		const { searchParams } = new URL(req.url);
		const lang = (searchParams.get("lang") || "en").toLowerCase();

		const policy = await TermsPolicy.findOne({ lang }).lean();

		if (!policy) {
			return NextResponse.json(
				{
					error:
						lang === "es"
							? "No se encontraron los términos de servicio para este idioma."
							: "Terms of service not found for this language.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json(policy, { status: 200 });
	} catch (error) {
		console.error("❌ Error obteniendo política pública de términos:", error);
		return NextResponse.json(
			{
				error:
					"Internal server error / Error interno del servidor al obtener los términos de servicio.",
			},
			{ status: 500 },
		);
	}
}
