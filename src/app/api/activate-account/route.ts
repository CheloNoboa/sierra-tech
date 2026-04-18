/**
 * =============================================================================
 * 📡 API Route: Activate Account
 * Path: src/app/api/activate-account/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público para activar la cuenta inicial de un usuario de organización.
 *
 *   Responsabilidades:
 *   - validar el token recibido por correo
 *   - validar la nueva contraseña definida por el usuario
 *   - actualizar el passwordHash definitivo
 *   - marcar la cuenta como registrada
 *   - limpiar token y expiraciones temporales
 *
 *   Reglas:
 *   - el token se valida contra su hash persistido, no en texto plano
 *   - un token solo puede usarse una vez
 *   - al activarse, la cuenta queda operativa para login
 *   - la contraseña final reemplaza la temporal
 *
 * EN:
 *   Public endpoint used to activate an organization user account.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { connectToDB } from "@/lib/connectToDB";
import OrganizationUser from "@/models/OrganizationUser";
import { hashActivationToken } from "@/lib/auth/organization-user-credentials";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

interface ActivateAccountInput {
	token: string;
	password: string;
	confirmPassword: string;
}

/* -------------------------------------------------------------------------- */
/* 🧠 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeActivateAccountInput(payload: unknown): ActivateAccountInput {
	const data =
		payload && typeof payload === "object"
			? (payload as Record<string, unknown>)
			: {};

	return {
		token: normalizeString(data.token),
		password: typeof data.password === "string" ? data.password : "",
		confirmPassword:
			typeof data.confirmPassword === "string" ? data.confirmPassword : "",
	};
}

/**
 * ES:
 * La contraseña final sigue una regla media-fuerte:
 * - al menos 8 caracteres
 * - al menos 1 mayúscula
 * - al menos 1 número
 * - al menos 1 carácter especial simple
 *
 * Esto mantiene una experiencia razonable para el cliente sin complicar
 * innecesariamente el primer acceso.
 */
function isValidActivationPassword(value: string): boolean {
	if (value.length < 8) {
		return false;
	}

	const hasUppercase = /[A-Z]/.test(value);
	const hasNumber = /[0-9]/.test(value);
	const hasSpecial = /[!@#$%]/.test(value);

	return hasUppercase && hasNumber && hasSpecial;
}

function validateActivateAccountInput(
	input: ActivateAccountInput,
): string | null {
	if (!input.token) {
		return "Token is required.";
	}

	if (!input.password) {
		return "Password is required.";
	}

	if (!input.confirmPassword) {
		return "Password confirmation is required.";
	}

	if (input.password !== input.confirmPassword) {
		return "Passwords do not match.";
	}

	if (!isValidActivationPassword(input.password)) {
		return "Password must include at least 8 characters, one uppercase letter, one number, and one special character.";
	}

	return null;
}

/* -------------------------------------------------------------------------- */
/* 📤 POST                                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
	try {
		await connectToDB();

		const body = await req.json();
		const input = normalizeActivateAccountInput(body);

		const validationError = validateActivateAccountInput(input);

		if (validationError) {
			return NextResponse.json(
				{
					ok: false,
					message: validationError,
				},
				{ status: 400 },
			);
		}

		const tokenHash = hashActivationToken(input.token);

		const user = await OrganizationUser.findOne({
			activationTokenHash: tokenHash,
		});

		if (!user) {
			return NextResponse.json(
				{
					ok: false,
					message: "Invalid or already used activation token.",
				},
				{ status: 400 },
			);
		}

		if (!user.activationTokenExpiresAt) {
			return NextResponse.json(
				{
					ok: false,
					message: "Activation token is not valid anymore.",
				},
				{ status: 400 },
			);
		}

		const now = new Date();

		if (user.activationTokenExpiresAt.getTime() < now.getTime()) {
			return NextResponse.json(
				{
					ok: false,
					message: "Activation token has expired.",
				},
				{ status: 400 },
			);
		}

		const passwordHash = await hash(input.password, 12);

		/**
		 * ES:
		 * Al completar la activación:
		 * - la contraseña temporal deja de ser relevante
		 * - el token queda invalidado inmediatamente
		 * - la cuenta pasa a estado registrado y activa
		 */
		user.passwordHash = passwordHash;
		user.isRegistered = true;
		user.status = "active";

		user.activationTokenHash = null;
		user.activationTokenExpiresAt = null;
		user.temporaryPasswordExpiresAt = null;

		user.resetToken = null;
		user.resetTokenExpiry = null;

		await user.save();

		return NextResponse.json({
			ok: true,
			message: "Account activated successfully.",
		});
	} catch (error) {
		console.error("POST /api/activate-account error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to activate account.",
			},
			{ status: 500 },
		);
	}
}
