/**
 * =============================================================================
 * 📌 API: /api/admin/settings
 * Path: src/app/api/admin/settings/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo oficial para Configuraciones del Sistema.
 *
 * Propósito:
 * - exponer configuraciones globales u operativas del sistema
 * - permitir lectura completa o filtrada por keys
 * - permitir creación de configuraciones tipadas
 * - permitir actualización segura sin perder el tipo real del valor
 * - permitir eliminación individual por id
 *
 * Alcance:
 * - Configuraciones simples de tipo:
 *   - text
 *   - number
 *   - boolean
 *
 * Decisiones:
 * - `type` deja de ser decorativo y pasa a ser parte real del contrato.
 * - `value` se normaliza según `type` antes de persistir.
 * - `text` se usa como nombre oficial en lugar de `string` para que la UI,
 *   el modelo y la API hablen el mismo lenguaje administrativo.
 * - En update, si no viene `type`, se conserva el tipo actual guardado en BD.
 * - En update, si viene `value`, se castea usando el tipo final aplicable.
 * - La API no guarda objetos ni arreglos dentro de SystemSettings en esta fase.
 *
 * Reglas:
 * - sin any
 * - respuestas consistentes: { ok, data } o { ok, message }
 * - GET soporta:
 *   - /api/admin/settings
 *   - /api/admin/settings?keys=a,b,c
 * - POST valida key única antes de crear
 * - PUT valida colisión de key si se intenta cambiar
 * - DELETE elimina por id
 *
 * EN:
 * Official administrative endpoint for System Settings.
 *
 * Purpose:
 * - expose global or operational settings
 * - allow full or key-filtered reads
 * - allow typed setting creation
 * - allow safe updates without losing the real value type
 * - allow individual deletion by id
 *
 * Decisions:
 * - `type` is now part of the real persisted contract.
 * - `value` is normalized according to `type` before persistence.
 * - `text` is the official administrative label instead of `string`.
 * - updates preserve the current stored type if no new type is provided.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import SystemSettings, {
	type ISystemSetting,
	type SystemSettingValue,
	type SystemSettingValueType,
} from "@/models/SystemSettings";

/* =============================================================================
 * Types
 * ============================================================================= */

type ApiOk<T> = {
	ok: true;
	data: T;
};

type ApiFail = {
	ok: false;
	message: string;
};

type LeanSetting = {
	_id: string;
	key: string;
	type: SystemSettingValueType;
	value: SystemSettingValue;
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
	type: SystemSettingValueType;
	value: SystemSettingValue;
	description: string;
	module: string | null;
	autoTranslate: boolean;
	lastModifiedBy: string | null;
	lastModifiedEmail: string | null;
};

type UpdateBody = Partial<CreateBody> & {
	_id: string;
};

/* =============================================================================
 * Primitive helpers
 * ============================================================================= */

