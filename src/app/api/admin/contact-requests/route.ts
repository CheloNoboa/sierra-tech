/**
 * =============================================================================
 * 📡 API Route: Admin Contact Requests
 * Path: src/app/api/admin/contact-requests/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo para listar solicitudes públicas de contacto.
 *
 * Query params soportados:
 * - intent: general | advisory | quote | support
 * - status: new | in_review | closed
 * - q: búsqueda simple por nombre, email, empresa o mensaje
 *
 * EN:
 * Administrative endpoint for listing public contact requests.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import ContactRequest from "@/models/ContactRequest";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ContactIntent = "general" | "advisory" | "quote" | "support";
type ContactStatus = "new" | "in_review" | "closed";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeIntent(value: string | null): ContactIntent | "" {
	if (
		value === "general" ||
		value === "advisory" ||
		value === "quote" ||
		value === "support"
	) {
		return value;
	}

	return "";
}

function normalizeStatus(value: string | null): ContactStatus | "" {
	if (value === "new" || value === "in_review" || value === "closed") {
		return value;
	}
	return "";
}

function normalizeSearch(value: string | null): string {
	return typeof value === "string" ? value.trim() : "";
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
	try {
		await connectToDB();

		const { searchParams } = new URL(req.url);

		const intent = normalizeIntent(searchParams.get("intent"));
		const status = normalizeStatus(searchParams.get("status"));
		const q = normalizeSearch(searchParams.get("q"));

		const filter: Record<string, unknown> = {};

		if (intent) {
			filter.intent = intent;
		}

		if (status) {
			filter.status = status;
		}

		if (q) {
			filter.$or = [
				{ name: { $regex: q, $options: "i" } },
				{ email: { $regex: q, $options: "i" } },
				{ company: { $regex: q, $options: "i" } },
				{ message: { $regex: q, $options: "i" } },
			];
		}

		const items = await ContactRequest.find(filter)
			.sort({ createdAt: -1 })
			.lean();

		return NextResponse.json(
			{
				ok: true,
				items: items.map((item) => ({
					_id: String(item._id),
					intent: item.intent ?? "general",
					name: item.name ?? "",
					company: item.company ?? "",
					email: item.email ?? "",
					phone: item.phone ?? "",
					location: item.location ?? "",
					serviceClassKey: item.serviceClassKey ?? "",
					serviceClassSnapshot: item.serviceClassSnapshot ?? { es: "", en: "" },
					message: item.message ?? "",
					source: item.source ?? "public_site",
					status: item.status ?? "new",
					createdAt: item.createdAt ?? null,
					updatedAt: item.updatedAt ?? null,
				})),
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[API /admin/contact-requests] GET error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Internal server error.",
				items: [],
			},
			{ status: 500 },
		);
	}
}
