/**
 * ✅ src/app/api/admin/privacy/route.ts
 * -------------------------------------------------------------------
 * API administrativa para la colección PrivacyPolicy
 * -------------------------------------------------------------------
 * - Tipado estricto
 * - Sin ANY
 * - Mensajes EN/ES según sesión
 * - Prevención de duplicados
 * -------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import PrivacyPolicy from "@/models/PrivacyPolicy";

/* ============================================================
   🌎 Types
   ============================================================ */

type Lang = "es" | "en";

interface UserSession {
  user?: {
    role?: string;
    name?: string;
    email?: string;
    language?: string;
  };
}

interface PrivacyPolicyBody {
  lang: Lang;
  title: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

/* ============================================================
   🗣️ Mensajes localizados
   ============================================================ */

const messages: Record<
  Lang,
  {
    created: string;
    updated: string;
    duplicate: string;
    notFound: string;
    unauthorized: string;
    serverError: string;
  }
> = {
  es: {
    created: "Registro creado exitosamente.",
    updated: "Registro actualizado correctamente.",
    duplicate: "Ya existe un registro similar. No se reemplazará.",
    notFound: "El registro no existe.",
    unauthorized: "No autorizado.",
    serverError: "Error interno del servidor.",
  },
  en: {
    created: "Record created successfully.",
    updated: "Record updated successfully.",
    duplicate: "A similar record already exists. It will not be replaced.",
    notFound: "Record not found.",
    unauthorized: "Unauthorized.",
    serverError: "Internal server error.",
  },
};

/* ============================================================
   🌐 Obtener idioma según sesión
   ============================================================ */

function getLang(session: UserSession | null): Lang {
  const lang = session?.user?.language?.toLowerCase();
  return lang === "es" ? "es" : "en";
}

/* ============================================================
   📌 GET — Listar políticas
   ============================================================ */

export async function GET() {
  try {
    await connectToDB();

    const policies = await PrivacyPolicy.find({})
      .sort({ lang: 1 })
      .lean();

    return NextResponse.json(policies, { status: 200 });
  } catch (err) {
    console.error("❌ Error obteniendo políticas:", err);
    return NextResponse.json(
      { error: messages.en.serverError },
      { status: 500 }
    );
  }
}

/* ============================================================
   ➕ POST — Crear nueva política
   ============================================================ */

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as UserSession | null;
    const lang = getLang(session);
    const msg = messages[lang];

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
    }

    await connectToDB();

    const body = (await req.json()) as PrivacyPolicyBody;

    // Evitar duplicados
    const existing = await PrivacyPolicy.findOne({ lang: body.lang });
    if (existing) {
      return NextResponse.json({ error: msg.duplicate }, { status: 409 });
    }

    const newPolicy = await PrivacyPolicy.create({
      lang: body.lang,
      title: body.title,
      sections: body.sections,
      lastModifiedBy: session.user.name ?? "Administrator",
      lastModifiedEmail: session.user.email ?? "admin@fastfood.com",
    });

    return NextResponse.json(
      { message: msg.created, data: newPolicy },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creando política:", err);
    return NextResponse.json(
      { error: messages.en.serverError },
      { status: 500 }
    );
  }
}

/* ============================================================
   💾 PUT — Actualizar política existente
   ============================================================ */

export async function PUT(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as UserSession | null;
    const lang = getLang(session);
    const msg = messages[lang];

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
    }

    await connectToDB();

    const body = (await req.json()) as PrivacyPolicyBody;

    const existing = await PrivacyPolicy.findOne({ lang: body.lang });
    if (!existing) {
      return NextResponse.json({ error: msg.notFound }, { status: 404 });
    }

    existing.title = body.title;
    existing.sections = body.sections;
    existing.updatedAt = new Date();
    existing.lastModifiedBy = session.user.name ?? "Administrator";
    existing.lastModifiedEmail = session.user.email ?? "admin@fastfood.com";

    await existing.save();

    return NextResponse.json(
      { message: msg.updated, data: existing },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error actualizando política:", err);
    return NextResponse.json(
      { error: messages.en.serverError },
      { status: 500 }
    );
  }
}
