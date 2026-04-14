"use client";

/**
 * =============================================================================
 * 📌 Component: Footer — Public Footer
 * Path: src/components/Footer.tsx
 * =============================================================================
 *
 * ES:
 * Footer público corporativo del sitio.
 *
 * Responsabilidades:
 * - Consumir branding y contacto desde /api/site-settings.
 * - Exponer navegación pública coherente con el Header.
 * - Mostrar enlaces legales configurables.
 * - Mostrar redes sociales disponibles.
 * - Permitir cambio de idioma persistente.
 * - Reflejar visualmente el estado activo de la navegación pública.
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
 * - El Footer no consume contenido editorial de HomeSettings.
 * - No usar hardcodes de terceros dentro de la base del componente.
 * - Si falla la API pública, mantener fallback seguro.
 *
 * EN:
 * Public footer component.
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useTranslation } from "@/hooks/useTranslation";
import { ROUTES } from "@/constants/routes";

import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Shield,
  FileText,
  Cookie,
  Linkedin,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LocalizedText {
  es: string;
  en: string;
}

type FooterNavItem = {
  key: string;
  href: string;
  label: string;
  isSectionLink?: boolean;
};

interface FooterSiteSettings {
  identity: {
    siteName: string;
    siteNameShort: string;
    logoLight: string;
    logoDark: string;
  };
  contact: {
    primaryEmail: string;
    secondaryEmail: string;
    phonePrimary: string;
    phoneSecondary: string;
    whatsapp: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    country: string;
  };
  socialLinks: {
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
    x: string;
  };
  footer: {
    aboutText: LocalizedText;
    copyrightText: string;
    legalLinksEnabled: boolean;
  };
}

/* -------------------------------------------------------------------------- */
/* Safe defaults                                                              */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = {
  es: "",
  en: "",
};

const FOOTER_SITE_SETTINGS_DEFAULTS: FooterSiteSettings = {
  identity: {
    siteName: "",
    siteNameShort: "",
    logoLight: "",
    logoDark: "",
  },
  contact: {
    primaryEmail: "",
    secondaryEmail: "",
    phonePrimary: "",
    phoneSecondary: "",
    whatsapp: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
  },
  socialLinks: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    x: "",
  },
  footer: {
    aboutText: {
      es: "",
      en: "",
    },
    copyrightText: "",
    legalLinksEnabled: true,
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

function normalizeSiteSettings(payload: unknown): FooterSiteSettings {
  if (!payload || typeof payload !== "object") {
    return FOOTER_SITE_SETTINGS_DEFAULTS;
  }

  const record = payload as Record<string, unknown>;
  const identity = (record.identity ?? {}) as Record<string, unknown>;
  const contact = (record.contact ?? {}) as Record<string, unknown>;
  const socialLinks = (record.socialLinks ?? {}) as Record<string, unknown>;
  const footer = (record.footer ?? {}) as Record<string, unknown>;

  return {
    identity: {
      siteName: normalizeString(identity.siteName),
      siteNameShort: normalizeString(identity.siteNameShort),
      logoLight: normalizeString(identity.logoLight),
      logoDark: normalizeString(identity.logoDark),
    },
    contact: {
      primaryEmail: normalizeString(contact.primaryEmail),
      secondaryEmail: normalizeString(contact.secondaryEmail),
      phonePrimary: normalizeString(contact.phonePrimary),
      phoneSecondary: normalizeString(contact.phoneSecondary),
      whatsapp: normalizeString(contact.whatsapp),
      addressLine1: normalizeString(contact.addressLine1),
      addressLine2: normalizeString(contact.addressLine2),
      city: normalizeString(contact.city),
      country: normalizeString(contact.country),
    },
    socialLinks: {
      facebook: normalizeString(socialLinks.facebook),
      instagram: normalizeString(socialLinks.instagram),
      linkedin: normalizeString(socialLinks.linkedin),
      youtube: normalizeString(socialLinks.youtube),
      x: normalizeString(socialLinks.x),
    },
    footer: {
      aboutText: normalizeLocalizedText(footer.aboutText),
      copyrightText: normalizeString(footer.copyrightText),
      legalLinksEnabled: normalizeBoolean(footer.legalLinksEnabled, true),
    },
  };
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

    if (remaining <= 0) return;

    window.setTimeout(() => {
      tryScroll(remaining - 1);
    }, 120);
  };

  tryScroll(attempts);
}

