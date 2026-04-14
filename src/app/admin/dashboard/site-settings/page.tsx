"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Site Settings
 * Path: src/app/admin/dashboard/site-settings/page.tsx
 * =============================================================================
 *
 * ES:
 *   Pantalla administrativa dedicada exclusivamente a la configuración global
 *   del sitio público Sierra Tech.
 *
 *   Responsabilidad:
 *   - Cargar y editar SiteSettings.
 *   - Guardar una sola entidad global del sitio.
 *   - Mantener esta pantalla separada del contenido editorial del Home.
 *
 *   Alcance:
 *   - Identidad del sitio
 *   - Contacto
 *   - Redes sociales
 *   - CTA global
 *   - Footer
 *   - SEO global
 *   - Idioma
 *
 *   Decisión oficial:
 *   - HomeSettings ya no se administra desde esta página.
 *   - Todo el contenido editorial del Home vive en:
 *     /admin/dashboard/home
 *
 * EN:
 *   Administrative screen dedicated exclusively to Sierra Tech public website
 *   global settings.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Settings as SettingsIcon } from "lucide-react";
import Image from "next/image";

import { useTranslation } from "@/hooks/useTranslation";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { useToast } from "@/components/ui/GlobalToastProvider";

import type {
  Locale,
  SiteSettingsPayload,
} from "@/lib/site-settings.contract";

import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings.contract";
import {
  isAllowedRole,
  normalizeSiteSettingsPayload,
} from "@/lib/site-settings.normalize";

import {
  uploadAdminFile,
  type UploadedAdminFile,
} from "@/lib/adminUploadsClient";

