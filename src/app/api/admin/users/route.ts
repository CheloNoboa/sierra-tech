/**
 * =============================================================================
 * 📌 API Route: Admin Users
 * Path: src/app/api/admin/users/route.ts
 * =============================================================================
 *
 * ES:
 * CRUD de usuarios administrativos basado en permisos.
 *
 * Reglas:
 * - Basado en:
 *   • session.user.role
 *   • session.user.permissions
 * - superadmin conserva acceso global
 * - Ya no existe control por sucursal en esta base
 *
 * EN:
 * Admin users CRUD based on permissions.
 * - superadmin keeps global access
 * - branch-based restrictions were removed from the reusable platform base
 *
 * Autor: Marcelo Noboa
 * Mantención técnica: IA asistida (ChatGPT)
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import UserModel, { type IUser } from "@/models/User";

/* =============================================================================
 * 🗣️ Mensajería bilingüe
 * ========================================================================== */

const MESSAGES = {
  unauthorized: { es: "No autorizado.", en: "Unauthorized." },
  forbidden: { es: "Acceso denegado.", en: "Forbidden." },
  missingFields: {
    es: "Faltan campos obligatorios.",
    en: "Missing required fields.",
  },
  emailInUse: {
    es: "El correo ya está registrado.",
    en: "Email already in use.",
  },
  userNotFound: {
    es: "Usuario no encontrado.",
    en: "User not found.",
  },
  invalidPhone: {
    es: "Número telefónico inválido.",
    en: "Invalid phone number.",
  },
};

function t(locale: string, key: keyof typeof MESSAGES): string {
  return MESSAGES[key][locale as "es" | "en"] || MESSAGES[key].es;
}

/* =============================================================================
 * 🔐 Tipos de sesión
 * ========================================================================== */

interface SessionUser {
  _id: string;
  role: string;
  permissions: string[];
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isRegistered?: boolean;
  image?: string | null;
}

interface AppSession {
  user: SessionUser;
}

/* =============================================================================
 * 🔐 Helpers de sesión y permisos
 * ========================================================================== */

async function getSession(): Promise<AppSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const u = session.user as SessionUser;

  return {
    user: {
      _id: u._id,
      role: u.role,
      permissions: u.permissions ?? [],
      name: u.name ?? null,
      email: u.email ?? null,
      phone: u.phone ?? null,
      isRegistered: u.isRegistered ?? false,
      image: u.image ?? null,
    },
  };
}

function hasPermission(session: AppSession, permission: string): boolean {
  if (session.user.role === "superadmin") return true;
  return session.user.permissions.includes(permission);
}

/* =============================================================================
 * 🌐 Detección de locale
 * ========================================================================== */

function getLocaleFromRequest(req: NextRequest): string {
  return (
    req.headers.get("x-lang") ||
    req.headers.get("accept-language")?.split(",")[0].slice(0, 2) ||
    "es"
  );
}

/* =============================================================================
 * 📌 GET — Listar usuarios
 * ========================================================================== */

export async function GET(req: NextRequest) {
  const locale = getLocaleFromRequest(req);
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: t(locale, "unauthorized") },
      { status: 401 }
    );
  }

  if (!hasPermission(session, "users.view")) {
    return NextResponse.json(
      { error: t(locale, "forbidden") },
      { status: 403 }
    );
  }

  await connectToDB();

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const phone = searchParams.get("phone") || "";

  const filter: Record<string, unknown> = {};

  if (name) {
    filter.name = { $regex: name, $options: "i" };
  }

  if (phone) {
    const normalized = phone.replace(/\D+/g, "");
    if (normalized.length > 4) {
      filter.phone = { $regex: normalized, $options: "i" };
    }
  }

  if (session.user.role !== "superadmin") {
    filter.role = { $ne: "superadmin" };
  }

  const users = await UserModel.find(filter)
    .select("-password")
    .sort({ name: 1 })
    .lean<IUser[]>();

  return NextResponse.json(users);
}

