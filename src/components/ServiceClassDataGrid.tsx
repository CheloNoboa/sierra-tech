"use client";

/**
 * =============================================================================
 * 📄 Component: ServiceClassDataGrid
 * Path: src/components/ServiceClassDataGrid.tsx
 * =============================================================================
 *
 * ES:
 * - Grilla administrativa para gestionar clases de servicio.
 * - Mantiene el patrón visual y estructural del admin:
 *   - GlobalDataGridShell
 *   - GlobalButton
 *   - GlobalConfirm
 *   - Modal dedicado de create / edit
 *
 * Responsabilidades:
 * - Obtener datos desde /api/admin/service-classes
 * - Leer configuración de registros por página desde /api/admin/settings
 * - Normalizar respuestas JSON defensivamente
 * - Filtrar por key y etiqueta
 * - Crear / editar mediante ServiceClassModal
 * - Eliminar con confirmación
 * - Evitar parpadeo innecesario del grid al guardar/eliminar
 * - Mantener paginación estable sin recargar toda la grilla
 *
 * Regla UX clave:
 * - El loading del grid se usa solo en:
 *   1) carga inicial
 *   2) refresh manual
 * - Guardar / eliminar actualizan estado local sin recargar toda la grilla
 * - La carga inicial usa el patrón estable:
 *     useEffect(() => { void loadInitial(); }, [])
 *
 * EN:
 * - Administrative grid for managing service classes.
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  Search,
  ListOrdered,
} from "lucide-react";

import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import ServiceClassModal, {
  type ServiceClassModalShape,
} from "@/components/ServiceClassModal";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";

/* =============================================================================
 * Types
 * ============================================================================= */

type Locale = "es" | "en";

interface LocalizedText {
  es: string;
  en: string;
}

interface ServiceClassDTO {
  _id: string;
  key: string;
  label: LocalizedText;
  description: LocalizedText;
  enabled: boolean;
  order: number;
}

interface ServiceClassItemResponse {
  ok?: boolean;
  message?: string;
  item?: ServiceClassDTO;
  code?: string;
}

interface DeleteResponse {
  ok?: boolean;
  message?: string;
  deletedId?: string;
}

interface SystemSettingDTO {
  key: string;
  value: string | number | boolean;
}

/* =============================================================================
 * Helpers
 * ============================================================================= */

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function safeStr(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function normalizeArray<T>(raw: unknown, keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];

  if (isObj(raw)) {
    if (raw.ok === false) return [];

    for (const k of keys) {
      const v = raw[k];
      if (Array.isArray(v)) return v as T[];
    }
  }

  return [];
}

async function safeJson(res: Response): Promise<unknown> {
  return (await res.json().catch(() => null)) as unknown;
}

function sortClasses(items: ServiceClassDTO[]): ServiceClassDTO[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.key.localeCompare(b.key);
  });
}

function toModalShape(item: ServiceClassDTO | null): ServiceClassModalShape {
  if (!item) {
    return {
      key: "",
      label: { es: "", en: "" },
      description: { es: "", en: "" },
      enabled: true,
      order: 0,
    };
  }

  return {
    id: item._id,
    key: item.key,
    label: item.label,
    description: item.description,
    enabled: item.enabled,
    order: item.order,
  };
}

