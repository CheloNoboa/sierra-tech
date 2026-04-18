/**
 * ============================================================================
 * 📌 API: /api/register — Public User Registration
 * Path: src/app/api/register/route.ts
 * ============================================================================
 *
 * ES:
 * Endpoint genérico de registro para la plataforma base.
 *
 * Funcionalidad:
 * - Registro manual (name/email/phone/password)
 * - Registro con Google (flujo por provider)
 * - Evita duplicados por email
 * - Actualiza usuarios existentes cuando aplica
 * - Primer usuario del sistema → superadmin
 *
 * Decisiones:
 * - Sin dependencia de sucursales
 * - Sin lógica del dominio FastFood
 * - Sin ANY
 * - `catch` usa `unknown`
 *
 * EN:
 * Generic registration endpoint for the reusable platform base.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDB } from "@/lib/connectToDB";
import User from "@/models/User";

/* ============================================================================
 * Language helpers
 * ========================================================================== */
function detectLanguage(req: Request): "es" | "en" {
	const raw = req.headers.get("Accept-Language")?.toLowerCase() ?? "";
	return raw.startsWith("es") ? "es" : "en";
}

function messages(lang: "es" | "en") {
	return {
		missing:
			lang === "es"
				? "Faltan campos obligatorios."
				: "Missing required fields.",

		invalidEmail: lang === "es" ? "Correo inválido." : "Invalid email.",

		shortPassword:
			lang === "es"
				? "La contraseña debe tener al menos 6 caracteres."
				: "Password must be at least 6 characters.",

		updated:
			lang === "es"
				? "Usuario actualizado correctamente."
				: "User updated successfully.",

		created:
			lang === "es"
				? "Usuario creado correctamente."
				: "User registered successfully.",

		internalError:
			lang === "es" ? "Error interno del servidor." : "Internal server error.",
	};
}

type RegisterBody = {
	name?: string;
	email?: string;
	password?: string;
	phone?: string;
	role?: string;
	provider?: "credentials" | "google";
};

function normalizePhone(raw: unknown): string | null {
	if (typeof raw !== "string" && typeof raw !== "number") return null;

	const value = String(raw).trim();
	if (!value) return null;

	if (value.startsWith("+")) return value;

	const digits = value.replace(/\D/g, "");
	return digits ? `+${digits}` : null;
}

function isValidEmail(email: string): boolean {
	return email.includes("@") && email.includes(".");
}

/* ============================================================================
 * POST — Generic registration
 * ========================================================================== */
export async function POST(req: Request) {
	const lang = detectLanguage(req);
	const msg = messages(lang);

	try {
		await connectToDB();

		const body = (await req.json()) as RegisterBody;

		const name = (body.name ?? "").trim();
		const email = (body.email ?? "").trim().toLowerCase();
		const password = (body.password ?? "").trim();
		const provider: "credentials" | "google" =
			body.provider === "google" ? "google" : "credentials";

		/* ------------------------------------------------------------------------
		 * Basic validation
		 * --------------------------------------------------------------------- */
		if (!name || !email) {
			return NextResponse.json({ message: msg.missing }, { status: 400 });
		}

		if (!isValidEmail(email)) {
			return NextResponse.json({ message: msg.invalidEmail }, { status: 400 });
		}

		if (provider === "credentials" && password.length < 6) {
			return NextResponse.json({ message: msg.shortPassword }, { status: 400 });
		}

		const totalUsers = await User.countDocuments();
		const isFirstUser = totalUsers === 0;

		const existing = await User.findOne({ email });

		/* ------------------------------------------------------------------------
		 * Existing user → update
		 * --------------------------------------------------------------------- */
		if (existing) {
			existing.name = name || existing.name;
			existing.provider = provider || existing.provider || "credentials";
			existing.phone = body.phone
				? normalizePhone(body.phone)
				: (existing.phone ?? null);
			existing.isRegistered = true;

			// Never downgrade superadmin.
			if (existing.role !== "superadmin") {
				existing.role = body.role || existing.role || "user";
			}

			if (provider === "credentials" && password) {
				existing.password = await bcrypt.hash(password, 10);
			}

			existing.updatedAt = new Date();
			await existing.save();

			return NextResponse.json({ message: msg.updated }, { status: 200 });
		}

		/* ------------------------------------------------------------------------
		 * New user
		 * --------------------------------------------------------------------- */
		const hashedPassword =
			provider === "credentials" && password
				? await bcrypt.hash(password, 10)
				: null;

		const formattedPhone = normalizePhone(body.phone);
		const finalRole = isFirstUser ? "superadmin" : body.role || "user";

		const newUser = new User({
			name,
			email,
			phone: formattedPhone,
			password: hashedPassword,
			role: finalRole,
			provider,
			isRegistered: true,
		});

		await newUser.save();

		return NextResponse.json({ message: msg.created }, { status: 201 });
	} catch (err: unknown) {
		console.error("❌ [API REGISTER ERROR]:", err);
		return NextResponse.json({ message: msg.internalError }, { status: 500 });
	}
}
