/**
 * ============================================================================
 * 📌 API: /api/setup/superadmin — Bootstrap (1 sola vez)
 * Ruta: src/app/api/setup/superadmin/route.ts
 * ============================================================================
 *
 * ES:
 * - Solo permite crear el PRIMER usuario del sistema.
 * - Requiere header x-setup-key == process.env.SETUP_KEY
 * - Si ya existe al menos 1 User → bloquea para siempre.
 * - Crea un User con role="superadmin", branchId=null.
 *
 * EN:
 * - One-time bootstrap endpoint for the FIRST system user.
 * - Requires x-setup-key header matching process.env.SETUP_KEY
 * - If at least 1 User exists → permanently locked.
 * - Creates a User with role="superadmin", branchId=null.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/connectToDB";
import User from "@/models/User";

function detectLanguage(req: Request): "es" | "en" {
	const raw = req.headers.get("Accept-Language")?.toLowerCase() ?? "";
	return raw.startsWith("es") ? "es" : "en";
}

function messages(lang: "es" | "en") {
	return {
		missingKey:
			lang === "es"
				? "Falta x-setup-key o es inválida."
				: "Missing or invalid x-setup-key.",
		missingEnv:
			lang === "es"
				? "SETUP_KEY no está configurada en el servidor."
				: "SETUP_KEY is not configured on the server.",
		alreadyInitialized:
			lang === "es"
				? "El sistema ya fue inicializado. Endpoint bloqueado."
				: "System is already initialized. Endpoint locked.",
		missingFields:
			lang === "es"
				? "Faltan campos obligatorios (name/email/password)."
				: "Missing required fields (name/email/password).",
		created:
			lang === "es"
				? "SuperAdmin creado correctamente."
				: "SuperAdmin created successfully.",
		internalError:
			lang === "es" ? "Error interno del servidor." : "Internal server error.",
		emailTaken:
			lang === "es"
				? "Ya existe un usuario con ese email."
				: "A user with that email already exists.",
	};
}

export async function POST(req: Request) {
	const lang = detectLanguage(req);
	const msg = messages(lang);

	try {
		const setupKey = req.headers.get("x-setup-key") ?? "";

		const serverKey = process.env.SETUP_KEY;
		if (!serverKey || !serverKey.trim()) {
			return NextResponse.json({ message: msg.missingEnv }, { status: 500 });
		}

		if (!setupKey || setupKey !== serverKey) {
			return NextResponse.json({ message: msg.missingKey }, { status: 401 });
		}

		await connectToDB();

		const totalUsers = await User.countDocuments();
		if (totalUsers > 0) {
			return NextResponse.json(
				{ message: msg.alreadyInitialized },
				{ status: 403 },
			);
		}

		const body = (await req.json().catch(() => null)) as {
			name?: unknown;
			email?: unknown;
			password?: unknown;
		} | null;

		const name = typeof body?.name === "string" ? body?.name.trim() : "";
		const email =
			typeof body?.email === "string" ? body?.email.trim().toLowerCase() : "";
		const password = typeof body?.password === "string" ? body?.password : "";

		if (!name || !email || !password) {
			return NextResponse.json({ message: msg.missingFields }, { status: 400 });
		}

		const existing = await User.findOne({ email });
		if (existing) {
			return NextResponse.json({ message: msg.emailTaken }, { status: 409 });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const superAdmin = new User({
			name,
			email,
			password: hashedPassword,
			phone: null,
			role: "superadmin",
			provider: "credentials",
			isRegistered: true,
			branchId: null,
			lastLogin: null,
		});

		await superAdmin.save();

		return NextResponse.json({ message: msg.created }, { status: 201 });
	} catch (err) {
		console.error("❌ [SETUP SUPERADMIN ERROR]:", err);
		return NextResponse.json({ message: msg.internalError }, { status: 500 });
	}
}
