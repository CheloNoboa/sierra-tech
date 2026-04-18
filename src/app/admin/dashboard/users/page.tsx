"use client";

/**
 * =============================================================================
 * 📌 Página: /admin/dashboard/users
 * =============================================================================
 * ES:
 *   Punto de entrada del módulo administrativo de Usuarios.
 *   - Esta página NO contiene lógica de negocio.
 *   - Todo el CRUD, filtros, modal y paginación viven en:
 *       → src/components/UsersDataGrid.tsx
 *
 * EN:
 *   Admin Users module entry point.
 *   - This page contains ZERO business logic.
 *   - All CRUD operations live in:
 *       → src/components/UsersDataGrid.tsx
 *
 * 🎯 DISEÑO:
 *   - Sigue el mismo patrón de las páginas:
 *       Productos / Categorías / Sucursales / Roles / Policies / Settings
 *   - Permite una estructura uniforme y predecible entre módulos.
 *
 * 📦 RESPONSABILIDAD:
 *   - Renderizar el UsersDataGrid dentro del layout administrativo.
 *   - Mantener una interfaz limpia y estable para futuras extensiones.
 *
 * 🛠️ MANTENCIÓN:
 *   - Si el grid evoluciona, este archivo NO cambia.
 *   - No inyectar estados ni efectos aquí (solo contenedor).
 *
 * Última actualización: 2025-12-01
 * Autor (UI/UX): Marcelo Noboa
 * Mantenimiento técnico: ChatGPT
 * =============================================================================
 */

import UsersDataGrid from "@/components/UsersDataGrid";

export default function UsersPage() {
	return (
		<div className="p-4">
			<UsersDataGrid />
		</div>
	);
}
