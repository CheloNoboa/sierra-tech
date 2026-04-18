/** ✅ src/app/api/translate/route.ts
 * ---------------------------------------------------------------
 * API interna para traducir textos ES <-> EN con OpenAI
 * ---------------------------------------------------------------
 * - Compatible con Next.js App Router
 * - Soporta GPT-5-mini o GPT-4o-mini
 * - Retorna JSON limpio con claves planas
 * - Manejo de errores mejorado y tolerante a fallos
 * ---------------------------------------------------------------
 */

import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { from, to, text } = await req.json();

		// ⚠️ Validar entrada
		if (!from || !to || !text) {
			return NextResponse.json(
				{ error: "Faltan datos de entrada / Missing input data" },
				{ status: 400 },
			);
		}

		if (!process.env.OPENAI_API_KEY) {
			console.error("❌ Falta la API Key de OpenAI (OPENAI_API_KEY).");
			return NextResponse.json(
				{
					error:
						"No se ha configurado la clave de OpenAI. / OpenAI API key not set.",
				},
				{ status: 500 },
			);
		}

		// 🧠 Prompt
		const prompt = `
      Traduce el siguiente contenido del idioma "${from}" al idioma "${to}".
      Devuelve ÚNICAMENTE un objeto JSON con esta estructura:
      { "name": "texto", "description": "texto", "ingredients": "texto", "category": "texto" }

      Sin explicaciones, sin formato adicional.

      Texto original:
      ${JSON.stringify(text)}
    `;

		// 🚀 Petición a OpenAI
		const response = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: "gpt-5-mini",
				messages: [{ role: "user", content: prompt }],
				temperature: 0.3,
			}),
		});

		const data = await response.json();
		console.log("🧠 Respuesta OpenAI:", JSON.stringify(data, null, 2));

		const rawText = data?.choices?.[0]?.message?.content?.trim();
		if (!rawText) {
			console.warn("⚠️ Respuesta vacía o malformada desde OpenAI.");
			throw new Error("Respuesta vacía del modelo");
		}

		// 🔍 Intentar parsear
		let translated: Record<string, string> = {};

		try {
			translated = JSON.parse(rawText);
		} catch {
			// ⚠️ err eliminado → ya no produce warning
			console.warn("⚠️ Respuesta no fue JSON válido. Usando fallback.");
			translated = {
				name: "[traducción no disponible]",
				description: "",
				ingredients: "",
				category: "",
			};
		}

		// 🧹 Normalizar
		for (const key of Object.keys(translated)) {
			const val = translated[key];
			if (typeof val === "object") translated[key] = JSON.stringify(val);
			else if (val == null) translated[key] = "";
			else translated[key] = String(val);
		}

		return NextResponse.json({ translated });
	} catch (error) {
		console.error("❌ Error en /api/translate:", error);
		return NextResponse.json(
			{
				error: "Error al traducir texto / Translation process failed",
				translated: {
					name: "",
					description: "",
					ingredients: "",
					category: "",
				},
			},
			{ status: 500 },
		);
	}
}
