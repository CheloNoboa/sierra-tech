"use client";

/**
 * =============================================================================
 * 📌 Component: OrganizationUserModal
 * Path: src/components/OrganizationUserModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal administrativo para crear o editar usuarios de organización.
 * - Permite capturar:
 *   - organización
 *   - nombre
 *   - apellido
 *   - email
 *   - rol
 *   - estado activo
 *   - contraseña y confirmación en creación
 *
 * Responsabilidades:
 * - Funcionar de forma consistente en creación y edición.
 * - Confirmar cierre cuando existen cambios sin guardar.
 * - Validar campos mínimos antes de persistir.
 * - Enviar payload final al endpoint administrativo del módulo.
 * - Devolver al padre el usuario persistido para upsert local sin reload.
 *
 * Reglas:
 * - En edición no se envían contraseñas vacías.
 * - El botón guardar solo se habilita si hay cambios reales.
 * - El backend debe devolver el usuario persistido para sincronización local.
 *
 * EN:
 * - Administrative modal for creating or editing organization users.
 * - Returns the persisted user to the parent for local upsert.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";

import GlobalModal from "@/components/ui/GlobalModal";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";

import type {
  OrganizationUserRole,
  OrganizationUserRow,
} from "@/types/organizationUser";

/* =============================================================================
 * Helpers
 * ============================================================================= */

interface OrganizationOptionDTO {
  _id: string;
  label: string;
}

