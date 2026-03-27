/**
 * ===============================================================
 * ✅ src/app/api/cookies/last-update/route.ts
 * ---------------------------------------------------------------
 * Devuelve la última fecha de actualización de la Política de Cookies
 * filtrada por idioma.
 *
 * Comportamiento esperado:
 * - Si existe al menos una política para el idioma solicitado:
 *   devuelve { date }
 * - Si todavía no existe ninguna política:
 *   NO devuelve error; responde estado vacío controlado
 *
 * Nota:
 * - La ausencia de colección o documentos en MongoDB no debe tratarse
 *   como error operativo del sistema.
 * - Este endpoint expone un contrato estable para que el frontend
 *   pueda renderizar una mensajería vacía sin romper la UI.
 * ===============================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import CookiePolicy from "@/models/CookiePolicy";

/** Idiomas permitidos por el endpoint */
type Lang = "es" | "en";

/**
 * Normaliza el idioma recibido por query string.
 * Cualquier valor distinto de "es" cae por defecto en "en".
 */
function parseLang(value: string | null): Lang {
  return value?.toLowerCase() === "es" ? "es" : "en";
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const lang = parseLang(searchParams.get("lang"));

    /**
     * Busca la política más recientemente actualizada
     * SOLO del idioma solicitado.
     */
    const last = await CookiePolicy.findOne(
      { lang },
      { updatedAt: 1, _id: 0 }
    )
      .sort({ updatedAt: -1 })
      .lean<{ updatedAt?: Date } | null>();

    /**
     * Estado vacío controlado:
     * - no hay colección aún
     * - no hay documentos todavía
     * - no existe política en ese idioma
     *
     * Esto NO es un error del sistema.
     */
    if (!last?.updatedAt) {
      return NextResponse.json(
        {
          date: null,
          isEmpty: true,
          message:
            lang === "es"
              ? "Aún no existe una Política de Cookies registrada para este idioma."
              : "There is no Cookie Policy registered for this language yet.",
        },
        { status: 200 }
      );
    }

    /**
     * Respuesta exitosa con fecha real de actualización.
     */
    return NextResponse.json(
      {
        date: last.updatedAt,
        isEmpty: false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error al obtener la fecha de Cookies:", error);

    return NextResponse.json(
      {
        date: null,
        isEmpty: true,
        error:
          "Internal server error / Error interno al obtener la fecha de la Política de Cookies.",
      },
      { status: 500 }
    );
  }
}