import { notifyBrandingUpdated } from "@/lib/publicBranding";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function SectionDivider(props: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-5 shadow-sm">
      <div className="flex items-start gap-4">
        {props.icon ? <div className="mt-0.5 shrink-0">{props.icon}</div> : null}

        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            {props.title}
          </h2>
          {props.subtitle ? (
            <p className="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionCard(props: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-text-primary">
          {props.title}
        </h3>
        {props.subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-5">{props.children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-text-primary">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;

  return (
    <input
      {...rest}
      className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${
        className ?? ""
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;

  return (
    <textarea
      {...rest}
      className={`min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${
        className ?? ""
      }`}
    />
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center gap-3 text-sm ${
        props.disabled
          ? "cursor-not-allowed text-text-secondary opacity-60"
          : "cursor-pointer text-text-primary"
      }`}
    >
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      <span>{props.label}</span>
    </label>
  );
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;

  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50 ${
        className ?? ""
      }`}
    />
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;

  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        className ?? ""
      }`}
    />
  );
}

function toAdminUploadSrc(fileKeyOrUrl: string): string {
  return fileKeyOrUrl.startsWith("admin/")
    ? `/api/admin/uploads/view?key=${encodeURIComponent(fileKeyOrUrl)}`
    : fileKeyOrUrl;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SiteSettingsPage() {
  const { locale } = useTranslation();
  const lang: Locale = locale === "es" ? "es" : "en";

  const { data: session, status } = useSession();
  const toast = useToast();

  const [siteForm, setSiteForm] =
    useState<SiteSettingsPayload>(SITE_SETTINGS_DEFAULTS);
  const [siteInitialData, setSiteInitialData] =
    useState<SiteSettingsPayload>(SITE_SETTINGS_DEFAULTS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingLogoLight, setUploadingLogoLight] = useState(false);
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);

  const hasLoadedInitialDataRef = useRef(false);

  const role = session?.user?.role;
  const hasAccess = isAllowedRole(role);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(siteForm) !== JSON.stringify(siteInitialData);
  }, [siteForm, siteInitialData]);

  useEffect(() => {
    async function loadSiteSettings() {
      try {
        const response = await fetch("/api/admin/site-settings", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`SITE_HTTP_${response.status}`);
        }

        const payload: unknown = await response.json().catch(() => null);
        const normalized = normalizeSiteSettingsPayload(payload);

        setSiteForm(normalized);
        setSiteInitialData(normalized);

        hasLoadedInitialDataRef.current = true;
      } catch (error) {
        console.error("[SiteSettingsPage] Error loading configuration:", error);
        toast.error(
          lang === "es"
            ? "No se pudo cargar la configuración."
            : "Could not load configuration."
        );
      } finally {
        setLoading(false);
      }
    }

    if (status !== "authenticated" || !hasAccess) {
      setLoading(false);
      return;
    }

    if (hasLoadedInitialDataRef.current) {
      return;
    }

    void loadSiteSettings();
  }, [status, hasAccess, lang, toast]);

  async function handleSave(): Promise<void> {
    try {
      setSaving(true);

      const response = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteForm),
      });

      if (!response.ok) {
        throw new Error(`SITE_SAVE_HTTP_${response.status}`);
      }

      const payload: unknown = await response.json().catch(() => siteForm);
      const normalized = normalizeSiteSettingsPayload(payload);

      setSiteForm(normalized);
      setSiteInitialData(normalized);

      notifyBrandingUpdated();

      toast.success(
        lang === "es"
          ? "Configuración guardada correctamente."
          : "Configuration saved successfully."
      );
    } catch (error) {
      console.error("[SiteSettingsPage] Error saving configuration:", error);
      toast.error(
        lang === "es"
          ? "Error al guardar la configuración."
          : "Error saving configuration."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleReset(): void {
    setSiteForm(siteInitialData);
  }

  /* ---------------------------------------------------------------------- */
  /* Updaters                                                               */
  /* ---------------------------------------------------------------------- */

  function updateIdentityField(
    field: "siteName" | "siteNameShort" | "logoLight" | "logoDark" | "favicon",
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        [field]: value,
      },
    }));
  }

  function updateIdentityTagline(localeKey: Locale, value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        tagline: {
          ...prev.identity.tagline,
          [localeKey]: value,
        },
      },
    }));
  }

  async function handleLogoLightUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) return;

    try {
      setUploadingLogoLight(true);

      const result = await uploadAdminFile(selectedFile, "site-settings/logos");

      if (!result.ok || !result.file) {
        toast.error(
          lang === "es"
            ? result.message || "No se pudo subir el logo."
            : result.message || "Could not upload the logo."
        );
        return;
      }

      const uploadedFile: UploadedAdminFile = result.file;
      updateIdentityField("logoLight", uploadedFile.fileKey);

      toast.success(
        lang === "es"
          ? "Logo Light subido correctamente."
          : "Logo Light uploaded successfully."
      );
    } catch (error) {
      console.error("[SiteSettingsPage] Logo Light upload error:", error);
      toast.error(
        lang === "es"
          ? "Ocurrió un error al subir el logo."
          : "An error occurred while uploading the logo."
      );
    } finally {
      setUploadingLogoLight(false);
      event.target.value = "";
    }
  }

  async function handleLogoDarkUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) return;

    try {
      setUploadingLogoDark(true);

      const result = await uploadAdminFile(selectedFile, "site-settings/logos");

      if (!result.ok || !result.file) {
        toast.error(
          lang === "es"
            ? result.message || "No se pudo subir el logo."
            : result.message || "Could not upload the logo."
        );
        return;
      }

      updateIdentityField("logoDark", result.file.fileKey);

      toast.success(
        lang === "es"
          ? "Logo Dark subido correctamente."
          : "Logo Dark uploaded successfully."
      );
    } catch (error) {
      console.error("[SiteSettingsPage] Logo Dark upload error:", error);
      toast.error(
        lang === "es"
          ? "Error al subir el logo."
          : "Upload error."
      );
    } finally {
      setUploadingLogoDark(false);
      event.target.value = "";
    }
  }

  async function handleFaviconUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) return;

    try {
      setUploadingFavicon(true);

      const result = await uploadAdminFile(selectedFile, "site-settings/favicons");

      if (!result.ok || !result.file) {
        toast.error(
          lang === "es"
            ? result.message || "No se pudo subir el favicon."
            : result.message || "Could not upload the favicon."
        );
        return;
      }

      updateIdentityField("favicon", result.file.fileKey);

      toast.success(
        lang === "es"
          ? "Favicon subido correctamente."
          : "Favicon uploaded successfully."
      );
    } catch (error) {
      console.error("[SiteSettingsPage] Favicon upload error:", error);
      toast.error(
        lang === "es"
          ? "Error al subir el favicon."
          : "Upload error."
      );
    } finally {
      setUploadingFavicon(false);
      event.target.value = "";
    }
  }

  function updateContactField(
    field:
      | "primaryEmail"
      | "secondaryEmail"
      | "phonePrimary"
      | "phoneSecondary"
      | "whatsapp"
      | "addressLine1"
      | "addressLine2"
      | "city"
      | "country",
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value,
      },
    }));
  }

  function updateSocialLinkField(
    field: "facebook" | "instagram" | "linkedin" | "youtube" | "x",
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [field]: value,
      },
    }));
  }

  function updateGlobalCtaLabel(localeKey: Locale, value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      globalPrimaryCta: {
        ...prev.globalPrimaryCta,
        label: {
          ...prev.globalPrimaryCta.label,
          [localeKey]: value,
        },
      },
    }));
  }

  function updateGlobalCtaField(
    field: "href" | "enabled",
    value: string | boolean
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      globalPrimaryCta: {
        ...prev.globalPrimaryCta,
        [field]: value,
      },
    }));
  }

  function updateFooterAboutText(localeKey: Locale, value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        aboutText: {
          ...prev.footer.aboutText,
          [localeKey]: value,
        },
      },
    }));
  }

  function updateFooterField(
    field: "copyrightText" | "legalLinksEnabled",
    value: string | boolean
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        [field]: value,
      },
    }));
  }

  function updateSeoLocalizedField(
    field: "defaultTitle" | "defaultDescription",
    localeKey: Locale,
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: {
          ...prev.seo[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateSeoField(field: "defaultOgImage", value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: value,
      },
    }));
  }

  async function handleOgImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) return;

    try {
      setUploadingOgImage(true);

      const result = await uploadAdminFile(selectedFile, "site-settings/seo");

      if (!result.ok || !result.file) {
        toast.error(
          lang === "es"
            ? result.message || "No se pudo subir la imagen OG."
            : result.message || "Could not upload the OG image."
        );
        return;
      }

      updateSeoField("defaultOgImage", result.file.fileKey);

      toast.success(
        lang === "es"
          ? "OG Image subida correctamente."
          : "OG Image uploaded successfully."
      );
    } catch (error) {
      console.error("[SiteSettingsPage] OG image upload error:", error);
      toast.error(
        lang === "es"
          ? "Error al subir la imagen OG."
          : "Upload error."
      );
    } finally {
      setUploadingOgImage(false);
      event.target.value = "";
    }
  }

  function updateI18nDefaultLocale(value: Locale): void {
    setSiteForm((prev) => ({
      ...prev,
      i18n: {
        ...prev.i18n,
        defaultLocale: value,
      },
    }));
  }

  function updateI18nSupportedLocales(value: Locale[]): void {
    setSiteForm((prev) => ({
      ...prev,
      i18n: {
        ...prev.i18n,
        supportedLocales: value,
        defaultLocale: value.includes(prev.i18n.defaultLocale)
          ? prev.i18n.defaultLocale
          : value[0] ?? "es",
      },
    }));
  }

  /* ---------------------------------------------------------------------- */
  /* Guards                                                                 */
  /* ---------------------------------------------------------------------- */

  if (status === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es" ? "Cargando sesión..." : "Loading session..."}
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
          {lang === "es"
            ? "Acceso restringido a administradores."
            : "Admin access only."}
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es"
            ? "Cargando configuración..."
            : "Loading configuration..."}
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="space-y-6">
      <AdminPageHeader
        icon={<SettingsIcon className="h-6 w-6 text-brand-primaryStrong" />}
        title={lang === "es" ? "Configuración del Sitio" : "Site Settings"}
        subtitle={
          lang === "es"
            ? "Administra la configuración global del sitio público."
            : "Manage the global configuration of the public website."
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleSave}
        >
          {saving
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
            ? "Guardar cambios"
            : "Save changes"}
        </PrimaryButton>

        <ActionButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleReset}
        >
          {lang === "es" ? "Restaurar" : "Reset"}
        </ActionButton>

        <span className="text-sm text-text-secondary">
          {hasUnsavedChanges
            ? lang === "es"
              ? "Hay cambios sin guardar."
              : "There are unsaved changes."
            : lang === "es"
            ? "Sin cambios pendientes."
            : "No pending changes."}
        </span>
      </div>

      <SectionDivider
        icon={<SettingsIcon className="h-6 w-6 text-brand-primaryStrong" />}
        title={
          lang === "es"
            ? "Configuración global del sitio"
            : "Global site configuration"
        }
        subtitle={
          lang === "es"
            ? "Identidad, contacto, redes, footer, SEO e idioma."
            : "Identity, contact, social links, footer, SEO and language."
        }
      />

      <SectionCard
        title={lang === "es" ? "Identidad del sitio" : "Site identity"}
        subtitle={
          lang === "es"
            ? "Define nombre comercial, slogans y assets principales."
            : "Define the business name, slogans and primary assets."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Nombre del sitio" : "Site name"}
            </FieldLabel>
            <TextInput
              value={siteForm.identity.siteName}
              onChange={(e) => updateIdentityField("siteName", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Nombre corto" : "Short name"}
            </FieldLabel>
            <TextInput
              value={siteForm.identity.siteNameShort}
              onChange={(e) =>
                updateIdentityField("siteNameShort", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Slogan ES</FieldLabel>
            <TextArea
              value={siteForm.identity.tagline.es}
              onChange={(e) => updateIdentityTagline("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Slogan EN</FieldLabel>
            <TextArea
              value={siteForm.identity.tagline.en}
              onChange={(e) => updateIdentityTagline("en", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <FieldLabel>Logo Light</FieldLabel>

            <div className="space-y-3">
              <TextInput
                value={siteForm.identity.logoLight}
                onChange={(e) => updateIdentityField("logoLight", e.target.value)}
                placeholder="admin/site-settings/logos/..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                    onChange={handleLogoLightUpload}
                    disabled={uploadingLogoLight || saving}
                  />
                  {uploadingLogoLight
                    ? lang === "es"
                      ? "Subiendo..."
                      : "Uploading..."
                    : lang === "es"
                    ? "Subir Logo Light"
                    : "Upload Logo Light"}
                </label>

                {siteForm.identity.logoLight ? (
                  <span className="text-xs text-text-secondary">
                    {siteForm.identity.logoLight}
                  </span>
                ) : null}
              </div>

              {siteForm.identity.logoLight ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                    {lang === "es" ? "Vista previa" : "Preview"}
                  </div>

                  <Image
                    src={toAdminUploadSrc(siteForm.identity.logoLight)}
                    alt="Logo Light Preview"
                    width={240}
                    height={96}
                    unoptimized
                    className="max-h-24 w-auto object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <FieldLabel>Logo Dark</FieldLabel>

            <div className="space-y-3">
              <TextInput
                value={siteForm.identity.logoDark}
                onChange={(e) => updateIdentityField("logoDark", e.target.value)}
                placeholder="admin/site-settings/logos/..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                    onChange={handleLogoDarkUpload}
                    disabled={uploadingLogoDark || saving}
                  />
                  {uploadingLogoDark
                    ? lang === "es"
                      ? "Subiendo..."
                      : "Uploading..."
                    : lang === "es"
                    ? "Subir Logo Dark"
                    : "Upload Logo Dark"}
                </label>

                {siteForm.identity.logoDark ? (
                  <span className="text-xs text-text-secondary">
                    {siteForm.identity.logoDark}
                  </span>
                ) : null}
              </div>

              {siteForm.identity.logoDark ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                    {lang === "es" ? "Vista previa" : "Preview"}
                  </div>

                  <Image
                    src={toAdminUploadSrc(siteForm.identity.logoDark)}
                    alt="Logo Dark Preview"
                    width={240}
                    height={96}
                    unoptimized
                    className="max-h-24 w-auto object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <FieldLabel>Favicon</FieldLabel>

            <div className="space-y-3">
              <TextInput
                value={siteForm.identity.favicon}
                onChange={(e) => updateIdentityField("favicon", e.target.value)}
                placeholder="admin/site-settings/favicons/..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                  <input
                    type="file"
                    accept=".png,.ico,.svg"
                    className="hidden"
                    onChange={handleFaviconUpload}
                    disabled={uploadingFavicon || saving}
                  />
                  {uploadingFavicon
                    ? lang === "es"
                      ? "Subiendo..."
                      : "Uploading..."
                    : lang === "es"
                    ? "Subir Favicon"
                    : "Upload Favicon"}
                </label>

                {siteForm.identity.favicon ? (
                  <span className="text-xs text-text-secondary">
                    {siteForm.identity.favicon}
                  </span>
                ) : null}
              </div>

              {siteForm.identity.favicon ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                    {lang === "es" ? "Vista previa" : "Preview"}
                  </div>

                  <Image
                    src={toAdminUploadSrc(siteForm.identity.favicon)}
                    alt="Favicon Preview"
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Contacto" : "Contact"}
        subtitle={
          lang === "es"
            ? "Configura correos, teléfonos y dirección visible del sitio."
            : "Configure public email, phone and address information."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Correo principal" : "Primary email"}
            </FieldLabel>
            <TextInput
              type="email"
              value={siteForm.contact.primaryEmail}
              onChange={(e) =>
                updateContactField("primaryEmail", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Correo secundario" : "Secondary email"}
            </FieldLabel>
            <TextInput
              type="email"
              value={siteForm.contact.secondaryEmail}
              onChange={(e) =>
                updateContactField("secondaryEmail", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <FieldLabel>
              {lang === "es" ? "Teléfono principal" : "Primary phone"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.phonePrimary}
              onChange={(e) =>
                updateContactField("phonePrimary", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Teléfono secundario" : "Secondary phone"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.phoneSecondary}
              onChange={(e) =>
                updateContactField("phoneSecondary", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>WhatsApp</FieldLabel>
            <TextInput
              value={siteForm.contact.whatsapp}
              onChange={(e) => updateContactField("whatsapp", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Dirección línea 1" : "Address line 1"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.addressLine1}
              onChange={(e) =>
                updateContactField("addressLine1", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Dirección línea 2" : "Address line 2"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.addressLine2}
              onChange={(e) =>
                updateContactField("addressLine2", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Ciudad" : "City"}</FieldLabel>
            <TextInput
              value={siteForm.contact.city}
              onChange={(e) => updateContactField("city", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "País" : "Country"}</FieldLabel>
            <TextInput
              value={siteForm.contact.country}
              onChange={(e) => updateContactField("country", e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Redes sociales" : "Social links"}
        subtitle={
          lang === "es"
            ? "Enlaces públicos a redes y canales corporativos."
            : "Public links to social and corporate channels."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Facebook</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.facebook}
              onChange={(e) => updateSocialLinkField("facebook", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Instagram</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.instagram}
              onChange={(e) =>
                updateSocialLinkField("instagram", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>LinkedIn</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.linkedin}
              onChange={(e) => updateSocialLinkField("linkedin", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>YouTube</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.youtube}
              onChange={(e) => updateSocialLinkField("youtube", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>X / Twitter</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.x}
              onChange={(e) => updateSocialLinkField("x", e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "CTA global" : "Global CTA"}
        subtitle={
          lang === "es"
            ? "Botón principal reutilizable a nivel global del sitio."
            : "Reusable primary button across the website."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Label ES</FieldLabel>
            <TextInput
              value={siteForm.globalPrimaryCta.label.es}
              onChange={(e) => updateGlobalCtaLabel("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Label EN</FieldLabel>
            <TextInput
              value={siteForm.globalPrimaryCta.label.en}
              onChange={(e) => updateGlobalCtaLabel("en", e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Href</FieldLabel>
          <TextInput
            value={siteForm.globalPrimaryCta.href}
            onChange={(e) => updateGlobalCtaField("href", e.target.value)}
          />
        </div>

        <Toggle
          label={lang === "es" ? "CTA global activo" : "Global CTA enabled"}
          checked={siteForm.globalPrimaryCta.enabled}
          onChange={(value) => updateGlobalCtaField("enabled", value)}
        />
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Footer" : "Footer"}
        subtitle={
          lang === "es"
            ? "Configura el texto institucional y opciones del pie de página."
            : "Configure institutional text and footer options."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es"
                ? "Texto institucional ES"
                : "Institutional text ES"}
            </FieldLabel>
            <TextArea
              value={siteForm.footer.aboutText.es}
              onChange={(e) => updateFooterAboutText("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es"
                ? "Texto institucional EN"
                : "Institutional text EN"}
            </FieldLabel>
            <TextArea
              value={siteForm.footer.aboutText.en}
              onChange={(e) => updateFooterAboutText("en", e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Copyright</FieldLabel>
          <TextInput
            value={siteForm.footer.copyrightText}
            onChange={(e) => updateFooterField("copyrightText", e.target.value)}
          />
        </div>

        <Toggle
          label={lang === "es" ? "Mostrar links legales" : "Show legal links"}
          checked={siteForm.footer.legalLinksEnabled}
          onChange={(value) => updateFooterField("legalLinksEnabled", value)}
        />
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "SEO global" : "Global SEO"}
        subtitle={
          lang === "es"
            ? "Metadatos por defecto del sitio."
            : "Default metadata for the website."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Title ES</FieldLabel>
            <TextInput
              value={siteForm.seo.defaultTitle.es}
              onChange={(e) =>
                updateSeoLocalizedField("defaultTitle", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Title EN</FieldLabel>
            <TextInput
              value={siteForm.seo.defaultTitle.en}
              onChange={(e) =>
                updateSeoLocalizedField("defaultTitle", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Description ES</FieldLabel>
            <TextArea
              value={siteForm.seo.defaultDescription.es}
              onChange={(e) =>
                updateSeoLocalizedField(
                  "defaultDescription",
                  "es",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <FieldLabel>Description EN</FieldLabel>
            <TextArea
              value={siteForm.seo.defaultDescription.en}
              onChange={(e) =>
                updateSeoLocalizedField(
                  "defaultDescription",
                  "en",
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <div>
          <FieldLabel>OG Image</FieldLabel>

          <div className="space-y-3">
            <TextInput
              value={siteForm.seo.defaultOgImage}
              onChange={(e) => updateSeoField("defaultOgImage", e.target.value)}
              placeholder="admin/site-settings/seo/... o /assets/..."
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                  className="hidden"
                  onChange={handleOgImageUpload}
                  disabled={uploadingOgImage || saving}
                />
                {uploadingOgImage
                  ? lang === "es"
                    ? "Subiendo..."
                    : "Uploading..."
                  : "Subir OG Image"}
              </label>

              {siteForm.seo.defaultOgImage ? (
                <span className="text-xs text-text-secondary">
                  {siteForm.seo.defaultOgImage}
                </span>
              ) : null}
            </div>

            {siteForm.seo.defaultOgImage ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                  {lang === "es" ? "Vista previa" : "Preview"}
                </div>

                <Image
                  src={toAdminUploadSrc(siteForm.seo.defaultOgImage)}
                  alt="OG Image Preview"
                  width={320}
                  height={180}
                  unoptimized
                  className="max-h-40 w-auto object-contain"
                />
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Idioma" : "Language"}
        subtitle={
          lang === "es"
            ? "Configura idioma por defecto y locales soportados."
            : "Configure default locale and supported locales."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Idioma por defecto" : "Default locale"}
            </FieldLabel>
            <select
              value={siteForm.i18n.defaultLocale}
              onChange={(e) => updateI18nDefaultLocale(e.target.value as Locale)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Locales soportados" : "Supported locales"}
            </FieldLabel>
            <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-background px-3 py-3">
              <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={siteForm.i18n.supportedLocales.includes("es")}
                  onChange={(e) => {
                    const next: Locale[] = e.target.checked
                      ? Array.from(
                          new Set<Locale>([
                            ...siteForm.i18n.supportedLocales,
                            "es",
                          ])
                        )
                      : siteForm.i18n.supportedLocales.filter(
                          (item): item is Locale => item !== "es"
                        );

                    updateI18nSupportedLocales(next);
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                ES
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={siteForm.i18n.supportedLocales.includes("en")}
                  onChange={(e) => {
                    const next: Locale[] = e.target.checked
                      ? Array.from(
                          new Set<Locale>([
                            ...siteForm.i18n.supportedLocales,
                            "en",
                          ])
                        )
                      : siteForm.i18n.supportedLocales.filter(
                          (item): item is Locale => item !== "en"
                        );

                    updateI18nSupportedLocales(next);
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                EN
              </label>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 pb-6">
        <PrimaryButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleSave}
        >
          {saving
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
            ? "Guardar cambios"
            : "Save changes"}
        </PrimaryButton>

        <ActionButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleReset}
        >
          {lang === "es" ? "Restaurar" : "Reset"}
        </ActionButton>
      </div>
    </main>
  );
}