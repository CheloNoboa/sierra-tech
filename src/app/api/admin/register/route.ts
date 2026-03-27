/**
 * ✅ src/app/api/admin/register/route.ts
 * -------------------------------------------------------------------
 * Registro de administradores
 * -------------------------------------------------------------------
 * - Usa el conector global `connectToDB()`
 * - Cifra contraseñas con bcryptjs
 * - Evita duplicados por correo electrónico
 * - Retorna mensajes bilingües (ES/EN)
 * -------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectToDB } from "@/lib/connectToDB";
import { getApiMessage } from "@/lib/getApiMessage";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = await req.json();
    const { name, email, password, role } = body;

    // Validaciones básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: getApiMessage("es", "global", "invalid") },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: getApiMessage("es", "users", "invalid") },
        { status: 400 }
      );
    }

    // Cifrar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "admin",
    });

    await newUser.save();

    return NextResponse.json(
      {
        message: getApiMessage("es", "users", "created"),
        user: {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error POST /admin/register:", error);
    return NextResponse.json(
      { error: getApiMessage("es", "global", "createError") },
      { status: 500 }
    );
  }
}
