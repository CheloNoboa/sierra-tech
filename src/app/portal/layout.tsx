/**
 * =============================================================================
 * 📄 Layout: Client Portal
 * Path: src/app/portal/layout.tsx
 * =============================================================================
 *
 * ES:
 * Layout oficial del portal cliente de Sierra Tech.
 *
 * Propósito:
 * - separar claramente el portal privado del sitio público
 * - ofrecer una experiencia más corporativa y sólida para clientes
 * - mostrar identidad mínima de organización y usuario autenticado
 * - mantener una navegación lateral estable para las secciones del portal
 * - integrar un mini-footer discreto con crédito de desarrollo
 * - incorporar el logotipo corto de FuturaTech dentro del footer del portal
 *
 * Alcance:
 * - protege visualmente la experiencia del portal
 * - no implementa lógica de negocio específica
 * - asume que middleware ya controla acceso por audiencia
 *
 * Secciones previstas:
 * - /portal
 * - /portal/projects
 * - /portal/documents
 * - /portal/alerts
 * - /portal/support
 *
 * Decisiones:
 * - el cierre de sesión regresa al sitio público
 * - el shell del portal no comparte header/footer del sitio comercial
 * - el footer de FuturaTech se mantiene discreto, tipo powered-by
 * - el footer vive dentro de la columna derecha para no romper la grilla
 * - el logotipo de FuturaTech se sirve desde:
 *   /public/images/LogoCortoFuturaTech.png
 *
 * EN:
 * Official client portal layout for Sierra Tech.
 * =============================================================================
 */

import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  Building2,
  ShieldCheck,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import PortalLogoutButton from "@/components/portal/PortalLogoutButton";
import PortalSidebarNav from "@/components/portal/PortalSidebarNav";

interface PortalLayoutProps {
  children: React.ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Footer del portal                                                          */
/* -------------------------------------------------------------------------- */

function PortalFooter() {
  return (
    <footer className="mt-6 rounded-2xl border border-border/80 bg-white/80 px-4 py-4 shadow-sm backdrop-blur">
      <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
        <span className="text-xs tracking-wide text-text-secondary">
          © {new Date().getFullYear()} Sierra Tech · Plataforma desarrollada por
        </span>

        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-1.5 shadow-sm">
          <Image
            src="/images/LogoCortoFuturaTech.png"
            alt="FuturaTech"
            width={22}
            height={22}
            className="h-[22px] w-auto object-contain"
          />

          <span className="text-xs font-semibold tracking-wide text-text-primary">
            FuturaTech
          </span>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout principal                                                           */
/* -------------------------------------------------------------------------- */

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  /**
   * Defensa adicional server-side.
   * El middleware ya protege /portal, pero el layout no debe renderizar
   * contenido si por alguna razón la sesión no es válida.
   */
  if (
    !user ||
    user.userType !== "client" ||
    user.status !== "active" ||
    !user.organizationId
  ) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(173,201,74,0.14),_transparent_28%),linear-gradient(to_bottom_right,_#ffffff,_#f8fafc,_#f7fee7)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-white/85 backdrop-blur-xl">
          <div className="px-6 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
                  Sierra Tech · Portal Cliente
                </p>

                <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                    {user.organizationName ?? "Organización"}
                  </h1>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primaryStrong">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Acceso privado autorizado
                  </span>
                </div>

                <p className="max-w-3xl text-sm leading-7 text-text-secondary">
                  Espacio privado para consulta de proyectos, documentos,
                  mantenimientos y alertas asociadas a tu organización.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-border/80 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-secondary">
                    Usuario autenticado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">
                    {user.name ?? "Usuario"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {user.email ?? "—"}
                  </p>
                </div>

                <PortalLogoutButton />
              </div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 px-6 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-border/80 bg-white shadow-sm">
              <div className="border-b border-border/70 bg-gradient-to-r from-brand-primary/10 via-white to-white px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-primary/15 p-3 text-brand-primaryStrong">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {user.organizationName ?? "Organización"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Rol: {user.organizationUserRole ?? "client_user"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <PortalSidebarNav />
              </div>
            </div>

            <div className="rounded-[28px] border border-border/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-text-primary">
                Acceso privado
              </p>

              <p className="mt-2 text-sm leading-7 text-text-secondary">
                El contenido disponible en este portal corresponde únicamente a
                la información autorizada para tu organización dentro de Sierra
                Tech.
              </p>
            </div>
          </aside>

          <div className="min-w-0">
            <main className="min-w-0">{children}</main>
            <PortalFooter />
          </div>
        </div>
      </div>
    </div>
  );
}