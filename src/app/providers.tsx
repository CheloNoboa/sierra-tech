"use client";

/**
 * =============================================================================
 * 📌 Component: Providers — Global Client Providers
 * Path: src/app/providers.tsx
 * =============================================================================
 *
 * ES:
 * Punto central de providers cliente de la plataforma base.
 *
 * Responsabilidades:
 * - Proveer sesión global (NextAuth)
 * - Proveer idioma global
 * - Proveer sistema global de toasts
 * - Sincronizar sesión entre pestañas
 * - Aplicar guard de auto logout
 * - Montar Header y Footer públicos
 *
 * Decisiones:
 * - Ya no usamos BranchProvider porque la base fue desacoplada del dominio
 *   FastFood / sucursales.
 * - Toda la mensajería global depende de GlobalToastProvider.
 * - Todo componente que use useToast() debe vivir dentro de este árbol.
 *
 * EN:
 * Central client-side provider entry point for the reusable platform base.
 * =============================================================================
 */

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

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
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <LanguageProvider>
        <GlobalToastProvider>
          {/* Sincronización de login/logout entre pestañas */}
          <SessionSyncClient />

          {/* Guard de inactividad */}
          <AutoLogoutGuard />

          {/* Header público global */}
          <Header />

          {/* Contenido dinámico */}
          <main className="flex-1 bg-gray-900 text-gray-100">{children}</main>

          {/* Footer público global */}
          <Footer />
        </GlobalToastProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}