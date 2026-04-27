"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Projects Create
 * Path: src/app/admin/dashboard/projects/new/page.tsx
 * =============================================================================
 *
 * ES:
 * Página administrativa wrapper para creación de nuevos proyectos.
 *
 * Propósito:
 * - delegar completamente la lógica y UI al componente ProjectFormPage
 * - inicializar el flujo en modo creación (payload vacío)
 * - mantener consistencia con el patrón de formularios del admin
 *
 * Responsabilidades:
 * - renderizar ProjectFormPage en modo "create"
 * - no contener lógica de negocio ni estado propio
 *
 * Decisiones:
 * - esta página NO implementa lógica de formulario
 * - toda la lógica vive en:
 *   src/components/projects/ProjectFormPage.tsx
 * - se mantiene como wrapper liviano para separar routing de lógica
 * - sigue el mismo patrón usado en Services y Maintenance
 *
 * Reglas:
 * - no duplicar estado
 * - no consumir APIs directamente
 * - no introducir lógica adicional aquí
 *
 * Flujo:
 * - el usuario accede a /projects/new
 * - se monta ProjectFormPage con mode="create"
 * - el formulario usa createEmptyProjectPayload internamente
 * - guarda mediante POST /api/admin/projects
 *
 * Alcance:
 * - únicamente enruta y monta el formulario
 *
 * EN:
 * Admin wrapper page for creating a new project.
 *
 * Purpose:
 * - delegate all UI and logic to ProjectFormPage
 * - initialize form in create mode (empty payload)
 * - keep routing layer clean and minimal
 *
 * Behavior:
 * - renders ProjectFormPage in "create" mode
 * - contains no business logic
 * =============================================================================
 */

import ProjectFormPage from "@/components/projects/ProjectFormPage";

export default function AdminProjectsCreatePage() {
	return <ProjectFormPage mode="create" />;
}