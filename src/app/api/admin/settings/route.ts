/**
 * =============================================================================
 * 📌 API: /api/admin/settings
 * Path: src/app/api/admin/settings/route.ts
 * =============================================================================
 * ES:
 *   CRUD minimalista y estable para Configuraciones del Sistema.
 *
 *   OBJETIVO:
 *   ---------
 *   Proveer un endpoint limpio que:
 *     • Exponga configuraciones (todas o por keys)
 *     • Permita crear nuevas configuraciones
 *     • Permita actualizarlas sin romper tipos
 *     • Permita eliminarlas individualmente
 *
 *   DECISIONES:
 *   -----------
 *   - Respuesta consistente: { ok, data?, message? }
 *   - Sin "any": validaciones con helpers tipados
 *   - GET soporta:
 *       - /api/admin/settings                => todas
 *       - /api/admin/settings?keys=a,b,c     => solo esas keys
 *
 * EN:
 *   Stable CRUD endpoint for System Settings.
 *
 * Seguridad, rendimiento y simplicidad primero.
 *
 * Autor: Marcelo Noboa
 * Mantención técnica: IA Asistida (ChatGPT)
 * Última actualización: 2026-02-19
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import SystemSettings, { type ISystemSetting } from "@/models/SystemSettings";

/* =============================================================================
 * Types (API contract)
 * ============================================================================= */

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; message: string };

type LeanSetting = {
	_id: string;
	key: string;
	value: unknown;
	description?: string;
	module?: string | null;
	autoTranslate?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
	lastModifiedBy?: string | null;
	lastModifiedEmail?: string | null;
};

type CreateBody = {
	key: string;
	value: unknown;
	description?: string;
	module?: string | null;
	autoTranslate?: boolean;
	lastModifiedBy?: string | null;
	lastModifiedEmail?: string | null;
};

type UpdateBody = Partial<CreateBody> & {
	_id: string;
};

function isObj(x: unknown): x is Record<string, unknown> {
	return !!x && typeof x === "object";
}

function safeString(x: unknown): string {
	return typeof x === "string" ? x : "";
}

function isNonEmptyString(x: unknown): x is string {
	return typeof x === "string" && x.trim().length > 0;
}

function parseKeysParam(req: NextRequest): string[] {
	const raw = req.nextUrl.searchParams.get("keys") ?? "";
	const parts = raw
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const seen = new Set<string>();
	const out: string[] = [];
	for (const k of parts) {
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(k);
	}
	return out;
}

function normalizeCreateBody(
	raw: unknown,
): { ok: true; body: CreateBody } | { ok: false; message: string } {
	if (!isObj(raw)) return { ok: false, message: "Invalid body." };

	const key = safeString(raw.key).trim();
	if (!key) return { ok: false, message: "Missing key." };

	// value es required, pero puede ser unknown (incluye string/number/bool/object)
	if (!("value" in raw)) return { ok: false, message: "Missing value." };

	const body: CreateBody = {
		key,
		value: (raw as { value: unknown }).value,
		description: isNonEmptyString(raw.description)
			? safeString(raw.description).trim()
			: "",
		module: isNonEmptyString(raw.module) ? safeString(raw.module).trim() : null,
		autoTranslate:
			typeof raw.autoTranslate === "boolean" ? raw.autoTranslate : false,
		lastModifiedBy: isNonEmptyString(raw.lastModifiedBy)
			? safeString(raw.lastModifiedBy).trim()
			: null,
		lastModifiedEmail: isNonEmptyString(raw.lastModifiedEmail)
			? safeString(raw.lastModifiedEmail).trim().toLowerCase()
			: null,
	};

	return { ok: true, body };
}

function normalizeUpdateBody(
	raw: unknown,
): { ok: true; body: UpdateBody } | { ok: false; message: string } {
	if (!isObj(raw)) return { ok: false, message: "Invalid body." };

	const _id = safeString(raw._id).trim();
	if (!_id) return { ok: false, message: "Missing _id for update." };

	const body: UpdateBody = { _id };

	if ("key" in raw && isNonEmptyString(raw.key))
		body.key = safeString(raw.key).trim();
	if ("value" in raw) body.value = (raw as { value: unknown }).value;

	if ("description" in raw)
		body.description = isNonEmptyString(raw.description)
			? safeString(raw.description).trim()
			: "";
	if ("module" in raw)
		body.module = isNonEmptyString(raw.module)
			? safeString(raw.module).trim()
			: null;
	if ("autoTranslate" in raw && typeof raw.autoTranslate === "boolean")
		body.autoTranslate = raw.autoTranslate;

	if ("lastModifiedBy" in raw)
		body.lastModifiedBy = isNonEmptyString(raw.lastModifiedBy)
			? safeString(raw.lastModifiedBy).trim()
			: null;
	if ("lastModifiedEmail" in raw)
		body.lastModifiedEmail = isNonEmptyString(raw.lastModifiedEmail)
			? safeString(raw.lastModifiedEmail).trim().toLowerCase()
			: null;

	return { ok: true, body };
}