interface OrganizationUserFormValues {
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: OrganizationUserRole;
  active: boolean;
  password: string;
  confirmPassword: string;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function buildInitialForm(
  user: OrganizationUserRow | null,
  organizations: OrganizationOptionDTO[]
): OrganizationUserFormValues {
  return {
    organizationId: user?.organizationId ?? (organizations[0]?._id ?? ""),
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "org_user",
    active: user?.status === "inactive" ? false : true,
    password: "",
    confirmPassword: "",
  };
}

function serializeForm(values: OrganizationUserFormValues): string {
  return JSON.stringify({
    organizationId: values.organizationId,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
    active: values.active,
    password: values.password,
    confirmPassword: values.confirmPassword,
  });
}

function isOrganizationUserRow(value: unknown): value is OrganizationUserRow {
  if (!isObj(value)) return false;
  if (typeof value._id !== "string") return false;
  if (typeof value.organizationId !== "string") return false;
  if (typeof value.firstName !== "string") return false;
  if (typeof value.lastName !== "string") return false;
  if (typeof value.fullName !== "string") return false;
  if (typeof value.email !== "string") return false;
  if (value.role !== "org_admin" && value.role !== "org_user") return false;
  if (value.status !== "active" && value.status !== "inactive") return false;
  if (typeof value.organizationName !== "string") return false;
  if (typeof value.createdAt !== "string") return false;
  if (typeof value.updatedAt !== "string") return false;

  if (
    value.lastLoginAt !== undefined &&
    value.lastLoginAt !== null &&
    typeof value.lastLoginAt !== "string"
  ) {
    return false;
  }

  return true;
}

function extractSavedUserCandidate(raw: unknown): unknown {
  if (!isObj(raw)) return null;

  if (isObj(raw.user)) return raw.user;
  if (isObj(raw.data)) return raw.data;
  if (isObj(raw.item)) return raw.item;

  return raw;
}

function normalizeSavedUser(
  raw: unknown,
  context: {
    existingUser: OrganizationUserRow | null;
    values: OrganizationUserFormValues;
    organizations: OrganizationOptionDTO[];
  }
): OrganizationUserRow | null {
  const candidate = extractSavedUserCandidate(raw);

  if (isOrganizationUserRow(candidate)) {
    return candidate;
  }

  if (context.existingUser) {
    const source = isObj(candidate) ? candidate : null;

    const organizationLabel =
      context.organizations.find(
        (organization) => organization._id === context.values.organizationId
      )?.label ?? context.existingUser.organizationName;

    const merged: OrganizationUserRow = {
      ...context.existingUser,
      _id: getString(source?._id) || context.existingUser._id,
      organizationId:
        getString(source?.organizationId) || context.values.organizationId,
      firstName: getString(source?.firstName) || context.values.firstName.trim(),
      lastName: getString(source?.lastName) || context.values.lastName.trim(),
      fullName:
        getString(source?.fullName) ||
        `${context.values.firstName.trim()} ${context.values.lastName.trim()}`.trim(),
      email:
        getString(source?.email) || context.values.email.trim().toLowerCase(),
      role:
        source?.role === "org_admin" || source?.role === "org_user"
          ? source.role
          : context.values.role,
      status: getBoolean(source?.status === "active", context.values.active)
        ? "active"
        : "inactive",
      lastLoginAt:
        typeof source?.lastLoginAt === "string"
          ? source.lastLoginAt
          : context.existingUser.lastLoginAt,
      createdAt:
        getString(source?.createdAt) || context.existingUser.createdAt,
      updatedAt:
        getString(source?.updatedAt) || context.existingUser.updatedAt,
      organizationName:
        getString(source?.organizationName) || organizationLabel,
    };

    return merged;
  }

  return null;
}

/* =============================================================================
 * Component
 * ============================================================================= */

interface OrganizationUserModalProps {
  isOpen: boolean;
  user: OrganizationUserRow | null;
  organizations: OrganizationOptionDTO[];
  onClose: () => void;
  onSaved: (savedUser: OrganizationUserRow) => void;
}

export default function OrganizationUserModal({
  isOpen,
  user,
  organizations,
  onClose,
  onSaved,
}: OrganizationUserModalProps) {
  const { locale } = useTranslation();
  const toast = useToast();
  const isEditing = !!user;

  const t = useMemo(
    () => ({
      newUser:
        locale === "es"
          ? "Nuevo usuario de organización"
          : "New organization user",
      editUser:
        locale === "es"
          ? "Editar usuario de organización"
          : "Edit organization user",

      organization: locale === "es" ? "Organización" : "Organization",
      firstName: locale === "es" ? "Nombre" : "First name",
      lastName: locale === "es" ? "Apellido" : "Last name",
      email: "Email",
      role: locale === "es" ? "Rol" : "Role",
      active: locale === "es" ? "Activo" : "Active",

      orgAdmin: locale === "es" ? "Admin organización" : "Organization admin",
      orgUser: locale === "es" ? "Usuario organización" : "Organization user",

      password: locale === "es" ? "Contraseña temporal" : "Temporary password",
      confirmPassword:
        locale === "es" ? "Confirmar contraseña" : "Confirm password",
      mismatch:
        locale === "es"
          ? "Las contraseñas no coinciden"
          : "Passwords do not match",

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
          ? "Usuario de organización creado correctamente."
          : "Organization user created successfully.",
      updatedOk:
        locale === "es"
          ? "Usuario de organización actualizado correctamente."
          : "Organization user updated successfully.",

      genericError: locale === "es" ? "Error al guardar." : "Error saving.",
      invalidSavedUser:
        locale === "es"
          ? "El backend no devolvió un usuario válido para actualizar la grilla."
          : "The backend did not return a valid user for grid update.",

      showPassword:
        locale === "es" ? "Mostrar contraseña" : "Show password",
      hidePassword:
        locale === "es" ? "Ocultar contraseña" : "Hide password",
      showConfirm:
        locale === "es"
          ? "Mostrar confirmación de contraseña"
          : "Show password confirmation",
      hideConfirm:
        locale === "es"
          ? "Ocultar confirmación de contraseña"
          : "Hide password confirmation",
    }),
    [locale]
  );

  const [form, setForm] = useState<OrganizationUserFormValues>(
    buildInitialForm(user, organizations)
  );
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const built = buildInitialForm(user, organizations);
    setForm(built);
    setInitialSnapshot(serializeForm(built));
    setShowPass(false);
    setShowConfirm(false);
    setShowUnsaved(false);
  }, [isOpen, user, organizations]);

  if (!isOpen) return null;

  const hasChanges = serializeForm(form) !== initialSnapshot;

  const isFormValid = (): boolean => {
    if (!form.organizationId.trim()) return false;
    if (!form.firstName.trim()) return false;
    if (!form.lastName.trim()) return false;
    if (!form.email.trim()) return false;
    if (!form.role.trim()) return false;

    if (!isEditing) {
      if (!form.password.trim() || !form.confirmPassword.trim()) return false;
      if (form.password.length < 8) return false;
      if (form.password !== form.confirmPassword) return false;
    }

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
        organizationId: form.organizationId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        status: form.active ? "active" : "inactive",
      };

      const res = await fetch(
        isEditing
          ? `/api/admin/organization-users/${user?._id ?? ""}`
          : "/api/admin/organization-users",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lang": locale,
          },
          body: JSON.stringify(
            isEditing
              ? {
                  ...payload,
                  ...(form.password.trim()
                    ? { password: form.password }
                    : {}),
                }
              : {
                  ...payload,
                  password: form.password,
                }
          ),
        }
      );

      const json = (await res.json().catch(() => null)) as
        | {
            error?: string;
            message?: string;
            user?: unknown;
            data?: unknown;
            item?: unknown;
          }
        | null;

      if (!res.ok) {
        toast.error(json?.error ?? json?.message ?? t.genericError);
        return;
      }

      const savedUser = normalizeSavedUser(json, {
        existingUser: user,
        values: form,
        organizations,
      });

      if (!savedUser) {
        toast.error(t.invalidSavedUser);
        return;
      }

      toast.success(json?.message ?? (isEditing ? t.updatedOk : t.createdOk));
      onSaved(savedUser);
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
        title={isEditing ? t.editUser : t.newUser}
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
              htmlFor="organization-user-organization"
              className="text-xs font-medium text-text-secondary"
            >
              {t.organization}
            </label>
            <select
              id="organization-user-organization"
              name="organization-user-organization"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.organizationId}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  organizationId: e.target.value,
                }))
              }
            >
              {organizations.map((organization) => (
                <option key={organization._id} value={organization._id}>
                  {organization.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="organization-user-first-name"
              className="text-xs font-medium text-text-secondary"
            >
              {t.firstName}
            </label>
            <input
              id="organization-user-first-name"
              name="organization-user-first-name"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.firstName}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  firstName: e.target.value,
                }))
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="organization-user-last-name"
              className="text-xs font-medium text-text-secondary"
            >
              {t.lastName}
            </label>
            <input
              id="organization-user-last-name"
              name="organization-user-last-name"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.lastName}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  lastName: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="col-span-2">
            <label
              htmlFor="organization-user-email"
              className="text-xs font-medium text-text-secondary"
            >
              {t.email}
            </label>
            <input
              id="organization-user-email"
              name="organization-user-email"
              type="email"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.email}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  email: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="col-span-2">
            <label
              htmlFor="organization-user-role"
              className="text-xs font-medium text-text-secondary"
            >
              {t.role}
            </label>
            <select
              id="organization-user-role"
              name="organization-user-role"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.role}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  role:
                    e.target.value === "org_admin" ? "org_admin" : "org_user",
                }))
              }
            >
              <option value="org_admin">{t.orgAdmin}</option>
              <option value="org_user">{t.orgUser}</option>
            </select>
          </div>

          <div className="col-span-2 mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3 py-2">
            <input
              id="organization-user-active"
              name="organization-user-active"
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  active: e.target.checked,
                }))
              }
              className="h-4 w-4"
            />
            <label
              htmlFor="organization-user-active"
              className="text-sm text-text-primary"
            >
              {t.active}
            </label>
          </div>

          {!isEditing && (
            <>
              <div>
                <label
                  htmlFor="organization-user-password"
                  className="text-xs font-medium text-text-secondary"
                >
                  {t.password}
                </label>

                <div className="relative mt-1">
                  <input
                    id="organization-user-password"
                    name="organization-user-password"
                    type={showPass ? "text" : "password"}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 pr-12 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    value={form.password}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        password: e.target.value,
                      }))
                    }
                    required
                  />

                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <button
                      type="button"
                      aria-label={showPass ? t.hidePassword : t.showPassword}
                      onClick={() => setShowPass((value) => !value)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="organization-user-confirm-password"
                  className="text-xs font-medium text-text-secondary"
                >
                  {t.confirmPassword}
                </label>

                <div className="relative mt-1">
                  <input
                    id="organization-user-confirm-password"
                    name="organization-user-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 pr-12 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                  />

                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <button
                      type="button"
                      aria-label={showConfirm ? t.hideConfirm : t.showConfirm}
                      onClick={() => setShowConfirm((value) => !value)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {!isEditing &&
                form.confirmPassword &&
                form.password !== form.confirmPassword ? (
                  <p className="mt-1 text-xs text-status-error">{t.mismatch}</p>
                ) : null}
              </div>
            </>
          )}
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