/* =============================================================================
 * ➕ POST — Crear usuario
 * ========================================================================== */

export async function POST(req: NextRequest) {
  const locale = getLocaleFromRequest(req);
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: t(locale, "unauthorized") },
      { status: 401 }
    );
  }

  if (!hasPermission(session, "users.create")) {
    return NextResponse.json(
      { error: t(locale, "forbidden") },
      { status: 403 }
    );
  }

  await connectToDB();
  const body = await req.json();

  const { name, email, password, role, phone } = body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
    phone?: unknown;
  };

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password ||
    !role.trim()
  ) {
    return NextResponse.json(
      { error: t(locale, "missingFields") },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (typeof phone === "string" && phone) {
    const clean = phone.replace(/\D/g, "");

    if (phone.startsWith("+1") && clean.length !== 11) {
      return NextResponse.json(
        { error: t(locale, "invalidPhone") },
        { status: 400 }
      );
    }
  }

  const exists = await UserModel.findOne({ email: normalizedEmail });
  if (exists) {
    return NextResponse.json(
      { error: t(locale, "emailInUse") },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  const newUser = await UserModel.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashed,
    role: role.trim(),
    phone: typeof phone === "string" ? phone : null,
    provider: "credentials",
    isRegistered: false,
  });

  const created = await UserModel.findById(newUser._id)
    .select("-password")
    .lean();

  return NextResponse.json(created, { status: 201 });
}

/* =============================================================================
 * ✏️ PUT — Actualizar usuario
 * ========================================================================== */

export async function PUT(req: NextRequest) {
  const locale = getLocaleFromRequest(req);
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: t(locale, "unauthorized") },
      { status: 401 }
    );
  }

  if (!hasPermission(session, "users.update")) {
    return NextResponse.json(
      { error: t(locale, "forbidden") },
      { status: 403 }
    );
  }

  await connectToDB();
  const body = await req.json();

  const { _id, name, email, role, phone } = body as {
    _id?: unknown;
    name?: unknown;
    email?: unknown;
    role?: unknown;
    phone?: unknown;
  };

  if (typeof _id !== "string" || !_id.trim()) {
    return NextResponse.json(
      { error: "User _id is required" },
      { status: 400 }
    );
  }

  const targetUser = await UserModel.findById(_id).lean<IUser | null>();

  if (!targetUser) {
    return NextResponse.json(
      { error: t(locale, "userNotFound") },
      { status: 404 }
    );
  }

  if (typeof phone === "string" && phone) {
    const clean = phone.replace(/\D/g, "");

    if (phone.startsWith("+1") && clean.length !== 11) {
      return NextResponse.json(
        { error: t(locale, "invalidPhone") },
        { status: 400 }
      );
    }
  }

  const updated = await UserModel.findByIdAndUpdate(
    _id,
    {
      name: typeof name === "string" ? name : undefined,
      email: typeof email === "string" ? email.trim().toLowerCase() : undefined,
      role: typeof role === "string" ? role : undefined,
      phone: typeof phone === "string" ? phone : undefined,
    },
    { new: true }
  )
    .select("-password")
    .lean();

  return NextResponse.json(updated);
}

/* =============================================================================
 * 🗑 DELETE — Eliminar usuario
 * ========================================================================== */

export async function DELETE(req: NextRequest) {
  const locale = getLocaleFromRequest(req);
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: t(locale, "unauthorized") },
      { status: 401 }
    );
  }

  if (!hasPermission(session, "users.delete")) {
    return NextResponse.json(
      { error: t(locale, "forbidden") },
      { status: 403 }
    );
  }

  await connectToDB();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "User id is required" },
      { status: 400 }
    );
  }

  const targetUser = await UserModel.findById(id).lean<IUser | null>();

  if (!targetUser) {
    return NextResponse.json(
      { error: t(locale, "userNotFound") },
      { status: 404 }
    );
  }

  await UserModel.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}