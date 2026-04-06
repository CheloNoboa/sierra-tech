"use client";

/**
 * =============================================================================
 * 📌 Component: OrganizationModal
 * Path: src/components/OrganizationModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal administrativo para crear o editar organizaciones.
 * - Permite capturar:
 *   - razón social
 *   - nombre comercial
 *   - tax ID / RUC
 *   - email principal
 *   - teléfono principal
 *   - sitio web
 *   - país
 *   - ciudad
 *   - dirección
 *   - estado activo
 *   - notas internas
 *
 * Responsabilidades:
 * - Funcionar de forma consistente en creación y edición.
 * - Confirmar cierre cuando existen cambios sin guardar.
 * - Validar campos mínimos obligatorios antes de persistir.
 * - Enviar payload final al endpoint administrativo de organizaciones.
 * - Devolver al padre la organización persistida para upsert local sin reload.
 *
 * Reglas:
 * - El botón guardar solo se habilita si hay cambios reales.
 * - El modal no contiene lógica de listado ni refresh del DataGrid.
 * - El backend debe devolver la organización persistida para sincronización local.
 *
 * EN:
 * - Administrative modal for creating or editing organizations.
 * - Returns the persisted organization to the parent for local upsert.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";

import GlobalModal from "@/components/ui/GlobalModal";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";

import type { Organization, OrganizationStatus } from "@/types/organization";

/* =============================================================================
 * Helpers
 * ============================================================================= */