function getFooterNavItemClasses(isActive: boolean): string {
  return [
    "transition-colors",
    isActive
      ? "text-brand-primaryStrong"
      : "hover:text-brand-primaryStrong",
  ].join(" ");
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale } = useTranslation();

  const [siteSettings, setSiteSettings] = useState<FooterSiteSettings>(
    FOOTER_SITE_SETTINGS_DEFAULTS
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
        console.error("[Footer] Error loading site settings:", error);
        setSiteSettings(FOOTER_SITE_SETTINGS_DEFAULTS);
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

  const businessName =
    siteSettings.identity.siteName.trim() ||
    siteSettings.identity.siteNameShort.trim() ||
    "Sierra Tech";

  const businessLogotipo = useMemo(() => {
    return normalizeImageSrc(siteSettings.identity.logoLight);
  }, [siteSettings.identity.logoLight]);

  const futuraTechLogo = "/images/LogoCortoFuturaTech.png";

  const aboutText = useMemo(() => {
    const fromDb =
      lang === "es"
        ? siteSettings.footer.aboutText.es
        : siteSettings.footer.aboutText.en;

    return (
      fromDb.trim() ||
      (lang === "es"
        ? "Sierra Tech desarrolla soluciones en tratamiento de agua, gestión ambiental y energías limpias."
        : "Sierra Tech develops solutions in water treatment, environmental management and clean energy.")
    );
  }, [lang, siteSettings.footer.aboutText]);

  const legalLinksEnabled = siteSettings.footer.legalLinksEnabled;

  const copyrightText =
    siteSettings.footer.copyrightText.trim() ||
    `© ${new Date().getFullYear()} ${businessName}`;

  const footerText = useMemo(
    () => ({
      home: lang === "es" ? "Inicio" : "Home",
      about: lang === "es" ? "Nosotros" : "About us",
      services: lang === "es" ? "Servicios" : "Services",
      projects: lang === "es" ? "Proyectos" : "Projects",
      blog: "Blog",
      contact: lang === "es" ? "Contacto" : "Contact",
      privacy: lang === "es" ? "Privacidad" : "Privacy",
      terms: lang === "es" ? "Términos" : "Terms",
      cookies: "Cookies",
      language: lang === "es" ? "Idioma" : "Language",
    }),
    [lang]
  );

  const navItems: FooterNavItem[] = useMemo(
    () => [
      {
        key: "home",
        href: "/",
        label: footerText.home,
      },
      {
        key: "about",
        href: "#about",
        label: footerText.about,
        isSectionLink: true,
      },
      {
        key: "services",
        href: "/services",
        label: footerText.services,
      },
      {
        key: "projects",
        href: "/projects",
        label: footerText.projects,
      },
      {
        key: "blog",
        href: "/blog",
        label: footerText.blog,
      },
      {
        key: "contact",
        href: "/contact",
        label: footerText.contact,
      },
    ],
    [footerText]
  );

  const locationLabel = useMemo(() => {
    const city = siteSettings.contact.city.trim();
    const country = siteSettings.contact.country.trim();

    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return "";
  }, [siteSettings.contact.city, siteSettings.contact.country]);

  const socialLinks = siteSettings.socialLinks;
  const contact = siteSettings.contact;

  const handleLocaleChange = (nextLocale: "es" | "en"): void => {
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;

    setLocale(nextLocale);
    router.refresh();
  };

  const handleSectionNavigation = useCallback(
    (sectionHref: string) => {
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

  const isNavItemActive = useCallback(
    (item: FooterNavItem): boolean => {
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
    <footer className="w-full border-t border-border bg-surface py-10 text-sm text-text-secondary">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        {/* TOP */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
          <div className="max-w-md text-center md:text-left">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              {businessLogotipo ? (
                <Image
                  src={businessLogotipo}
                  alt={businessName}
                  width={42}
                  height={42}
                  className="h-[42px] w-auto object-contain"
                />
              ) : null}

              <h3 className="text-lg font-semibold text-text-primary">
                {businessName}
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {aboutText}
            </p>

            {contact.primaryEmail || contact.phonePrimary || locationLabel ? (
              <div className="mt-4 space-y-2 text-sm text-text-secondary">
                {contact.primaryEmail ? (
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <Mail size={15} className="text-brand-primaryStrong" />
                    <span>{contact.primaryEmail}</span>
                  </div>
                ) : null}

                {contact.phonePrimary ? (
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <Phone size={15} className="text-brand-primaryStrong" />
                    <span>{contact.phonePrimary}</span>
                  </div>
                ) : null}

                {locationLabel ? (
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <MapPin size={15} className="text-brand-primaryStrong" />
                    <span>{locationLabel}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-3 text-center md:justify-end">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item);

              return item.isSectionLink ? (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSectionNavigation(item.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={getFooterNavItemClasses(isActive)}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={getFooterNavItemClasses(isActive)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* MIDDLE */}
        <div className="flex flex-col items-center justify-between gap-5 border-t border-border pt-6 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {legalLinksEnabled ? (
              <>
                <Link
                  href={ROUTES.PRIVACY_PAGE}
                  className="flex items-center gap-1 transition-colors hover:text-brand-primaryStrong"
                >
                  <Shield size={14} />
                  {footerText.privacy}
                </Link>

                <span className="text-border">·</span>

                <Link
                  href={ROUTES.TERMS_PAGE}
                  className="flex items-center gap-1 transition-colors hover:text-brand-primaryStrong"
                >
                  <FileText size={14} />
                  {footerText.terms}
                </Link>

                <span className="text-border">·</span>

                <Link
                  href={ROUTES.COOKIES_PAGE}
                  className="flex items-center gap-1 transition-colors hover:text-brand-primaryStrong"
                >
                  <Cookie size={14} />
                  {footerText.cookies}
                </Link>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{footerText.language}</span>

            <button
              type="button"
              onClick={() => handleLocaleChange("es")}
              className={`rounded px-3 py-1.5 transition ${
                locale === "es"
                  ? "bg-brand-primary text-text-primary"
                  : "text-text-secondary hover:bg-surface-soft hover:text-brand-primaryStrong"
              }`}
            >
              ES
            </button>

            <span className="text-border">|</span>

            <button
              type="button"
              onClick={() => handleLocaleChange("en")}
              className={`rounded px-3 py-1.5 transition ${
                locale === "en"
                  ? "bg-brand-primary text-text-primary"
                  : "text-text-secondary hover:bg-surface-soft hover:text-brand-primaryStrong"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="border-t border-border pt-6">
          <div className="flex flex-col gap-4">
            {/* ROW 1 */}
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="text-center text-xs text-text-muted md:text-left">
                {copyrightText}
              </div>

              <div className="flex items-center gap-4">
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted transition hover:text-brand-primaryStrong"
                  >
                    <Facebook size={18} />
                  </a>
                )}

                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted transition hover:text-brand-primaryStrong"
                  >
                    <Instagram size={18} />
                  </a>
                )}

                {socialLinks.x && (
                  <a
                    href={socialLinks.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted transition hover:text-brand-primaryStrong"
                  >
                    <Twitter size={18} />
                  </a>
                )}

                {socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted transition hover:text-brand-primaryStrong"
                  >
                    <Youtube size={18} />
                  </a>
                )}

                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted transition hover:text-brand-primaryStrong"
                  >
                    <Linkedin size={18} />
                  </a>
                )}
              </div>
            </div>

            {/* SIGNATURE STRIP */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="hidden sm:inline">
                  {lang === "es" ? "Desarrollado por" : "Developed by"}
                </span>

                <div className="flex items-center gap-2">
                  <Image
                    src="/images/LogoCortoFuturaTech.png"
                    alt="FuturaTech"
                    width={20}
                    height={20}
                    className="h-5 w-auto object-contain opacity-90"
                  />

                  <span className="font-medium tracking-wide text-text-primary">
                    FuturaTech
                  </span>
                </div>

                <span className="hidden sm:inline text-border">—</span>

                <span className="hidden sm:inline">
                  {lang === "es"
                    ? "Desarrollo de software y soluciones cloud"
                    : "Software & cloud solutions"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}