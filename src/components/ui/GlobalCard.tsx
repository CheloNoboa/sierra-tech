"use client";

/**
 * =============================================================================
 * 🌐 GlobalCard
 * Path: src/components/ui/GlobalCard.tsx
 * =============================================================================
 *
 * ES:
 * - Contenedor visual estándar reutilizable para frontend y admin.
 * - Proporciona una superficie limpia, clara y consistente.
 * - Alineado con el sistema visual centralizado de Sierra Tech.
 *
 * Uso recomendado:
 * - formularios
 * - paneles informativos
 * - tarjetas de resumen
 * - bloques administrativos
 *
 * EN:
 * - Reusable standard visual container for frontend and admin.
 * - Provides a clean, light and consistent surface.
 * - Aligned with the Sierra Tech centralized design system.
 * =============================================================================
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlobalCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlobalCard({
  children,
  className,
}: GlobalCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}