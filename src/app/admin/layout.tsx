"use client";

/**
 * =============================================================================
 * 📌 Component: AdminLayout
 * Path: src/app/admin/layout.tsx
 * =============================================================================
 *
 * ES:
 * - Layout principal del panel administrativo.
 * - Protege `/admin` y rutas hijas usando permisos de sesión.
 * - Sincroniza logout entre pestañas mediante `BroadcastChannel`.
 * - Monta la estructura visual base del panel:
 *   - sidebar
 *   - shell principal
 *   - header interno
 *   - área de contenido
 *
 * Responsabilidades:
 * - Validar sesión autenticada antes de renderizar el panel.
 * - Redirigir al home cuando el usuario no tiene acceso administrativo.
 * - Escuchar eventos cross-tab de cierre de sesión.
 * - Mantener la distribución responsive del panel.
 *
 * Reglas:
 * - El acceso administrativo se determina por permisos, no por rol.
 * - `AdminLayout` no cambia el idioma.
 * - `AdminLayout` solo consume `locale` para textos visibles.
 *
 * EN:
 * - Main administrative panel layout.
 * - Protects `/admin` routes using session permissions.
 * - Syncs logout events across tabs.
 * - Renders the base admin shell with sidebar, internal header and content area.
 * =============================================================================
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

import AdminSidebar from "@/components/AdminSidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

/* =============================================================================
 * Access helper
 * ============================================================================= */

/**
 * ES:
 * - `"*"` implica acceso total.
 * - Si el usuario solo tiene `system.dashboard.view`, no se considera acceso admin.
 * - Cualquier permiso adicional habilita el panel administrativo.
 *
 * EN:
 * - `"*"` means full access.
 * - If the user only has `system.dashboard.view`, this is not considered admin access.
 * - Any additional permission enables admin access.
 */
function userHasAdminAccess(permissions: string[] = []) {
  if (permissions.includes("*")) return true;
  return permissions.some((permission) => permission !== "system.dashboard.view");
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { status, data } = useSession();
  const router = useRouter();
  const { locale } = useTranslation();

  /* =============================================================================
   * Session and permission guard
   * ============================================================================= */
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    if (status === "authenticated") {
      const permissions = data?.user?.permissions ?? [];

      if (!userHasAdminAccess(permissions)) {
        router.replace("/");
      }
    }
  }, [status, data, router]);

  /* =============================================================================
   * Cross-tab logout sync
   * ============================================================================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel("session-updates");

    const handler = (event: MessageEvent) => {
      if (event.data === "logout") {
        router.replace("/");
      }
    };

    channel.addEventListener("message", handler);

    return () => {
      channel.removeEventListener("message", handler);
      channel.close();
    };
  }, [router]);

  /* =============================================================================
   * Loading state
   * ============================================================================= */
  if (status === "loading" || (status === "authenticated" && !data?.user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
        {locale === "es" ? "Cargando sesión..." : "Loading session..."}
      </div>
    );
  }

  /* =============================================================================
   * Invalid session
   * ============================================================================= */
  if (status !== "authenticated" || !data?.user) {
    return null;
  }

  /* =============================================================================
   * Main render
   * ============================================================================= */
  return (
    <SidebarProvider>
      <AdminShell userEmail={data.user.email ?? ""}>{children}</AdminShell>
    </SidebarProvider>
  );
}

/* =============================================================================
 * AdminShell
 * ============================================================================= */

interface AdminShellProps {
  children: ReactNode;
  userEmail: string;
}

function AdminShell({ children, userEmail }: AdminShellProps) {
  const { locale } = useTranslation();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const desktopMarginClass = isCollapsed ? "md:ml-24" : "md:ml-64";

  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <AdminSidebar />

      {/* Desktop toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={`
          fixed top-20 z-50 hidden h-10 w-8 items-center justify-center rounded-r-xl
          border border-border bg-surface shadow-sm
          text-brand-primaryStrong transition-all hover:bg-brand-primary hover:text-white
          md:flex
          ${isCollapsed ? "left-24" : "left-64"}
        `}
        aria-label={
          locale === "es"
            ? isCollapsed
              ? "Expandir menú lateral"
              : "Colapsar menú lateral"
            : isCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
        }
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={`
          fixed top-32 z-50 flex h-10 w-10 items-center justify-center rounded-full
          border border-border bg-surface shadow-sm
          text-brand-primaryStrong transition-all hover:bg-brand-primary hover:text-white
          md:hidden
          ${isCollapsed ? "left-4" : "left-[256px]"}
        `}
        aria-label={
          locale === "es"
            ? isCollapsed
              ? "Expandir menú lateral"
              : "Colapsar menú lateral"
            : isCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
        }
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Content shell */}
      <div
        className={`
          flex flex-1 flex-col transition-[margin] duration-200 ease-in-out
          ${desktopMarginClass}
        `}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-soft">
                <ShieldCheck className="text-brand-primaryStrong" size={18} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-text-primary">
                  {locale === "es" ? "Panel de Control" : "Control Panel"}
                </h2>
                <p className="truncate text-xs text-text-secondary">
                  {locale === "es"
                    ? "Administración central del sistema"
                    : "Central system administration"}
                </p>
              </div>
            </div>

            <div className="hidden max-w-[320px] truncate rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-secondary md:block">
              {userEmail}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-6 md:px-6">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}