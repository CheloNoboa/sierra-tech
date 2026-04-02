"use client";

/**
 * =============================================================================
 * 📄 Component: ServiceClassModal
 * Path: src/components/ServiceClassModal.tsx
 * =============================================================================
 *
 * ES:
 * Modal administrativo para crear y editar clases de servicio.
 *
 * Responsabilidades:
 * - Presentar formulario bilingüe consistente con el panel admin.
 * - Validar campos mínimos antes de guardar.
 * - Mantener snapshot inicial para detectar cambios reales.
 * - Deshabilitar "Guardar" cuando no existan cambios efectivos.
 * - Proteger la salida del modal cuando existan cambios sin guardar.
 * - Usar la base modal común del sistema.
 *
 * Reglas UX:
 * - En modo edición, "Guardar" inicia deshabilitado.
 * - Solo se habilita cuando el usuario modifica datos realmente.
 * - Si el usuario intenta cerrar con cambios sin guardar,
 *   debe mostrarse confirmación para descartar cambios.
 * - En modo creación, "Guardar" solo se habilita cuando el formulario
 *   es válido y exista contenido ingresado.
 *
 * EN:
 * Administrative modal for creating and editing service classes.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";
import { useTranslation } from "@/hooks/useTranslation";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface ServiceClassModalShape {
  id?: string;
  key: string;
  label: LocalizedText;
  description: LocalizedText;
  enabled: boolean;
  order: number;
}

interface ServiceClassModalProps {
  open: boolean;
  initialData: ServiceClassModalShape;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: ServiceClassModalShape) => Promise<void> | void;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeShape(value: ServiceClassModalShape): ServiceClassModalShape {
  return {
    id: value.id,
    key: value.key ?? "",
    label: {
      es: value.label?.es ?? "",
      en: value.label?.en ?? "",
    },
    description: {
      es: value.description?.es ?? "",
      en: value.description?.en ?? "",
    },
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    order: Number.isFinite(value.order) ? value.order : 0,
  };
}

function areEqualShape(
  a: ServiceClassModalShape,
  b: ServiceClassModalShape
): boolean {
  return (
    (a.id ?? "") === (b.id ?? "") &&
    a.key === b.key &&
    a.label.es === b.label.es &&
    a.label.en === b.label.en &&
    a.description.es === b.description.es &&
    a.description.en === b.description.en &&
    a.enabled === b.enabled &&
    a.order === b.order
  );
}

function isFormValid(value: ServiceClassModalShape): boolean {
  return (
    value.key.trim().length > 0 &&
    value.label.es.trim().length > 0 &&
    value.label.en.trim().length > 0
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ServiceClassModal({
  open,
  initialData,
  loading = false,
  onClose,
  onSave,
}: ServiceClassModalProps) {
  const { locale } = useTranslation();
  const lang: Locale = locale === "en" ? "en" : "es";

  const [initialSnapshot, setInitialSnapshot] = useState<ServiceClassModalShape>(
    normalizeShape(initialData)
  );
  const [form, setForm] = useState<ServiceClassModalShape>(
    normalizeShape(initialData)
  );

  const [errors, setErrors] = useState<{
    key?: string;
    labelEs?: string;
    labelEn?: string;
  }>({});

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;

    const normalized = normalizeShape(initialData);
    setInitialSnapshot(normalized);
    setForm(normalized);
    setErrors({});
    setShowDiscardConfirm(false);
  }, [initialData, open]);

  const t = useMemo(
    () => ({
      createTitle:
        lang === "es" ? "Nueva clase de servicio" : "New service class",
      editTitle:
        lang === "es" ? "Editar clase de servicio" : "Edit service class",

      key: "Key",
      labelEs: "Etiqueta (ES)",
      labelEn: "Label (EN)",
      descriptionEs: "Descripción (ES)",
      descriptionEn: "Description (EN)",
      order: lang === "es" ? "Orden" : "Order",
      active: lang === "es" ? "Activo" : "Active",

      save: lang === "es" ? "Guardar" : "Save",
      cancel: lang === "es" ? "Cancelar" : "Cancel",

      validationKey:
        lang === "es" ? "La key es obligatoria." : "Key is required.",
      validationLabelEs:
        lang === "es"
          ? "La etiqueta en español es obligatoria."
          : "Spanish label is required.",
      validationLabelEn:
        lang === "es"
          ? "La etiqueta en inglés es obligatoria."
          : "English label is required.",

      discardTitle:
        lang === "es" ? "Descartar cambios" : "Discard changes",
      discardMessage:
        lang === "es"
          ? "Tienes cambios sin guardar. ¿Deseas descartarlos?"
          : "You have unsaved changes. Do you want to discard them?",
      discardConfirm:
        lang === "es" ? "Descartar cambios" : "Discard changes",
      continueEditing:
        lang === "es" ? "Seguir editando" : "Keep editing",
    }),
    [lang]
  );

  const hasUnsavedChanges = !areEqualShape(form, initialSnapshot);
  const canSave = !loading && hasUnsavedChanges && isFormValid(form);

  const requestClose = (): void => {
    if (loading) return;

    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
      return;
    }

    onClose();
  };

  if (!open) return null;

  const title = initialSnapshot.id ? t.editTitle : t.createTitle;

  const validate = (): boolean => {
    const nextErrors: {
      key?: string;
      labelEs?: string;
      labelEn?: string;
    } = {};

    if (!form.key.trim()) nextErrors.key = t.validationKey;
    if (!form.label.es.trim()) nextErrors.labelEs = t.validationLabelEs;
    if (!form.label.en.trim()) nextErrors.labelEn = t.validationLabelEn;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveClick = async (): Promise<void> => {
    if (!validate()) return;

    await onSave({
      ...form,
      key: form.key.trim(),
      label: {
        es: form.label.es.trim(),
        en: form.label.en.trim(),
      },
      description: {
        es: form.description.es.trim(),
        en: form.description.en.trim(),
      },
      order: Number.isFinite(form.order) ? form.order : 0,
    });
  };

  const confirmDiscard = (): void => {
    setShowDiscardConfirm(false);
    onClose();
  };

  return (
    <>
      <GlobalModal
        open={open}
        onClose={requestClose}
        title={title}
        size="lg"
        showCloseButton={false}
        footer={
          <div className="flex justify-end gap-2">
            <GlobalButton
              variant="secondary"
              size="sm"
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={requestClose}
              disabled={loading}
            >
              {t.cancel}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              size="sm"
              loading={loading}
              disabled={!canSave}
              className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleSaveClick()}
            >
              {t.save}
            </GlobalButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="service-class-modal-key"
              className="mb-1 block text-xs text-text-secondary"
            >
              {t.key}
            </label>
            <input
              id="service-class-modal-key"
              type="text"
              value={form.key}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, key: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              autoComplete="off"
            />
            {errors.key ? (
              <p className="mt-1 text-xs text-status-error">{errors.key}</p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="service-class-modal-label-es"
                className="mb-1 block text-xs text-text-secondary"
              >
                {t.labelEs}
              </label>
              <input
                id="service-class-modal-label-es"
                type="text"
                value={form.label.es}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    label: { ...prev.label, es: e.target.value },
                  }))
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                autoComplete="off"
              />
              {errors.labelEs ? (
                <p className="mt-1 text-xs text-status-error">
                  {errors.labelEs}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="service-class-modal-label-en"
                className="mb-1 block text-xs text-text-secondary"
              >
                {t.labelEn}
              </label>
              <input
                id="service-class-modal-label-en"
                type="text"
                value={form.label.en}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    label: { ...prev.label, en: e.target.value },
                  }))
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                autoComplete="off"
              />
              {errors.labelEn ? (
                <p className="mt-1 text-xs text-status-error">
                  {errors.labelEn}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="service-class-modal-description-es"
                className="mb-1 block text-xs text-text-secondary"
              >
                {t.descriptionEs}
              </label>
              <textarea
                id="service-class-modal-description-es"
                value={form.description.es}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: { ...prev.description, es: e.target.value },
                  }))
                }
                className="min-h-[110px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              />
            </div>

            <div>
              <label
                htmlFor="service-class-modal-description-en"
                className="mb-1 block text-xs text-text-secondary"
              >
                {t.descriptionEn}
              </label>
              <textarea
                id="service-class-modal-description-en"
                value={form.description.en}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: { ...prev.description, en: e.target.value },
                  }))
                }
                className="min-h-[110px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_220px]">
            <div>
              <label
                htmlFor="service-class-modal-order"
                className="mb-1 block text-xs text-text-secondary"
              >
                {t.order}
              </label>
              <input
                id="service-class-modal-order"
                type="number"
                value={String(form.order)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    order: Number(e.target.value) || 0,
                  }))
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                {t.active}
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
                <span>{t.active}</span>
              </label>
            </div>
          </div>
        </div>
      </GlobalModal>

      <GlobalUnsavedChangesConfirm
        open={showDiscardConfirm}
        title={t.discardTitle}
        message={t.discardMessage}
        cancelLabel={t.continueEditing}
        confirmLabel={t.discardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={confirmDiscard}
      />
    </>
  );
}