function isObj(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

/* =============================================================================
 * Setting type/value normalization
 * ============================================================================= */

/**
 * ES:
 * Normaliza el tipo administrativo del setting.
 *
 * Regla:
 * - cualquier valor desconocido cae a `text`
 * - esto mantiene compatibilidad con registros antiguos sin type
 */
function normalizeSettingType(value: unknown): SystemSettingValueType {
	if (value === "number") return "number";
	if (value === "boolean") return "boolean";

	return "text";
}

/**
 * ES:
 * Normaliza el valor real según el tipo final que se va a persistir.
 *
 * Reglas:
 * - text:
 *   - siempre persiste string
 * - number:
 *   - intenta convertir desde number/string
 *   - si no es válido, persiste 0
 * - boolean:
 *   - acepta boolean real
 *   - acepta strings comunes: true, 1, yes
 *   - todo lo demás se interpreta como false/Boolean(value)
 */
function normalizeSettingValue(
	value: unknown,
	type: SystemSettingValueType,
): SystemSettingValue {
	if (type === "number") {
		const parsed =
			typeof value === "number"
				? value
				: typeof value === "string"
					? Number(value)
					: Number.NaN;

		return Number.isFinite(parsed) ? parsed : 0;
	}

	if (type === "boolean") {
		if (typeof value === "boolean") return value;

		if (typeof value === "string") {
			const normalized = value.trim().toLowerCase();

			if (
				normalized === "true" ||
				normalized === "1" ||
				normalized === "yes"
			) {
				return true;
			}

			if (
				normalized === "false" ||
				normalized === "0" ||
				normalized === "no" ||
				normalized === ""
			) {
				return false;
			}
		}

		return Boolean(value);
	}

	return typeof value === "string" ? value : String(value ?? "");
}

/* =============================================================================
 * Query helpers
 * ============================================================================= */

/**
 * ES:
 * Convierte ?keys=a,b,c en una lista única y limpia.
 */
function parseKeysParam(req: NextRequest): string[] {
	const raw = req.nextUrl.searchParams.get("keys") ?? "";
	const seen = new Set<string>();

	return raw
		.split(",")
		.map((item) => item.trim())
		.filter((item) => {
			if (!item || seen.has(item)) return false;

			seen.add(item);
			return true;
		});
}

/* =============================================================================
 * Body normalization
 * ============================================================================= */

/**
 * ES:
 * Normaliza payload de creación.
 *
 * Reglas:
 * - key es obligatorio
 * - value es obligatorio
 * - type es opcional, pero si no viene se asume text
 * - value se castea según type antes de persistir
 */
function normalizeCreateBody(
	raw: unknown,
): { ok: true; body: CreateBody } | { ok: false; message: string } {
	if (!isObj(raw)) {
		return { ok: false, message: "Invalid body." };
	}

	const key = safeString(raw.key).trim();

	if (!key) {
		return { ok: false, message: "Missing key." };
	}

	if (!("value" in raw)) {
		return { ok: false, message: "Missing value." };
	}

	const type = normalizeSettingType(raw.type);
	const value = normalizeSettingValue(raw.value, type);

	return {
		ok: true,
		body: {
			key,
			type,
			value,
			description: isNonEmptyString(raw.description)
				? safeString(raw.description).trim()
				: "",
			module: isNonEmptyString(raw.module)
				? safeString(raw.module).trim()
				: null,
			autoTranslate:
				typeof raw.autoTranslate === "boolean" ? raw.autoTranslate : false,
			lastModifiedBy: isNonEmptyString(raw.lastModifiedBy)
				? safeString(raw.lastModifiedBy).trim()
				: null,
			lastModifiedEmail: isNonEmptyString(raw.lastModifiedEmail)
				? safeString(raw.lastModifiedEmail).trim().toLowerCase()
				: null,
		},
	};
}

/**
 * ES:
 * Normaliza payload de actualización.
 *
 * Reglas:
 * - _id es obligatorio
 * - si viene `type`, se usa como nuevo tipo final
 * - si no viene `type`, se usa el tipo actual de BD
 * - si viene `value`, se castea usando el tipo final aplicable
 * - no fuerza edición de campos que no llegaron en el payload
 */
function normalizeUpdateBody(
	raw: unknown,
	currentType: SystemSettingValueType,
): { ok: true; body: UpdateBody } | { ok: false; message: string } {
	if (!isObj(raw)) {
		return { ok: false, message: "Invalid body." };
	}

	const _id = safeString(raw._id).trim();

	if (!_id) {
		return { ok: false, message: "Missing _id for update." };
	}

	const finalType = "type" in raw ? normalizeSettingType(raw.type) : currentType;

	const body: UpdateBody = { _id };

	if ("key" in raw && isNonEmptyString(raw.key)) {
		body.key = safeString(raw.key).trim();
	}

	if ("type" in raw) {
		body.type = finalType;
	}

	if ("value" in raw) {
		body.value = normalizeSettingValue(raw.value, finalType);
	}

	if ("description" in raw) {
		body.description = isNonEmptyString(raw.description)
			? safeString(raw.description).trim()
			: "";
	}

	if ("module" in raw) {
		body.module = isNonEmptyString(raw.module)
			? safeString(raw.module).trim()
			: null;
	}

	if ("autoTranslate" in raw && typeof raw.autoTranslate === "boolean") {
		body.autoTranslate = raw.autoTranslate;
	}

	if ("lastModifiedBy" in raw) {
		body.lastModifiedBy = isNonEmptyString(raw.lastModifiedBy)
			? safeString(raw.lastModifiedBy).trim()
			: null;
	}

	if ("lastModifiedEmail" in raw) {
		body.lastModifiedEmail = isNonEmptyString(raw.lastModifiedEmail)
			? safeString(raw.lastModifiedEmail).trim().toLowerCase()
			: null;
	}

	return { ok: true, body };
}

/* =============================================================================
 * GET — Obtener settings
 * ============================================================================= */

export async function GET(req: NextRequest) {
	try {
		await connectToDB();

		const keys = parseKeysParam(req);
		const query = keys.length > 0 ? { key: { $in: keys } } : {};

		const settings = await SystemSettings.find(query)
			.sort({ key: 1 })
			.lean<LeanSetting[]>();

		return NextResponse.json<ApiOk<LeanSetting[]>>(
			{
				ok: true,
				data: settings,
			},
			{ status: 200 },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";

		return NextResponse.json<ApiFail>(
			{
				ok: false,
				message,
			},
			{ status: 500 },
		);
	}
}

/* =============================================================================
 * POST — Crear setting
 * ============================================================================= */

export async function POST(req: NextRequest) {
	try {
		await connectToDB();

		const raw: unknown = await req.json().catch(() => null);
		const parsed = normalizeCreateBody(raw);

		if (!parsed.ok) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: parsed.message,
				},
				{ status: 400 },
			);
		}

		const exists = await SystemSettings.findOne({
			key: parsed.body.key,
		})
			.select({ _id: 1 })
			.lean<{ _id: string } | null>();

		if (exists?._id) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: "Key already exists.",
				},
				{ status: 409 },
			);
		}

		const created = await SystemSettings.create(parsed.body);

		return NextResponse.json<ApiOk<ISystemSetting>>(
			{
				ok: true,
				data: created,
			},
			{ status: 201 },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";

		return NextResponse.json<ApiFail>(
			{
				ok: false,
				message,
			},
			{ status: 500 },
		);
	}
}

