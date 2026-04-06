/**
 * =============================================================================
 * 📄 Page: Admin Organization Users
 * Path: src/app/admin/dashboard/organization-users/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página administrativa del módulo de usuarios de organización.
 *
 *   Propósito:
 *   - Montar la grilla principal del módulo dentro del dashboard admin.
 *   - Mantener la página liviana y sin lógica de negocio.
 *
 *   Responsabilidades:
 *   - Renderizar el contenedor visual base del módulo.
 *   - Delegar la lógica completa de listado, filtros, acciones y modales
 *     al componente OrganizationUsersDataGrid.
 *
 *   Regla:
 *   - Esta página no implementa fetch, estado local ni validaciones.
 *   - Toda la lógica operativa vive en el DataGrid del módulo.
 *
 * EN:
 *   Administrative page for the organization users module.
 * =============================================================================
 */

import OrganizationUsersDataGrid from "@/components/OrganizationUsersDataGrid";

export default function OrganizationUsersPage() {
  return (
    <div className="p-4">
      <OrganizationUsersDataGrid />
    </div>
  );
}