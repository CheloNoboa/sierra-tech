/**
 * ============================================================================
 * 📌 API: /api/admin/permissions/route.ts — Versión corregida
 * ----------------------------------------------------------------------------
 * ES:
 *   CRUD administrativo para permisos, PERO:
 *   - No convierte códigos a mayúsculas.
 *   - Respeta catálogo oficial (permissions.ts).
 *   - Evita corrupción de códigos.
 *
 * EN:
 *   Permissions admin CRUD — NOW SAFE.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Permission, { type IPermission } from "@/models/Permission"; // ✔ FIX aplicado
import { connectToDB } from "@/lib/connectToDB";

/* ============================================================================
 * Helpers
 * ============================================================================
 */

function getAuthRole(req: NextRequest): string {
	return req.headers.get("x-user-role") ?? "user";
}

function isValidObjectId(id: string | null | undefined): id is string {
	return typeof id === "string" && Types.ObjectId.isValid(id);
}

function toDTO(p: IPermission) {
	return {
		id: p.id,
		code: p.code,
		module: p.module,
		scope: p.scope,
		name_es: p.name_es,
		name_en: p.name_en,
		description_es: p.description_es,
		description_en: p.description_en,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
	};
}

/* =============================================================================
 * GET — Listar permisos (superadmin + admin)
 * =============================================================================
 */
export async function GET(req: NextRequest) {
	await connectToDB();
	const role = getAuthRole(req);

	if (role !== "superadmin" && role !== "admin") {
		return NextResponse.json(
			{
				es: "Acceso denegado. Solo superadmin o admin pueden ver permisos.",
				en: "Access denied. Only superadmin or admin can view permissions.",
			},
			{ status: 403 },
		);
	}

	const permissions = await Permission.find()
		.sort({ module: 1, code: 1 })
		.exec();
	return NextResponse.json(permissions.map(toDTO), { status: 200 });
}

/* =============================================================================
 * POST — Crear permiso (SOLO superadmin)
 * =============================================================================
 */
export async function POST(req: NextRequest) {
	await connectToDB();
	const role = getAuthRole(req);

	if (role !== "superadmin") {
		return NextResponse.json(
			{
				es: "Acceso denegado. Solo superadmin puede crear permisos.",
				en: "Access denied. Only superadmin can create permissions.",
			},
			{ status: 403 },
		);
	}

	const body = await req.json();

	if (!body.code || !body.module || !body.name_es || !body.name_en) {
		return NextResponse.json(
			{
				es: "Faltan campos requeridos: code, module, name_es, name_en.",
				en: "Missing required fields: code, module, name_es, name_en.",
			},
			{ status: 400 },
		);
	}

	const code = body.code.trim();

	const exists = await Permission.findOne({ code }).lean();
	if (exists) {
		return NextResponse.json(
			{
				es: "Ya existe un permiso con este código.",
				en: "A permission with this code already exists.",
			},
			{ status: 409 },
		);
	}

	const created = await Permission.create({
		code,
		module: body.module,
		scope: body.scope ?? "GLOBAL",
		name_es: body.name_es.trim(),
		name_en: body.name_en.trim(),
		description_es: body.description_es?.trim() ?? "",
		description_en: body.description_en?.trim() ?? "",
	});

	return NextResponse.json(toDTO(created), { status: 201 });
}

/* =============================================================================
 * PUT — Actualizar permiso (SOLO superadmin)
 * =============================================================================
 */
export async function PUT(req: NextRequest) {
	await connectToDB();
	const role = getAuthRole(req);

	if (role !== "superadmin") {
		return NextResponse.json(
			{
				es: "Acceso denegado. Solo superadmin puede actualizar permisos.",
				en: "Access denied. Only superadmin can update permissions.",
			},
			{ status: 403 },
		);
	}

	const body = await req.json();

	if (!isValidObjectId(body.id)) {
		return NextResponse.json(
			{ es: "ID inválido.", en: "Invalid ID." },
			{ status: 400 },
		);
	}

	const perm = await Permission.findById(body.id).exec();
	if (!perm) {
		return NextResponse.json(
			{ es: "Permiso no encontrado.", en: "Permission not found." },
			{ status: 404 },
		);
	}

	if (body.code) perm.code = body.code.trim();
	if (body.module) perm.module = body.module;
	if (body.scope) perm.scope = body.scope;
	if (body.name_es) perm.name_es = body.name_es.trim();
	if (body.name_en) perm.name_en = body.name_en.trim();
	if (body.description_es !== undefined)
		perm.description_es = body.description_es.trim();
	if (body.description_en !== undefined)
		perm.description_en = body.description_en.trim();

	await perm.save();
	return NextResponse.json(toDTO(perm), { status: 200 });
}

/* =============================================================================
 * DELETE — Eliminar permiso (SOLO superadmin)
 * =============================================================================
 */
export async function DELETE(req: NextRequest) {
	await connectToDB();
	const role = getAuthRole(req);

	if (role !== "superadmin") {
		return NextResponse.json(
			{
				es: "Acceso denegado. Solo superadmin puede eliminar permisos.",
				en: "Access denied. Only superadmin can delete permissions.",
			},
			{ status: 403 },
		);
	}

	const id = req.nextUrl.searchParams.get("id");

	if (!isValidObjectId(id)) {
		return NextResponse.json(
			{ es: "ID inválido.", en: "Invalid ID." },
			{ status: 400 },
		);
	}

	await Permission.findByIdAndDelete(id).exec();

	return NextResponse.json(
		{ es: "Permiso eliminado.", en: "Permission deleted." },
		{ status: 200 },
	);
}
