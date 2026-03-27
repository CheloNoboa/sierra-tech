/**
 * =============================================================================
 * 🌐 PermissionGate Component
 * =============================================================================
 *
 * ES:
 *  Componente que permite mostrar u ocultar partes de la UI basado en un permiso
 *  específico del usuario logueado.
 *
 * EN:
 *  Component that shows/hides UI elements based on a user's permission.
 *
 * Requisitos:
 *  - session.user.role es "superadmin", "admin", "manager", "employee"
 *  - session.user.permissions es un string[] con códigos de permisos
 *
 * Autor: Marcelo Noboa
 * IA colaborativa: ChatGPT
 * Última actualización: 2025-11-22
 * =============================================================================
 */

"use client";

import { useSession } from "next-auth/react";

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
}

export default function PermissionGate({ permission, children }: PermissionGateProps) {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  const role = session?.user?.role;

  // ✔ SuperAdmin bypass
  if (role === "superadmin") return <>{children}</>;

  // ✔ Si en la sesión existen permisos explícitos
  const userPerms = Array.isArray(session?.user?.permissions)
    ? session?.user?.permissions
    : [];

  if (userPerms.includes(permission)) return <>{children}</>;

  return null;
}
