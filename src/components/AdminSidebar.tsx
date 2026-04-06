"use client";

/**
 * =============================================================================
 * 📌 Component: AdminSidebar
 * Path: src/components/AdminSidebar.tsx
 * =============================================================================
 *
 * ES:
 * Sidebar administrativo dinámico basado en permisos reales del usuario.
 *
 * Responsabilidades:
 * - Renderizar navegación administrativa agrupada por módulos.
 * - Mostrar únicamente opciones permitidas según rol/permisos.
 * - Mantener estado visual activo según la ruta actual.
 * - Exponer selector de idioma y acción de cierre de sesión.
 *
 * Reglas:
 * - `*` concede acceso total.
 * - La visibilidad por módulo se resuelve por prefijo de permiso.
 * - El sidebar no contiene lógica de negocio de cada módulo.
 *
 * EN:
 * Dynamic administrative sidebar driven by the user's real permissions.
 * =============================================================================
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { useSidebar } from "@/context/SidebarContext";
import { useTranslation } from "@/hooks/useTranslation";

import {
  Building2,
  Clock,
  Cookie,
  DatabaseBackup,
  FileText,
  Globe2,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Mail,
  MonitorSmartphone,
  Scale,
  Settings,
  UserCircle2,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Layout constants                                                           */
/* -------------------------------------------------------------------------- */