interface OrganizationFormValues {
  legalName: string;
  commercialName: string;
  taxId: string;
  primaryEmail: string;
  primaryPhone: string;
  website: string;
  country: string;
  city: string;
  address: string;
  status: OrganizationStatus;
  notes: string;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeString(value: string): string {
  return value.trim();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function buildInitialForm(
  organization: Organization | null
): OrganizationFormValues {
  return {
    legalName: organization?.legalName ?? "",
    commercialName: organization?.commercialName ?? "",
    taxId: organization?.taxId ?? "",
    primaryEmail: organization?.primaryEmail ?? "",
    primaryPhone: organization?.primaryPhone ?? "",
    website: organization?.website ?? "",
    country: organization?.country ?? "",
    city: organization?.city ?? "",
    address: organization?.address ?? "",
    status: organization?.status === "inactive" ? "inactive" : "active",
    notes: organization?.notes ?? "",
  };
}

function serializeForm(values: OrganizationFormValues): string {
  return JSON.stringify({
    legalName: normalizeString(values.legalName),
    commercialName: normalizeString(values.commercialName),
    taxId: normalizeString(values.taxId),
    primaryEmail: normalizeEmail(values.primaryEmail),
    primaryPhone: normalizeString(values.primaryPhone),
    website: normalizeString(values.website),
    country: normalizeString(values.country),
    city: normalizeString(values.city),
    address: normalizeString(values.address),
    status: values.status,
    notes: normalizeString(values.notes),
  });
}

function isOrganization(value: unknown): value is Organization {
  if (!isObj(value)) return false;
  if (typeof value._id !== "string") return false;
  if (typeof value.legalName !== "string") return false;
  if (typeof value.taxId !== "string") return false;
  if (typeof value.primaryEmail !== "string") return false;
  if (typeof value.primaryPhone !== "string") return false;
  if (value.status !== "active" && value.status !== "inactive") return false;
  return true;
}

function extractSavedOrganizationCandidate(raw: unknown): unknown {
  if (!isObj(raw)) return null;

  if (isObj(raw.organization)) return raw.organization;
  if (isObj(raw.data)) return raw.data;
  if (isObj(raw.item)) return raw.item;

  return raw;
}

function normalizeSavedOrganization(
  raw: unknown,
  context: {
    existingOrganization: Organization | null;
    values: OrganizationFormValues;
  }
): Organization | null {
  const candidate = extractSavedOrganizationCandidate(raw);

  if (isOrganization(candidate)) {
    return candidate;
  }

  if (context.existingOrganization) {
    const source = isObj(candidate) ? candidate : null;

    const merged: Organization = {
      ...context.existingOrganization,
      _id: getString(source?._id) || context.existingOrganization._id,
      legalName:
        getString(source?.legalName) || normalizeString(context.values.legalName),
      commercialName:
        getString(source?.commercialName) ||
        normalizeString(context.values.commercialName),
      taxId: getString(source?.taxId) || normalizeString(context.values.taxId),
      primaryEmail:
        getString(source?.primaryEmail) ||
        normalizeEmail(context.values.primaryEmail),
      primaryPhone:
        getString(source?.primaryPhone) ||
        normalizeString(context.values.primaryPhone),
      website:
        getString(source?.website) || normalizeString(context.values.website),
      country:
        getString(source?.country) || normalizeString(context.values.country),
      city: getString(source?.city) || normalizeString(context.values.city),
      address:
        getString(source?.address) || normalizeString(context.values.address),
      status:
        source?.status === "inactive" || source?.status === "active"
          ? source.status
          : context.values.status,
      notes: getString(source?.notes) || normalizeString(context.values.notes),
      createdAt:
        getString(source?.createdAt) || context.existingOrganization.createdAt,
      updatedAt:
        getString(source?.updatedAt) || context.existingOrganization.updatedAt,
    };

    return merged;
  }

  return null;
}

/* =============================================================================
 * Component
 * ============================================================================= */

interface OrganizationModalProps {
  isOpen: boolean;
  organization: Organization | null;
  onClose: () => void;
  onSaved: (savedOrganization: Organization) => void;
}

export default function OrganizationModal({
  isOpen,
  organization,
  onClose,
  onSaved,
}: OrganizationModalProps) {
  const { locale } = useTranslation();
  const toast = useToast();
  const isEditing = !!organization;

  const t = useMemo(
    () => ({
      newOrganization:
        locale === "es" ? "Nueva organización" : "New organization",
      editOrganization:
        locale === "es" ? "Editar organización" : "Edit organization",

      legalName: locale === "es" ? "Razón social" : "Legal name",
      commercialName:
        locale === "es" ? "Nombre comercial" : "Commercial name",
      taxId: locale === "es" ? "RUC / Tax ID" : "Tax ID",
      primaryEmail:
        locale === "es" ? "Email principal" : "Primary email",
      primaryPhone:
        locale === "es" ? "Teléfono principal" : "Primary phone",
      website: locale === "es" ? "Sitio web" : "Website",
      country: locale === "es" ? "País" : "Country",
      city: locale === "es" ? "Ciudad" : "City",
      address: locale === "es" ? "Dirección" : "Address",
      active: locale === "es" ? "Activa" : "Active",
      notes: locale === "es" ? "Notas" : "Notes",

      cancel: locale === "es" ? "Cancelar" : "Cancel",
      save: locale === "es" ? "Guardar" : "Save",
      saving: locale === "es" ? "Guardando..." : "Saving...",

      unsavedTitle:
        locale === "es" ? "Cambios sin guardar" : "Unsaved changes",
      unsavedMessage:
        locale === "es"
          ? "Tienes cambios sin guardar. ¿Salir sin guardar?"
          : "You have unsaved changes. Leave without saving?",
      unsavedCancel:
        locale === "es" ? "Seguir editando" : "Keep editing",
      unsavedConfirm:
        locale === "es" ? "Salir sin guardar" : "Leave without saving",

      createdOk:
        locale === "es"
          ? "Organización creada correctamente."
          : "Organization created successfully.",
      updatedOk:
        locale === "es"
          ? "Organización actualizada correctamente."
          : "Organization updated successfully.",

      genericError: locale === "es" ? "Error al guardar." : "Error saving.",
      invalidSavedOrganization:
        locale === "es"
          ? "El backend no devolvió una organización válida para actualizar la grilla."
          : "The backend did not return a valid organization for grid update.",
    }),
    [locale]
  );

  const [form, setForm] = useState<OrganizationFormValues>(
    buildInitialForm(organization)
  );
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const built = buildInitialForm(organization);
    setForm(built);
    setInitialSnapshot(serializeForm(built));
    setShowUnsaved(false);
  }, [isOpen, organization]);

  if (!isOpen) return null;

  const hasChanges = serializeForm(form) !== initialSnapshot;

  const isFormValid = (): boolean => {
    if (!normalizeString(form.legalName)) return false;
    if (!normalizeString(form.taxId)) return false;
    if (!normalizeEmail(form.primaryEmail)) return false;
    if (!normalizeString(form.primaryPhone)) return false;
    return true;
  };

  const canSave = hasChanges && isFormValid() && !saving;

