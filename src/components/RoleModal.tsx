"use client";

/**
 * =============================================================================
 * 📌 Component: RoleModal
 * Path: src/components/RoleModal.tsx
 * =============================================================================
 *
 * ES:
 * Modal administrativo para crear y editar roles del sistema.
 *
 * Responsabilidades:
 * - Renderizar formulario de rol con:
 *   - código
 *   - nombre en español
 *   - nombre en inglés
 *   - permisos agrupados por módulo
 * - Normalizar el shape recibido antes de usarlo en UI.
 * - Validar campos mínimos antes de persistir.
 * - Detectar cambios reales para habilitar/deshabilitar Guardar.
 * - Proteger la salida cuando existan cambios sin guardar.
 * - Persistir usando upsert local desde el padre.
 *
 * Reglas:
 * - Usa `GlobalModal` como base común del sistema.
 * - No usa `any`.
 * - El sistema trabaja con permission codes (`string`), no con ids.
 * - El wildcard `"*"` representa superadmin.
 * - Si el rol es superadmin:
 *   - todos los permisos se muestran activos
 *   - los checks quedan deshabilitados
 *   - el payload persistido siempre es `["*"]`
 * - La X se oculta para mantener consistencia con otros modales de edición.
 *
 * EN:
 * Administrative modal for creating and editing system roles.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

/* =============================================================================
 * Types
 * ============================================================================= */

type Locale = "es" | "en";

export interface PermissionGrouped {
  module: string;
  permissions: {
    code: string;
    name_es: string;
    name_en: string;
  }[];
}

export interface RoleSavedShape {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
  permissions: string[];
}

export interface RoleModalShape {
  id?: string;
  code: string;
  name_es: string;
  name_en: string;
  permissions: unknown;
}

interface RoleFormValues {
  code: string;
  name_es: string;
  name_en: string;
  permissions: string[];
}

interface RoleModalProps {
  role?: RoleModalShape | null;
  permissions: PermissionGrouped[];
  onClose: () => void;
  onSaved: (savedRole: RoleSavedShape) => void | Promise<void>;
}

/* =============================================================================
 * Helpers
 * ============================================================================= */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function normalizePermissionCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const out: string[] = [];

  for (const it of raw) {
    const s = asString(it);
    if (s) {
      const code = s.trim();
      if (code) out.push(code);
      continue;
    }

    if (isRecord(it)) {
      const code = asString(it.code)?.trim() ?? "";
      if (code) out.push(code);
    }
  }

  return Array.from(new Set(out));
}

function normalizeIncomingRole(role?: RoleModalShape | null): RoleModalShape {
  return {
    id: role?.id,
    code: typeof role?.code === "string" ? role.code : "",
    name_es: typeof role?.name_es === "string" ? role.name_es : "",
    name_en: typeof role?.name_en === "string" ? role.name_en : "",
    permissions: Array.isArray(role?.permissions) ? role.permissions : [],
  };
}

function buildInitialForm(role?: RoleModalShape | null): RoleFormValues {
  const safeRole = normalizeIncomingRole(role);

  return {
    code: safeRole.code,
    name_es: safeRole.name_es,
    name_en: safeRole.name_en,
    permissions: normalizePermissionCodes(safeRole.permissions),
  };
}

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function areFormsEqual(a: RoleFormValues, b: RoleFormValues): boolean {
  return (
    a.code === b.code &&
    a.name_es === b.name_es &&
    a.name_en === b.name_en &&
    JSON.stringify(sortStrings(a.permissions)) ===
      JSON.stringify(sortStrings(b.permissions))
  );
}

