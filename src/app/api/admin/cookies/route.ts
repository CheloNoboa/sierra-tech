/**
 * =============================================================================
 * 📌 API: Admin Cookie Policy
 * Path: src/app/api/admin/cookies/route.ts
 * =============================================================================
 *
 * ES:
 * API administrativa para gestionar la Política de Cookies.
 *
 * Responsabilidades:
 * - Listar las políticas de cookies disponibles por idioma.
 * - Crear una política cuando no exista para el idioma indicado.
 * - Actualizar una política existente.
 * - Registrar metadata administrativa de modificación.
 * - Responder con mensajes localizados ES/EN.
 *
 * Contrato:
 * - La entidad se identifica por `lang`.
 * - Cada política contiene:
 *   - title
 *   - sections[] con heading/content
 * - No se crean registros duplicados para el mismo idioma.
 *
 * Seguridad:
 * - El acceso de escritura se valida mediante permisos reales de sesión.
 * - Permite escritura si el usuario cumple al menos una condición:
 *   - role === "superadmin"
 *   - permissions incluye "*"
 *   - permissions incluye "policies.update"
 *
 * Decisiones:
 * - No se usa validación rígida por rol "admin".
 * - El editor administrativo trabaja con `heading`, no con `title`, dentro
 *   de cada sección.
 * - GET no modifica datos.
 * - POST previene duplicados.
 * - PUT actualiza únicamente el registro del idioma recibido.
 *
 * Reglas:
 * - Sin `any`.
 * - Sin lógica visual.
 *
 * EN:
 * Administrative API for managing the Cookie Policy.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import CookiePolicy from "@/models/CookiePolicy";

type Lang = "es" | "en";

interface UserSession {
	user?: {
		name?: string | null;
		email?: string | null;
		role?: string | null;
		language?: string | null;
		permissions?: string[];
	} | null;
}

interface CookiePolicyPayload {
	lang: Lang;
	title: string;
	sections: Array<{ heading: string; content: string }>;
}

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

function getLang(session: UserSession | null): Lang {
	const raw = session?.user?.language?.toLowerCase();
	return raw === "es" ? "es" : "en";
}

function canManagePolicies(session: UserSession | null): boolean {
	const permissions = session?.user?.permissions ?? [];

	return (
		session?.user?.role === "superadmin" ||
		permissions.includes("*") ||
		permissions.includes("policies.update")
	);
}

export async function GET() {
	try {
		await connectToDB();

		const cookies = await CookiePolicy.find({}).sort({ lang: 1 }).lean();

		return NextResponse.json(cookies, { status: 200 });
	} catch (error) {
		console.error("❌ Error obteniendo políticas de cookies:", error);

		return NextResponse.json(
			{ error: messages.en.serverError },
			{ status: 500 },
		);
	}
}

export async function POST(req: Request) {
	try {
		const session = (await getServerSession(authOptions)) as UserSession | null;
		const lang = getLang(session);
		const msg = messages[lang];

		if (!canManagePolicies(session)) {
			return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
		}

		await connectToDB();

		const body = (await req.json()) as CookiePolicyPayload;

		const existing = await CookiePolicy.findOne({ lang: body.lang });

		if (existing) {
			return NextResponse.json({ error: msg.duplicate }, { status: 409 });
		}

		const newCookie = await CookiePolicy.create({
			...body,
			lastModifiedBy: session?.user?.name ?? "Administrator",
			lastModifiedEmail: session?.user?.email ?? "admin@sierratech.com",
		});

		return NextResponse.json(
			{ ok: true, message: msg.created, data: newCookie },
			{ status: 201 },
		);
	} catch (error) {
		console.error("❌ Error creando política de cookies:", error);

		return NextResponse.json(
			{ error: messages.en.serverError },
			{ status: 500 },
		);
	}
}

export async function PUT(req: Request) {
	try {
		const session = (await getServerSession(authOptions)) as UserSession | null;
		const lang = getLang(session);
		const msg = messages[lang];

		if (!canManagePolicies(session)) {
			return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
		}

		await connectToDB();

		const body = (await req.json()) as CookiePolicyPayload;

		const existing = await CookiePolicy.findOne({ lang: body.lang });

		if (!existing) {
			return NextResponse.json({ error: msg.notFound }, { status: 404 });
		}

		existing.title = body.title;
		existing.sections = body.sections;
		existing.updatedAt = new Date();
		existing.lastModifiedBy = session?.user?.name ?? "Administrator";
		existing.lastModifiedEmail = session?.user?.email ?? "admin@sierratech.com";

		await existing.save();

		return NextResponse.json(
			{ ok: true, message: msg.updated, data: existing },
			{ status: 200 },
		);
	} catch (error) {
		console.error("❌ Error actualizando política de cookies:", error);

		return NextResponse.json(
			{ error: messages.en.serverError },
			{ status: 500 },
		);
	}
}