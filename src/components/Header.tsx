"use client";

/**
 * =============================================================================
 * 📌 Component: Header — Public Main Navigation
 * Path: src/components/Header.tsx
 * =============================================================================
 *
 * ES:
 * Navegación principal pública del sitio.
 *
 * Responsabilidades:
 * - Cargar branding dinámico desde /api/site-settings.
 * - Mostrar navegación bilingüe estable.
 * - Mantener acciones de autenticación.
 * - Permitir cambio de idioma persistente.
 * - Resolver correctamente navegación mixta:
 *   - Rutas públicas normales.
 *   - Scroll hacia secciones internas del home.
 * - Reflejar visualmente el estado activo del menú.
 * - Resolver el CTA global con la misma lógica robusta del menú.
 *
 * Contrato actual:
 * - Inicio     -> /
 * - Nosotros   -> #about
 * - Servicios  -> /services
 * - Proyectos  -> /projects
 * - Blog       -> /blog
 * - Contacto   -> /contact
 *
 * Reglas:
 * - Sin hardcode innecesario de branding.
 * - SiteSettings es la fuente de verdad para branding y CTA global.
 * - No consumir contenido editorial desde HomeSettings.
 * - Si el logo almacenado es un fileKey privado (`admin/...`), debe resolverse
 *   al endpoint interno de lectura segura.
 *
 * EN:
 * Public main navigation component.
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { useTranslation } from "@/hooks/useTranslation";
import { getPublicBranding, listenBrandingUpdates } from "@/lib/publicBranding";

import {
	HiOutlineBars3,
	HiOutlineGlobeAlt,
	HiOutlineIdentification,
	HiOutlineUserCircle,
	HiOutlineXMark,
} from "react-icons/hi2";

import LoginModal from "@/components/LoginModal";
import SignUpModal from "@/components/SignUpModal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type HeaderNavItem = {
	key: string;
	href: string;
	label: string;
	isSectionLink?: boolean;
};

interface LocalizedText {
	es: string;
	en: string;
}

interface HeaderSiteSettings {
	identity: {
		siteName: string;
		siteNameShort: string;
		logoLight: string;
		logoDark: string;
	};
	globalPrimaryCta: {
		label: LocalizedText;
		href: string;
		enabled: boolean;
	};
}

/* -------------------------------------------------------------------------- */
/* Safe defaults                                                              */
/* -------------------------------------------------------------------------- */