function normalizeSavedRole(
  raw: unknown,
  fallback: {
    id?: string;
    code: string;
    name_es: string;
    name_en: string;
    permissions: string[];
  }
): RoleSavedShape | null {
  if (isRecord(raw)) {
    const source = isRecord(raw.item)
      ? raw.item
      : isRecord(raw.role)
        ? raw.role
        : isRecord(raw.data)
          ? raw.data
          : raw;

    const id = asString(source.id) ?? asString(source._id) ?? fallback.id ?? "";
    const code = asString(source.code) ?? fallback.code;
    const name_es = asString(source.name_es) ?? fallback.name_es;
    const name_en = asString(source.name_en) ?? fallback.name_en;

    const permissionsFromResponse = normalizePermissionCodes(source.permissions);
    const permissions =
      permissionsFromResponse.length > 0
        ? permissionsFromResponse
        : fallback.permissions;

    if (id && code) {
      return {
        id,
        code,
        name_es,
        name_en,
        permissions,
      };
    }
  }

  if (fallback.id && fallback.code) {
    return {
      id: fallback.id,
      code: fallback.code,
      name_es: fallback.name_es,
      name_en: fallback.name_en,
      permissions: fallback.permissions,
    };
  }

  return null;
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function RoleModal({
  role,
  permissions,
  onClose,
  onSaved,
}: RoleModalProps) {
  const toast = useToast();
  const { locale } = useTranslation();
  const lang: Locale = locale === "es" ? "es" : "en";

  const safeRole = useMemo(() => normalizeIncomingRole(role), [role]);

  const t = useMemo(
    () => ({
      titleCreate: lang === "es" ? "Crear rol" : "Create role",
      titleEdit: lang === "es" ? "Editar rol" : "Edit role",

      code: lang === "es" ? "Código" : "Code",
      nameEs: lang === "es" ? "Nombre (ES)" : "Name (ES)",
      nameEn: lang === "es" ? "Nombre (EN)" : "Name (EN)",
      permissions: lang === "es" ? "Permisos" : "Permissions",

      placeholderCode:
        lang === "es" ? "Ej: admin, ventas..." : "Ex: admin, sales...",
      placeholderEs:
        lang === "es" ? "Nombre en español..." : "Spanish name...",
      placeholderEn:
        lang === "es" ? "Nombre en inglés..." : "English name...",

      save: lang === "es" ? "Guardar" : "Save",
      saving: lang === "es" ? "Guardando..." : "Saving...",
      cancel: lang === "es" ? "Cancelar" : "Cancel",

      codeRequired:
        lang === "es" ? "El código es obligatorio." : "Code is required.",
      esRequired:
        lang === "es"
          ? "El nombre en español es obligatorio."
          : "Spanish name is required.",
      enRequired:
        lang === "es"
          ? "El nombre en inglés es obligatorio."
          : "English name is required.",

      saveError:
        lang === "es" ? "Error al guardar el rol." : "Error saving role.",
      createSuccess:
        lang === "es" ? "Rol creado correctamente." : "Role created.",
      updateSuccess:
        lang === "es" ? "Rol actualizado correctamente." : "Role updated.",

      unsavedTitle: lang === "es" ? "Cambios sin guardar" : "Unsaved changes",
      unsavedMessage:
        lang === "es"
          ? "Tienes cambios sin guardar. ¿Salir sin guardar?"
          : "You have unsaved changes. Leave without saving?",
      unsavedCancel: lang === "es" ? "Seguir editando" : "Keep editing",
      unsavedConfirm:
        lang === "es" ? "Salir sin guardar" : "Leave without saving",
    }),
    [lang]
  );

  const [form, setForm] = useState<RoleFormValues>(() => buildInitialForm(role));
  const [initialForm, setInitialForm] = useState<RoleFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);

  const isSuperadminRole = useMemo(() => {
    const codes = normalizePermissionCodes(safeRole.permissions);
    return codes.includes("*");
  }, [safeRole.permissions]);

  useEffect(() => {
    if (isSuperadminRole) {
      const allCodes = permissions.flatMap((m) =>
        m.permissions.map((p) => p.code)
      );

      const expandedForm: RoleFormValues = {
        code: safeRole.code,
        name_es: safeRole.name_es,
        name_en: safeRole.name_en,
        permissions: Array.from(new Set(allCodes)),
      };

      setForm(expandedForm);
      setInitialForm(expandedForm);
      setShowUnsaved(false);
      return;
    }

    const built = buildInitialForm(safeRole);
    setForm(built);
    setInitialForm(built);
    setShowUnsaved(false);
  }, [safeRole, permissions, isSuperadminRole]);

  const hasChanges = initialForm !== null && !areFormsEqual(initialForm, form);

  const isValid = (): boolean => {
    if (!form.code.trim()) return false;
    if (!form.name_es.trim()) return false;
    if (!form.name_en.trim()) return false;
    return true;
  };

  const canSave = hasChanges && isValid() && !saving;

  const requestClose = () => {
    if (saving) return;

    if (hasChanges) {
      setShowUnsaved(true);
      return;
    }

    onClose();
  };

  const togglePerm = (code: string) => {
    if (isSuperadminRole) return;

    setForm((prev) => {
      const exists = prev.permissions.includes(code);

      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((x) => x !== code)
          : [...prev.permissions, code],
      };
    });
  };

  const toggleModule = (group: PermissionGrouped) => {
    if (isSuperadminRole) return;

    const codes = group.permissions.map((p) => p.code);

    setForm((prev) => {
      const allSelected = codes.every((c) => prev.permissions.includes(c));

      if (allSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => !codes.includes(p)),
        };
      }

      return {
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...codes])),
      };
    });
  };

  const handleSave = async () => {
    if (!isValid()) {
      if (!form.code.trim()) toast.error(t.codeRequired);
      else if (!form.name_es.trim()) toast.error(t.esRequired);
      else if (!form.name_en.trim()) toast.error(t.enRequired);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/roles", {
        method: safeRole.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "accept-language": lang,
        },
        body: JSON.stringify({
          id: safeRole.id,
          code: form.code.trim(),
          name_es: form.name_es.trim(),
          name_en: form.name_en.trim(),
          permissions: isSuperadminRole ? ["*"] : form.permissions,
        }),
      });

      const json: unknown = await res.json().catch(() => null);
      const errMsg =
        isRecord(json) && typeof json.error === "string" ? json.error : null;

      if (!res.ok) {
        toast.error(errMsg || t.saveError);
        return;
      }

      const savedRole = normalizeSavedRole(json, {
        id: safeRole.id,
        code: form.code.trim(),
        name_es: form.name_es.trim(),
        name_en: form.name_en.trim(),
        permissions: isSuperadminRole ? ["*"] : form.permissions,
      });

      if (!savedRole) {
        toast.error(t.saveError);
        return;
      }

      await onSaved(savedRole);
      toast.success(safeRole.id ? t.updateSuccess : t.createSuccess);
      setShowUnsaved(false);
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <GlobalModal
        open={true}
        onClose={requestClose}
        title={safeRole.id ? t.titleEdit : t.titleCreate}
        widthClass="max-w-5xl"
        showCloseButton={false}
        footer={
          <div className="flex justify-end gap-2">
            <GlobalButton
              variant="secondary"
              size="sm"
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={requestClose}
              disabled={saving}
            >
              {t.cancel}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              size="sm"
              className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSave}
              onClick={() => void handleSave()}
            >
              {saving ? t.saving : t.save}
            </GlobalButton>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="role-code"
              className="text-xs font-medium text-text-secondary"
            >
              {t.code}
            </label>
            <input
              id="role-code"
              name="role-code"
              autoComplete="off"
              placeholder={t.placeholderCode}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.code}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  code: e.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="role-name-es"
                className="text-xs font-medium text-text-secondary"
              >
                {t.nameEs}
              </label>
              <input
                id="role-name-es"
                name="role-name-es"
                autoComplete="off"
                placeholder={t.placeholderEs}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                value={form.name_es}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name_es: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label
                htmlFor="role-name-en"
                className="text-xs font-medium text-text-secondary"
              >
                {t.nameEn}
              </label>
              <input
                id="role-name-en"
                name="role-name-en"
                autoComplete="off"
                placeholder={t.placeholderEn}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                value={form.name_en}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name_en: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-text-secondary">
              {t.permissions}
            </div>

            <div className="max-h-[420px] overflow-auto rounded-xl border border-border bg-surface-soft p-4">
              {permissions.map((group) => {
                const moduleCodes = group.permissions.map((p) => p.code);

                const allSelected = isSuperadminRole
                  ? true
                  : moduleCodes.length > 0 &&
                    moduleCodes.every((c) => form.permissions.includes(c));

                return (
                  <div
                    key={group.module}
                    className="mb-4 rounded-lg border border-border bg-surface p-3 last:mb-0"
                  >
                    <label
                      htmlFor={`module-${group.module}`}
                      className="mb-2 flex cursor-pointer items-center gap-2 text-brand-primaryStrong"
                    >
                      <input
                        id={`module-${group.module}`}
                        name={`module-${group.module}`}
                        type="checkbox"
                        checked={allSelected}
                        disabled={isSuperadminRole}
                        onChange={() => toggleModule(group)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-semibold uppercase tracking-wide">
                        {group.module}
                      </span>
                    </label>

                    <div className="ml-6 space-y-2">
                      {group.permissions.map((perm) => {
                        const checked =
                          isSuperadminRole ||
                          form.permissions.includes(perm.code);

                        return (
                          <label
                            key={perm.code}
                            htmlFor={`perm-${perm.code}`}
                            className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary"
                          >
                            <input
                              id={`perm-${perm.code}`}
                              name={`perm-${perm.code}`}
                              type="checkbox"
                              checked={checked}
                              disabled={isSuperadminRole}
                              onChange={() => togglePerm(perm.code)}
                              className="h-4 w-4"
                            />
                            <span>
                              {lang === "es" ? perm.name_es : perm.name_en}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
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