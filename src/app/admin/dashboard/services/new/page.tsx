/**
 * =============================================================================
 * 📄 Page: Admin Service Create
 * Path: src/app/admin/dashboard/services/new/page.tsx
 * =============================================================================
 *
 * ES:
 * Página administrativa wrapper para creación de nuevos servicios.
 *
 * Propósito:
 * - delegar completamente la lógica y UI al componente ServiceFormPage
 * - inicializar el formulario en modo creación (payload vacío)
 * - mantener consistencia con el patrón de páginas tipo form del admin
 *
 * Responsabilidades:
 * - renderizar ServiceFormPage en modo "create"
 * - no contener lógica de negocio ni estado propio
 *
 * Decisiones:
 * - esta página NO implementa lógica de formulario
 * - toda la lógica vive en:
 *   src/components/services/ServiceFormPage.tsx
 * - se mantiene como wrapper liviano para separar routing de lógica
 * - sigue el mismo patrón usado en Projects y Maintenance
 *
 * Reglas:
 * - no duplicar estado
 * - no consumir APIs directamente
 * - no introducir lógica adicional aquí
 *
 * Flujo:
 * - el usuario accede a /services/new
 * - se monta ServiceFormPage con mode="create"
 * - el formulario usa createEmptyPayload internamente
 * - guarda mediante POST /api/admin/services
 *
 * Alcance:
 * - únicamente enruta y monta el formulario
 *
 * EN:
 * Admin wrapper page for creating a new service.
 *
 * Purpose:
 * - delegate all UI and logic to ServiceFormPage
 * - initialize form in create mode (empty payload)
 * - keep routing layer clean and minimal
 *
 * Behavior:
 * - renders ServiceFormPage in "create" mode
 * - contains no business logic
 * =============================================================================
 */

import ServiceFormPage from "@/components/services/ServiceFormPage";

export default function AdminServiceCreatePage() {
	return <ServiceFormPage mode="create" />;
}