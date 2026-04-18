"use client";

/**
 * ============================================================================
 * 📌 Página: src/app/admin/dashboard/roles/page.tsx
 * ----------------------------------------------------------------------------
 * ES:
 *   Pantalla principal de gestión de Roles del sistema.
 *   - Incluye encabezado bilingüe correctamente.
 *   - Carga RoleDataGrid sin modificar su estructura interna.
 *
 * EN:
 *   Main Roles management page.
 *   - Proper bilingual header.
 *   - Loads RoleDataGrid cleanly.
 * ============================================================================
 */

import RoleDataGrid from "@/components/RoleDataGrid";

export default function RolesPage() {
	return (
		<div className="p-4">
			<RoleDataGrid />
		</div>
	);
}
