/**
 * =============================================================================
 * 📄 Page: Admin Maintenance Detail
 * Path: src/app/admin/dashboard/maintenance/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa oficial para consultar y editar un mantenimiento
 * existente dentro del módulo Maintenance de Sierra Tech.
 *
 * Propósito:
 * - cargar una entidad Maintenance por ID
 * - mostrar el contexto real de organización y proyecto asociado
 * - editar la configuración principal del mantenimiento
 * - administrar su programación/schedule como fuente de verdad
 * - guardar cambios mediante la API administrativa correspondiente
 *
 * Responsabilidades:
 * - consumir GET /api/admin/maintenance/[id]
 * - consumir PUT /api/admin/maintenance/[id]
 * - mantener el formulario como una página completa, no modal
 * - controlar cambios sin guardar antes de salir
 * - recalcular o editar filas del schedule según reglas del módulo
 * - permitir marcar estados administrativos cuando aplique
 * - mostrar feedback mediante toast global
 *
 * Decisiones:
 * - Maintenance vive en módulo independiente de Projects
 * - Projects solo aporta contexto base: organización, proyecto y fechas
 * - schedule es la fuente de verdad del mantenimiento
 * - no se usan alert()
 * - no se usa any
 * - no se hacen fixes visuales improvisados
 * - la UI sigue el patrón administrativo estable de Sierra Tech
 *
 * Reglas funcionales:
 * - la primera fila del schedule puede recalcular la secuencia completa
 * - las demás filas afectan únicamente su propia entrada
 * - nextDueDate y status se derivan desde el schedule
 * - los estados por fila son: pending, done, overdue, cancelled
 * - alertStatus controla emisión de alertas: pending o emitted
 * - el cliente podrá marcar mantenimiento realizado desde portal cliente
 * - admin puede revisar, corregir y guardar el estado oficial
 *
 * UX:
 * - página completa tipo formulario
 * - acciones principales visibles mediante FormActionsHeader
 * - prevención de salida con cambios sin guardar
 * - carga inicial controlada
 * - guardado controlado
 * - mensajes por GlobalToastProvider
 *
 * EN:
 * Official admin detail page for viewing and editing an existing Maintenance
 * entity in Sierra Tech.
 *
 * This page treats the maintenance schedule as the source of truth and keeps
 * Maintenance fully separated from Projects.
 * =============================================================================
 */

import MaintenanceFormPage from "@/components/maintenance/MaintenanceFormPage";

export default function AdminMaintenanceDetailPage() {
	return <MaintenanceFormPage mode="edit" />;
}