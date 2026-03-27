/**
 * =============================================================================
 * 📌 API: /api/auth/update-password
 * Path: src/app/api/auth/update-password/route.ts
 * =============================================================================
 *
 * ES:
 * Actualiza la contraseña verificando el token JWT emitido por
 * `/api/auth/reset-password`.
 *
 * Funcionalidad:
 * - Soporta usuarios de la plataforma base
 * - Valida token y nueva contraseña
 * - Marca al usuario como registrado
 * - Limpia tokens persistentes si existen
 * - Sin ANY
 *
 * EN:
 * Updates the password using the reset token issued by
 * `/api/auth/reset-password`.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { connectToDB } from "@/lib/connectToDB";
import User from "@/models/User";

interface ResetTokenPayload extends JwtPayload {
  email: string;
}

interface UpdatePasswordRequest {
  token: string;
  newPassword: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<UpdatePasswordRequest>;

    const token = typeof body.token === "string" ? body.token : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    if (!token) {
      return NextResponse.json(
        { message: "Invalid or missing token" },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { message: "Invalid or missing password" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    let decoded: ResetTokenPayload;

    try {
      decoded = jwt.verify(token, requireEnv("JWT_SECRET")) as ResetTokenPayload;
    } catch (err) {
      const error = err as Error;

      if (error.name === "TokenExpiredError") {
        return NextResponse.json({ message: "Token expired" }, { status: 401 });
      }

      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    if (!decoded.email || typeof decoded.email !== "string") {
      return NextResponse.json(
        { message: "Invalid token payload" },
        { status: 400 }
      );
    }

    await connectToDB();

    const user = await User.findOne({ email: decoded.email.trim().toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.isRegistered = true;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    return NextResponse.json({
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("❌ Error in update-password:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}