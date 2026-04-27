/**
 * =============================================================================
 * 📄 Page: Admin Maintenance Create
 * Path: src/app/admin/dashboard/maintenance/new/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa oficial para la creación de un nuevo Maintenance.
 *
 * Propósito:
 * - crear un mantenimiento como entidad independiente del módulo Projects
 * - vincularlo a una organización y a un proyecto existente
 * - generar su programación inicial (schedule)
 * - permitir edición previa al guardado
 * - persistir el mantenimiento mediante la API administrativa
 *
 * Responsabilidades:
 * - cargar organizaciones disponibles
 * - cargar proyectos asociados a la organización seleccionada
 * - recuperar contexto contractual del proyecto:
 *   - contractStartDate
 *   - contractDurationMonths
 *   - contractEndDate
 * - definir identidad base del mantenimiento:
 *   - tipo
 *   - título
 *   - descripción
 * - permitir selección de modo de generación:
 *   - automático (basado en contrato/frecuencia)
 *   - manual (tabla editable)
 * - generar un schedule inicial coherente
 * - permitir edición básica de filas antes de guardar
 * - ejecutar POST /api/admin/maintenance
 *
 * Decisiones:
 * - Maintenance es un módulo independiente
 * - NO se guarda dentro de Project
 * - schedule es la fuente de verdad desde el inicio
 * - la generación automática usa datos contractuales del proyecto
 * - la UI es página completa (sin modal), siguiendo patrón Maintenance
 * - no se usa any
 * - no se usa alert()
 *
 * Reglas funcionales:
 * - el usuario DEBE seleccionar organización y proyecto
 * - el proyecto define el contexto base del mantenimiento
 * - el schedule puede:
 *   - generarse automáticamente (frecuencia + duración)
 *   - o construirse manualmente
 * - cada fila del schedule representa una ejecución esperada
 * - estados iniciales:
 *   - pending (por defecto)
 * - alertDate se calcula según reglas de alertas
 *
 * Flujo:
 * 1. Seleccionar organización
 * 2. Seleccionar proyecto
 * 3. Cargar contexto contractual
 * 4. Definir configuración del mantenimiento
 * 5. Elegir modo de generación
 * 6. Generar schedule inicial
 * 7. Ajustar filas si es necesario
 * 8. Guardar → POST
 *
 * UX:
 * - página completa tipo formulario
 * - bloques claros (identidad, contexto, generación, schedule)
 * - acciones visibles mediante FormActionsHeader
 * - validación previa al guardado
 * - prevención de salida con cambios sin guardar
 * - feedback mediante GlobalToastProvider
 *
 * Alcance:
 * - NO ejecuta lógica de alertas (eso lo hará el backend/demonio)
 * - NO gestiona ejecución real del mantenimiento
 * - NO modifica Projects
 *
 * EN:
 * Official admin page for creating a new Maintenance entity.
 *
 * Purpose:
 * - create a maintenance linked to a project
 * - generate its initial schedule (source of truth)
 * - allow controlled editing before persistence
 *
 * Behavior:
 * - POST /api/admin/maintenance
 * - supports automatic or manual schedule generation
 * - uses project contract data as baseline
 *
 * Design:
 * - full page (no modal)
 * - consistent with Maintenance detail page
 * - strict typed payload
 * =============================================================================
 */

import MaintenanceFormPage from "@/components/maintenance/MaintenanceFormPage";

export default function AdminMaintenanceCreatePage() {
	return <MaintenanceFormPage mode="create" />;
}