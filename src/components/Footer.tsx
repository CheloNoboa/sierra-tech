"use client";

/**
 * =============================================================================
 * 📌 Component: Footer — Public Footer
 * Path: src/components/Footer.tsx
 * =============================================================================
 *
 * ES:
 * - Footer público corporativo del proyecto Sierra Tech.
 * - Consume configuración global únicamente desde /api/site-settings.
 * - Usa SiteSettings como fuente de verdad para branding, contacto,
 *   footer y redes sociales.
 * - Preserva navegación básica, enlaces legales e idioma.
 *
 * Reglas:
 * - El Footer no debe leer contenido editorial de HomeSettings.
 * - No usar hooks legacy.
 * - Si la API pública falla, mantener fallback visual seguro.
 *
 * EN:
 * - Public corporate footer for the Sierra Tech project.
 * - Reads global settings only from /api/site-settings.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Footer() {
  const { locale, setLocale } = useTranslation();

  const [siteSettings, setSiteSettings] = useState<FooterSiteSettings>(
    FOOTER_SITE_SETTINGS_DEFAULTS
  );

  /* ---------------------------------------------------------------------- */
  /* Data loading                                                            */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Derived state                                                           */
  /* ---------------------------------------------------------------------- */

  const lang = locale === "es" ? "es" : "en";

  const businessName = siteSettings.identity.siteName.trim() || "Sierra Tech";

  const businessLogotipo = useMemo(() => {
    return normalizeImageSrc(siteSettings.identity.logoLight);
  }, [siteSettings.identity.logoLight]);

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
      contact: lang === "es" ? "Contacto" : "Contact",
      privacy: lang === "es" ? "Privacidad" : "Privacy",
      terms: lang === "es" ? "Términos" : "Terms",
      cookies: "Cookies",
      designedBy: lang === "es" ? "Diseñado por" : "Designed by",
    }),
    [lang]
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

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <footer className="w-full border-t border-border bg-surface py-10 text-sm text-text-secondary">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        {/* TOP */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
          {/* Brand / summary */}
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

          {/* Navigation */}
          <nav className="flex flex-wrap items-center justify-center gap-3 text-center md:justify-end">
            <a
              href="#home"
              className="transition-colors hover:text-brand-primaryStrong"
            >
              {footerText.home}
            </a>

            <span className="hidden text-border md:inline">·</span>

            <a
              href="#about"
              className="transition-colors hover:text-brand-primaryStrong"
            >
              {footerText.about}
            </a>

            <span className="hidden text-border md:inline">·</span>

            <a
              href="#services"
              className="transition-colors hover:text-brand-primaryStrong"
            >
              {footerText.services}
            </a>

            <span className="hidden text-border md:inline">·</span>

            <a
              href="#projects"
              className="transition-colors hover:text-brand-primaryStrong"
            >
              {footerText.projects}
            </a>

            <span className="hidden text-border md:inline">·</span>

            <a
              href="#contact"
              className="transition-colors hover:text-brand-primaryStrong"
            >
              {footerText.contact}
            </a>
          </nav>
        </div>

        {/* MIDDLE */}
        <div className="flex flex-col items-center justify-between gap-5 border-t border-border pt-6 md:flex-row">
          {/* Legal */}
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

          {/* Language */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocale("es")}
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
              onClick={() => setLocale("en")}
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
        <div className="flex flex-col items-center justify-between gap-5 border-t border-border pt-6 md:flex-row">
          <div className="text-center text-xs text-text-muted md:text-left">
            {copyrightText}
          </div>

          <div className="group flex items-center justify-center gap-2 text-xs text-text-muted">
            <span>{footerText.designedBy}</span>

            <a
              href="https://futuratech.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition"
            >
              <Image
                src="/images/LogoCortoFuturaTech.png"
                alt="FuturaTech Logo"
                width={20}
                height={10}
                className="opacity-80 transition-transform group-hover:scale-105 group-hover:opacity-100"
                priority
              />
              <span className="font-semibold text-brand-primaryStrong">
                FuturaTech ©
              </span>
            </a>
          </div>

          <div className="flex items-center justify-center gap-4">
            {socialLinks.facebook ? (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-brand-primaryStrong"
              >
                <Facebook size={20} />
              </a>
            ) : null}

            {socialLinks.instagram ? (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-brand-primaryStrong"
              >
                <Instagram size={20} />
              </a>
            ) : null}

            {socialLinks.x ? (
              <a
                href={socialLinks.x}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-brand-primaryStrong"
              >
                <Twitter size={20} />
              </a>
            ) : null}

            {socialLinks.youtube ? (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-brand-primaryStrong"
              >
                <Youtube size={20} />
              </a>
            ) : null}

            {socialLinks.linkedin ? (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-brand-primaryStrong"
              >
                <Linkedin size={20} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}