function upsertServiceClass(
  prev: ServiceClassDTO[],
  saved: ServiceClassDTO
): ServiceClassDTO[] {
  const exists = prev.some((item) => item._id === saved._id);

  if (!exists) {
    return sortClasses([saved, ...prev]);
  }

  return sortClasses(
    prev.map((item) => (item._id === saved._id ? saved : item))
  );
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function ServiceClassDataGrid() {
  const { locale } = useTranslation();
  const toast = useToast();
  const lang: Locale = locale === "es" ? "es" : "en";

  const t = useMemo(
    () => ({
      title: lang === "es" ? "Clases de servicio" : "Service classes",
      subtitle:
        lang === "es"
          ? "Administra el catálogo utilizado por formularios y clasificación comercial."
          : "Manage the catalog used by forms and commercial classification.",

      newItem: lang === "es" ? "Nueva clase" : "New class",
      refresh: lang === "es" ? "Refrescar" : "Refresh",

      key: "Key",
      label: lang === "es" ? "Etiqueta" : "Label",
      order: lang === "es" ? "Orden" : "Order",
      status: lang === "es" ? "Estado" : "Status",
      actions: lang === "es" ? "Acciones" : "Actions",

      active: lang === "es" ? "Activo" : "Active",
      inactive: lang === "es" ? "Inactivo" : "Inactive",

      searchKeyPlaceholder:
        lang === "es" ? "Buscar por key..." : "Search by key...",
      searchLabelPlaceholder:
        lang === "es" ? "Buscar por etiqueta..." : "Search by label...",

      loading:
        lang === "es"
          ? "Cargando clases de servicio..."
          : "Loading service classes...",
      noResults: lang === "es" ? "Sin resultados." : "No results.",

      resultsShort: (n: number) =>
        n === 0
          ? lang === "es"
            ? "Sin resultados."
            : "No results."
          : lang === "es"
            ? `Resultados: ${n}`
            : `Results: ${n}`,

      resultsLabel: (from: number, to: number, total: number) =>
        total === 0
          ? lang === "es"
            ? "Sin resultados."
            : "No results."
          : lang === "es"
            ? `Mostrando ${from}–${to} de ${total}`
            : `Showing ${from}–${to} of ${total}`,

      pageLabel: (page: number, total: number) =>
        lang === "es" ? `Página ${page} de ${total}` : `Page ${page} of ${total}`,

      loadError:
        lang === "es"
          ? "Error al cargar clases de servicio."
          : "Error loading service classes.",
      saveError:
        lang === "es"
          ? "Error guardando información."
          : "Error saving data.",
      deleteError:
        lang === "es"
          ? "Error eliminando registro."
          : "Error deleting record.",
      duplicateError:
        lang === "es"
          ? "La key ya existe."
          : "The key already exists.",

      createSuccess:
        lang === "es"
          ? "Clase creada correctamente."
          : "Service class created successfully.",
      updateSuccess:
        lang === "es"
          ? "Clase actualizada correctamente."
          : "Service class updated successfully.",
      deleteSuccess:
        lang === "es"
          ? "Clase eliminada correctamente."
          : "Service class deleted successfully.",

      confirmDeleteTitle:
        lang === "es" ? "Confirmar eliminación" : "Confirm delete",
      confirmDeleteMessage:
        lang === "es"
          ? "¿Eliminar esta clase de servicio? Esta acción no se puede deshacer."
          : "Delete this service class? This action cannot be undone.",

      cancel: lang === "es" ? "Cancelar" : "Cancel",
      delete: lang === "es" ? "Eliminar" : "Delete",

      tooltipEdit: lang === "es" ? "Editar" : "Edit",
      tooltipDelete: lang === "es" ? "Eliminar" : "Delete",

      settingsKey: "recordsPerPageServiceClasses",
    }),
    [lang]
  );

  /**
   * Refs para usar el texto/toast más reciente sin volver a disparar
   * el efecto de carga inicial.
   */
  const toastRef = useRef(toast);
  const textRef = useRef(t);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    textRef.current = t;
  }, [t]);

  const [items, setItems] = useState<ServiceClassDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchKey, setSearchKey] = useState("");
  const [searchLabel, setSearchLabel] = useState("");

  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceClassDTO | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ServiceClassDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ----------------------------------------------------------------------- */
  /* Load                                                                    */
  /* ----------------------------------------------------------------------- */

  const loadGrid = useCallback(
    async (showGridLoading: boolean): Promise<void> => {
      if (showGridLoading) {
        setLoading(true);
      }

      try {
        const [classesRes, settingsRes] = await Promise.all([
          fetch("/api/admin/service-classes", {
            method: "GET",
            cache: "no-store",
          }),
          fetch(
            `/api/admin/settings?keys=${encodeURIComponent(
              textRef.current.settingsKey
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          ),
        ]);

        const [classesRaw, settingsRaw] = await Promise.all([
          safeJson(classesRes),
          safeJson(settingsRes),
        ]);

        if (!classesRes.ok) {
          throw new Error(textRef.current.loadError);
        }

        const normalized = normalizeArray<ServiceClassDTO>(classesRaw, [
          "items",
          "data",
        ]);
        setItems(sortClasses(normalized));

        if (settingsRes.ok) {
          const settingsData = normalizeArray<SystemSettingDTO>(settingsRaw, [
            "data",
            "settings",
          ]);

          const perPageCfg = settingsData.find(
            (s) => s.key === textRef.current.settingsKey
          );

          if (perPageCfg) {
            const parsed = Number(perPageCfg.value);
            if (!Number.isNaN(parsed) && parsed > 0) {
              setRecordsPerPage(parsed);
            }
          }
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : textRef.current.loadError;
        console.error("[ServiceClassDataGrid] loadGrid failed:", msg);
        toastRef.current.error(msg);
        setItems([]);
      } finally {
        if (showGridLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  /**
   * Carga inicial estable:
   * no depende de toast/t/lang para evitar re-ejecuciones por cambios del provider.
   */
  useEffect(() => {
    void loadGrid(true);
  }, [loadGrid]);

  /* ----------------------------------------------------------------------- */
  /* Filtering + pagination                                                  */
  /* ----------------------------------------------------------------------- */

  useEffect(() => {
    setPage(1);
  }, [searchKey, searchLabel]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchKey =
        !searchKey || item.key.toLowerCase().includes(searchKey.toLowerCase());

      const labelEs = safeStr(item.label?.es).toLowerCase();
      const labelEn = safeStr(item.label?.en).toLowerCase();

      const matchLabel =
        !searchLabel ||
        labelEs.includes(searchLabel.toLowerCase()) ||
        labelEn.includes(searchLabel.toLowerCase());

      return matchKey && matchLabel;
    });
  }, [items, searchKey, searchLabel]);

  const total = filtered.length;
  const totalPages = total > 0 ? Math.ceil(total / recordsPerPage) : 1;
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    return filtered.slice(
      (currentPage - 1) * recordsPerPage,
      currentPage * recordsPerPage
    );
  }, [currentPage, filtered, recordsPerPage]);

  const from = total === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const to = Math.min(total, currentPage * recordsPerPage);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* ----------------------------------------------------------------------- */
  /* Modal actions                                                           */
  /* ----------------------------------------------------------------------- */

  const openCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEdit = (item: ServiceClassDTO) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  /* ----------------------------------------------------------------------- */
  /* Save without grid reload                                                */
  /* ----------------------------------------------------------------------- */

  const handleSave = async (payload: ServiceClassModalShape): Promise<void> => {
    setSaving(true);

    try {
      const body = {
        key: payload.key,
        label: payload.label,
        description: payload.description,
        enabled: payload.enabled,
        order: payload.order,
      };

      const url = payload.id
        ? `/api/admin/service-classes?id=${payload.id}`
        : "/api/admin/service-classes";

      const res = await fetch(url, {
        method: payload.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const raw: ServiceClassItemResponse | unknown = await res
        .json()
        .catch(() => null);

      if (!res.ok) {
        const code = isObj(raw) && "code" in raw ? safeStr(raw.code) : "";

        if (code === "DUPLICATE_KEY") {
          toastRef.current.error(textRef.current.duplicateError);
        } else {
          toastRef.current.error(textRef.current.saveError);
        }
        return;
      }

      const savedItem =
        isObj(raw) && "item" in raw
          ? (raw.item as ServiceClassDTO | undefined)
          : undefined;

      if (!savedItem) {
        toastRef.current.error(textRef.current.saveError);
        return;
      }

      setItems((prev) => upsertServiceClass(prev, savedItem));

      setModalOpen(false);
      setEditingItem(null);

      toastRef.current.success(
        payload.id
          ? textRef.current.updateSuccess
          : textRef.current.createSuccess
      );
    } catch (e) {
      console.error("[ServiceClassDataGrid] handleSave failed:", e);
      toastRef.current.error(textRef.current.saveError);
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------------------- */
  /* Delete without grid reload                                              */
  /* ----------------------------------------------------------------------- */

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      const res = await fetch(
        `/api/admin/service-classes?id=${deleteTarget._id}`,
        {
          method: "DELETE",
        }
      );

      const raw: DeleteResponse | unknown = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("[ServiceClassDataGrid] delete failed:", raw);
        toastRef.current.error(textRef.current.deleteError);
        return;
      }

      const deletedId =
        isObj(raw) && "deletedId" in raw ? safeStr(raw.deletedId) : "";

      if (!deletedId) {
        toastRef.current.error(textRef.current.deleteError);
        return;
      }

      setItems((prev) => prev.filter((item) => item._id !== deletedId));

      if (editingItem?._id === deletedId) {
        setEditingItem(null);
        setModalOpen(false);
      }

      setDeleteTarget(null);
      toastRef.current.success(textRef.current.deleteSuccess);
    } catch (e) {
      console.error("[ServiceClassDataGrid] confirmDelete failed:", e);
      toastRef.current.error(textRef.current.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <GlobalDataGridShell
        title={t.title}
        subtitle={t.subtitle}
        icon={<ListOrdered className="h-7 w-7 text-brand-primaryStrong" />}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <GlobalButton
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              loading={loading}
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={() => {
                setSearchKey("");
                setSearchLabel("");
                setPage(1);
                void loadGrid(true);
              }}
            >
              {t.refresh}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
              onClick={openCreate}
            >
              {t.newItem}
            </GlobalButton>
          </div>
        }
        filters={
          <div className="flex flex-col gap-3">
            <div className="grid max-w-2xl gap-2 md:grid-cols-2">
              <div className="flex flex-col">
                <label
                  htmlFor="service-classes-filter-key"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.key}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="service-classes-filter-key"
                    name="service-classes-filter-key"
                    type="text"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    placeholder={t.searchKeyPlaceholder}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="service-classes-filter-label"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.label}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="service-classes-filter-label"
                    name="service-classes-filter-label"
                    type="text"
                    value={searchLabel}
                    onChange={(e) => setSearchLabel(e.target.value)}
                    placeholder={t.searchLabelPlaceholder}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <span className="text-[11px] text-text-muted">
              {t.resultsShort(total)}
            </span>
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between text-xs text-text-secondary">
            <span>{t.resultsLabel(from, to, total)}</span>

            <div className="flex items-center gap-2">
              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === 1}
                onClick={() => setPage(1)}
              >
                «
              </GlobalButton>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </GlobalButton>

              <span>{t.pageLabel(currentPage, totalPages)}</span>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === totalPages || total === 0}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </GlobalButton>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === totalPages || total === 0}
                onClick={() => setPage(totalPages)}
              >
                »
              </GlobalButton>
            </div>
          </div>
        }
      >
        <table className="w-full border-collapse text-left text-sm text-text-secondary">
          <thead>
            <tr className="border-b border-border bg-surface-soft text-text-primary">
              <th className="px-3 py-3">{t.key}</th>
              <th className="px-3 py-3">{t.label}</th>
              <th className="px-3 py-3">{t.order}</th>
              <th className="px-3 py-3">{t.status}</th>
              <th className="px-3 py-3 text-right">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-5 text-center text-text-secondary"
                >
                  {t.loading}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-5 text-center text-text-muted"
                >
                  {t.noResults}
                </td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-border bg-surface transition hover:bg-surface-soft"
                >
                  <td className="px-3 py-3 font-semibold text-brand-primaryStrong">
                    {item.key}
                  </td>

                  <td className="px-3 py-3 text-text-primary">
                    {lang === "es" ? item.label.es : item.label.en}
                  </td>

                  <td className="px-3 py-3">{item.order}</td>

                  <td className="px-3 py-3">
                    {item.enabled ? t.active : t.inactive}
                  </td>

                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border bg-surface p-1.5 text-text-primary transition hover:bg-surface-soft"
                        onClick={() => openEdit(item)}
                        title={t.tooltipEdit}
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        type="button"
                        className="rounded-md border border-status-error bg-surface p-1.5 text-status-error transition hover:bg-surface-soft"
                        onClick={() => setDeleteTarget(item)}
                        title={t.tooltipDelete}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlobalDataGridShell>

      <ServiceClassModal
        open={modalOpen}
        initialData={toModalShape(editingItem)}
        loading={saving}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditingItem(null);
          }
        }}
        onSave={handleSave}
      />

      <GlobalConfirm
        open={!!deleteTarget}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMessage}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}