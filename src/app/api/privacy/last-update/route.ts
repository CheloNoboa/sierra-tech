/**
 * ===============================================================
 * ✅ src/app/api/privacy/last-update/route.ts
 * ---------------------------------------------------------------
 * Devuelve la última fecha de actualización de la Política de
 * Privacidad filtrada por idioma.
 *
 * Comportamiento esperado:
 * - Si existe una política para el idioma solicitado:
 *   devuelve { date, isEmpty: false }
 * - Si todavía no existe ninguna política:
 *   devuelve estado vacío controlado con { date: null, isEmpty: true }
 *
 * Nota:
 * - La ausencia de colección o documentos no debe tratarse
 *   como error operativo del sistema.
 * - Este endpoint mantiene un contrato estable para que el
 *   frontend pueda renderizar estado vacío sin romper la UI.
 * ===============================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import PrivacyPolicy from "@/models/PrivacyPolicy";

/** Idiomas permitidos por el endpoint */
type Lang = "es" | "en";

/**
 * Normaliza el idioma recibido por query string.
 * Cualquier valor distinto de "es" cae por defecto en "en".
 */
function parseLang(raw: string | null): Lang {
  return raw?.toLowerCase() === "es" ? "es" : "en";
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
    const last = await PrivacyPolicy.findOne(
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
              ? "Aún no existe una Política de Privacidad registrada para este idioma."
              : "There is no Privacy Policy registered for this language yet.",
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
    console.error("❌ Error al obtener la fecha de Privacy:", error);

    return NextResponse.json(
      {
        date: null,
        isEmpty: true,
        error:
          "Internal server error / Error interno al obtener la fecha de la Política de Privacidad.",
      },
      { status: 500 }
    );
  }
}