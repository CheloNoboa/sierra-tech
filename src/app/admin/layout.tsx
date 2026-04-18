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
 *   - header administrativo con branding real del sitio
 *   - área de contenido
 *
 * Responsabilidades:
 * - Validar sesión autenticada antes de renderizar el panel.
 * - Redirigir al home cuando el usuario no tiene acceso administrativo.
 * - Escuchar eventos cross-tab de cierre de sesión.
 * - Mantener la distribución responsive del panel.
 * - Exponer branding visible del proyecto dentro del admin.
 * - Exponer una salida de sesión visible sin depender del header público.
 *
 * Reglas:
 * - El acceso administrativo se determina por permisos, no por rol.
 * - `AdminLayout` no cambia el idioma automáticamente.
 * - El admin no depende del Header público global.
 * - El header administrativo NO debe heredar el margen lateral del contenido.
 *
 * EN:
 * - Main administrative panel layout.
 * - Protects `/admin` routes using session permissions.
 * - Syncs logout events across tabs.
 * - Renders the base admin shell with sidebar, branded admin header and content area.
 * =============================================================================
 */

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/hooks/useTranslation";
import AdminSidebar from "@/components/AdminSidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { getPublicBranding, listenBrandingUpdates } from "@/lib/publicBranding";

import {
	ChevronLeft,
	ChevronRight,
	Globe,
	LogOut,
	ShieldCheck,
	UserCircle2,
} from "lucide-react";

interface AdminLayoutProps {
	children: ReactNode;
}

interface AdminBrandingState {
	siteName: string;
	siteNameShort: string;
	logoLight: string;
	logoDark: string;
}

/* =============================================================================
 * Access helper
 * ============================================================================= */

function userHasAdminAccess(permissions: string[] = []) {
	if (permissions.includes("*")) return true;

	return permissions.some(
		(permission) => permission !== "system.dashboard.view",
	);
}

/* =============================================================================
 * Branding helpers
 * ============================================================================= */

const ADMIN_BRANDING_DEFAULTS: AdminBrandingState = {
	siteName: "Sierra Tech",
	siteNameShort: "Sierra Tech",
	logoLight: "",
	logoDark: "",
};

