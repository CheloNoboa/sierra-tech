/**
 * =============================================================================
 * 📄 Page: Admin Maintenance Settings
 * Path: src/app/admin/dashboard/maintenance/settings/page.tsx
 * =============================================================================
 *
 * ES:
 * Página administrativa wrapper para la configuración operativa del módulo
 * Maintenance.
 *
 * Propósito:
 * - montar la pantalla MaintenanceSettingsPage
 * - separar routing de lógica de UI
 * - mantener el patrón de páginas administrativas del dashboard
 *
 * Alcance:
 * - no contiene lógica de formulario
 * - no consume APIs directamente
 * - no ejecuta el scheduler
 *
 * EN:
 * Admin wrapper page for Maintenance settings.
 * =============================================================================
 */

import MaintenanceSettingsPage from "@/components/maintenance/MaintenanceSettingsPage";

export default function AdminMaintenanceSettingsPage() {
	return <MaintenanceSettingsPage />;
}