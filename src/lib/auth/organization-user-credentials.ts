/**
 * =============================================================================
 * 📄 Helper: Organization User Credentials
 * Path: src/lib/auth/organization-user-credentials.ts
 * =============================================================================
 *
 * ES:
 * Helper oficial para:
 * - generar contraseña temporal legible pero suficientemente fuerte
 * - generar token de activación / set-password
 * - hashear token para persistencia segura
 *
 * Reglas:
 * - la contraseña temporal incluye:
 *   - al menos 1 mayúscula
 *   - al menos 1 número
 *   - al menos 1 carácter especial simple
 * - el token plano SOLO se usa para construir el link del correo
 * - en base de datos se guarda únicamente el hash del token
 * =============================================================================
 */

import { createHash, randomBytes, randomInt } from "node:crypto";

const UPPERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERS = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SPECIALS = "!@#$%";
const ALL = `${UPPERS}${LOWERS}${NUMBERS}${SPECIALS}`;

export const TEMP_PASSWORD_EXPIRES_HOURS = 72;
export const ACTIVATION_TOKEN_EXPIRES_HOURS = 24;

function pick(source: string): string {
	return source[randomInt(0, source.length)];
}

function shuffle(chars: string[]): string {
	const items = [...chars];

	for (let i = items.length - 1; i > 0; i -= 1) {
		const j = randomInt(0, i + 1);
		[items[i], items[j]] = [items[j], items[i]];
	}

	return items.join("");
}

/**
 * Genera contraseña temporal media-fuerte y amigable para usuario.
 */
export function generateTemporaryPassword(length = 10): string {
	const safeLength = Math.max(length, 8);

	const chars: string[] = [
		pick(UPPERS),
		pick(LOWERS),
		pick(NUMBERS),
		pick(SPECIALS),
	];

	while (chars.length < safeLength) {
		chars.push(pick(ALL));
	}

	return shuffle(chars);
}

/**
 * Genera token plano para activación / creación de contraseña.
 * Este token NO debe persistirse en texto plano.
 */
export function generateActivationToken(): string {
	return randomBytes(32).toString("hex");
}

/**
 * Genera hash SHA-256 del token para persistencia segura.
 */
export function hashActivationToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/**
 * Expiración absoluta para contraseña temporal.
 */
export function getTemporaryPasswordExpiresAt(): Date {
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + TEMP_PASSWORD_EXPIRES_HOURS);
	return expiresAt;
}

/**
 * Expiración absoluta para token de activación.
 */
export function getActivationTokenExpiresAt(): Date {
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + ACTIVATION_TOKEN_EXPIRES_HOURS);
	return expiresAt;
}

/**
 * Construye link público para activación / creación de contraseña.
 */
export function buildActivationUrl(token: string): string {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

	if (!appUrl) {
		throw new Error(
			"NEXT_PUBLIC_APP_URL no está configurada para construir el link de activación.",
		);
	}

	const baseUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;

	return `${baseUrl}/activate-account?token=${encodeURIComponent(token)}`;
}
