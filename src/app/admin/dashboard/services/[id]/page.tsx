"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Service Detail
 * Path: src/app/admin/dashboard/services/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 * Página administrativa wrapper para edición de servicios existentes.
 *
 * Propósito:
 * - delegar completamente la lógica y UI al componente ServiceFormPage
 * - resolver el ID del servicio desde la ruta dinámica
 * - mantener consistencia con el patrón de páginas tipo form del admin
 *
 * Responsabilidades:
 * - obtener el parámetro dinámico [id]
 * - renderizar ServiceFormPage en modo "edit"
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
 * Alcance:
 * - únicamente enruta y monta el formulario
 *
 * EN:
 * Admin wrapper page for editing an existing service.
 *
 * Purpose:
 * - delegate all UI and logic to ServiceFormPage
 * - resolve dynamic route parameter [id]
 * - keep routing layer clean and minimal
 *
 * Behavior:
 * - renders ServiceFormPage in "edit" mode
 * - contains no business logic
 * =============================================================================
 */

import { useParams } from "next/navigation";

import ServiceFormPage from "@/components/services/ServiceFormPage";

export default function AdminServiceDetailPage() {
	const params = useParams<{ id: string }>();
	const serviceId = typeof params?.id === "string" ? params.id.trim() : "";

	return <ServiceFormPage mode="edit" serviceId={serviceId} />;
}