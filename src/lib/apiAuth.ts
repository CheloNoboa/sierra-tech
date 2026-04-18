// File: src/lib/apiAuth.ts
/**
 * =============================================================================
 * 🔐 API Auth Helpers (Headers-based, from middleware)
 * Ruta: src/lib/apiAuth.ts
 * =============================================================================
 * ES:
 * - Lee identidad/permiso desde headers inyectados por middleware:
 *   x-user-id, x-user-role, x-user-branch-id, x-user-permissions (CSV)
 * - NO reemplaza JWT, pero es el contrato interno de la plataforma.
 * =============================================================================
 */

export type ApiIdentity = {
	userId: string;
	role: string;
	branchId: string;
	permissions: string[];
};

function safeStr(x: string | null): string {
	return typeof x === "string" ? x.trim() : "";
}

export function readApiIdentity(headers: Headers): ApiIdentity {
	const userId = safeStr(headers.get("x-user-id"));
	const role = safeStr(headers.get("x-user-role")) || "user";
	const branchId = safeStr(headers.get("x-user-branch-id"));

	const permsRaw = safeStr(headers.get("x-user-permissions"));
	const permissions = permsRaw
		? permsRaw
				.split(",")
				.map((p) => p.trim())
				.filter((p) => p.length > 0)
		: [];

	return { userId, role, branchId, permissions };
}

export function hasPermission(perms: string[], required: string): boolean {
	if (perms.includes("*")) return true;
	return perms.includes(required);
}

export function assertPermission(
	identity: ApiIdentity,
	required: string,
): void {
	if (!identity.userId) throw new Error("Unauthorized (missing user).");
	if (!hasPermission(identity.permissions, required)) {
		throw new Error(`Forbidden (missing permission: ${required}).`);
	}
}