function normalizeImageSrc(value: string | undefined | null): string {
	const raw = value?.trim() ?? "";

	if (!raw) {
		return "";
	}

	const normalized = raw.replace(/\\/g, "/");

	if (/^https?:\/\//i.test(normalized)) {
		return normalized;
	}

	if (normalized.startsWith("/")) {
		return normalized;
	}

	if (normalized.startsWith("admin/")) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(normalized)}`;
	}

	return "";
}

export default function AdminLayout({ children }: AdminLayoutProps) {
	const { status, data } = useSession();
	const router = useRouter();
	const { locale } = useTranslation();

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

	if (status === "loading" || (status === "authenticated" && !data?.user)) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
				{locale === "es" ? "Cargando sesión..." : "Loading session..."}
			</div>
		);
	}

	if (status !== "authenticated" || !data?.user) {
		return null;
	}

	return (
		<SidebarProvider>
			<AdminShell userName={data.user.name ?? ""}>{children}</AdminShell>
		</SidebarProvider>
	);
}

/* =============================================================================
 * AdminShell
 * ============================================================================= */

interface AdminShellProps {
	children: ReactNode;
	userName: string;
}

function AdminShell({ children, userName }: AdminShellProps) {
	const { locale, setLocale } = useTranslation();
	const { isCollapsed, toggleSidebar } = useSidebar();

	const [isSigningOut, setIsSigningOut] = useState(false);
	const [branding, setBranding] = useState<AdminBrandingState>(
		ADMIN_BRANDING_DEFAULTS,
	);

	/**
	 * El área de contenido usa margen lateral.
	 * El header no hereda ese margen, pero sí recibe un pequeño padding izquierdo
	 * extra para que el toggle fijo no invada visualmente la zona del branding.
	 */
	const desktopMarginClass = isCollapsed ? "md:ml-24" : "md:ml-64";

	const headerLeftInsetClass = useMemo(() => {
		return isCollapsed ? "md:pl-8 lg:pl-10" : "md:pl-10 lg:pl-12";
	}, [isCollapsed]);

	useEffect(() => {
		async function loadBranding() {
			try {
				const next = await getPublicBranding();

				setBranding({
					siteName: next.siteName || "Sierra Tech",
					siteNameShort: next.siteNameShort || next.siteName || "Sierra Tech",
					logoLight: next.logoLight || "",
					logoDark: next.logoDark || "",
				});
			} catch {
				setBranding(ADMIN_BRANDING_DEFAULTS);
			}
		}

		void loadBranding();
	}, []);

	useEffect(() => {
		const unsubscribe = listenBrandingUpdates(() => {
			async function reloadBranding() {
				try {
					const next = await getPublicBranding();

					setBranding({
						siteName: next.siteName || "Sierra Tech",
						siteNameShort: next.siteNameShort || next.siteName || "Sierra Tech",
						logoLight: next.logoLight || "",
						logoDark: next.logoDark || "",
					});
				} catch {
					/* noop */
				}
			}

			void reloadBranding();
		});

		return unsubscribe;
	}, []);

	async function handleLogout(): Promise<void> {
		if (isSigningOut) return;

		setIsSigningOut(true);

		try {
			if (typeof window !== "undefined") {
				const channel = new BroadcastChannel("session-updates");
				channel.postMessage("logout");
				channel.close();
			}
		} catch {
			/* noop */
		}

		await signOut({ callbackUrl: "/" });
	}

	const businessName =
		branding.siteName.trim() || branding.siteNameShort.trim() || "Sierra Tech";

	const businessLogo = normalizeImageSrc(
		branding.logoLight || branding.logoDark,
	);

	const firstName =
		userName.trim().split(" ").filter(Boolean)[0] ||
		(locale === "es" ? "Usuario" : "User");

	return (
		<div className="flex min-h-screen bg-background text-text-primary">
			<AdminSidebar />

			{/* Desktop toggle */}
			<button
				type="button"
				onClick={toggleSidebar}
				className={`
          fixed top-[124px] z-50 hidden h-10 w-8 items-center justify-center rounded-r-xl
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
          fixed top-36 z-50 flex h-10 w-10 items-center justify-center rounded-full
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

			<div className="flex flex-1 flex-col">
				<header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
					<div
						className={["px-4 py-4 md:px-6 md:py-4", headerLeftInsetClass].join(
							" ",
						)}
					>
						<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
							<div className="flex min-w-0 items-center gap-4">
								<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
									{businessLogo ? (
										<Image
											src={businessLogo}
											alt={businessName}
											width={64}
											height={64}
											className="h-11 w-11 object-contain"
											unoptimized
											priority
										/>
									) : (
										<ShieldCheck
											className="text-brand-primaryStrong"
											size={24}
										/>
									)}
								</div>

								<div className="min-w-0">
									<p className="text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-brand-primaryStrong">
										{locale === "es" ? "Panel administrativo" : "Admin panel"}
									</p>

									<h1 className="mt-1 truncate text-[1.95rem] font-bold leading-none tracking-tight text-text-primary md:text-[2.15rem]">
										{businessName}
									</h1>

									<p className="mt-1.5 truncate text-sm leading-5 text-text-secondary">
										{locale === "es"
											? "Gestión central del sitio, contenido y operaciones internas"
											: "Central management for site, content and internal operations"}
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:self-center">
								<div className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface-soft px-4 text-sm text-text-secondary">
									<UserCircle2 size={16} className="shrink-0" />
									<span className="truncate">
										{locale === "es" ? "Hola" : "Hello"}, {firstName}
									</span>
								</div>

								<button
									type="button"
									onClick={() => void handleLogout()}
									disabled={isSigningOut}
									className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-text-primary transition hover:border-status-error/40 hover:bg-status-error hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
								>
									<LogOut size={16} />
									<span>
										{isSigningOut
											? locale === "es"
												? "Saliendo..."
												: "Signing out..."
											: locale === "es"
												? "Cerrar sesión"
												: "Sign out"}
									</span>
								</button>

								<div className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm text-text-secondary">
									<Globe size={16} className="shrink-0" />
									<span>{locale === "es" ? "Idioma" : "Language"}</span>
									<select
										value={locale}
										onChange={(e) =>
											setLocale(e.target.value === "en" ? "en" : "es")
										}
										className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none"
										aria-label={locale === "es" ? "Idioma" : "Language"}
									>
										<option value="es">ES</option>
										<option value="en">EN</option>
									</select>
								</div>
							</div>
						</div>
					</div>
				</header>

				<div
					className={`
            flex flex-1 flex-col transition-[margin] duration-200 ease-in-out
            ${desktopMarginClass}
          `}
				>
					<main className="flex-1 overflow-y-auto px-5 py-6 md:px-6">
						<div className="mx-auto w-full max-w-[1600px]">{children}</div>
					</main>
				</div>
			</div>
		</div>
	);
}
