/**
 * =============================================================================
 * 📌 Página: /admin/dashboard/settings
 * =============================================================================
 * ES:
 *   Punto de entrada del módulo administrativo de Configuraciones del Sistema.
 *
 *   - Esta página NO contiene lógica de negocio.
 *   - Todo el CRUD, filtros, modal y paginación viven en:
 *       → src/components/SettingsDataGrid.tsx
 *
 * EN:
 *   Admin System Settings module entry point.
 *   - This page contains ZERO business logic.
 *   - All CRUD operations live in:
 *       → src/components/SettingsDataGrid.tsx
 *
 * 🎯 DISEÑO:
 *   - Sigue el mismo patrón de las páginas:
 *       Productos / Categorías / Sucursales / Roles / Usuarios
 *   - Permite una estructura uniforme y predecible entre módulos.
 *
 * 📦 RESPONSABILIDAD:
 *   - Renderizar SettingsDataGrid dentro del layout administrativo.
 *   - Mantener una interfaz limpia y estable para futuras extensiones.
 *
 * 🛠️ MANTENCIÓN:
 *   - Si el grid evoluciona, este archivo NO cambia.
 *   - No inyectar estados ni efectos aquí (solo contenedor).
 *
 * Última actualización: 2025-12-04
 * Autor (UI/UX): Marcelo Noboa
 * Mantenimiento técnico: IA Asistida (ChatGPT)
 * =============================================================================
 */

"use client";

import SettingsDataGrid from "@/components/SettingsDataGrid";

export default function SettingsPage() {
  return (
    <div className="p-4">
      <SettingsDataGrid />
    </div>
  );
}
