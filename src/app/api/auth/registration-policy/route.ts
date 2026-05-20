/**
 * =============================================================================
 * 📌 API Route: Registration Policy
 * Path: src/app/api/auth/registration-policy/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint público seguro para determinar si el registro público debe mostrarse.
 *
 * Reglas:
 * - Si NO existe SuperAdmin, se permite registro para bootstrap inicial.
 * - Si ya existe SuperAdmin, el registro depende de allowPublicRegistration.
 * - No expone datos sensibles de usuarios.
 *
 * EN:
 * Safe public endpoint to determine whether public registration should be shown.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import SystemSettings from "@/models/SystemSettings";
import User from "@/models/User";

type RegistrationPolicyResponse =
	| { ok: true; canRegister: boolean }
	| { ok: false; canRegister: false; message: string };

function parseBooleanSetting(value: unknown): boolean {
	if (typeof value === "boolean") return value;

	if (typeof value === "string") {
		return value.trim().toLowerCase() === "true";
	}

	return false;
}

export async function GET() {
	try {
		await connectToDB();

		const [registrationSetting, superAdminExists] = await Promise.all([
			SystemSettings.findOne({ key: "allowPublicRegistration" })
				.select({ value: 1, _id: 0 })
				.lean<{ value?: unknown } | null>(),

			User.exists({ role: "superadmin" }),
		]);

		const allowPublicRegistration = parseBooleanSetting(
			registrationSetting?.value,
		);

		const canRegister = allowPublicRegistration || !superAdminExists;

		const out: RegistrationPolicyResponse = {
			ok: true,
			canRegister,
		};

		return NextResponse.json(out, {
			status: 200,
			headers: { "Cache-Control": "no-store, max-age=0" },
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Unknown registration policy error";

		const out: RegistrationPolicyResponse = {
			ok: false,
			canRegister: false,
			message,
		};

		return NextResponse.json(out, { status: 500 });
	}
}