/* =============================================================================
 * PUT — Actualizar setting
 * ============================================================================= */

export async function PUT(req: NextRequest) {
	try {
		await connectToDB();

		const raw: unknown = await req.json().catch(() => null);

		if (!isObj(raw)) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: "Invalid body.",
				},
				{ status: 400 },
			);
		}

		const _id = safeString(raw._id).trim();

		if (!_id) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: "Missing _id for update.",
				},
				{ status: 400 },
			);
		}

		const current = await SystemSettings.findById(_id)
			.select({ type: 1 })
			.lean<{ type?: SystemSettingValueType } | null>();

		if (!current) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: "Setting not found.",
				},
				{ status: 404 },
			);
		}

		const parsed = normalizeUpdateBody(raw, normalizeSettingType(current.type));

		if (!parsed.ok) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: parsed.message,
				},
				{ status: 400 },
			);
		}

		const { _id: settingId, ...patch } = parsed.body;

		if (patch.key) {
			const collision = await SystemSettings.findOne({
				key: patch.key,
				_id: { $ne: settingId },
			})
				.select({ _id: 1 })
				.lean<{ _id: string } | null>();

			if (collision?._id) {
				return NextResponse.json<ApiFail>(
					{
						ok: false,
						message: "Key already exists.",
					},
					{ status: 409 },
				);
			}
		}

		const updated = await SystemSettings.findByIdAndUpdate(settingId, patch, {
			new: true,
			runValidators: true,
		}).lean<LeanSetting | null>();

		if (!updated) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: "Setting not found.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json<ApiOk<LeanSetting>>(
			{
				ok: true,
				data: updated,
			},
			{ status: 200 },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";

		return NextResponse.json<ApiFail>(
			{
				ok: false,
				message,
			},
			{ status: 500 },
		);
	}
}

/* =============================================================================
 * DELETE — Eliminar setting
 * ============================================================================= */

export async function DELETE(req: NextRequest) {
	try {
		await connectToDB();

		const _id = (req.nextUrl.searchParams.get("id") ?? "").trim();

		if (!_id) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: "Missing id to delete.",
				},
				{ status: 400 },
			);
		}

		const deleted = await SystemSettings.findByIdAndDelete(_id).lean<
			LeanSetting | null
		>();

		if (!deleted) {
			return NextResponse.json<ApiFail>(
				{
					ok: false,
					message: "Setting not found.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json<ApiOk<{ success: true }>>(
			{
				ok: true,
				data: { success: true },
			},
			{ status: 200 },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";

		return NextResponse.json<ApiFail>(
			{
				ok: false,
				message,
			},
			{ status: 500 },
		);
	}
}

