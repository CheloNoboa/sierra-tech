/**
 * =============================================================================
 * 📄 Page: Client Portal Support
 * Path: src/app/portal/support/page.tsx
 * =============================================================================
 *
 * ES:
 * Página oficial de Soporte para el portal cliente de Sierra Tech.
 *
 * Propósito:
 * - ofrecer un punto claro de contacto para la organización autenticada
 * - mostrar canales reales de atención visibles desde la configuración global
 *   del sitio
 * - completar la navegación principal del portal con una vista útil, seria y
 *   estable, evitando repeticiones innecesarias
 *
 * Alcance de esta versión:
 * - usa sesión autenticada server-side
 * - consume datos reales de contacto desde Site Settings público
 * - no implementa aún ticketing ni mensajería interna
 * - prioriza claridad, confianza y acceso rápido a canales reales
 *
 * Decisiones:
 * - la sección debe ser simple, directa y confiable
 * - la fuente de verdad para contacto es Site Settings
 * - se muestran únicamente canales con datos reales disponibles
 * - no se repiten los mismos datos en múltiples tarjetas
 * - las acciones visibles deben tener sentido real para el usuario
 *
 * EN:
 * Official Support page for the Sierra Tech client portal.
 * =============================================================================
 */

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  LifeBuoy,
  Mail,
  MessageCircle,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPublicSiteSettings } from "@/lib/siteSettings";
import CopyValueButton from "@/components/portal/CopyValueButton";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function hasValue(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function formatWhatsappLink(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "");
  const normalized = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  return `https://wa.me/${normalized}`;
}

function resolveMainChannel(params: {
  email: string;
  phone: string;
  whatsapp: string;
}): string {
  const { email, phone, whatsapp } = params;

  if (hasValue(email)) return "Correo";
  if (hasValue(phone)) return "Teléfono";
  if (hasValue(whatsapp)) return "WhatsApp";
  return "Pendiente";
}

/* -------------------------------------------------------------------------- */
/* UI                                                                         */
/* -------------------------------------------------------------------------- */

function SummaryMetric({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
        {icon}
      </div>

      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="mt-3 break-words text-2xl font-bold text-text-primary">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function ContactRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: {
    type: "whatsapp" | "copy";
    href?: string;
  };
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
            {label}
          </p>
          <p className="mt-2 break-words text-base font-semibold text-text-primary">
            {value}
          </p>
        </div>

        {action?.type === "whatsapp" && action.href ? (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
          >
            Abrir WhatsApp
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : null}

        {action?.type === "copy" ? (
          <CopyValueButton value={value} />
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PortalSupportPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  /**
   * Defensa adicional server-side.
   * El middleware ya protege /portal, pero la página no debe continuar si
   * la sesión cliente no es válida.
   */
  if (
    !user ||
    user.userType !== "client" ||
    user.status !== "active" ||
    !user.organizationId
  ) {
    redirect("/login");
  }

  const siteSettings = await getPublicSiteSettings();

  const primaryEmail = normalizeText(siteSettings.contact.primaryEmail);
  const secondaryEmail = normalizeText(siteSettings.contact.secondaryEmail);
  const phonePrimary = normalizeText(siteSettings.contact.phonePrimary);
  const phoneSecondary = normalizeText(siteSettings.contact.phoneSecondary);
  const whatsapp = normalizeText(siteSettings.contact.whatsapp);

  const supportEmail =
    primaryEmail || secondaryEmail || "Pendiente de configuración";
  const supportPhone =
    phonePrimary || phoneSecondary || "Pendiente de configuración";
  const supportWhatsapp = whatsapp || "Pendiente de configuración";

  const mainChannel = resolveMainChannel({
    email: supportEmail === "Pendiente de configuración" ? "" : supportEmail,
    phone: supportPhone === "Pendiente de configuración" ? "" : supportPhone,
    whatsapp:
      supportWhatsapp === "Pendiente de configuración" ? "" : supportWhatsapp,
  });

  const availableChannelsCount = [
    hasValue(primaryEmail) || hasValue(secondaryEmail),
    hasValue(phonePrimary) || hasValue(phoneSecondary),
    hasValue(whatsapp),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
            Soporte y atención
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Soporte para la organización
          </h1>

          <p className="text-base leading-8 text-text-secondary">
            Aquí encontrarás los canales visibles de contacto y seguimiento para
            tu organización dentro del portal cliente de Sierra Tech. Esta
            sección está pensada para facilitar consultas, soporte documental y
            coordinación relacionada con proyectos autorizados.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <SummaryMetric
          title="Canal principal"
          value={mainChannel}
          description="Canal prioritario de atención actualmente visible."
          icon={<LifeBuoy className="h-5 w-5" />}
        />

        <SummaryMetric
          title="Correo de soporte"
          value={supportEmail}
          description="Referencia principal para consultas y seguimiento documental."
          icon={<Mail className="h-5 w-5" />}
        />

        <SummaryMetric
          title="Canales disponibles"
          value={String(availableChannelsCount)}
          description="Cantidad de canales configurados y visibles para tu organización."
          icon={<MessageCircle className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Contacto directo
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Canales disponibles para atención
              </h2>

              <p className="text-sm leading-7 text-text-secondary">
                Usa estos canales para consultas generales, coordinación y
                seguimiento relacionado con la información visible dentro del
                portal.
              </p>
            </div>

            <div className="mt-6 space-y-3">
                <ContactRow
                    label="Correo"
                    value={supportEmail}
                    action={
                        hasValue(primaryEmail)
                        ? { type: "copy" }
                        : undefined
                    }
                />

                <ContactRow
                    label="Teléfono"
                    value={supportPhone}
                    action={
                        hasValue(phonePrimary)
                        ? { type: "copy" }
                        : undefined
                    }
                />

                <ContactRow
                    label="WhatsApp"
                    value={supportWhatsapp}
                    action={
                        hasValue(whatsapp)
                        ? {
                            type: "whatsapp",
                            href: formatWhatsappLink(whatsapp),
                            }
                        : undefined
                    }
                />
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Soporte documental
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Consultas sobre archivos y documentación
              </h2>

              <p className="text-sm leading-7 text-text-secondary">
                Para dudas sobre contratos, garantías, reportes, manuales o
                adjuntos operativos, utiliza el canal principal visible de
                soporte. Esta vía también sirve para solicitar orientación
                relacionada con documentos ya compartidos dentro del portal.
              </p>
            </div>

            <div className="mt-5">
            {hasValue(primaryEmail) ? (
                <div className="flex flex-wrap gap-3">
                <CopyValueButton value={primaryEmail} defaultLabel="Copiar correo" />
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                El canal documental aún no ha sido configurado.
                </div>
            )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Alcance del módulo
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Qué incluye esta sección
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Correo y teléfono de atención
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Canal rápido visible cuando exista configuración
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Referencia para soporte documental
              </div>

              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                Continuidad hacia proyectos, documentos y alertas
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
                Continuidad del portal
              </p>

              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Volver al inicio del portal
              </h2>

              <p className="text-sm leading-7 text-text-secondary">
                Desde la página principal puedes revisar el resumen general de
                proyectos, documentos y alertas disponibles para tu
                organización.
              </p>
            </div>

            <div className="mt-5">
              <Link
                href="/portal"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
              >
                Ir al inicio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}