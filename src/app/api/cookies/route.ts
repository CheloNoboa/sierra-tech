/**
 * ===============================================================
 * ✅ src/app/api/cookies/route.ts
 * ===============================================================
 * API pública para obtener la Política de Cookies por idioma.
 * - No requiere autenticación.
 * - Retorna solo un documento por idioma.
 * - Respuestas EN / ES según query param ?lang=
 * - Sin ANY — Tipado estricto — Sin warnings
 * ===============================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import CookiePolicy from "@/models/CookiePolicy";

/** Idiomas permitidos */
type Lang = "es" | "en";

/** Helper para normalizar el idioma */
function parseLang(value: string | null): Lang {
  const v = value?.toLowerCase();
  return v === "es" ? "es" : "en";
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const lang = parseLang(searchParams.get("lang"));

    const policy = await CookiePolicy.findOne({ lang }).lean();

    if (!policy) {
      return NextResponse.json(
        {
          error:
            lang === "es"
              ? "No se encontró la política de cookies para este idioma."
              : "Cookie policy not found for this language.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(policy, { status: 200 });
  } catch (error) {
    console.error("❌ Error obteniendo política pública de cookies:", error);
    return NextResponse.json(
      {
        error:
          "Internal server error / Error interno del servidor al obtener la política de cookies.",
      },
      { status: 500 }
    );
  }
}