/* =============================================================================
 * GET — Obtener settings (todos o por keys)
 * =============================================================================
 */
export async function GET(req: NextRequest) {
	try {
		await connectToDB();

		const keys = parseKeysParam(req);

		const query = keys.length > 0 ? { key: { $in: keys } } : {};

		const settings = await SystemSettings.find(query)
			.sort({ key: 1 })
			.lean<LeanSetting[]>();

		const body: ApiOk<LeanSetting[]> = { ok: true, data: settings };
		return NextResponse.json(body, { status: 200 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Unknown error";
		const body: ApiFail = { ok: false, message: msg };
		return NextResponse.json(body, { status: 500 });
	}
}

/* =============================================================================
 * POST — Crear nuevo setting
 * =============================================================================
 */
export async function POST(req: NextRequest) {
	try {
		await connectToDB();

		const raw: unknown = await req.json().catch(() => null);
		const parsed = normalizeCreateBody(raw);
		if (!parsed.ok) {
			const body: ApiFail = { ok: false, message: parsed.message };
			return NextResponse.json(body, { status: 400 });
		}

		// ✅ Enforce unique key at app level (además del schema unique)
		const exists = await SystemSettings.findOne({ key: parsed.body.key })
			.select({ _id: 1 })
			.lean<{ _id: string } | null>();
		if (exists?._id) {
			const body: ApiFail = { ok: false, message: "Key already exists." };
			return NextResponse.json(body, { status: 409 });
		}

		const created = await SystemSettings.create(parsed.body);

		const body: ApiOk<ISystemSetting> = { ok: true, data: created };
		return NextResponse.json(body, { status: 201 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Unknown error";
		const body: ApiFail = { ok: false, message: msg };
		return NextResponse.json(body, { status: 500 });
	}
}

/* =============================================================================
 * PUT — Actualizar un setting existente
 * =============================================================================
 */
export async function PUT(req: NextRequest) {
	try {
		await connectToDB();

		const raw: unknown = await req.json().catch(() => null);
		const parsed = normalizeUpdateBody(raw);
		if (!parsed.ok) {
			const body: ApiFail = { ok: false, message: parsed.message };
			return NextResponse.json(body, { status: 400 });
		}

		const { _id, ...patch } = parsed.body;

		// ✅ Si cambian key, validamos colisión
		if (patch.key) {
			const collision = await SystemSettings.findOne({
				key: patch.key,
				_id: { $ne: _id },
			})
				.select({ _id: 1 })
				.lean<{ _id: string } | null>();

			if (collision?._id) {
				const body: ApiFail = { ok: false, message: "Key already exists." };
				return NextResponse.json(body, { status: 409 });
			}
		}

		const updated = await SystemSettings.findByIdAndUpdate(_id, patch, {
			new: true,
		}).lean<LeanSetting | null>();

		if (!updated) {
			const body: ApiFail = { ok: false, message: "Setting not found." };
			return NextResponse.json(body, { status: 404 });
		}

		const body: ApiOk<LeanSetting> = { ok: true, data: updated };
		return NextResponse.json(body, { status: 200 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Unknown error";
		const body: ApiFail = { ok: false, message: msg };
		return NextResponse.json(body, { status: 500 });
	}
}

/* =============================================================================
 * DELETE — Eliminar un setting (por id)
 * =============================================================================
 */
export async function DELETE(req: NextRequest) {
	try {
		await connectToDB();

		const id = req.nextUrl.searchParams.get("id") ?? "";
		const _id = id.trim();

		if (!_id) {
			const body: ApiFail = { ok: false, message: "Missing id to delete." };
			return NextResponse.json(body, { status: 400 });
		}

		const deleted = await SystemSettings.findByIdAndDelete(
			_id,
		).lean<LeanSetting | null>();

		if (!deleted) {
			const body: ApiFail = { ok: false, message: "Setting not found." };
			return NextResponse.json(body, { status: 404 });
		}

		const body: ApiOk<{ success: true }> = {
			ok: true,
			data: { success: true },
		};
		return NextResponse.json(body, { status: 200 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Unknown error";
		const body: ApiFail = { ok: false, message: msg };
		return NextResponse.json(body, { status: 500 });
	}
}
