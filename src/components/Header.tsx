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

const EMPTY_LOCALIZED_TEXT: LocalizedText = {
  es: "",
  en: "",
};

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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText = EMPTY_LOCALIZED_TEXT
): LocalizedText {
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es, fallback.es),
    en: normalizeString(record.en, fallback.en),
  };
}

function normalizeImageSrc(value: string | undefined | null): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";

  const normalized = raw.replace(/\\/g, "/");

  if (normalized.startsWith("/")) return normalized;

  try {
    return new URL(normalized).toString();
  } catch {
    return "";
  }
}

function normalizeSiteSettings(payload: unknown): HeaderSiteSettings {
  if (!payload || typeof payload !== "object") {
    return HEADER_SITE_SETTINGS_DEFAULTS;
  }

  const record = payload as Record<string, unknown>;
  const identity = (record.identity ?? {}) as Record<string, unknown>;
  const globalPrimaryCta = (record.globalPrimaryCta ?? {}) as Record<
    string,
    unknown
  >;

  return {
    identity: {
      siteName: normalizeString(identity.siteName),
      siteNameShort: normalizeString(identity.siteNameShort),
      logoLight: normalizeString(identity.logoLight),
      logoDark: normalizeString(identity.logoDark),
    },
    globalPrimaryCta: {
      label: normalizeLocalizedText(globalPrimaryCta.label, {
        es: "Solicitar cotización",
        en: "Request a quote",
      }),
      href: normalizeString(globalPrimaryCta.href, "/contact"),
      enabled: normalizeBoolean(globalPrimaryCta.enabled, true),
    },
  };
}

function getLocalizedText(value: LocalizedText, locale: "es" | "en"): string {
  return locale === "es" ? value.es : value.en;
}

function hasLocalizedText(value: LocalizedText | null | undefined): boolean {
  if (!value) return false;
  return value.es.trim().length > 0 || value.en.trim().length > 0;
}

/**
 * Hace scroll manual hacia una sección con reintentos.
 */
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

    if (remaining <= 0) return;

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
        const response = await fetch("/api/site-settings", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const payload: unknown = await response.json().catch(() => null);
        setSiteSettings(normalizeSiteSettings(payload));
      } catch (error) {
        console.error("[Header] Error loading site settings:", error);
        setSiteSettings(HEADER_SITE_SETTINGS_DEFAULTS);
      }
    }

    void loadSiteSettings();
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
      quote:
        hasLocalizedText(siteSettings.globalPrimaryCta.label)
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

    if (!globalCtaIsSectionLink) return;

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
        <div className="grid h-16 w-full grid-cols-[auto_1fr_auto] items-center px-4 md:h-20 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
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
              className="flex min-w-0 items-center gap-3"
            >
              {businessLogotipo ? (
                <Image
                  src={businessLogotipo}
                  alt={businessName}
                  width={54}
                  height={54}
                  className="h-[42px] w-auto object-contain md:h-[54px]"
                  priority
                />
              ) : (
                <div className="h-[42px] w-[42px] rounded-md border border-border bg-surface-soft md:h-[54px] md:w-[54px]" />
              )}

              <span className="truncate text-base font-semibold tracking-tight text-text-primary md:text-[1.35rem]">
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

          <div className="flex items-center justify-end gap-2 md:gap-3">
            {showGlobalCta ? (
              globalCtaIsSectionLink ? (
                <button
                  type="button"
                  onClick={handleGlobalCtaNavigation}
                  className="hidden rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white md:inline-flex"
                >
                  {authText.quote}
                </button>
              ) : (
                <Link
                  href={globalCtaHref}
                  className="hidden rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white md:inline-flex"
                >
                  {authText.quote}
                </Link>
              )
            ) : null}

            {isAuthenticated ? (
              <>
                <div className="hidden items-center justify-end gap-3 md:flex">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-surface-soft px-4 py-2 text-sm text-text-secondary">
                    <HiOutlineUserCircle size={18} className="shrink-0" />
                    <span className="max-w-[140px] truncate">
                      {authText.hello}, {firstName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-status-error hover:bg-status-error hover:text-white"
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
                <div className="hidden items-center justify-end gap-3 md:flex">
                  <button
                    type="button"
                    onClick={() => setShowLogin(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-brand-primary hover:bg-surface-soft hover:text-brand-primaryStrong"
                  >
                    <HiOutlineUserCircle size={18} className="shrink-0" />
                    <span>{authText.signIn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSignUp(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-soft px-4 py-2 text-sm font-medium text-text-primary transition hover:border-brand-primary hover:bg-brand-secondary"
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

            <div className="hidden items-center gap-2 rounded-full border border-border bg-surface-soft px-4 py-2 md:flex">
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

            <div className="flex items-center md:hidden">
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