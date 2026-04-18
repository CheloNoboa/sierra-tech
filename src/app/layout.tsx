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

import Script from "next/script";
import Providers from "./providers";
import { getPublicSiteSettings } from "@/lib/siteSettings";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * -----------------------------------------------------------------------------
 * Resuelve una URL pública utilizable por metadata o por el documento HTML.
 *
 * Reglas:
 * - Si el valor ya es una URL absoluta, se usa tal cual.
 * - Si el valor es un fileKey privado de admin, se transforma al endpoint
 *   interno de lectura segura.
 * - Si el valor está vacío, devuelve undefined.
 * -----------------------------------------------------------------------------
 */
function resolveAssetUrl(value: string): string | undefined {
	const trimmed = value.trim();

	if (!trimmed) {
		return undefined;
	}

	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}

	if (trimmed.startsWith("admin/")) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(trimmed)}`;
	}

	return trimmed;
}

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

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

	const ogImage = resolveAssetUrl(settings.seo.defaultOgImage);
	const favicon = resolveAssetUrl(settings.identity.favicon);

	return {
		metadataBase: new URL(
			process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
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

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	const settings = await getPublicSiteSettings();

	const defaultLocale = settings.i18n.defaultLocale === "en" ? "en" : "es";

	return (
		<html
			lang={defaultLocale}
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			<head>
				<link
					href="https://fonts.googleapis.com/icon?family=Material+Icons"
					rel="stylesheet"
				/>

				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
				/>

				<Script
					src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places,marker&v=weekly`}
					strategy="afterInteractive"
				/>
			</head>

			<body className="flex min-h-screen flex-col bg-white text-text-primary antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
