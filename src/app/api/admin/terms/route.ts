/**
 * ✅ src/app/api/admin/terms/route.ts
 * -------------------------------------------------------------------
 * API administrativa para la colección TermsPolicy
 * Tipado estricto — Sin ANY
 * -------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import TermsPolicy from "@/models/TermsPolicy";

/* ===============================================================
   🌎 Tipos
   =============================================================== */

type Lang = "es" | "en";

interface UserSession {
	user?: {
		role?: string;
		name?: string;
		email?: string;
		language?: string;
	};
}

/* ===============================================================
   🗣️ Mensajes localizados
   =============================================================== */

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

/* ===============================================================
   🌐 Obtener idioma (sin ANY)
   =============================================================== */

function getLang(session: UserSession | null): Lang {
	const lang = session?.user?.language?.toLowerCase();
	return lang === "es" ? "es" : "en";
}

/* ===============================================================
   📌 GET
   =============================================================== */

export async function GET() {
	try {
		await connectToDB();
		const terms = await TermsPolicy.find({}).sort({ lang: 1 });
		return NextResponse.json(terms);
	} catch (error) {
		console.error("❌ Error obteniendo términos:", error);
		return NextResponse.json(
			{ error: messages.en.serverError },
			{ status: 500 },
		);
	}
}

/* ===============================================================
   ➕ POST
   =============================================================== */

export async function POST(req: Request) {
	try {
		const session = (await getServerSession(authOptions)) as UserSession | null;
		const lang = getLang(session);
		const msg = messages[lang];

		if (!session || session.user?.role !== "admin") {
			return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
		}

		await connectToDB();
		const body = await req.json();

		const existing = await TermsPolicy.findOne({ lang: body.lang });
		if (existing) {
			return NextResponse.json({ error: msg.duplicate }, { status: 409 });
		}

		const newTerms = await TermsPolicy.create({
			lang: body.lang,
			title: body.title,
			sections: body.sections,
			lastModifiedBy: session.user.name || "Administrator",
			lastModifiedEmail: session.user.email || "admin@fastfood.com",
		});

		return NextResponse.json(
			{ message: msg.created, data: newTerms },
			{ status: 201 },
		);
	} catch (error) {
		console.error("❌ Error creando términos:", error);
		return NextResponse.json(
			{ error: messages.en.serverError },
			{ status: 500 },
		);
	}
}

/* ===============================================================
   💾 PUT
   =============================================================== */

export async function PUT(req: Request) {
	try {
		const session = (await getServerSession(authOptions)) as UserSession | null;
		const lang = getLang(session);
		const msg = messages[lang];

		if (!session || session.user?.role !== "admin") {
			return NextResponse.json({ error: msg.unauthorized }, { status: 403 });
		}

		await connectToDB();
		const body = await req.json();

		const existing = await TermsPolicy.findOne({ lang: body.lang });
		if (!existing) {
			return NextResponse.json({ error: msg.notFound }, { status: 404 });
		}

		existing.title = body.title;
		existing.sections = body.sections;
		existing.updatedAt = new Date();
		existing.lastModifiedBy = session.user.name || "Administrator";
		existing.lastModifiedEmail = session.user.email || "admin@fastfood.com";

		await existing.save();

		return NextResponse.json({ message: msg.updated, data: existing });
	} catch (error) {
		console.error("❌ Error actualizando términos:", error);
		return NextResponse.json(
			{ error: messages.en.serverError },
			{ status: 500 },
		);
	}
}
