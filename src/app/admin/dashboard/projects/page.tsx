"use client";

/**
 * =============================================================================
 * 📌 Página: /admin/dashboard/projects
 * Path: src/app/admin/dashboard/projects/page.tsx
 * =============================================================================
 *
 * ES:
 *   Punto de entrada del módulo administrativo de Projects.
 *
 *   Reglas:
 *   - Esta página NO contiene lógica de negocio.
 *   - Todo el CRUD, filtros, selección, paginación y modal viven en:
 *       → src/components/ProjectsDataGrid.tsx
 *
 *   Responsabilidad:
 *   - Renderizar la grilla administrativa del módulo Projects.
 *   - Mantener una estructura estable y uniforme con el resto del admin.
 *
 * EN:
 *   Admin Projects module entry point.
 *   - This page contains ZERO business logic.
 *   - All CRUD operations live in:
 *       → src/components/ProjectsDataGrid.tsx
 * =============================================================================
 */

import ProjectsDataGrid from "@/components/ProjectsDataGrid";

export default function ProjectsPage() {
	return (
		<div className="p-4">
			<ProjectsDataGrid />
		</div>
	);
}
