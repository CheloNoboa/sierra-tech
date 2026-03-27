/**
 * ✅ src/app/api/admin/cookies/route.ts
 * -------------------------------------------------------------------
 * API administrativa para la colección CookiePolicy — SIN ANY
 * -------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CookiePolicy from "@/models/CookiePolicy";

/** 🌎 Tipado estricto de idiomas */
type Lang = "es" | "en";

/** 🔐 Tipado estricto de sesión */
interface UserSession {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    language?: string;
  } | null;
}

/** 📝 Tipado del body que recibe POST y PUT */
interface CookiePolicyPayload {
  lang: Lang;
  title: string;
  sections: Array<{ heading: string; content: string }>;
}

/** 🗣️ Diccionario de mensajes localizados */
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

/** 🌐 Obtener idioma del usuario con tipado estricto */
function getLang(session: UserSession | null): Lang {
  const raw = session?.user?.language?.toLowerCase();
  return raw === "es" ? "es" : "en";
}

/* ===================================================================
   📌 GET — Obtener todas las políticas
   =================================================================== */

export async function GET() {
  try {
    await connectToDB();
    const cookies = await CookiePolicy.find({}).sort({ lang: 1 });
    return NextResponse.json(cookies);
  } catch (error) {
    console.error("❌ Error obteniendo políticas de cookies:", error);
    return NextResponse.json({ error: messages.en.serverError }, { status: 500 });
  }
}

/* ===================================================================
   📌 POST — Crear nueva política
   =================================================================== */

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as UserSession | null;
    const lang = getLang(session);
    const msg = messages[lang];

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
    }

    await connectToDB();

    const body: CookiePolicyPayload = await req.json();

    const existing = await CookiePolicy.findOne({ lang: body.lang });

    if (existing) {
      return NextResponse.json({ error: msg.duplicate }, { status: 409 });
    }

    const newCookie = await CookiePolicy.create({
      ...body,
      lastModifiedBy: session.user?.name || "Administrator",
      lastModifiedEmail: session.user?.email || "admin@fastfood.com",
    });

    return NextResponse.json(
      { message: msg.created, data: newCookie },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creando política de cookies:", error);
    return NextResponse.json({ error: messages.en.serverError }, { status: 500 });
  }
}

/* ===================================================================
   📌 PUT — Actualizar política existente
   =================================================================== */

export async function PUT(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as UserSession | null;
    const lang = getLang(session);
    const msg = messages[lang];

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
    }

    await connectToDB();

    const body: CookiePolicyPayload = await req.json();

    const existing = await CookiePolicy.findOne({ lang: body.lang });

    if (!existing) {
      return NextResponse.json({ error: msg.notFound }, { status: 404 });
    }

    existing.title = body.title;
    existing.sections = body.sections;
    existing.updatedAt = new Date();
    existing.lastModifiedBy = session.user?.name || "Administrator";
    existing.lastModifiedEmail = session.user?.email || "admin@fastfood.com";

    await existing.save();

    return NextResponse.json({ message: msg.updated, data: existing });
  } catch (error) {
    console.error("❌ Error actualizando política de cookies:", error);
    return NextResponse.json({ error: messages.en.serverError }, { status: 500 });
  }
}
