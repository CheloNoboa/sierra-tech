"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Projects Edit
 * Path: src/app/admin/dashboard/projects/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 * Página administrativa wrapper para edición de proyectos existentes.
 *
 * Propósito:
 * - delegar completamente la lógica y UI al componente ProjectFormPage
 * - resolver el ID del proyecto desde la ruta dinámica
 * - mantener consistencia con el patrón de formularios del admin
 *
 * Responsabilidades:
 * - obtener el parámetro dinámico [id]
 * - renderizar ProjectFormPage en modo "edit"
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
 * - el usuario accede a /projects/[id]
 * - se monta ProjectFormPage con mode="edit"
 * - el componente carga datos vía GET /api/admin/projects/[id]
 * - guarda cambios vía PUT /api/admin/projects/[id]
 *
 * Alcance:
 * - únicamente enruta y monta el formulario
 *
 * EN:
 * Admin wrapper page for editing an existing project.
 *
 * Purpose:
 * - delegate all UI and logic to ProjectFormPage
 * - resolve dynamic route parameter [id]
 * - keep routing layer clean and minimal
 *
 * Behavior:
 * - renders ProjectFormPage in "edit" mode
 * - contains no business logic
 * =============================================================================
 */

import { useParams } from "next/navigation";

import ProjectFormPage from "@/components/projects/ProjectFormPage";

export default function AdminProjectsEditPage() {
	const params = useParams<{ id: string }>();

	return <ProjectFormPage mode="edit" projectId={params.id} />;
}