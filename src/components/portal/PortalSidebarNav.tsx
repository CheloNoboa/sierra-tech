"use client";

/**
 * =============================================================================
 * 📄 Component: PortalSidebarNav
 * Path: src/components/portal/PortalSidebarNav.tsx
 * =============================================================================
 *
 * ES:
 * Navegación lateral cliente del portal.
 *
 * Propósito:
 * - resolver el estado activo del menú lateral
 * - mantener el layout principal del portal como Server Component
 * - ofrecer una señal visual clara de la sección actual
 *
 * Decisiones:
 * - el estado activo se calcula con usePathname()
 * - /portal activa únicamente Inicio
 * - rutas hijas activan su sección correspondiente
 * - se mantiene consistencia visual con el resto del portal
 *
 * EN:
 * Client-side sidebar navigation for the portal with active route state.
 * =============================================================================
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  TriangleAlert,
} from "lucide-react";

type PortalNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: PortalNavItem[] = [
  {
    href: "/portal",
    label: "Inicio",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/portal/projects",
    label: "Proyectos",
    icon: <FolderKanban className="h-4 w-4" />,
  },
  {
    href: "/portal/documents",
    label: "Documentos",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: "/portal/alerts",
    label: "Alertas",
    icon: <TriangleAlert className="h-4 w-4" />,
  },
  {
    href: "/portal/support",
    label: "Soporte",
    icon: <LifeBuoy className="h-4 w-4" />,
  },
];

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/portal") {
    return pathname === "/portal";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-3">
      {NAV_ITEMS.map((item) => {
        const active = isItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "group relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all duration-200 ease-out",
              active
                ? "border-brand-primary/30 bg-brand-primary/10 text-text-primary shadow-[0_8px_24px_rgba(173,201,74,0.14)]"
                : "border-border/80 bg-white text-text-primary hover:-translate-y-[1px] hover:scale-[1.01] hover:border-brand-primary/35 hover:bg-brand-primary/5 hover:shadow-md",
            ].join(" ")}
          >
            <span
              className={[
                "rounded-xl p-2 transition-all duration-200 ease-out",
                active
                  ? "bg-brand-primary/20 text-brand-primaryStrong"
                  : "bg-brand-primary/10 text-brand-primaryStrong group-hover:bg-brand-primary/15",
              ].join(" ")}
            >
              {item.icon}
            </span>

            <span className={active ? "font-semibold" : "font-medium"}>
              {item.label}
            </span>

            {active ? (
              <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-primaryStrong" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}