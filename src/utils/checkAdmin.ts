/**
 * 🔐 checkAdmin()
 * ---------------------------------------------------------
 * Evalúa si un rol es permitido para páginas de administración.
 * Roles válidos: "admin" y "superadmin".
 * ---------------------------------------------------------
 */
export function checkAdminRole(role?: string) {
	return role === "admin" || role === "superadmin";
}
