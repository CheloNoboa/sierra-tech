"use client";

/**
 * =============================================================================
 * 📌 Component: RoleDataGrid
 * Path: src/components/RoleDataGrid.tsx
 * =============================================================================
 *
 * ES:
 * - Grilla administrativa para gestionar roles del sistema.
 * - Carga roles, permisos y configuraciones necesarias para renderizar:
 *   - listado paginado
 *   - filtros por código y nombre
 *   - selección múltiple
 *   - eliminación individual y masiva
 *   - creación y edición mediante RoleModal
 *
 * Responsabilidades:
 * - Obtener datos desde los endpoints administrativos requeridos.
 * - Normalizar respuestas JSON con validación defensiva.
 * - Mantener estado de filtros, paginación y selección.
 * - Traducir labels y mensajes según locale actual.
 * - Entregar a RoleModal el shape de datos esperado.
 * - Evitar doble parpadeo del datagrid al guardar o eliminar.
 *
 * Reglas:
 * - No usa `any`.
 * - Si un endpoint responde con contenido no JSON o payload inesperado,
 *   genera diagnóstico explícito para facilitar soporte técnico.
 * - La paginación puede tomar su valor inicial desde SystemSettings
 *   usando la clave `recordsPerPageRoles`.
 * - La carga visual del grid se usa solo en:
 *   1) carga inicial
 *   2) refresh manual
 * - Guardar / eliminar actualizan el estado local sin recargar toda la grilla.
 *
 * EN:
 * - Administrative grid for managing system roles.
 * - Loads roles, permissions and settings required to render:
 *   paginated list, filters, multi-select, delete actions and modal editing.
 * - Includes defensive JSON normalization and explicit endpoint diagnostics.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  UserCog,
  Search,
} from "lucide-react";

import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";

import RoleModal, {
  type PermissionGrouped,
  type RoleModalShape,
  type RoleSavedShape,
} from "@/components/RoleModal";

/* =============================================================================
 * Types
 * ============================================================================= */

interface RoleDTO {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
  permissions: string[];
}

interface PermissionDTO {
  id: string;
  code: string;
  module: string;
  name_es: string;
  name_en: string;
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

async function readBodyText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function snippet(s: string, max = 180): string {
  const v = s.replace(/\s+/g, " ").trim();
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

async function fetchJsonStrict(
  url: string
): Promise<
  | { ok: true; status: number; raw: unknown }
  | { ok: false; status: number; message: string }
> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const ct = safeStr(res.headers.get("content-type"));
  const bodyText = await readBodyText(res);

  const looksJson =
    ct.toLowerCase().includes("application/json") ||
    bodyText.trim().startsWith("{") ||
    bodyText.trim().startsWith("[");

  if (!looksJson) {
    return {
      ok: false,
      status: res.status,
      message: `Endpoint ${url} devolvió NO-JSON (content-type: ${
        ct || "n/a"
      }). Snippet: ${snippet(bodyText)}`,
    };
  }

  let raw: unknown = null;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return {
      ok: false,
      status: res.status,
      message: `Endpoint ${url} devolvió JSON inválido. Snippet: ${snippet(
        bodyText
      )}`,
    };
  }

  if (!res.ok) {
    const msg = isObj(raw) && "message" in raw ? safeStr(raw.message) : "";
    return {
      ok: false,
      status: res.status,
      message: `Endpoint ${url} HTTP ${res.status}${msg ? `: ${msg}` : ""}`,
    };
  }

  return { ok: true, status: res.status, raw };
}

function groupPermissions(perms: PermissionDTO[]): PermissionGrouped[] {
  const map = new Map<string, PermissionGrouped>();

  perms.forEach((p: PermissionDTO) => {
    const mod = safeStr(p.module) || "general";
    const existing = map.get(mod);

    if (existing) {
      existing.permissions.push({
        code: p.code,
        name_es: p.name_es,
        name_en: p.name_en,
      });
    } else {
      map.set(mod, {
        module: mod,
        permissions: [
          {
            code: p.code,
            name_es: p.name_es,
            name_en: p.name_en,
          },
        ],
      });
    }
  });

  const grouped = Array.from(map.values()).sort(
    (a: PermissionGrouped, b: PermissionGrouped) =>
      a.module.localeCompare(b.module)
  );

  grouped.forEach((g: PermissionGrouped) =>
    g.permissions.sort(
      (
        a: { code: string; name_es: string; name_en: string },
        b: { code: string; name_es: string; name_en: string }
      ) => a.code.localeCompare(b.code)
    )
  );

  return grouped;
}

