"use client";

/**
 * =============================================================================
 * 📄 Component: OrganizationUsersDataGrid
 * Path: src/components/OrganizationUsersDataGrid.tsx
 * =============================================================================
 *
 * ES:
 * - Grilla administrativa para gestión completa de usuarios de organización.
 * - Implementa el patrón UX administrativo base del sistema:
 *   - carga inicial estable
 *   - refresh manual suave
 *   - creación/edición con upsert local
 *   - desactivación local sin recarga global
 *   - control de selección, filtros y paginación sin parpadeo
 *
 * Responsabilidades:
 * - Obtener usuarios de organización, organizaciones y configuraciones.
 * - Mantener filtros, paginación, selección y estado del modal.
 * - Resolver etiquetas bilingües según locale actual.
 * - Sincronizar cambios locales después de crear o editar.
 * - Permitir desactivación lógica por lote o individual.
 *
 * Reglas:
 * - No elimina físicamente registros.
 * - La desactivación se resuelve vía actualización de status.
 * - No usa recarga global para reflejar cambios.
 * - El modal devuelve el usuario persistido para upsert local.
 *
 * EN:
 * - Administrative grid for organization users.
 * - Uses the same stable local-state pattern as the rest of the admin modules.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Edit3,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";

import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import { useToast } from "@/components/ui/GlobalToastProvider";

import { useTranslation } from "@/hooks/useTranslation";
import OrganizationUserModal from "@/components/OrganizationUserModal";

import type { Organization } from "@/types/organization";
import type {
  OrganizationUserRole,
  OrganizationUserRow,
  OrganizationUserStatus,
} from "@/types/organizationUser";

import { formatLastAccess } from "@/lib/format/formatLastAccess";

/* =============================================================================
 * Internal helper types
 * ============================================================================= */

interface SystemSettingDTO {
  key: string;
  value: string | number | boolean;
}

