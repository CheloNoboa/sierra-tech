"use client";

/**
 * =============================================================================
 * 📌 Component: RoleModal
 * Path: src/components/RoleModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal administrativo para crear y editar roles del sistema.
 * - Permite definir:
 *   - código del rol
 *   - nombre en español
 *   - nombre en inglés
 *   - conjunto de permisos asociados
 *
 * Responsabilidades:
 * - Normalizar el shape de `role.permissions` antes de usarlo en UI.
 * - Renderizar permisos agrupados por módulo.
 * - Permitir selección individual de permisos.
 * - Permitir selección masiva por módulo.
 * - Tratar el rol superadmin como wildcard `"*"`.
 * - Validar datos mínimos antes de persistir.
 * - Enviar al API el payload final esperado para creación o actualización.
 *
 * Reglas:
 * - El sistema opera por permission codes (`string`), nunca por `_id`.
 * - El wildcard `"*"` representa superadmin.
 * - Si el rol es superadmin:
 *   - la UI muestra todos los permisos marcados
 *   - los checks quedan deshabilitados
 *   - el payload persistido siempre es `["*"]`
 * - Los roles normales persisten únicamente los permission codes seleccionados.
 *
 * EN:
 * - Administrative modal for creating and editing system roles.
 * - Normalizes incoming permissions, renders grouped permissions,
 *   supports per-module selection, validates required fields and
 *   persists the final role payload expected by the API.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

/* =============================================================================
 * Types
 * ============================================================================= */

export interface PermissionGrouped {
  module: string;
  permissions: {
    code: string;
    name_es: string;
    name_en: string;
  }[];
}

export interface RoleModalShape {
  id?: string;
  code: string;
  name_es: string;
  name_en: string;

  /**
   * ES:
   * - En runtime puede llegar como string[] o como documentos poblados.
   * - Se normaliza internamente a `string[]` antes de renderizar o guardar.
   *
   * EN:
   * - At runtime this may arrive either as string[] or populated documents.
   * - It is normalized internally to `string[]` before render or save.
   */
  permissions: unknown;
}

interface RoleFormValues {
  code: string;
  name_es: string;
  name_en: string;
  permissions: string[];
}

interface RoleModalProps {
  role: RoleModalShape;
  permissions: PermissionGrouped[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
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

function buildInitialForm(role: RoleModalShape): RoleFormValues {
  const codes = normalizePermissionCodes(role.permissions);

  return {
    code: typeof role.code === "string" ? role.code : "",
    name_es: typeof role.name_es === "string" ? role.name_es : "",
    name_en: typeof role.name_en === "string" ? role.name_en : "",
    permissions: codes,
  };
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
  const lang: "es" | "en" = locale === "es" ? "es" : "en";

  const t = useMemo(
    () => ({
      titleCreate: lang === "es" ? "Crear rol" : "Create role",
      titleEdit: lang === "es" ? "Editar rol" : "Edit role",

      code: lang === "es" ? "Código" : "Code",
      nameEs: lang === "es" ? "Nombre (ES)" : "Name (ES)",
      nameEn: lang === "es" ? "Nombre (EN)" : "Name (EN)",

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
    const codes = normalizePermissionCodes(role.permissions);
    return codes.includes("*");
  }, [role.permissions]);

  useEffect(() => {
    if (isSuperadminRole) {
      const allCodes = permissions.flatMap((m) =>
        m.permissions.map((p) => p.code)
      );

      const expandedForm: RoleFormValues = {
        code: typeof role.code === "string" ? role.code : "",
        name_es: typeof role.name_es === "string" ? role.name_es : "",
        name_en: typeof role.name_en === "string" ? role.name_en : "",
        permissions: Array.from(new Set(allCodes)),
      };

      setForm(expandedForm);
      setInitialForm(expandedForm);
      return;
    }

    const built = buildInitialForm(role);
    setForm(built);
    setInitialForm(built);
  }, [role, permissions, isSuperadminRole]);

  const hasChanges =
    initialForm !== null && JSON.stringify(initialForm) !== JSON.stringify(form);

  const requestClose = () => {
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

  const isValid = () => {
    if (!form.code.trim()) return false;
    if (!form.name_es.trim()) return false;
    if (!form.name_en.trim()) return false;
    return true;
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
        method: role.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "accept-language": lang,
        },
        body: JSON.stringify({
          id: role.id,
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

      toast.success(role.id ? t.updateSuccess : t.createSuccess);
      await onSaved();
      onClose();
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
        title={role.id ? t.titleEdit : t.titleCreate}
        size="lg"
      >
        <div className="flex flex-col gap-5">
          {/* Código */}
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
                setForm((prev) => ({ ...prev, code: e.target.value }))
              }
            />
          </div>

          {/* Nombres ES / EN */}
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
                  setForm((prev) => ({ ...prev, name_es: e.target.value }))
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
                  setForm((prev) => ({ ...prev, name_en: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Permisos */}
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
                        isSuperadminRole || form.permissions.includes(perm.code);

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

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-1">
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
              disabled={!isValid() || saving}
              onClick={handleSave}
            >
              {saving ? t.saving : t.save}
            </GlobalButton>
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