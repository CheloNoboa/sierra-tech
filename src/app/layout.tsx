/**
 * =============================================================================
 * 📌 src/app/layout.tsx — RootLayout (SERVER)
 * =============================================================================
 *
 * ES:
 * - Layout raíz del proyecto Sierra Tech.
 * - Se mantiene como Server Component.
 * - No usa hooks ni "use client".
 * - Centraliza metadata global del sitio desde SiteSettings.
 * - Mantiene la carga global de estilos, providers y script base de Google Maps.
 *
 * Responsabilidades:
 * - Resolver metadata global del sitio en servidor.
 * - Aplicar favicon dinámico si existe en SiteSettings.
 * - Aplicar SEO global base:
 *   - title
 *   - description
 *   - open graph
 *   - twitter card
 * - Respetar el idioma por defecto configurado en SiteSettings.
 * - Mantener la estructura global de la app.
 *
 * Reglas:
 * - Toda lógica cliente global sigue viviendo en src/app/providers.tsx
 * - Este archivo no debe depender de hooks cliente.
 * - Si SiteSettings falla o no existe, usa defaults seguros.
 * - metadataBase debe existir para resolver correctamente imágenes OG/Twitter.
 *
 * EN:
 * - Root layout for the Sierra Tech project.
 * - Must remain a Server Component.
 * - Does not use hooks or "use client".
 * - Centralizes global site metadata from SiteSettings.
 * - Keeps global styles, providers and base Google Maps script loading.
 * =============================================================================
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import Script from "next/script";
import Providers from "./providers";
import { getPublicSiteSettings } from "@/lib/siteSettings";

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * ============================================================================
 * generateMetadata
 * ============================================================================
 * ES:
 * - Obtiene SiteSettings desde servidor.
 * - Aplica metadata SEO global del sitio.
 * - Prioriza contenido configurado por admin.
 * - Usa el idioma por defecto configurado en SiteSettings.
 * - Si faltan datos, usa valores seguros por defecto.
 *
 * EN:
 * - Fetches SiteSettings on the server.
 * - Applies global SEO metadata.
 * - Prioritizes admin-configured content.
 * - Uses the default locale configured in SiteSettings.
 * - Falls back to safe defaults when data is missing.
 * ============================================================================
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();

  const defaultLocale = settings.i18n.defaultLocale === "en" ? "en" : "es";

  const siteName = settings.identity.siteName.trim() || "Sierra Tech";

  const title =
    defaultLocale === "en"
      ? settings.seo.defaultTitle.en.trim() || siteName
      : settings.seo.defaultTitle.es.trim() || siteName;

  const description =
    defaultLocale === "en"
      ? settings.seo.defaultDescription.en.trim() ||
        settings.identity.tagline.en.trim() ||
        siteName
      : settings.seo.defaultDescription.es.trim() ||
        settings.identity.tagline.es.trim() ||
        siteName;

  const ogImage = settings.seo.defaultOgImage.trim() || undefined;
  const favicon = settings.identity.favicon.trim() || undefined;

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ),
    title,
    description,
    icons: favicon
      ? {
          icon: favicon,
          shortcut: favicon,
          apple: favicon,
        }
      : undefined,
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Root layout                                                                */
/* -------------------------------------------------------------------------- */

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Material Icons */}
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />

        {/*
          Google Maps
          ----------------------------------------------------------------------
          ES:
          - Se mantiene temporalmente aquí porque la base actual ya lo usa.
          - Más adelante conviene moverlo solo a los módulos que realmente lo
            necesiten.
          *
          EN:
          - Kept here temporarily because the current base already uses it.
          - Later it should be moved to the specific modules that actually need it.
        */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places,marker&v=weekly`}
          strategy="afterInteractive"
        />
      </head>

      <body className="flex min-h-screen flex-col bg-background text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}