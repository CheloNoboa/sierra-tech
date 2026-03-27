/**
 * ============================================================================
 * 📌 API: /api/admin/roles/route.ts
 * ----------------------------------------------------------------------------
 * ES:
 *   CRUD de Roles del sistema FastFood, con reglas:
 *   - Solo superadmin puede ver/crear/editar/eliminar el rol "superadmin".
 *   - Usuarios NO superadmin nunca ven ese rol.
 *   - Respuestas bilingües y consistentes con el resto del sistema.
 *
 * EN:
 *   FastFood Roles CRUD with restrictions:
 *   - Only superadmin can see/create/edit/delete "superadmin".
 *   - Non-superadmins never see that role.
 *   - Fully bilingual consistent responses.
 *
 * Reglas:
 *   ✔ 0 ANY
 *   ✔ Tipado estricto
 *   ✔ ESLint clean
 *   ✔ Compatible con NextAuth y Next.js 15
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import Role, { type IRole } from "@/models/Role";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* ============================================================================
 * 🌐 Localización
 * ========================================================================== */
function getLocale(req: NextRequest): "es" | "en" {
  const lang = req.headers.get("accept-language");
  return lang?.toLowerCase().startsWith("es") ? "es" : "en";
}

/* ============================================================================
 * 🔐 Sesión mínima
 * ========================================================================== */
async function getSessionSafe() {
  const session = await getServerSession(authOptions);
  return session as { user?: { role: string } } | null;
}

/* ============================================================================
 * DTO
 * ========================================================================== */
interface RoleDTO {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

function roleToDTO(role: IRole): RoleDTO {
  return {
    id: role.id,
    code: role.code,
    name_es: role.name_es,
    name_en: role.name_en,
    permissions: role.permissions,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

/* ============================================================================
 * Body recibido del cliente
 * ========================================================================== */
interface RoleBody {
  id?: string;
  code?: string;
  name_es?: string;
  name_en?: string;
  permissions?: string[];
}

/* ============================================================================
 * 📌 GET — listar roles
 * ========================================================================== */
export async function GET() {
  await connectToDB();
  const session = await getSessionSafe();

  const filter: Record<string, unknown> = {};

  if (session?.user?.role !== "superadmin") {
    filter.code = { $ne: "superadmin" };
  }

  const roles = await Role.find(filter).sort({ code: 1 }).exec();

  return NextResponse.json(roles.map(roleToDTO), { status: 200 });
}

/* ============================================================================
 * 📌 POST — crear rol
 * ========================================================================== */
export async function POST(req: NextRequest) {
  const locale = getLocale(req);

  try {
    await connectToDB();

    const body = (await req.json()) as RoleBody;
    const { code, name_es, name_en, permissions } = body;

    const session = await getSessionSafe();

    if (!code || !name_es || !name_en || !Array.isArray(permissions)) {
      return NextResponse.json(
        {
          error:
            locale === "es"
              ? "Faltan campos obligatorios (code, name_es, name_en, permissions)."
              : "Missing required fields (code, name_es, name_en, permissions).",
        },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toLowerCase();

    // Restricción superadmin
    if (
      normalizedCode === "superadmin" &&
      session?.user?.role !== "superadmin"
    ) {
      return NextResponse.json(
        {
          error:
            locale === "es"
              ? "Solo el superadmin puede crear este rol."
              : "Only superadmin can create this role.",
        },
        { status: 403 }
      );
    }

    // Duplicados
    const exists = await Role.findOne({ code: normalizedCode }).exec();
    if (exists) {
      return NextResponse.json(
        {
          error:
            locale === "es"
              ? "Ya existe un rol con ese código."
              : "A role with that code already exists.",
        },
        { status: 409 }
      );
    }

    const created = await Role.create({
      code: normalizedCode,
      name_es: name_es.trim(),
      name_en: name_en.trim(),
      permissions,
    });

    return NextResponse.json(roleToDTO(created), { status: 201 });
  } catch (err) {
    console.error("❌ Error creando rol:", err);
    return NextResponse.json(
      {
        error:
          locale === "es"
            ? "Error interno al crear el rol."
            : "Internal error while creating role.",
      },
      { status: 500 }
    );
  }
}

/* ============================================================================
 * 📌 PUT — editar rol
 * ========================================================================== */
export async function PUT(req: NextRequest) {
  const locale = getLocale(req);

  try {
    await connectToDB();

    const body = (await req.json()) as RoleBody;
    const { id, code, name_es, name_en, permissions } = body;

    if (!id) {
      return NextResponse.json(
        { error: locale === "es" ? "Falta el id del rol." : "Missing role id." },
        { status: 400 }
      );
    }

    const session = await getSessionSafe();
    const current = await Role.findById(id).exec();

    if (!current) {
      return NextResponse.json(
        { error: locale === "es" ? "Rol no encontrado." : "Role not found." },
        { status: 404 }
      );
    }

    // Superadmin restrictions
    if (
      current.code === "superadmin" &&
      session?.user?.role !== "superadmin"
    ) {
      return NextResponse.json(
        {
          error:
            locale === "es"
              ? "No puedes modificar el rol superadmin."
              : "You cannot modify the superadmin role.",
        },
        { status: 403 }
      );
    }

    const fields: Partial<RoleBody> = {};

    if (code) fields.code = code.trim().toLowerCase();
    if (name_es) fields.name_es = name_es.trim();
    if (name_en) fields.name_en = name_en.trim();
    if (Array.isArray(permissions)) fields.permissions = permissions;

    const updated = await Role.findByIdAndUpdate(id, fields, { new: true }).exec();

    return NextResponse.json(roleToDTO(updated!), { status: 200 });
  } catch (err) {
    console.error("❌ Error actualizando rol:", err);
    return NextResponse.json(
      {
        error:
          locale === "es"
            ? "Error interno al actualizar el rol."
            : "Internal error while updating role.",
      },
      { status: 500 }
    );
  }
}

/* ============================================================================
 * 📌 DELETE — eliminar rol
 * ========================================================================== */
export async function DELETE(req: NextRequest) {
  let locale: "es" | "en" = "en";

  try {
    await connectToDB();

    locale = getLocale(req);

    const session = await getSessionSafe();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: locale === "es" ? "Falta el id del rol." : "Missing role id." },
        { status: 400 }
      );
    }

    const role = await Role.findById(id).exec();

    if (!role) {
      return NextResponse.json(
        { error: locale === "es" ? "Rol no encontrado." : "Role not found." },
        { status: 404 }
      );
    }

    // superadmin restriction
    if (
      role.code === "superadmin" &&
      session?.user?.role !== "superadmin"
    ) {
      return NextResponse.json(
        {
          error:
            locale === "es"
              ? "No puedes eliminar el rol superadmin."
              : "You cannot delete the superadmin role.",
        },
        { status: 403 }
      );
    }

    await Role.findByIdAndDelete(id).exec();

    return NextResponse.json(
      {
        message:
          locale === "es"
            ? "Rol eliminado correctamente."
            : "Role deleted successfully.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error eliminando rol:", err);
    return NextResponse.json(
      {
        error:
          locale === "es"
            ? "Error interno al eliminar el rol."
            : "Internal error while deleting role.",
      },
      { status: 500 }
    );
  }
}
