"use client";

/**
 * =============================================================================
 * 📌 Component: Providers — Global Client Providers
 * Path: src/app/providers.tsx
 * =============================================================================
 *
 * ES:
 * Punto central de providers cliente de Sierra Tech.
 *
 * Responsabilidades:
 * - Proveer sesión global (NextAuth)
 * - Proveer idioma global
 * - Proveer sistema global de toasts
 * - Sincronizar sesión entre pestañas
 * - Aplicar guard de auto logout
 * - Montar el chrome público solo cuando la ruta pertenece al sitio público
 * - Sincronizar el idioma activo con <html lang>
 *
 * Decisiones:
 * - Providers NO debe forzar el Header/Footer público sobre admin o portal.
 * - /portal/** y /admin/** usan su propio layout visual.
 * - El sitio público mantiene Header/Footer desde este mismo árbol mientras
 *   hacemos el refactor mayor de route groups con seguridad.
 *
 * Regla:
 * - showPublicChrome = true solo para rutas públicas
 * - showPublicChrome = false para:
 *   - /admin/**
 *   - /portal/**
 *
 * EN:
 * Central client-side provider entry point for Sierra Tech.
 * =============================================================================
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

import { LanguageProvider } from "@/context/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

import SessionSyncClient from "@/components/SessionSyncClient";
import AutoLogoutGuard from "@/components/AutoLogoutGuard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GlobalToastProvider } from "@/components/ui/GlobalToastProvider";

interface ProvidersProps {
	children: ReactNode;
}

function HtmlLangSync() {
	const { locale } = useTranslation();

	useEffect(() => {
		const safeLocale = locale === "en" ? "en" : "es";

		document.documentElement.lang = safeLocale;

		document.cookie = `locale=${safeLocale}; path=/; max-age=31536000; samesite=lax`;
		document.cookie = `NEXT_LOCALE=${safeLocale}; path=/; max-age=31536000; samesite=lax`;
	}, [locale]);

	return null;
}

function ProvidersContent({ children }: ProvidersProps) {
	const pathname = usePathname();

	const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
	const isPortalRoute =
		pathname === "/portal" || pathname.startsWith("/portal/");
	const showPublicChrome = !isAdminRoute && !isPortalRoute;

	return (
		<>
			<HtmlLangSync />

			<SessionSyncClient />
			<AutoLogoutGuard />

			{showPublicChrome ? <Header /> : null}

			<main
				className={
					showPublicChrome ? "flex-1 bg-white text-text-primary" : "flex-1"
				}
			>
				{children}
			</main>

			{showPublicChrome ? <Footer /> : null}
		</>
	);
}

export default function Providers({ children }: ProvidersProps) {
	return (
		<SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
			<LanguageProvider>
				<GlobalToastProvider>
					<ProvidersContent>{children}</ProvidersContent>
				</GlobalToastProvider>
			</LanguageProvider>
		</SessionProvider>
	);
}