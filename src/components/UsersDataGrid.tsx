"use client";

/**
 * =============================================================================
 * 📄 Component: UsersDataGrid
 * Path: src/components/UsersDataGrid.tsx
 * =============================================================================
 *
 * ES:
 * - Grilla administrativa para gestión completa de usuarios.
 * - Implementa el mismo patrón UX esperado para módulos modernos:
 *   - carga inicial estable
 *   - refresh manual suave
 *   - creación/edición con upsert local
 *   - eliminación local sin recarga global
 *   - control de selección, filtros y paginación sin parpadeo
 *
 * Responsabilidades:
 * - Obtener usuarios, roles y configuraciones requeridas para el módulo.
 * - Mantener filtros, paginación, selección y estado del modal.
 * - Resolver etiquetas bilingües según locale actual.
 * - Formatear visualmente el teléfono para la grilla.
 * - Sincronizar cambios locales después de crear, editar o eliminar.
 *
 * Reglas:
 * - Esta base reusable no maneja sucursales.
 * - No consulta `/api/admin/branches`.
 * - No renderiza columna de sucursal.
 * - No usa recarga global para reflejar cambios.
 *
 * EN:
 * - Administrative grid for system users.
 * - Uses a modern local-state pattern:
 *   stable load, soft refresh, local upsert and local delete without reload.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  Users as UsersIcon,
  Search,
  Phone,
} from "lucide-react";

import GlobalButton from "@/components/ui/GlobalButton";
import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";

import { useTranslation } from "@/hooks/useTranslation";
import UserModal from "@/components/UserModal";

import type { UserDTO, RoleDTO } from "@/components/users/types";
import { extractNationalFromE164 } from "@/components/phone/PhoneUtils";

/* =============================================================================
 * Internal helper types
 * ============================================================================= */

interface SystemSettingDTO {
  key: string;
  value: string | number | boolean;
}

/* =============================================================================
 * Safe helpers
 * ============================================================================= */

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function normalizeArray<T>(raw: unknown, keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];

  if (isObj(raw)) {
    if (raw.ok === false) return [];

    for (const key of keys) {
      const value = raw[key];
      if (Array.isArray(value)) return value as T[];
    }
  }

  return [];
}

async function safeJson(res: Response): Promise<unknown> {
  return (await res.json().catch(() => null)) as unknown;
}

function formatPhoneForGrid(phone?: string | null): string {
  if (!phone) return "—";

  try {
    const { country, nationalNumber } = extractNationalFromE164(phone);

    if (!country || !nationalNumber) return phone;

    const cc = country.code.toLowerCase();
    const dial = `+${country.dialCode}`;

    if (country.code === "US" && nationalNumber.length === 10) {
      return `${cc} ${dial} (${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(
        3,
        6
      )}-${nationalNumber.slice(6)}`;
    }

    return `${cc} ${dial} ${nationalNumber}`;
  } catch {
    return phone;
  }
}

function upsertUser(prev: UserDTO[], saved: UserDTO): UserDTO[] {
  const exists = prev.some((item) => item._id === saved._id);

  if (!exists) {
    return [saved, ...prev];
  }

  return prev.map((item) => (item._id === saved._id ? saved : item));
}

/* =============================================================================
 * Main component
 * ============================================================================= */

