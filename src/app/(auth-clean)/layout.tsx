/**
 * =============================================================================
 * 📄 Layout: Auth Clean Layout
 * Path: src/app/(auth-clean)/layout.tsx
 * =============================================================================
 *
 * ES:
 *   Layout limpio para pantallas públicas de acceso puntual.
 *
 *   Propósito:
 *   - renderizar páginas como activación de cuenta sin header ni footer
 *   - evitar solapamientos visuales con el layout comercial del sitio
 *   - mantener una experiencia enfocada en una sola acción
 *
 *   Regla:
 *   - este layout no altera la URL pública
 *   - el route group solo organiza render, no cambia la ruta final
 * =============================================================================
 */

import type { ReactNode } from "react";

export default function AuthCleanLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}