function toModalShape(r: RoleDTO | null): RoleModalShape {
  if (!r) {
    return {
      id: undefined,
      code: "",
      name_es: "",
      name_en: "",
      permissions: [],
    };
  }

  return {
    id: r.id,
    code: r.code,
    name_es: r.name_es,
    name_en: r.name_en,
    permissions: r.permissions,
  };
}

function upsertRole(prev: RoleDTO[], saved: RoleSavedShape): RoleDTO[] {
  const normalized: RoleDTO = {
    id: saved.id,
    code: saved.code,
    name_es: saved.name_es,
    name_en: saved.name_en,
    permissions: saved.permissions,
  };

  const exists = prev.some((r: RoleDTO) => r.id === normalized.id);

  if (!exists) {
    return [...prev, normalized].sort((a: RoleDTO, b: RoleDTO) =>
      a.code.localeCompare(b.code)
    );
  }

  return prev
    .map((r: RoleDTO) => (r.id === normalized.id ? normalized : r))
    .sort((a: RoleDTO, b: RoleDTO) => a.code.localeCompare(b.code));
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function RoleDataGrid() {
  const { locale } = useTranslation();
  const toast = useToast();
  const lang: "es" | "en" = locale === "es" ? "es" : "en";

  const t = useMemo(
    () => ({
      title: lang === "es" ? "Roles del sistema" : "System roles",
      subtitle:
        lang === "es"
          ? "Crea, edita y administra los roles y sus permisos."
          : "Create, edit and manage roles and their permissions.",

      newRole: lang === "es" ? "Nuevo rol" : "New role",
      refresh: lang === "es" ? "Refrescar" : "Refresh",
      deleteSelected:
        lang === "es" ? "Eliminar seleccionados" : "Delete selected",

      code: lang === "es" ? "Código" : "Code",
      nameEs: "Nombre (ES)",
      nameEn: "Nombre (EN)",
      permissions: lang === "es" ? "Permisos" : "Permissions",
      actions: lang === "es" ? "Acciones" : "Actions",

      searchCodePlaceholder:
        lang === "es" ? "Buscar por código..." : "Search by code...",
      searchNamePlaceholder:
        lang === "es" ? "Buscar por nombre..." : "Search by name...",

      loading:
        lang === "es"
          ? "Cargando roles y permisos..."
          : "Loading roles and permissions...",
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
        lang === "es"
          ? `Página ${page} de ${total}`
          : `Page ${page} of ${total}`,

      loadError:
        lang === "es"
          ? "Error al cargar roles o permisos."
          : "Error loading roles or permissions.",
      deleteError:
        lang === "es" ? "Error al eliminar roles." : "Error deleting roles.",
      deleteSuccess:
        lang === "es"
          ? "Rol eliminado correctamente."
          : "Role deleted successfully.",
      bulkSummary: (success: number, fail: number) =>
        lang === "es"
          ? `Se eliminaron ${success}, ${fail} fallaron.`
          : `${success} deleted, ${fail} failed.`,

      confirmDeleteTitle:
        lang === "es" ? "Confirmar eliminación" : "Confirm delete",
      confirmDeleteMessage:
        lang === "es"
          ? "¿Eliminar los roles seleccionados? Esta acción no se puede deshacer."
          : "Delete selected roles? This action cannot be undone.",

      cancel: lang === "es" ? "Cancelar" : "Cancel",
      delete: lang === "es" ? "Eliminar" : "Delete",

      tooltipEdit: lang === "es" ? "Editar" : "Edit",
      tooltipDelete: lang === "es" ? "Eliminar" : "Delete",

      permsCount: (n: number) =>
        lang === "es"
          ? `${n} permiso${n === 1 ? "" : "s"}`
          : `${n} permission${n === 1 ? "" : "s"}`,
    }),
    [lang]
  );

  const toastRef = useRef(toast);
  const textRef = useRef(t);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    textRef.current = t;
  }, [t]);

  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState<
    PermissionGrouped[]
  >([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDTO | null>(null);

  const loadInitial = async (): Promise<void> => {
    setLoading(true);

    try {
      const [rolesR, permsR, settingsR] = await Promise.all([
        fetchJsonStrict("/api/admin/roles"),
        fetchJsonStrict("/api/admin/permissions"),
        fetchJsonStrict("/api/admin/settings"),
      ]);

      if (!rolesR.ok) throw new Error(`ROLES: ${rolesR.message}`);
      if (!permsR.ok) throw new Error(`PERMISSIONS: ${permsR.message}`);
      if (!settingsR.ok) throw new Error(`SETTINGS: ${settingsR.message}`);

      const rolesJson = normalizeArray<RoleDTO>(rolesR.raw, ["roles", "data"]);
      const permsJson = normalizeArray<PermissionDTO>(permsR.raw, [
        "permissions",
        "data",
      ]);
      const settingsJson = normalizeArray<SystemSettingDTO>(settingsR.raw, [
        "settings",
        "data",
      ]);

      setRoles(rolesJson);
      setPermissionsGrouped(groupPermissions(permsJson));

      const perPageCfg = settingsJson.find(
        (s: SystemSettingDTO) => s.key === "recordsPerPageRoles"
      );

      if (perPageCfg) {
        const parsed = Number(perPageCfg.value);
        if (!Number.isNaN(parsed) && parsed > 0) {
          setRecordsPerPage(parsed);
        }
      }

      setPage(1);
      setSelectedIds([]);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : textRef.current.loadError;
      console.error("[RoleDataGrid] loadInitial failed:", msg);
      toastRef.current.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const refreshRolesSilent = async (): Promise<void> => {
    try {
      const r = await fetchJsonStrict("/api/admin/roles");
      if (!r.ok) return;

      const data = normalizeArray<RoleDTO>(r.raw, ["roles", "data"]);
      setRoles(data);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchCode, searchName]);

  const filtered = roles.filter((r: RoleDTO) => {
    const matchCode =
      !searchCode || r.code.toLowerCase().includes(searchCode.toLowerCase());

    const matchName =
      !searchName ||
      r.name_es.toLowerCase().includes(searchName.toLowerCase()) ||
      r.name_en.toLowerCase().includes(searchName.toLowerCase());

    return matchCode && matchName;
  });

  const totalResults = filtered.length;
  const totalPages =
    totalResults > 0 ? Math.ceil(totalResults / recordsPerPage) : 1;
  const currentPage = Math.min(page, totalPages);

  const paginated = filtered.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const pageFrom =
    totalResults === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const pageTo = Math.min(totalResults, currentPage * recordsPerPage);

  const pageIds = paginated.map((r: RoleDTO) => r.id);
  const allSelected =
    pageIds.length > 0 &&
    pageIds.every((id: string) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev: string[]) =>
        prev.filter((id: string) => !pageIds.includes(id))
      );
    } else {
      setSelectedIds((prev: string[]) =>
        Array.from(new Set([...prev, ...pageIds]))
      );
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
    );
  };

  const deleteOne = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/admin/roles?id=${id}`, {
      method: "DELETE",
      headers: { "x-lang": locale },
      credentials: "include",
      cache: "no-store",
    });

    return res.ok;
  };

  const deleteSelectedRoles = async () => {
    if (selectedIds.length === 0) return;

    setBulkDeleting(true);

    try {
      if (selectedIds.length === 1) {
        const targetId = selectedIds[0];
        const ok = await deleteOne(targetId);

        if (!ok) {
          toastRef.current.error(textRef.current.deleteError);
        } else {
          setRoles((prev: RoleDTO[]) =>
            prev.filter((r: RoleDTO) => r.id !== targetId)
          );
          setSelectedIds([]);
          setShowDeleteModal(false);
          toastRef.current.success(textRef.current.deleteSuccess);
        }
      } else {
        let success = 0;
        let fail = 0;
        const deletedIds: string[] = [];

        for (const id of selectedIds) {
          const ok = await deleteOne(id);
          if (ok) {
            success++;
            deletedIds.push(id);
          } else {
            fail++;
          }
        }

        if (deletedIds.length > 0) {
          setRoles((prev: RoleDTO[]) =>
            prev.filter((r: RoleDTO) => !deletedIds.includes(r.id))
          );
        }

        setSelectedIds([]);
        setShowDeleteModal(false);

        if (fail === 0) {
          toastRef.current.success(
            lang === "es" ? `Se eliminaron ${success}.` : `${success} deleted.`
          );
        } else {
          toastRef.current.error(textRef.current.bulkSummary(success, fail));
          await refreshRolesSilent();
        }
      }
    } catch {
      toastRef.current.error(textRef.current.deleteError);
    } finally {
      setBulkDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingRole(null);
    setModalOpen(true);
  };

  const openEdit = (role: RoleDTO) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const handleSaved = async (savedRole: RoleSavedShape) => {
    setRoles((prev: RoleDTO[]) => upsertRole(prev, savedRole));
    setModalOpen(false);
    setEditingRole(null);
  };

  return (
    <>
      <GlobalDataGridShell
        title={t.title}
        subtitle={t.subtitle}
        icon={<UserCog className="h-7 w-7 text-brand-primaryStrong" />}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <GlobalButton
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              loading={loading}
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={() => {
                setSearchCode("");
                setSearchName("");
                setPage(1);
                setSelectedIds([]);
                void loadInitial();
              }}
            >
              {t.refresh}
            </GlobalButton>

            <GlobalButton
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              disabled={selectedIds.length === 0}
              className="border border-status-error bg-surface text-status-error hover:bg-surface-soft disabled:border-border disabled:text-text-muted"
              onClick={() => setShowDeleteModal(true)}
            >
              {t.deleteSelected}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
              onClick={openCreate}
            >
              {t.newRole}
            </GlobalButton>
          </div>
        }
        filters={
          <div className="flex flex-col gap-3">
            <div className="grid max-w-2xl gap-2 md:grid-cols-2">
              <div className="flex flex-col">
                <label
                  htmlFor="roles-filter-code"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.code}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="roles-filter-code"
                    name="roles-filter-code"
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder={t.searchCodePlaceholder}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="roles-filter-name"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {lang === "es" ? "Nombre" : "Name"}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="roles-filter-name"
                    name="roles-filter-name"
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder={t.searchNamePlaceholder}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <span className="text-[11px] text-text-muted">
              {t.resultsShort(totalResults)}
            </span>
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between text-xs text-text-secondary">
            <span>{t.resultsLabel(pageFrom, pageTo, totalResults)}</span>

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
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
              >
                ‹
              </GlobalButton>

              <span>{t.pageLabel(currentPage, totalPages)}</span>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === totalPages || totalResults === 0}
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
              >
                ›
              </GlobalButton>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === totalPages || totalResults === 0}
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
              <th className="w-10 px-3 py-3">#</th>

              <th className="w-10 px-3 py-3 text-center">
                <div className="flex justify-center">
                  <input
                    id="roles-select-all"
                    name="roles-select-all"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                  <label htmlFor="roles-select-all" className="sr-only">
                    Select all roles
                  </label>
                </div>
              </th>

              <th className="px-3 py-3">{t.code}</th>
              <th className="px-3 py-3">{t.nameEs}</th>
              <th className="px-3 py-3">{t.nameEn}</th>
              <th className="px-3 py-3">{t.permissions}</th>
              <th className="px-3 py-3 text-right">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-5 text-center text-text-secondary"
                >
                  {t.loading}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-5 text-center text-text-muted"
                >
                  {t.noResults}
                </td>
              </tr>
            ) : (
              paginated.map((r: RoleDTO, idx: number) => {
                const checked = selectedIds.includes(r.id);

                return (
                  <tr
                    key={r.id}
                    className={`border-b border-border transition ${
                      checked ? "bg-surface-soft" : "bg-surface"
                    } hover:bg-surface-soft`}
                  >
                    <td className="w-10 px-3 py-3 text-text-secondary">
                      {(currentPage - 1) * recordsPerPage + idx + 1}
                    </td>

                    <td className="w-10 px-3 py-3 text-center">
                      <div className="flex justify-center">
                        <input
                          id={`roles-row-${r.id}`}
                          name={`roles-row-${r.id}`}
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={() => toggleOne(r.id)}
                        />
                        <label
                          htmlFor={`roles-row-${r.id}`}
                          className="sr-only"
                        >
                          Select role
                        </label>
                      </div>
                    </td>

                    <td className="px-3 py-3 font-semibold text-brand-primaryStrong">
                      {r.code}
                    </td>
                    <td className="px-3 py-3 text-text-primary">{r.name_es}</td>
                    <td className="px-3 py-3 text-text-primary">{r.name_en}</td>
                    <td className="px-3 py-3 text-text-secondary">
                      {t.permsCount(
                        r.code === "superadmin"
                          ? permissionsGrouped.reduce(
                              (acc: number, g: PermissionGrouped) =>
                                acc + g.permissions.length,
                              0
                            )
                          : r.permissions.length
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-border bg-surface p-1.5 text-text-primary transition hover:bg-surface-soft"
                          onClick={() => openEdit(r)}
                          title={t.tooltipEdit}
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          className="rounded-md border border-status-error bg-surface p-1.5 text-status-error transition hover:bg-surface-soft"
                          onClick={() => {
                            setSelectedIds([r.id]);
                            setShowDeleteModal(true);
                          }}
                          title={t.tooltipDelete}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </GlobalDataGridShell>

      <GlobalConfirm
        open={showDeleteModal}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMessage}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        loading={bulkDeleting}
        onCancel={() => {
          if (!bulkDeleting) setShowDeleteModal(false);
        }}
        onConfirm={() => void deleteSelectedRoles()}
      />

      {modalOpen ? (
        <RoleModal
          role={toModalShape(editingRole)}
          permissions={permissionsGrouped}
          onClose={() => {
            setModalOpen(false);
            setEditingRole(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}