export default function UsersDataGrid() {
  const { locale } = useTranslation();
  const toast = useToast();

  const t = useMemo(
    () => ({
      title: locale === "es" ? "Gestión de Usuarios" : "Users Management",
      subtitle:
        locale === "es"
          ? "Crea y administra usuarios con roles."
          : "Create and manage users with roles.",

      newUser: locale === "es" ? "Nuevo Usuario" : "New User",
      refresh: locale === "es" ? "Refrescar" : "Refresh",
      deleteSelected:
        locale === "es" ? "Eliminar seleccionados" : "Delete selected",

      filterName:
        locale === "es" ? "Buscar por nombre..." : "Search by name...",
      filterPhone:
        locale === "es" ? "Buscar por teléfono..." : "Search by phone...",

      email: "Email",
      name: locale === "es" ? "Nombre" : "Name",
      role: locale === "es" ? "Rol" : "Role",
      phone: locale === "es" ? "Teléfono" : "Phone",
      actions: locale === "es" ? "Acciones" : "Actions",

      noResults: locale === "es" ? "Sin resultados." : "No results.",
      loading: locale === "es" ? "Cargando usuarios..." : "Loading users...",

      resultsShort: (n: number) =>
        n === 0
          ? locale === "es"
            ? "Sin resultados."
            : "No results."
          : locale === "es"
            ? `Resultados: ${n}`
            : `Results: ${n}`,

      resultsLabel: (from: number, to: number, total: number) =>
        total === 0
          ? locale === "es"
            ? "Sin resultados."
            : "No results."
          : locale === "es"
            ? `Mostrando ${from}–${to} de ${total}`
            : `Showing ${from}–${to} of ${total}`,

      pageLabel: (page: number, total: number) =>
        locale === "es"
          ? `Página ${page} de ${total}`
          : `Page ${page} of ${total}`,

      loadError:
        locale === "es" ? "Error cargando usuarios." : "Error loading users.",
      deleteSuccess:
        locale === "es"
          ? "Usuarios eliminados correctamente."
          : "Users deleted successfully.",
      deleteError:
        locale === "es"
          ? "Error eliminando usuarios."
          : "Error deleting users.",
      bulkSummary: (ok: number, fail: number) =>
        locale === "es"
          ? `Se eliminaron ${ok} usuario(s), pero ${fail} fallaron.`
          : `${ok} user(s) deleted, but ${fail} failed.`,

      confirmDeleteTitle:
        locale === "es" ? "Confirmar eliminación" : "Confirm deletion",
      confirmDeleteMessage:
        locale === "es"
          ? "¿Eliminar los usuarios seleccionados? Esta acción no se puede deshacer."
          : "Delete selected users? This action cannot be undone.",
      cancel: locale === "es" ? "Cancelar" : "Cancel",
      delete: locale === "es" ? "Eliminar" : "Delete",
    }),
    [locale]
  );

  /* =============================================================================
   * Main state
   * ============================================================================= */

  const [users, setUsers] = useState<UserDTO[]>([]);
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* =============================================================================
   * Initial load
   * ============================================================================= */

  useEffect(() => {
    async function runInitialLoad() {
      try {
        setLoading(true);

        const [usersRes, rolesRes, settingsRes] = await Promise.all([
          fetch("/api/admin/users", { cache: "no-store" }),
          fetch("/api/admin/roles", { cache: "no-store" }),
          fetch("/api/admin/settings", { cache: "no-store" }),
        ]);

        if (!usersRes.ok || !rolesRes.ok || !settingsRes.ok) {
          throw new Error("API error");
        }

        const [usersRaw, rolesRaw, settingsRaw] = await Promise.all([
          safeJson(usersRes),
          safeJson(rolesRes),
          safeJson(settingsRes),
        ]);

        const usersList = normalizeArray<UserDTO>(usersRaw, ["users", "data"]);
        const rolesList = normalizeArray<RoleDTO>(rolesRaw, ["roles", "data"]);

        setUsers(usersList);
        setRoles(rolesList);

        const settingsData = normalizeArray<SystemSettingDTO>(settingsRaw, [
          "settings",
          "data",
        ]);
        const perPageCfg = settingsData.find(
          (s) => s.key === "recordsPerPageUsers"
        );

        if (perPageCfg) {
          const parsed = Number(perPageCfg.value);
          if (!Number.isNaN(parsed) && parsed > 0) {
            setRecordsPerPage(parsed);
          }
        }

        setPage(1);
        setSelectedIds([]);
      } catch {
        toast.error(t.loadError);
      } finally {
        setLoading(false);
      }
    }

    void runInitialLoad();
  }, [toast, t.loadError]);

  /* =============================================================================
   * Soft refresh
   * ============================================================================= */

  async function refreshUsers() {
    try {
      setRefreshing(true);

      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) throw new Error("Users refresh failed");

      const raw = await safeJson(res);
      const nextUsers = normalizeArray<UserDTO>(raw, ["users", "data"]);
      setUsers(nextUsers);

      if (roles.length === 0) {
        const roleRes = await fetch("/api/admin/roles", { cache: "no-store" });

        if (roleRes.ok) {
          const rolesRaw = await safeJson(roleRes);
          setRoles(normalizeArray<RoleDTO>(rolesRaw, ["roles", "data"]));
        }
      }
    } catch {
      toast.error(t.loadError);
    } finally {
      setRefreshing(false);
    }
  }

  /* =============================================================================
   * Filters + pagination
   * ============================================================================= */

  useEffect(() => {
    setPage(1);
  }, [searchName, searchPhone]);

  const filterByPhone = (phone: string | null | undefined, input: string) => {
    if (!input) return true;
    if (!phone) return false;

    const lower = input.toLowerCase();

    try {
      const { nationalNumber } = extractNationalFromE164(phone);
      return (
        phone.toLowerCase().includes(lower) || nationalNumber.includes(input)
      );
    } catch {
      return phone.toLowerCase().includes(lower);
    }
  };

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchName =
        !searchName ||
        user.name.toLowerCase().includes(searchName.toLowerCase());

      const matchPhone = filterByPhone(user.phone, searchPhone);

      return matchName && matchPhone;
    });
  }, [searchName, searchPhone, users]);

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

  /* =============================================================================
   * Selection
   * ============================================================================= */

  useEffect(() => {
    const validIds = new Set(users.map((user) => user._id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [users]);

  const pageIds = paginated.map((user) => user._id);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* =============================================================================
   * Modal actions
   * ============================================================================= */

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (user: UserDTO) => {
    setEditing(user);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleUserSaved = (savedUser: UserDTO) => {
    setUsers((prev) => upsertUser(prev, savedUser));
    setModalOpen(false);
    setEditing(null);
  };

  /* =============================================================================
   * Delete
   * ============================================================================= */

  const deleteOneRequest = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/admin/users?id=${id}`, {
      method: "DELETE",
      headers: { "x-lang": locale },
    });

    return res.ok;
  };

  const deleteSelectedUsers = async () => {
    if (selectedIds.length === 0) return;

    setBulkDeleting(true);

    try {
      let ok = 0;
      let fail = 0;
      const idsToDelete = [...selectedIds];

      for (const id of idsToDelete) {
        const deleted = await deleteOneRequest(id);
        if (deleted) ok += 1;
        else fail += 1;
      }

      if (ok > 0) {
        const deletedSet = new Set(idsToDelete);
        setUsers((prev) => prev.filter((user) => !deletedSet.has(user._id)));
        setSelectedIds((prev) => prev.filter((id) => !deletedSet.has(id)));
      }

      if (fail === 0) {
        toast.success(t.deleteSuccess);
      } else {
        toast.error(t.bulkSummary(ok, fail));
      }

      setShowDeleteModal(false);
    } catch {
      toast.error(t.deleteError);
    } finally {
      setBulkDeleting(false);
    }
  };

  /* =============================================================================
   * Render
   * ============================================================================= */

  return (
    <>
      <GlobalDataGridShell
        title={t.title}
        subtitle={t.subtitle}
        icon={<UsersIcon className="h-7 w-7 text-brand-primaryStrong" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <GlobalButton
              variant="secondary"
              size="sm"
              loading={refreshing}
              leftIcon={<RefreshCw size={14} />}
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={() => void refreshUsers()}
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
              onClick={handleCreate}
            >
              {t.newUser}
            </GlobalButton>
          </div>
        }
        filters={
          <div className="flex flex-col gap-3">
            <div className="grid max-w-3xl gap-3 md:grid-cols-2">
              <div className="flex flex-col">
                <label
                  htmlFor="user-filter-name"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.name}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="user-filter-name"
                    name="user-filter-name"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder={t.filterName}
                    autoComplete="off"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="user-filter-phone"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.phone}
                </label>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="user-filter-phone"
                    name="user-filter-phone"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder={t.filterPhone}
                    autoComplete="off"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
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
              <th className="w-10 px-3 py-3">#</th>

              <th className="w-10 px-3 py-3 text-center">
                <input
                  id="users-select-all"
                  name="users-select-all"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                <label htmlFor="users-select-all" className="sr-only">
                  Select all
                </label>
              </th>

              <th className="px-3 py-3">{t.name}</th>
              <th className="px-3 py-3">{t.email}</th>
              <th className="px-3 py-3">{t.role}</th>
              <th className="px-3 py-3">{t.phone}</th>
              <th className="px-3 py-3 text-right">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-5 text-center text-text-secondary">
                  {t.loading}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-5 text-center text-text-muted">
                  {t.noResults}
                </td>
              </tr>
            ) : (
              paginated.map((user, idx) => {
                const checked = selectedIds.includes(user._id);

                const roleLabel = (() => {
                  const role = roles.find((r) => r.code === user.role);
                  return role
                    ? locale === "es"
                      ? role.name_es
                      : role.name_en
                    : user.role;
                })();

                const phoneLabel = formatPhoneForGrid(user.phone);

                return (
                  <tr
                    key={user._id}
                    className={`border-b border-border transition ${
                      checked ? "bg-surface-soft" : "bg-surface"
                    } hover:bg-surface-soft`}
                  >
                    <td className="px-3 py-3 text-text-secondary">
                      {(currentPage - 1) * recordsPerPage + idx + 1}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <input
                        id={`users-row-${user._id}`}
                        name={`users-row-${user._id}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleOne(user._id)}
                      />
                      <label
                        htmlFor={`users-row-${user._id}`}
                        className="sr-only"
                      >
                        Select user {user.name}
                      </label>
                    </td>

                    <td className="px-3 py-3 font-semibold text-brand-primaryStrong">
                      {user.name}
                    </td>

                    <td className="px-3 py-3 text-text-primary">{user.email}</td>

                    <td className="px-3 py-3 text-text-primary">{roleLabel}</td>

                    <td className="px-3 py-3 text-text-secondary">{phoneLabel}</td>

                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          aria-label={`Editar usuario ${user.name}`}
                          className="rounded-md border border-border bg-surface p-1.5 text-text-primary transition hover:bg-surface-soft"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label={`Eliminar usuario ${user.name}`}
                          className="rounded-md border border-status-error bg-surface p-1.5 text-status-error transition hover:bg-surface-soft"
                          onClick={() => {
                            setSelectedIds([user._id]);
                            setShowDeleteModal(true);
                          }}
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
        onConfirm={() => void deleteSelectedUsers()}
      />

      <UserModal
        isOpen={modalOpen}
        user={editing}
        roles={roles}
        onClose={handleModalClose}
        onSaved={handleUserSaved}
      />
    </>
  );
}