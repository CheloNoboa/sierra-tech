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
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

import { LanguageProvider } from "@/context/LanguageContext";

import SessionSyncClient from "@/components/SessionSyncClient";
import AutoLogoutGuard from "@/components/AutoLogoutGuard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GlobalToastProvider } from "@/components/ui/GlobalToastProvider";

interface ProvidersProps {
	children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
	const pathname = usePathname();

	/**
	 * ---------------------------------------------------------------------------
	 * Determina si la ruta actual pertenece al sitio público.
	 *
	 * Rutas privadas:
	 * - /admin/**
	 * - /portal/**
	 *
	 * Todo lo demás se considera público dentro de la estructura actual.
	 * ---------------------------------------------------------------------------
	 */
	const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
	const isPortalRoute =
		pathname === "/portal" || pathname.startsWith("/portal/");
	const showPublicChrome = !isAdminRoute && !isPortalRoute;

	return (
		<SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
			<LanguageProvider>
				<GlobalToastProvider>
					{/* Sincronización de login/logout entre pestañas */}
					<SessionSyncClient />

					{/* Guard global de inactividad */}
					<AutoLogoutGuard />

					{/* Header público solo en rutas públicas */}
					{showPublicChrome ? <Header /> : null}

					{/* Contenido dinámico */}
					<main
						className={
							showPublicChrome ? "flex-1 bg-white text-text-primary" : "flex-1"
						}
					>
						{children}
					</main>

					{/* Footer público solo en rutas públicas */}
					{showPublicChrome ? <Footer /> : null}
				</GlobalToastProvider>
			</LanguageProvider>
		</SessionProvider>
	);
}
