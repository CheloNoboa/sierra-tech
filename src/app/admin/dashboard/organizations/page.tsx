"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Organizations
 * Path: src/app/admin/dashboard/organizations/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página administrativa del módulo Organizaciones.
 *
 *   Propósito:
 *   - Exponer el registro corporativo base del sistema.
 *   - Servir como punto de entrada para crear y editar organizaciones.
 *
 *   Alcance:
 *   - render del encabezado del módulo
 *   - montaje de la grilla administrativa
 *
 * EN:
 *   Administrative page for the Organizations module.
 * =============================================================================
 */

import OrganizationDataGrid from "@/components/OrganizationDataGrid";

export default function OrganizationsPage() {
	return (
		<div className="p-4">
			<OrganizationDataGrid />
		</div>
	);
}
