/**
 * =============================================================================
 * 📡 API Route: Admin Policies History
 * Path: src/app/api/admin/policies/history/route.ts
 * =============================================================================
 *
 * ES:
 *   Devuelve un historial unificado de cambios para las políticas administrativas:
 *   - PrivacyPolicy
 *   - TermsPolicy
 *   - CookiePolicy
 *
 *   Objetivo:
 *   - Exponer una única fuente de consulta para la pantalla de historial.
 *   - Unificar estructura de respuesta entre colecciones distintas.
 *   - Permitir orden cronológico descendente para auditoría operativa.
 *
 *   Seguridad:
 *   - Requiere sesión activa.
 *   - Acceso permitido únicamente a roles: admin, superadmin.
 *
 *   Respuesta:
 *   - Retorna una lista normalizada de HistoryItem[].
 *   - Cada elemento representa una versión o modificación registrada en alguna
 *     de las colecciones de políticas.
 *
 * EN:
 *   Returns a unified change history for administrative policy documents:
 *   - PrivacyPolicy
 *   - TermsPolicy
 *   - CookiePolicy
 *
 *   Purpose:
 *   - Provide a single source for the admin history screen.
 *   - Normalize records coming from different policy collections.
 *   - Support descending chronological sorting for operational auditing.
 *
 *   Security:
 *   - Requires an active session.
 *   - Access is restricted to: admin, superadmin.
 *
 *   Response:
 *   - Returns a normalized HistoryItem[] list.
 *   - Each item represents one stored policy revision or modification.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";

import PrivacyPolicy from "@/models/PrivacyPolicy";
import TermsPolicy from "@/models/TermsPolicy";
import CookiePolicy from "@/models/CookiePolicy";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Lang = "es" | "en";
type PolicyType = "Privacy" | "Terms" | "Cookies";
type AdminRole = "admin" | "superadmin";

interface BasePolicyDoc {
  _id: string | { toString(): string };
  lang?: Lang;
  lastModifiedBy?: string;
  lastModifiedEmail?: string;
  updatedAt?: Date | string;
}

interface HistoryItem {
  _id: string;
  policyType: PolicyType;
  lang: Lang;
  lastModifiedBy: string;
  lastModifiedEmail: string;
  updatedAt: string;
}

type AdminGuardResult =
  | { ok: true; role: AdminRole }
  | { ok: false; response: NextResponse };

/* -------------------------------------------------------------------------- */
/* Security                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Validates that the current request belongs to an authenticated admin user.
 *
 * Rules:
 * - 401: no active session
 * - 403: authenticated user without sufficient privileges
 */
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
        { status: 401 }
      ),
    };
  }

  const role = session.user.role;

  if (role !== "admin" && role !== "superadmin") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error_es: "No tienes permisos para acceder a este recurso.",
          error_en: "You do not have permission to access this resource.",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, role };
}

/* -------------------------------------------------------------------------- */
/* Normalization helpers                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Converts a raw policy document into the normalized history shape expected by
 * the admin UI.
 */
function mapPolicyDocToHistoryItem(
  policyType: PolicyType,
  doc: BasePolicyDoc
): HistoryItem {
  return {
    _id: typeof doc._id === "string" ? doc._id : doc._id.toString(),
    policyType,
    lang: doc.lang === "es" ? "es" : "en",
    lastModifiedBy: doc.lastModifiedBy?.trim() || "—",
    lastModifiedEmail: doc.lastModifiedEmail?.trim() || "—",
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : new Date(0).toISOString(),
  };
}

/**
 * Maps a collection of raw policy documents into normalized history items.
 */
function mapPolicyDocs(
  policyType: PolicyType,
  docs: BasePolicyDoc[]
): HistoryItem[] {
  return docs.map((doc) => mapPolicyDocToHistoryItem(policyType, doc));
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

    const [privacyDocs, termsDocs, cookieDocs] = await Promise.all([
      PrivacyPolicy.find({}).lean<BasePolicyDoc[]>(),
      TermsPolicy.find({}).lean<BasePolicyDoc[]>(),
      CookiePolicy.find({}).lean<BasePolicyDoc[]>(),
    ]);

    const history: HistoryItem[] = [
      ...mapPolicyDocs("Privacy", privacyDocs),
      ...mapPolicyDocs("Terms", termsDocs),
      ...mapPolicyDocs("Cookies", cookieDocs),
    ].sort((a, b) => {
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });

    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin policies history:", error);

    return NextResponse.json(
      {
        error_es: "Error interno al obtener el historial de políticas.",
        error_en: "Internal error while fetching policies history.",
      },
      { status: 500 }
    );
  }
}