const HEADER_SITE_SETTINGS_DEFAULTS: HeaderSiteSettings = {
	identity: {
		siteName: "",
		siteNameShort: "",
		logoLight: "",
		logoDark: "",
	},
	globalPrimaryCta: {
		label: {
			es: "",
			en: "",
		},
		href: "",
		enabled: false,
	},
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

function getLocalizedText(value: LocalizedText, locale: "es" | "en"): string {
	return locale === "es" ? value.es : value.en;
}

function hasLocalizedText(value: LocalizedText | null | undefined): boolean {
	if (!value) {
		return false;
	}

	return value.es.trim().length > 0 || value.en.trim().length > 0;
}

function scrollToSection(sectionId: string, attempts = 12): void {
	const safeId = sectionId.replace(/^#/, "");

	const tryScroll = (remaining: number) => {
		const element = document.getElementById(safeId);

		if (element) {
			const headerOffset = 96;
			const top =
				element.getBoundingClientRect().top + window.scrollY - headerOffset;

			window.scrollTo({
				top: Math.max(top, 0),
				behavior: "smooth",
			});
			return;
		}

		if (remaining <= 0) {
			return;
		}

		window.setTimeout(() => {
			tryScroll(remaining - 1);
		}, 120);
	};

	tryScroll(attempts);
}

function getNavItemBaseClasses(isActive: boolean): string {
	return [
		"text-sm font-medium transition",
		isActive
			? "text-brand-primaryStrong"
			: "text-text-secondary hover:text-brand-primaryStrong",
	].join(" ");
}

function getMobileNavItemBaseClasses(isActive: boolean): string {
	return [
		"rounded-xl px-3 py-3 text-left text-sm font-medium transition",
		isActive
			? "bg-surface-soft text-brand-primaryStrong"
			: "text-text-secondary hover:bg-surface-soft hover:text-brand-primaryStrong",
	].join(" ");
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Header() {
	const router = useRouter();
	const pathname = usePathname();
	const { locale, setLocale } = useTranslation();
	const { data: session, status } = useSession();

	const [showLogin, setShowLogin] = useState(false);
	const [showSignUp, setShowSignUp] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [siteSettings, setSiteSettings] = useState<HeaderSiteSettings>(
		HEADER_SITE_SETTINGS_DEFAULTS
	);
	const [currentHash, setCurrentHash] = useState("");

	useEffect(() => {
		async function loadSiteSettings() {
			try {
				const branding = await getPublicBranding();

				setSiteSettings((prev) => ({
					...prev,
					identity: {
						siteName: branding.siteName,
						siteNameShort: branding.siteNameShort,
						logoLight: branding.logoLight,
						logoDark: branding.logoDark,
					},
				}));
			} catch (error) {
				console.error("[Header] Error loading site settings:", error);
				setSiteSettings(HEADER_SITE_SETTINGS_DEFAULTS);
			}
		}

		void loadSiteSettings();
	}, []);

	useEffect(() => {
		const unsubscribe = listenBrandingUpdates(() => {
			async function reloadBranding() {
				try {
					const branding = await getPublicBranding();

					setSiteSettings((prev) => ({
						...prev,
						identity: {
							siteName: branding.siteName,
							siteNameShort: branding.siteNameShort,
							logoLight: branding.logoLight,
							logoDark: branding.logoDark,
						},
					}));
				} catch (error) {
					console.error("[Header] Branding sync error:", error);
				}
			}

			void reloadBranding();
		});

		return unsubscribe;
	}, []);

	useEffect(() => {
		const syncHash = () => {
			setCurrentHash(window.location.hash || "");
		};

		syncHash();
		window.addEventListener("hashchange", syncHash);

		return () => {
			window.removeEventListener("hashchange", syncHash);
		};
	}, [pathname]);

	const lang = locale === "en" ? "en" : "es";
	const isAuthenticated = status === "authenticated" && !!session?.user;

	const businessName =
		siteSettings.identity.siteName.trim() ||
		siteSettings.identity.siteNameShort.trim() ||
		"Sierra Tech";

	const businessLogotipo = normalizeImageSrc(siteSettings.identity.logoLight);
	const firstName = session?.user?.name?.trim()?.split(" ")[0] || "User";

	const navItems: HeaderNavItem[] = useMemo(
		() => [
			{
				key: "home",
				href: "/",
				label: lang === "es" ? "Inicio" : "Home",
			},
			{
				key: "about",
				href: "#about",
				label: lang === "es" ? "Nosotros" : "About us",
				isSectionLink: true,
			},
			{
				key: "services",
				href: "/services",
				label: lang === "es" ? "Servicios" : "Services",
			},
			{
				key: "projects",
				href: "/projects",
				label: lang === "es" ? "Proyectos" : "Projects",
			},
			{
				key: "blog",
				href: "/blog",
				label: "Blog",
			},
			{
				key: "contact",
				href: "/contact",
				label: lang === "es" ? "Contacto" : "Contact",
			},
		],
		[lang]
	);

	const authText = useMemo(
		() => ({
			signIn: lang === "es" ? "Ingresar" : "Sign in",
			signUp: lang === "es" ? "Registrarse" : "Sign up",
			signOut: lang === "es" ? "Cerrar sesión" : "Sign out",
			hello: lang === "es" ? "Hola" : "Hello",
			language: lang === "es" ? "Idioma" : "Language",
			openMenu: lang === "es" ? "Abrir menú" : "Open menu",
			closeMenu: lang === "es" ? "Cerrar menú" : "Close menu",
			quote: hasLocalizedText(siteSettings.globalPrimaryCta.label)
				? getLocalizedText(siteSettings.globalPrimaryCta.label, lang)
				: lang === "es"
					? "Solicitar cotización"
					: "Request a quote",
		}),
		[lang, siteSettings]
	);

	const showGlobalCta = siteSettings.globalPrimaryCta.enabled;
	const globalCtaHref = siteSettings.globalPrimaryCta.href.trim() || "/contact";
	const globalCtaIsSectionLink = globalCtaHref.startsWith("#");

	useEffect(() => {
		if (isMenuOpen) {
			document.body.classList.add("overflow-hidden");
		} else {
			document.body.classList.remove("overflow-hidden");
		}

		return () => {
			document.body.classList.remove("overflow-hidden");
		};
	}, [isMenuOpen]);

	const handleLogout = async (): Promise<void> => {
		await signOut({ callbackUrl: "/" });
	};

	const closeMobileMenu = (): void => {
		setIsMenuOpen(false);
	};

	const handleOpenLogin = (): void => {
		closeMobileMenu();
		setShowLogin(true);
	};

	const handleOpenSignUp = (): void => {
		closeMobileMenu();
		setShowSignUp(true);
	};

	const handleLocaleChange = (nextLocale: string): void => {
		const safeLocale = nextLocale === "en" ? "en" : "es";

		document.cookie = `locale=${safeLocale}; path=/; max-age=31536000; samesite=lax`;
		document.cookie = `NEXT_LOCALE=${safeLocale}; path=/; max-age=31536000; samesite=lax`;
		document.documentElement.lang = safeLocale;

		setLocale(safeLocale);
		router.refresh();
	};

	const handleSectionNavigation = useCallback(
		(sectionHref: string) => {
			closeMobileMenu();

			if (pathname === "/") {
				if (window.location.hash !== sectionHref) {
					window.history.pushState(null, "", sectionHref);
					setCurrentHash(sectionHref);
				}

				scrollToSection(sectionHref);
				return;
			}

			window.location.href = `/${sectionHref}`;
		},
		[pathname]
	);

	const handleGlobalCtaNavigation = useCallback(() => {
		closeMobileMenu();

		if (!globalCtaIsSectionLink) {
			return;
		}

		if (pathname === "/") {
			if (window.location.hash !== globalCtaHref) {
				window.history.pushState(null, "", globalCtaHref);
				setCurrentHash(globalCtaHref);
			}

			scrollToSection(globalCtaHref);
			return;
		}

		window.location.href = `/${globalCtaHref}`;
	}, [globalCtaHref, globalCtaIsSectionLink, pathname]);

	const isNavItemActive = useCallback(
		(item: HeaderNavItem): boolean => {
			if (item.isSectionLink) {
				return pathname === "/" && currentHash === item.href;
			}

			if (item.href === "/") {
				return pathname === "/" && (currentHash === "" || currentHash === "#home");
			}

			return pathname === item.href;
		},
		[currentHash, pathname]
	);

	return (
		<>
			<header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-surface/95 shadow-sm backdrop-blur-md">
				<div className="grid h-16 w-full grid-cols-[minmax(0,auto)_1fr_auto] items-center px-4 md:h-20 md:px-6">
					<div className="flex min-w-0 items-center gap-4 md:gap-5">
						<button
							type="button"
							onClick={() => setIsMenuOpen((prev) => !prev)}
							aria-label={isMenuOpen ? authText.closeMenu : authText.openMenu}
							className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-primary transition hover:bg-surface-soft md:hidden"
						>
							{isMenuOpen ? (
								<HiOutlineXMark size={24} />
							) : (
								<HiOutlineBars3 size={24} />
							)}
						</button>

						<Link
							href="/"
							onClick={closeMobileMenu}
							className="flex min-w-0 items-center gap-3.5 md:gap-4"
						>
							{businessLogotipo ? (
								<Image
									src={businessLogotipo}
									alt={businessName}
									width={60}
									height={60}
									className="h-[46px] w-auto object-contain md:h-[58px]"
									priority
									unoptimized
								/>
							) : (
								<div className="h-[46px] w-[46px] rounded-md border border-border bg-surface-soft md:h-[58px] md:w-[58px]" />
							)}

							<span className="truncate leading-none text-base font-semibold tracking-tight text-text-primary md:text-[1.35rem]">
								{businessName}
							</span>
						</Link>
					</div>

					<nav className="hidden items-center justify-center gap-7 md:flex">
						{navItems.map((item) => {
							const isActive = isNavItemActive(item);

							return item.isSectionLink ? (
								<button
									key={item.key}
									type="button"
									onClick={() => handleSectionNavigation(item.href)}
									aria-current={isActive ? "page" : undefined}
									className={getNavItemBaseClasses(isActive)}
								>
									{item.label}
								</button>
							) : (
								<Link
									key={item.key}
									href={item.href}
									aria-current={isActive ? "page" : undefined}
									className={getNavItemBaseClasses(isActive)}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>

					<div className="flex h-full items-center justify-end gap-2 self-stretch md:gap-3">
						{showGlobalCta ? (
							globalCtaIsSectionLink ? (
								<button
									type="button"
									onClick={handleGlobalCtaNavigation}
									className="hidden h-10 rounded-full bg-brand-primary px-4 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white md:inline-flex md:items-center"
								>
									{authText.quote}
								</button>
							) : (
								<Link
									href={globalCtaHref}
									className="hidden h-10 rounded-full bg-brand-primary px-4 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white md:inline-flex md:items-center"
								>
									{authText.quote}
								</Link>
							)
						) : null}

						{isAuthenticated ? (
							<>
								<div className="hidden h-full items-center justify-end gap-3 md:flex">
									<div className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface-soft px-4 text-sm text-text-secondary">
										<HiOutlineUserCircle size={18} className="shrink-0" />
										<span className="max-w-[140px] truncate">
											{authText.hello}, {firstName}
										</span>
									</div>

									<button
										type="button"
										onClick={() => void handleLogout()}
										className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-text-secondary transition hover:border-status-error hover:bg-status-error hover:text-white"
									>
										<HiOutlineUserCircle size={18} className="shrink-0" />
										<span>{authText.signOut}</span>
									</button>
								</div>

								<button
									type="button"
									onClick={() => void handleLogout()}
									aria-label={authText.signOut}
									className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-soft hover:text-brand-primaryStrong md:hidden"
								>
									<HiOutlineUserCircle size={22} />
								</button>
							</>
						) : (
							<>
								<div className="hidden h-full items-center justify-end gap-3 md:flex">
									<button
										type="button"
										onClick={() => setShowLogin(true)}
										className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-text-secondary transition hover:border-brand-primary hover:bg-surface-soft hover:text-brand-primaryStrong"
									>
										<HiOutlineUserCircle size={18} className="shrink-0" />
										<span>{authText.signIn}</span>
									</button>

									<button
										type="button"
										onClick={() => setShowSignUp(true)}
										className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-soft px-4 text-sm font-medium text-text-primary transition hover:border-brand-primary hover:bg-brand-secondary"
									>
										<HiOutlineIdentification size={18} className="shrink-0" />
										<span>{authText.signUp}</span>
									</button>
								</div>

								<button
									type="button"
									onClick={() => setShowLogin(true)}
									aria-label={authText.signIn}
									className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-soft hover:text-brand-primaryStrong md:hidden"
								>
									<HiOutlineUserCircle size={22} />
								</button>

								<button
									type="button"
									onClick={() => setShowSignUp(true)}
									aria-label={authText.signUp}
									className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-soft hover:text-brand-primaryStrong md:hidden"
								>
									<HiOutlineIdentification size={22} />
								</button>
							</>
						)}

						<div className="hidden h-10 items-center gap-2 rounded-full border border-border bg-surface-soft px-4 md:flex">
							<HiOutlineGlobeAlt
								size={18}
								className="shrink-0 text-text-secondary"
							/>
							<span className="text-sm font-medium text-text-secondary">
								{authText.language}
							</span>

							<select
								value={locale}
								onChange={(e) => handleLocaleChange(e.target.value)}
								aria-label={authText.language}
								className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none"
							>
								<option value="es">ES</option>
								<option value="en">EN</option>
							</select>
						</div>

						<div className="flex h-full items-center md:hidden">
							<label htmlFor="mobile-header-locale" className="sr-only">
								{authText.language}
							</label>

							<div className="flex items-center gap-1 rounded-xl px-2 py-1 text-text-secondary transition hover:bg-surface-soft">
								<HiOutlineGlobeAlt size={20} />
								<select
									id="mobile-header-locale"
									value={locale}
									onChange={(e) => handleLocaleChange(e.target.value)}
									aria-label={authText.language}
									className="bg-transparent text-xs font-medium text-text-primary outline-none"
								>
									<option value="es" className="bg-surface text-text-primary">
										ES
									</option>
									<option value="en" className="bg-surface text-text-primary">
										EN
									</option>
								</select>
							</div>
						</div>
					</div>
				</div>

				{isMenuOpen ? (
					<div className="border-t border-border bg-surface px-4 py-4 md:hidden">
						<nav className="flex flex-col gap-2">
							{navItems.map((item) => {
								const isActive = isNavItemActive(item);

								return item.isSectionLink ? (
									<button
										key={item.key}
										type="button"
										onClick={() => handleSectionNavigation(item.href)}
										aria-current={isActive ? "page" : undefined}
										className={getMobileNavItemBaseClasses(isActive)}
									>
										{item.label}
									</button>
								) : (
									<Link
										key={item.key}
										href={item.href}
										onClick={closeMobileMenu}
										aria-current={isActive ? "page" : undefined}
										className={getMobileNavItemBaseClasses(isActive)}
									>
										{item.label}
									</Link>
								);
							})}

							{showGlobalCta ? (
								globalCtaIsSectionLink ? (
									<button
										type="button"
										onClick={handleGlobalCtaNavigation}
										className="rounded-xl bg-brand-primary px-3 py-3 text-left text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
									>
										{authText.quote}
									</button>
								) : (
									<Link
										href={globalCtaHref}
										onClick={closeMobileMenu}
										className="rounded-xl bg-brand-primary px-3 py-3 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
									>
										{authText.quote}
									</Link>
								)
							) : null}

							{!isAuthenticated ? (
								<>
									<button
										type="button"
										onClick={handleOpenLogin}
										className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-text-secondary transition hover:bg-surface-soft hover:text-brand-primaryStrong"
									>
										<HiOutlineUserCircle size={18} />
										<span>{authText.signIn}</span>
									</button>

									<button
										type="button"
										onClick={handleOpenSignUp}
										className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-text-secondary transition hover:bg-surface-soft hover:text-brand-primaryStrong"
									>
										<HiOutlineIdentification size={18} />
										<span>{authText.signUp}</span>
									</button>
								</>
							) : (
								<button
									type="button"
									onClick={() => {
										closeMobileMenu();
										void handleLogout();
									}}
									className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-status-error transition hover:bg-red-50 hover:text-status-error"
								>
									<HiOutlineUserCircle size={18} />
									<span>{authText.signOut}</span>
								</button>
							)}
						</nav>
					</div>
				) : null}
			</header>

			<LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
			<SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />
		</>
	);
}