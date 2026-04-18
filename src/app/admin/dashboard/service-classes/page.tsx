"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Service Classes
 * Path: src/app/admin/dashboard/service-classes/page.tsx
 * =============================================================================
 *
 * ES:
 * Punto de entrada del módulo administrativo de clases de servicio.
 *
 * Responsabilidades:
 * - Mantener la página desacoplada de la lógica de grilla.
 * - Delegar el CRUD y la experiencia operativa al componente ServiceClassDataGrid.
 *
 * EN:
 * Entry page for the admin service classes module.
 * =============================================================================
 */

import ServiceClassDataGrid from "@/components/ServiceClassDataGrid";

export default function ServiceClassesPage() {
	return (
		<div className="p-4">
			<ServiceClassDataGrid />
		</div>
	);
}