  const requestClose = () => {
    if (hasChanges) {
      setShowUnsaved(true);
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    if (!canSave) return;

    try {
      setSaving(true);

      const payload = {
        legalName: normalizeString(form.legalName),
        commercialName: normalizeString(form.commercialName),
        taxId: normalizeString(form.taxId),
        primaryEmail: normalizeEmail(form.primaryEmail),
        primaryPhone: normalizeString(form.primaryPhone),
        website: normalizeString(form.website),
        country: normalizeString(form.country),
        city: normalizeString(form.city),
        address: normalizeString(form.address),
        status: form.status,
        notes: normalizeString(form.notes),
      };

      const res = await fetch(
        isEditing
          ? `/api/admin/organizations/${organization?._id ?? ""}`
          : "/api/admin/organizations",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lang": locale,
          },
          body: JSON.stringify(payload),
        }
      );

      const json = (await res.json().catch(() => null)) as
        | {
            error?: string;
            message?: string;
            organization?: unknown;
            data?: unknown;
            item?: unknown;
          }
        | null;

      if (!res.ok) {
        toast.error(json?.error ?? json?.message ?? t.genericError);
        return;
      }

      const savedOrganization = normalizeSavedOrganization(json, {
        existingOrganization: organization,
        values: form,
      });

      if (!savedOrganization) {
        toast.error(t.invalidSavedOrganization);
        return;
      }

      toast.success(json?.message ?? (isEditing ? t.updatedOk : t.createdOk));
      onSaved(savedOrganization);
      setShowUnsaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <GlobalModal
        open={isOpen}
        onClose={requestClose}
        title={isEditing ? t.editOrganization : t.newOrganization}
        size="lg"
        showCloseButton={false}
        footer={
          <div className="flex justify-end gap-3">
            <GlobalButton
              variant="secondary"
              size="sm"
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={requestClose}
            >
              {t.cancel}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              size="sm"
              className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
              disabled={!canSave}
              onClick={() => void handleSave()}
            >
              {saving ? t.saving : t.save}
            </GlobalButton>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label
              htmlFor="organization-legal-name"
              className="text-xs font-medium text-text-secondary"
            >
              {t.legalName}
            </label>
            <input
              id="organization-legal-name"
              name="organization-legal-name"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.legalName}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  legalName: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="col-span-2">
            <label
              htmlFor="organization-commercial-name"
              className="text-xs font-medium text-text-secondary"
            >
              {t.commercialName}
            </label>
            <input
              id="organization-commercial-name"
              name="organization-commercial-name"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.commercialName}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  commercialName: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label
              htmlFor="organization-tax-id"
              className="text-xs font-medium text-text-secondary"
            >
              {t.taxId}
            </label>
            <input
              id="organization-tax-id"
              name="organization-tax-id"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.taxId}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  taxId: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3 py-2">
            <input
              id="organization-active"
              name="organization-active"
              type="checkbox"
              checked={form.status === "active"}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  status: e.target.checked ? "active" : "inactive",
                }))
              }
              className="h-4 w-4"
            />
            <label
              htmlFor="organization-active"
              className="text-sm text-text-primary"
            >
              {t.active}
            </label>
          </div>

          <div>
            <label
              htmlFor="organization-primary-email"
              className="text-xs font-medium text-text-secondary"
            >
              {t.primaryEmail}
            </label>
            <input
              id="organization-primary-email"
              name="organization-primary-email"
              type="email"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.primaryEmail}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  primaryEmail: e.target.value,
                }))
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="organization-primary-phone"
              className="text-xs font-medium text-text-secondary"
            >
              {t.primaryPhone}
            </label>
            <input
              id="organization-primary-phone"
              name="organization-primary-phone"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.primaryPhone}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  primaryPhone: e.target.value,
                }))
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="organization-website"
              className="text-xs font-medium text-text-secondary"
            >
              {t.website}
            </label>
            <input
              id="organization-website"
              name="organization-website"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.website}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  website: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label
              htmlFor="organization-country"
              className="text-xs font-medium text-text-secondary"
            >
              {t.country}
            </label>
            <input
              id="organization-country"
              name="organization-country"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.country}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  country: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label
              htmlFor="organization-city"
              className="text-xs font-medium text-text-secondary"
            >
              {t.city}
            </label>
            <input
              id="organization-city"
              name="organization-city"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.city}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  city: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label
              htmlFor="organization-address"
              className="text-xs font-medium text-text-secondary"
            >
              {t.address}
            </label>
            <input
              id="organization-address"
              name="organization-address"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.address}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  address: e.target.value,
                }))
              }
            />
          </div>

          <div className="col-span-2">
            <label
              htmlFor="organization-notes"
              className="text-xs font-medium text-text-secondary"
            >
              {t.notes}
            </label>
            <textarea
              id="organization-notes"
              name="organization-notes"
              rows={4}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.notes}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  notes: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </GlobalModal>

      <GlobalUnsavedChangesConfirm
        open={showUnsaved}
        title={t.unsavedTitle}
        message={t.unsavedMessage}
        cancelLabel={t.unsavedCancel}
        confirmLabel={t.unsavedConfirm}
        onCancel={() => setShowUnsaved(false)}
        onConfirm={() => {
          setShowUnsaved(false);
          onClose();
        }}
      />
    </>
  );
}