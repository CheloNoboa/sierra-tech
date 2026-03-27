"use client";

/**
 * =============================================================================
 * 📌 Component: SettingsModal
 * Path: src/components/SettingsModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal administrativo para crear y editar configuraciones del sistema.
 * - Permite definir:
 *   - key
 *   - value
 *   - type
 *   - module
 *   - description
 *
 * Responsabilidades:
 * - Cargar una referencia inicial estable al abrirse.
 * - Mantener el formulario editable sin reinicializaciones innecesarias.
 * - Detectar cambios sin guardar.
 * - Normalizar el valor según el tipo seleccionado antes de enviar.
 * - Delegar persistencia al callback `onSubmit`.
 *
 * Reglas:
 * - El modal no persiste directamente en API.
 * - Cuando `editing === true`, no permite cambiar `key` ni `type`.
 * - El estado inicial se toma solo cuando `open` cambia a abierto.
 * - El cierre se bloquea con confirmación si existen cambios sin guardar.
 *
 * EN:
 * - Administrative modal for creating and editing system settings.
 * - Keeps a stable initial snapshot, tracks unsaved changes, normalizes the
 *   typed value before submit and delegates persistence through `onSubmit`.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";
import { useTranslation } from "@/hooks/useTranslation";

export interface SettingsModalData {
  key: string;
  value: string | number | boolean;
  module?: string;
  description?: string;
}

interface Props {
  open: boolean;
  editing: boolean;
  data: SettingsModalData;
  onClose: () => void;
  onSubmit: (data: SettingsModalData) => void;
}

export default function SettingsModal({
  open,
  editing,
  data,
  onClose,
  onSubmit,
}: Props) {
  const { locale } = useTranslation();

  /* ---------------------------------------------------------------------------
   * Stable initial snapshot
   * ------------------------------------------------------------------------- */
  const initialRef = useRef<SettingsModalData | null>(null);

  const [form, setForm] = useState<SettingsModalData>({
    key: "",
    value: "",
    module: "",
    description: "",
  });

  const [type, setType] = useState<"string" | "number" | "boolean">("string");
  const [showUnsaved, setShowUnsaved] = useState(false);

  /* ---------------------------------------------------------------------------
   * Localized text
   * ------------------------------------------------------------------------- */
  const t = useMemo(
    () => ({
      title: editing
        ? locale === "es"
          ? "Editar configuración"
          : "Edit setting"
        : locale === "es"
          ? "Nueva configuración"
          : "New setting",

      save: locale === "es" ? "Guardar" : "Save",
      cancel: locale === "es" ? "Cancelar" : "Cancel",

      key: locale === "es" ? "Clave" : "Key",
      value: locale === "es" ? "Valor" : "Value",
      module: locale === "es" ? "Módulo" : "Module",
      description: locale === "es" ? "Descripción" : "Description",
      type: locale === "es" ? "Tipo" : "Type",

      booleanTrue: locale === "es" ? "Verdadero" : "True",
      booleanFalse: locale === "es" ? "Falso" : "False",

      unsavedTitle: locale === "es" ? "Cambios sin guardar" : "Unsaved changes",
      unsavedMessage:
        locale === "es"
          ? "Tienes cambios sin guardar. ¿Deseas salir sin guardar?"
          : "You have unsaved changes. Leave without saving?",
      unsavedCancel: locale === "es" ? "Seguir editando" : "Continue editing",
      unsavedConfirm:
        locale === "es" ? "Descartar cambios" : "Discard changes",
    }),
    [locale, editing]
  );

  /* ---------------------------------------------------------------------------
   * Load initial data only when modal opens
   * ------------------------------------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    initialRef.current = data;
    setForm(data);

    if (typeof data.value === "boolean") setType("boolean");
    else if (typeof data.value === "number") setType("number");
    else setType("string");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ---------------------------------------------------------------------------
   * Unsaved changes detection
   * ------------------------------------------------------------------------- */
  const hasChanges = useMemo(() => {
    if (!initialRef.current) return false;

    const initial = initialRef.current;

    return (
      form.key !== initial.key ||
      String(form.value) !== String(initial.value) ||
      (form.module ?? "") !== (initial.module ?? "") ||
      (form.description ?? "") !== (initial.description ?? "")
    );
  }, [form]);

  /* ---------------------------------------------------------------------------
   * Value normalization
   * ------------------------------------------------------------------------- */
  const normalizeValue = () => {
    if (type === "number") return Number(form.value);
    if (type === "boolean") return form.value === "true" || form.value === true;
    return String(form.value);
  };

  const isValid = () => form.key.trim() && form.value !== "";

  /* ---------------------------------------------------------------------------
   * Submit
   * ------------------------------------------------------------------------- */
  const handleSave = () => {
    if (!isValid()) return;

    onSubmit({
      ...form,
      value: normalizeValue(),
    });
  };

  /* ---------------------------------------------------------------------------
   * Close handling
   * ------------------------------------------------------------------------- */
  const requestClose = () => {
    if (hasChanges) {
      setShowUnsaved(true);
      return;
    }
    onClose();
  };

  /* ---------------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------------- */
  return (
    <>
      <GlobalModal
        open={open}
        onClose={requestClose}
        title={t.title}
        size="lg"
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
              disabled={!isValid()}
              onClick={handleSave}
            >
              {t.save}
            </GlobalButton>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Key */}
          <div>
            <label
              htmlFor="settings-key"
              className="text-xs font-medium text-text-secondary"
            >
              {t.key}
            </label>
            <input
              id="settings-key"
              disabled={editing}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-60"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="settings-type"
              className="text-xs font-medium text-text-secondary"
            >
              {t.type}
            </label>

            <select
              id="settings-type"
              disabled={editing}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-60"
              value={type}
              onChange={(e) =>
                setType(e.target.value as "string" | "number" | "boolean")
              }
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
            </select>
          </div>

          {/* Value */}
          <div className="md:col-span-2">
            <label
              htmlFor="settings-value"
              className="text-xs font-medium text-text-secondary"
            >
              {t.value}
            </label>

            {type === "boolean" ? (
              <select
                id="settings-value"
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                value={String(form.value)}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              >
                <option value="true">{t.booleanTrue}</option>
                <option value="false">{t.booleanFalse}</option>
              </select>
            ) : (
              <input
                id="settings-value"
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                value={String(form.value)}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            )}
          </div>

          {/* Module */}
          <div>
            <label
              htmlFor="settings-module"
              className="text-xs font-medium text-text-secondary"
            >
              {t.module}
            </label>
            <input
              id="settings-module"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.module ?? ""}
              onChange={(e) => setForm({ ...form, module: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="settings-description"
              className="text-xs font-medium text-text-secondary"
            >
              {t.description}
            </label>
            <input
              id="settings-description"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
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