interface OrganizationOptionDTO {
  _id: string;
  label: string;
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

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isOrganizationUserRole(value: unknown): value is OrganizationUserRole {
  return value === "org_admin" || value === "org_user";
}

function isOrganizationUserStatus(
  value: unknown
): value is OrganizationUserStatus {
  return value === "active" || value === "inactive";
}

function isOrganizationUserRow(value: unknown): value is OrganizationUserRow {
  if (!isObj(value)) return false;
  if (typeof value._id !== "string") return false;
  if (typeof value.organizationId !== "string") return false;
  if (typeof value.firstName !== "string") return false;
  if (typeof value.lastName !== "string") return false;
  if (typeof value.fullName !== "string") return false;
  if (typeof value.email !== "string") return false;
  if (!isOrganizationUserRole(value.role)) return false;
  if (!isOrganizationUserStatus(value.status)) return false;
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

  if (typeof value.isRegistered !== "boolean") return false;

  if (
    value.activationStatus !== "pending" &&
    value.activationStatus !== "completed"
  ) {
    return false;
  }

  return true;
}

function normalizeOrganizationUsersResponse(raw: unknown): OrganizationUserRow[] {
  const list = normalizeArray<unknown>(raw, ["data", "organizationUsers"]);
  return list.filter(isOrganizationUserRow);
}

function normalizeOrganizationsResponse(raw: unknown): Organization[] {
  const list = normalizeArray<unknown>(raw, ["data", "organizations"]);

  return list.filter((item): item is Organization => {
    if (!isObj(item)) return false;
    if (typeof item._id !== "string") return false;
    if (typeof item.legalName !== "string") return false;
    if (typeof item.taxId !== "string") return false;
    if (typeof item.primaryEmail !== "string") return false;
    if (typeof item.primaryPhone !== "string") return false;
    if (item.status !== "active" && item.status !== "inactive") return false;
    if (typeof item.createdAt !== "string") return false;
    if (typeof item.updatedAt !== "string") return false;
    return true;
  });
}

function buildOrganizationOptions(
  organizations: Organization[]
): OrganizationOptionDTO[] {
  return organizations.map((organization) => {
    const commercialName = getString(organization.commercialName).trim();

    return {
      _id: organization._id,
      label: commercialName || organization.legalName,
    };
  });
}

function upsertOrganizationUser(
  prev: OrganizationUserRow[],
  saved: OrganizationUserRow
): OrganizationUserRow[] {
  const exists = prev.some((item) => item._id === saved._id);

  if (!exists) {
    return [saved, ...prev];
  }

  return prev.map((item) => (item._id === saved._id ? saved : item));
}

function applyInactiveStatus(
  prev: OrganizationUserRow[],
  ids: string[]
): OrganizationUserRow[] {
  const selected = new Set(ids);

  return prev.map((item) =>
    selected.has(item._id) ? { ...item, status: "inactive" } : item
  );
}

/* =============================================================================
 * Main component
 * ============================================================================= */

export default function OrganizationUsersDataGrid() {
  const { locale } = useTranslation();
  const toast = useToast();

  const t = useMemo(
    () => ({
      title:
        locale === "es"
          ? "Gestión de Usuarios de Organización"
          : "Organization Users Management",
      subtitle:
        locale === "es"
          ? "Crea y administra accesos asociados a organizaciones."
          : "Create and manage organization-linked portal accesses.",

      newUser:
        locale === "es"
          ? "Nuevo usuario de organización"
          : "New organization user",
      refresh: locale === "es" ? "Refrescar" : "Refresh",
      deactivateSelected:
        locale === "es" ? "Desactivar seleccionados" : "Deactivate selected",

      filterName:
        locale === "es"
          ? "Buscar por nombre o email..."
          : "Search by name or email...",
      filterOrganization:
        locale === "es" ? "Filtrar por organización" : "Filter by organization",
      filterRole: locale === "es" ? "Rol" : "Role",
      filterStatus: locale === "es" ? "Estado" : "Status",

      all: locale === "es" ? "Todos" : "All",
      orgAdmin: locale === "es" ? "Admin organización" : "Organization admin",
      orgUser: locale === "es" ? "Usuario organización" : "Organization user",
      active: locale === "es" ? "Activo" : "Active",
      inactive: locale === "es" ? "Inactivo" : "Inactive",

      fullName: locale === "es" ? "Nombre completo" : "Full name",
      email: "Email",
      organization: locale === "es" ? "Organización" : "Organization",
      role: locale === "es" ? "Rol" : "Role",
      statusLabel: locale === "es" ? "Estado" : "Status",
      lastLogin: locale === "es" ? "Último acceso" : "Last login",
      actions: locale === "es" ? "Acciones" : "Actions",
      activation: locale === "es" ? "Activación" : "Activation",
      activationPending: locale === "es" ? "Pendiente" : "Pending",
      activationCompleted: locale === "es" ? "Activado" : "Activated",

      loading:
        locale === "es"
          ? "Cargando usuarios de organización..."
          : "Loading organization users...",
      noResults: locale === "es" ? "Sin resultados." : "No results.",

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
        locale === "es"
          ? "Error cargando usuarios de organización."
          : "Error loading organization users.",
      deactivateSuccess:
        locale === "es"
          ? "Usuarios desactivados correctamente."
          : "Users deactivated successfully.",
      deactivateError:
        locale === "es"
          ? "Error desactivando usuarios."
          : "Error deactivating users.",
      bulkSummary: (ok: number, fail: number) =>
        locale === "es"
          ? `Se desactivaron ${ok} usuario(s), pero ${fail} fallaron.`
          : `${ok} user(s) deactivated, but ${fail} failed.`,

      confirmDeactivateTitle:
        locale === "es"
          ? "Confirmar desactivación"
          : "Confirm deactivation",
      confirmDeactivateMessage:
        locale === "es"
          ? "¿Desactivar los usuarios seleccionados? Esta acción no elimina registros y puede revertirse después."
          : "Deactivate selected users? This action does not delete records and can be reverted later.",
      cancel: locale === "es" ? "Cancelar" : "Cancel",
      deactivate: locale === "es" ? "Desactivar" : "Deactivate",

      editUser:
        locale === "es"
          ? "Editar usuario de organización"
          : "Edit organization user",
      resendActivation:
        locale === "es" ? "Reenviar activación" : "Resend activation",
      resendActivationSuccess:
        locale === "es"
          ? "Correo de activación reenviado correctamente."
          : "Activation email resent successfully.",
      resendActivationError:
        locale === "es"
          ? "No se pudo reenviar el correo de activación."
          : "Could not resend activation email.",
      resendActivationConflict:
        locale === "es"
          ? "Este usuario ya activó su cuenta."
          : "This user has already activated the account.",

      statusActiveText: locale === "es" ? "Activo" : "Active",
      statusInactiveText: locale === "es" ? "Inactivo" : "Inactive",
      lastLoginNever: locale === "es" ? "Nunca" : "Never",
    }),
    [locale]
  );

  /* =============================================================================
   * Main state
   * ============================================================================= */

  const [organizationUsers, setOrganizationUsers] = useState<
    OrganizationUserRow[]
  >([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<OrganizationUserRole | "all">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    OrganizationUserStatus | "all"
  >("all");

  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationUserRow | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [bulkDeactivating, setBulkDeactivating] = useState(false);

  /* =============================================================================
   * Initial load
   * ============================================================================= */

  useEffect(() => {
    async function runInitialLoad() {
      try {
        setLoading(true);

        const [usersRes, organizationsRes, settingsRes] = await Promise.all([
          fetch("/api/admin/organization-users", { cache: "no-store" }),
          fetch("/api/admin/organizations?status=active", { cache: "no-store" }),
          fetch("/api/admin/settings", { cache: "no-store" }),
        ]);

        if (!usersRes.ok || !organizationsRes.ok || !settingsRes.ok) {
          throw new Error("API error");
        }

        const [usersRaw, organizationsRaw, settingsRaw] = await Promise.all([
          safeJson(usersRes),
          safeJson(organizationsRes),
          safeJson(settingsRes),
        ]);

        setOrganizationUsers(normalizeOrganizationUsersResponse(usersRaw));
        setOrganizations(normalizeOrganizationsResponse(organizationsRaw));

        const settingsData = normalizeArray<SystemSettingDTO>(settingsRaw, [
          "settings",
          "data",
        ]);

        const perPageCfg = settingsData.find(
          (s) => s.key === "recordsPerPageOrganizationsUsers"
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

  async function refreshOrganizationUsers() {
    try {
      setRefreshing(true);

      const [usersRes, organizationsRes] = await Promise.all([
        fetch("/api/admin/organization-users", { cache: "no-store" }),
        fetch("/api/admin/organizations?status=active", { cache: "no-store" }),
      ]);

      if (!usersRes.ok || !organizationsRes.ok) {
        throw new Error("Refresh failed");
      }

      const [usersRaw, organizationsRaw] = await Promise.all([
        safeJson(usersRes),
        safeJson(organizationsRes),
      ]);

      setOrganizationUsers(normalizeOrganizationUsersResponse(usersRaw));
      setOrganizations(normalizeOrganizationsResponse(organizationsRaw));
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
  }, [searchValue, organizationFilter, roleFilter, statusFilter]);

  const filtered = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return organizationUsers.filter((user) => {
      const fullName = user.fullName.toLowerCase();
      const email = user.email.toLowerCase();

      const matchSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        email.includes(normalizedSearch);

      const matchOrganization =
        organizationFilter === "all" ||
        user.organizationId === organizationFilter;

      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchStatus = statusFilter === "all" || user.status === statusFilter;

      return matchSearch && matchOrganization && matchRole && matchStatus;
    });
  }, [
    organizationUsers,
    organizationFilter,
    roleFilter,
    searchValue,
    statusFilter,
  ]);

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
    const validIds = new Set(organizationUsers.map((user) => user._id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [organizationUsers]);

  const selectablePageIds = paginated
    .filter((user) => user.status !== "inactive")
    .map((user) => user._id);

  const allSelected =
    selectablePageIds.length > 0 &&
    selectablePageIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !selectablePageIds.includes(id))
      );
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...selectablePageIds])));
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

  const handleEdit = (user: OrganizationUserRow) => {
    setEditing(user);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleOrganizationUserSaved = (savedUser: OrganizationUserRow) => {
    setOrganizationUsers((prev) => upsertOrganizationUser(prev, savedUser));
    setModalOpen(false);
    setEditing(null);
  };

  const handleResendActivation = async (user: OrganizationUserRow) => {
    try {
      const res = await fetch(
        `/api/admin/organization-users/${user._id}/resend-activation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (res.status === 409) {
        toast.error(result?.message || t.resendActivationConflict);
        return;
      }

      if (!res.ok || !result?.ok) {
        throw new Error(result?.message || t.resendActivationError);
      }

      toast.success(result.message || t.resendActivationSuccess);
    } catch {
      toast.error(t.resendActivationError);
    }
  };

  /* =============================================================================
   * Logical deactivate
   * ============================================================================= */

  const deactivateOneRequest = async (
    user: OrganizationUserRow
  ): Promise<boolean> => {
    const res = await fetch(`/api/admin/organization-users/${user._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-lang": locale,
      },
      body: JSON.stringify({
        status: "inactive",
      }),
    });

    return res.ok;
  };

  const deactivateSelectedUsers = async () => {
    if (selectedIds.length === 0) return;

    setBulkDeactivating(true);

    try {
      let ok = 0;
      let fail = 0;

      const selectedUsers = organizationUsers.filter((user) =>
        selectedIds.includes(user._id)
      );

      for (const user of selectedUsers) {
        if (user.status === "inactive") {
          continue;
        }

        const updated = await deactivateOneRequest(user);

        if (updated) ok += 1;
        else fail += 1;
      }

      if (ok > 0) {
        setOrganizationUsers((prev) => applyInactiveStatus(prev, selectedIds));
        setSelectedIds([]);
      }

      if (fail === 0) {
        toast.success(t.deactivateSuccess);
      } else {
        toast.error(t.bulkSummary(ok, fail));
      }

      setShowDeactivateModal(false);
    } catch {
      toast.error(t.deactivateError);
    } finally {
      setBulkDeactivating(false);
    }
  };

  const organizationOptions = useMemo(
    () => buildOrganizationOptions(organizations),
    [organizations]
  );

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
              onClick={() => void refreshOrganizationUsers()}
            >
              {t.refresh}
            </GlobalButton>

            <GlobalButton
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              disabled={selectedIds.length === 0}
              className="border border-status-error bg-surface text-status-error hover:bg-surface-soft disabled:border-border disabled:text-text-muted"
              onClick={() => setShowDeactivateModal(true)}
            >
              {t.deactivateSelected}
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
            <div className="grid max-w-6xl gap-3 md:grid-cols-4">
              <div className="flex flex-col">
                <label
                  htmlFor="organization-user-filter-search"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.fullName}
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="organization-user-filter-search"
                    name="organization-user-filter-search"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={t.filterName}
                    autoComplete="off"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="organization-user-filter-organization"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.organization}
                </label>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <select
                    id="organization-user-filter-organization"
                    name="organization-user-filter-organization"
                    value={organizationFilter}
                    onChange={(e) => setOrganizationFilter(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                  >
                    <option value="all">{t.all}</option>
                    {organizationOptions.map((organization) => (
                      <option key={organization._id} value={organization._id}>
                        {organization.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="organization-user-filter-role"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.filterRole}
                </label>

                <select
                  id="organization-user-filter-role"
                  name="organization-user-filter-role"
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(
                      e.target.value === "org_admin" ||
                        e.target.value === "org_user"
                        ? e.target.value
                        : "all"
                    )
                  }
                  className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="all">{t.all}</option>
                  <option value="org_admin">{t.orgAdmin}</option>
                  <option value="org_user">{t.orgUser}</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="organization-user-filter-status"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.filterStatus}
                </label>

                <select
                  id="organization-user-filter-status"
                  name="organization-user-filter-status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value === "active" || e.target.value === "inactive"
                        ? e.target.value
                        : "all"
                    )
                  }
                  className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="all">{t.all}</option>
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
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
                  id="organization-users-select-all"
                  name="organization-users-select-all"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                <label
                  htmlFor="organization-users-select-all"
                  className="sr-only"
                >
                  Select all
                </label>
              </th>

              <th className="px-3 py-3">{t.fullName}</th>
              <th className="px-3 py-3">{t.email}</th>
              <th className="px-3 py-3">{t.organization}</th>
              <th className="px-3 py-3">{t.role}</th>
              <th className="px-3 py-3">{t.statusLabel}</th>
              <th className="px-3 py-3">{t.activation}</th>
              <th className="px-3 py-3">{t.lastLogin}</th>
              <th className="px-3 py-3 text-right">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-5 text-center text-text-secondary">
                  {t.loading}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-5 text-center text-text-muted">
                  {t.noResults}
                </td>
              </tr>
            ) : (
              paginated.map((user, idx) => {
                const checked = selectedIds.includes(user._id);
                const isInactive = user.status === "inactive";

                const roleLabel =
                  user.role === "org_admin" ? t.orgAdmin : t.orgUser;

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
                        id={`organization-users-row-${user._id}`}
                        name={`organization-users-row-${user._id}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        disabled={isInactive}
                        onChange={() => toggleOne(user._id)}
                      />
                      <label
                        htmlFor={`organization-users-row-${user._id}`}
                        className="sr-only"
                      >
                        Select organization user {user.fullName}
                      </label>
                    </td>

                    <td className="px-3 py-3 font-semibold text-brand-primaryStrong">
                      {user.fullName}
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={13} className="text-text-muted" />
                        {user.email}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      {user.organizationName}
                    </td>

                    <td className="px-3 py-3 text-text-primary">{roleLabel}</td>

                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                          user.status === "active"
                            ? "border border-brand-primary bg-brand-secondary text-text-primary"
                            : "border border-border bg-surface-soft text-text-secondary"
                        }`}
                      >
                        {user.status === "active"
                          ? t.statusActiveText
                          : t.statusInactiveText}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                          user.activationStatus === "pending"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {user.activationStatus === "pending"
                          ? t.activationPending
                          : t.activationCompleted}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-text-secondary">
                      {formatLastAccess(user.lastLoginAt ?? null)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-2">
                        {user.activationStatus === "pending" ? (
                          <button
                            type="button"
                            aria-label={`${t.resendActivation} ${user.fullName}`}
                            className="rounded-md border border-amber-300 bg-amber-50 p-1.5 text-amber-700 transition hover:bg-amber-100"
                            onClick={() => void handleResendActivation(user)}
                          >
                            <Send size={16} />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          aria-label={`${t.editUser} ${user.fullName}`}
                          className="rounded-md border border-border bg-surface p-1.5 text-text-primary transition hover:bg-surface-soft"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit3 size={16} />
                        </button>

                        {!isInactive ? (
                          <button
                            type="button"
                            aria-label={`${t.deactivate} ${user.fullName}`}
                            className="rounded-md border border-status-error bg-surface p-1.5 text-status-error transition hover:bg-surface-soft"
                            onClick={() => {
                              setSelectedIds([user._id]);
                              setShowDeactivateModal(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
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
        open={showDeactivateModal}
        title={t.confirmDeactivateTitle}
        message={t.confirmDeactivateMessage}
        confirmLabel={t.deactivate}
        cancelLabel={t.cancel}
        loading={bulkDeactivating}
        onCancel={() => {
          if (!bulkDeactivating) setShowDeactivateModal(false);
        }}
        onConfirm={() => void deactivateSelectedUsers()}
      />

      <OrganizationUserModal
        isOpen={modalOpen}
        user={editing}
        organizations={organizationOptions}
        onClose={handleModalClose}
        onSaved={handleOrganizationUserSaved}
      />
    </>
  );
}