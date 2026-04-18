/**
 * =============================================================================
 * 🔧 Helper: resolveAssetUrl
 * =============================================================================
 *
 * ES:
 *   Resuelve rutas de archivos administrados (admin/*) a endpoints públicos.
 *
 *   Regla:
 *   - admin/* → /api/admin/uploads/view?key=
 *   - http/https → se mantiene
 *   - /assets/... → se mantiene
 *
 * EN:
 *   Resolves admin-managed file keys into public URLs.
 * =============================================================================
 */

export function resolveAssetUrl(value: unknown): string {
	const raw = typeof value === "string" ? value.trim() : "";

	if (!raw) return "";

	if (raw.startsWith("admin/")) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(raw)}`;
	}

	return raw;
}