const GLOBAL_HEADER_HEIGHT_PX = 80;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function canAccessModule(perms: string[] = [], module: string): boolean {
  if (perms.includes("*")) return true;
  return perms.some((permission) => permission.startsWith(module));
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminSidebar() {
  const pathname = usePathname();
  const { locale, setLocale } = useTranslation();
  const { data: session } = useSession();
  const { isCollapsed } = useSidebar();

  const permissions: string[] = session?.user?.permissions ?? [];
  const isSuperAdmin = session?.user?.role === "superadmin";

  const linkClass = (active: boolean) =>
    [
      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
      active
        ? "bg-brand-secondary text-text-primary shadow-sm ring-1 ring-border"
        : "text-text-secondary hover:bg-surface-soft hover:text-text-primary",
    ].join(" ");

  const iconClass = (active: boolean) =>
    active
      ? "text-brand-primaryStrong"
      : "text-text-muted transition group-hover:text-brand-primaryStrong";

  const textVisibility = isCollapsed
    ? "hidden md:inline md:w-0 md:opacity-0"
    : "inline opacity-100";

  const mobileTransform = isCollapsed
    ? "-translate-x-full md:translate-x-0"
    : "translate-x-0 md:translate-x-0";

  const desktopWidth = isCollapsed ? "md:w-24" : "md:w-64";

  const t = {
    title: locale === "es" ? "Panel Admin" : "Admin Panel",

    cms: locale === "es" ? "Sitio Web" : "Website",
    publicSite: locale === "es" ? "Sitio Público" : "Public Website",
    services: locale === "es" ? "Servicios" : "Services",
    serviceClasses:
      locale === "es" ? "Clases de servicio" : "Service classes",
    contactRequests:
      locale === "es" ? "Solicitudes de contacto" : "Contact requests",

    crm: locale === "es" ? "Organizaciones" : "Organizations",
    organizations: locale === "es" ? "Organizaciones" : "Organizations",
    organizationUsers:
      locale === "es"
        ? "Usuarios de organización"
        : "Organization users",

    policies: locale === "es" ? "Políticas" : "Policies",
    system: locale === "es" ? "Sistema" : "System",

    privacy: locale === "es" ? "Privacidad" : "Privacy",
    terms: locale === "es" ? "Términos" : "Terms",
    cookies: locale === "es" ? "Cookies" : "Cookies",
    history: locale === "es" ? "Historial" : "History",

    roles: locale === "es" ? "Roles" : "Roles",
    users: locale === "es" ? "Usuarios" : "Users",
    settings: locale === "es" ? "Configuraciones" : "Settings",
    seeder:
      locale === "es"
        ? "Ejecutar Seeder Seguridad"
        : "Run Security Seeder",

    signOut: locale === "es" ? "Cerrar sesión" : "Sign out",
    language: locale === "es" ? "Idioma" : "Language",

    brand: "Sierra Tech",
  };

  const isPublicSiteActive =
    pathname.startsWith("/admin/dashboard/site-settings") ||
    pathname.startsWith("/admin/dashboard/home");

  const isServicesActive = pathname.startsWith("/admin/dashboard/services");
  const isServiceClassesActive = pathname.startsWith(
    "/admin/dashboard/service-classes"
  );
  const isContactRequestsActive = pathname.startsWith(
    "/admin/dashboard/contact-requests"
  );

  const isOrganizationsActive = pathname.startsWith(
    "/admin/dashboard/organizations"
  );
  const isOrganizationUsersActive = pathname.startsWith(
    "/admin/dashboard/organization-users"
  );

  const isPrivacyActive = pathname.startsWith("/admin/dashboard/privacy");
  const isTermsActive = pathname.startsWith("/admin/dashboard/terms");
  const isCookiesActive = pathname.startsWith("/admin/dashboard/cookies");
  const isPolicyHistoryActive = pathname.startsWith(
    "/admin/dashboard/policies/history"
  );

  const isRolesActive = pathname.startsWith("/admin/dashboard/roles");
  const isUsersActive = pathname.startsWith("/admin/dashboard/users");
  const isSettingsActive = pathname.startsWith("/admin/dashboard/settings");
  const isSeederActive = pathname.startsWith(
    "/admin/dashboard/system/seed-security"
  );

  const canViewCms =
    isSuperAdmin ||
    canAccessModule(permissions, "home") ||
    canAccessModule(permissions, "site-settings") ||
    canAccessModule(permissions, "services") ||
    canAccessModule(permissions, "service-classes") ||
    canAccessModule(permissions, "contact-requests") ||
    canAccessModule(permissions, "cms");

  const canViewOrganizations =
    isSuperAdmin ||
    canAccessModule(permissions, "organizations") ||
    canAccessModule(permissions, "organization-users");

  const canViewPolicies =
    isSuperAdmin || canAccessModule(permissions, "policies");

  const canViewSystem =
    isSuperAdmin ||
    canAccessModule(permissions, "roles") ||
    canAccessModule(permissions, "users") ||
    canAccessModule(permissions, "settings");

  return (
    <aside
      style={{
        top: `${GLOBAL_HEADER_HEIGHT_PX}px`,
        height: `calc(100vh - ${GLOBAL_HEADER_HEIGHT_PX}px)`,
      }}
      className={`
        fixed left-0
        z-40 w-64
        overflow-y-auto
        border-r border-border bg-surface
        transition-[width,transform] duration-200 ease-in-out
        ${mobileTransform}
        ${desktopWidth}
      `}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="border-b border-border bg-surface px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-surface-soft px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface">
              <LayoutDashboard className="text-brand-primaryStrong" size={20} />
            </div>

            <h1
              className={`whitespace-nowrap text-base font-semibold text-text-primary transition-opacity ${textVisibility}`}
            >
              {t.title}
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-5 p-4 text-sm">
          {canViewCms && (
            <div className="space-y-1.5">
              <p
                className={`px-1 text-[11px] uppercase tracking-[0.14em] text-text-muted ${textVisibility}`}
              >
                {t.cms}
              </p>

              {(isSuperAdmin ||
                canAccessModule(permissions, "home") ||
                canAccessModule(permissions, "site-settings") ||
                canAccessModule(permissions, "cms")) && (
                <Link
                  href="/admin/dashboard/site-settings"
                  className={linkClass(isPublicSiteActive)}
                >
                  <MonitorSmartphone
                    size={18}
                    className={iconClass(isPublicSiteActive)}
                  />
                  <span className={textVisibility}>{t.publicSite}</span>
                </Link>
              )}

              {(isSuperAdmin ||
                canAccessModule(permissions, "services") ||
                canAccessModule(permissions, "cms")) && (
                <Link
                  href="/admin/dashboard/services"
                  className={linkClass(isServicesActive)}
                >
                  <Wrench size={18} className={iconClass(isServicesActive)} />
                  <span className={textVisibility}>{t.services}</span>
                </Link>
              )}

              {(isSuperAdmin ||
                canAccessModule(permissions, "service-classes") ||
                canAccessModule(permissions, "cms")) && (
                <Link
                  href="/admin/dashboard/service-classes"
                  className={linkClass(isServiceClassesActive)}
                >
                  <ListOrdered
                    size={18}
                    className={iconClass(isServiceClassesActive)}
                  />
                  <span className={textVisibility}>{t.serviceClasses}</span>
                </Link>
              )}

              {(isSuperAdmin ||
                canAccessModule(permissions, "contact-requests") ||
                canAccessModule(permissions, "cms")) && (
                <Link
                  href="/admin/dashboard/contact-requests"
                  className={linkClass(isContactRequestsActive)}
                >
                  <Mail
                    size={18}
                    className={iconClass(isContactRequestsActive)}
                  />
                  <span className={textVisibility}>{t.contactRequests}</span>
                </Link>
              )}
            </div>
          )}

          {canViewOrganizations && (
            <div className="space-y-1.5">
              <p
                className={`px-1 text-[11px] uppercase tracking-[0.14em] text-text-muted ${textVisibility}`}
              >
                {t.crm}
              </p>

              {(isSuperAdmin || canAccessModule(permissions, "organizations")) && (
                <Link
                  href="/admin/dashboard/organizations"
                  className={linkClass(isOrganizationsActive)}
                >
                  <Building2
                    size={18}
                    className={iconClass(isOrganizationsActive)}
                  />
                  <span className={textVisibility}>{t.organizations}</span>
                </Link>
              )}

              {(isSuperAdmin ||
                canAccessModule(permissions, "organization-users")) && (
                <Link
                  href="/admin/dashboard/organization-users"
                  className={linkClass(isOrganizationUsersActive)}
                >
                  <Users
                    size={18}
                    className={iconClass(isOrganizationUsersActive)}
                  />
                  <span className={textVisibility}>{t.organizationUsers}</span>
                </Link>
              )}
            </div>
          )}

          {canViewPolicies && (
            <div className="space-y-1.5">
              <p
                className={`px-1 text-[11px] uppercase tracking-[0.14em] text-text-muted ${textVisibility}`}
              >
                {t.policies}
              </p>

              <Link
                href="/admin/dashboard/privacy"
                className={linkClass(isPrivacyActive)}
              >
                <FileText size={18} className={iconClass(isPrivacyActive)} />
                <span className={textVisibility}>{t.privacy}</span>
              </Link>

              <Link
                href="/admin/dashboard/terms"
                className={linkClass(isTermsActive)}
              >
                <Scale size={18} className={iconClass(isTermsActive)} />
                <span className={textVisibility}>{t.terms}</span>
              </Link>

              <Link
                href="/admin/dashboard/cookies"
                className={linkClass(isCookiesActive)}
              >
                <Cookie size={18} className={iconClass(isCookiesActive)} />
                <span className={textVisibility}>{t.cookies}</span>
              </Link>

              <Link
                href="/admin/dashboard/policies/history"
                className={linkClass(isPolicyHistoryActive)}
              >
                <Clock size={18} className={iconClass(isPolicyHistoryActive)} />
                <span className={textVisibility}>{t.history}</span>
              </Link>
            </div>
          )}

          {canViewSystem && (
            <div className="space-y-1.5">
              <p
                className={`px-1 text-[11px] uppercase tracking-[0.14em] text-text-muted ${textVisibility}`}
              >
                {t.system}
              </p>

              {(isSuperAdmin || canAccessModule(permissions, "roles")) && (
                <Link
                  href="/admin/dashboard/roles"
                  className={linkClass(isRolesActive)}
                >
                  <UserCog size={18} className={iconClass(isRolesActive)} />
                  <span className={textVisibility}>{t.roles}</span>
                </Link>
              )}

              {(isSuperAdmin || canAccessModule(permissions, "users")) && (
                <Link
                  href="/admin/dashboard/users"
                  className={linkClass(isUsersActive)}
                >
                  <UserCircle2 size={18} className={iconClass(isUsersActive)} />
                  <span className={textVisibility}>{t.users}</span>
                </Link>
              )}

              {(isSuperAdmin || canAccessModule(permissions, "settings")) && (
                <Link
                  href="/admin/dashboard/settings"
                  className={linkClass(isSettingsActive)}
                >
                  <Settings size={18} className={iconClass(isSettingsActive)} />
                  <span className={textVisibility}>{t.settings}</span>
                </Link>
              )}

              {isSuperAdmin && (
                <Link
                  href="/admin/dashboard/system/seed-security"
                  className={linkClass(isSeederActive)}
                >
                  <DatabaseBackup
                    size={18}
                    className={iconClass(isSeederActive)}
                  />
                  <span className={textVisibility}>{t.seeder}</span>
                </Link>
              )}
            </div>
          )}
        </nav>

        <div className="space-y-4 border-t border-border bg-surface p-4">
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="admin-language-select"
                className={`cursor-pointer text-xs text-text-secondary ${textVisibility}`}
              >
                <span className="flex items-center gap-2">
                  <Globe2 size={15} />
                  {t.language}
                </span>
              </label>

              <select
                id="admin-language-select"
                name="admin-language-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as "es" | "en")}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none transition focus:border-brand-primaryStrong"
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-surface-soft hover:text-status-error"
          >
            <LogOut size={18} />
            <span className={textVisibility}>{t.signOut}</span>
          </button>

          <p
            className={`text-center text-xs text-text-muted ${textVisibility}`}
          >
            © 2026 {t.brand}
          </p>
        </div>
      </div>
    </aside>
  );
}