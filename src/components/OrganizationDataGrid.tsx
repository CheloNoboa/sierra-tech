"use client";

/**
 * =============================================================================
 * 📄 Component: OrganizationDataGrid
 * Path: src/components/OrganizationDataGrid.tsx
 * =============================================================================
 *
 * ES:
 * - Grilla administrativa para gestión completa de organizaciones.
 * - Implementa el patrón UX administrativo base del sistema:
 *   - carga inicial estable
 *   - refresh manual suave
 *   - creación/edición con upsert local
 *   - desactivación local sin recarga global
 *   - control de selección, filtros y paginación sin parpadeo
 *
 * Responsabilidades:
 * - Obtener organizaciones y configuraciones requeridas para el módulo.
 * - Mantener filtros, paginación, selección y estado del modal.
 * - Resolver etiquetas bilingües según locale actual.
 * - Sincronizar cambios locales después de crear o editar.
 * - Permitir desactivación lógica por lote o individual.
 *
 * Reglas:
 * - No elimina físicamente registros.
 * - La desactivación se resuelve vía actualización de status.
 * - No usa recarga global para reflejar cambios.
 * - El modal devuelve la organización persistida para upsert local.
 *
 * EN:
 * - Administrative grid for organizations.
 * - Uses the same stable local-state pattern as the rest of the admin modules.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  Edit3,
  Search,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";

import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import { useToast } from "@/components/ui/GlobalToastProvider";

import { useTranslation } from "@/hooks/useTranslation";
import OrganizationModal from "@/components/OrganizationModal";

import type { Organization, OrganizationStatus } from "@/types/organization";

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

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
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

function isOrganizationStatus(value: unknown): value is OrganizationStatus {
  return value === "active" || value === "inactive";
}

function isOrganization(value: unknown): value is Organization {
  if (!isObj(value)) return false;
  if (typeof value._id !== "string") return false;
  if (typeof value.legalName !== "string") return false;
  if (typeof value.taxId !== "string") return false;
  if (typeof value.primaryEmail !== "string") return false;
  if (typeof value.primaryPhone !== "string") return false;
  if (!isOrganizationStatus(value.status)) return false;
  if (typeof value.createdAt !== "string") return false;
  if (typeof value.updatedAt !== "string") return false;

  if (
    value.commercialName !== undefined &&
    value.commercialName !== null &&
    typeof value.commercialName !== "string"
  ) {
    return false;
  }

  return true;
}

function normalizeOrganizationsResponse(raw: unknown): Organization[] {
  const list = normalizeArray<unknown>(raw, ["organizations", "data"]);

  return list.filter(isOrganization);
}

function formatOrganizationName(row: Organization): string {
  const commercialName = getString(row.commercialName).trim();
  if (commercialName) return commercialName;
  return row.legalName;
}

function upsertOrganization(
  prev: Organization[],
  saved: Organization
): Organization[] {
  const exists = prev.some((item) => item._id === saved._id);

  if (!exists) {
    return [saved, ...prev];
  }

  return prev.map((item) => (item._id === saved._id ? saved : item));
}

function applyInactiveStatus(prev: Organization[], ids: string[]): Organization[] {
  const selected = new Set(ids);

  return prev.map((item) =>
    selected.has(item._id) ? { ...item, status: "inactive" } : item
  );
}

/* =============================================================================
 * Main component
 * ============================================================================= */

export default function OrganizationDataGrid() {
  const { locale } = useTranslation();
  const toast = useToast();

  const t = useMemo(
    () => ({
      title: locale === "es" ? "Gestión de Organizaciones" : "Organizations Management",
      subtitle:
        locale === "es"
          ? "Crea y administra organizaciones base del portal."
          : "Create and manage the base organizations of the portal.",

      newOrganization:
        locale === "es" ? "Nueva organización" : "New organization",
      refresh: locale === "es" ? "Refrescar" : "Refresh",
      deactivateSelected:
        locale === "es" ? "Desactivar seleccionadas" : "Deactivate selected",

      filterName:
        locale === "es"
          ? "Buscar por razón social, nombre comercial o RUC..."
          : "Search by legal name, commercial name or tax ID...",
      filterEmail:
        locale === "es"
          ? "Buscar por email principal..."
          : "Search by primary email...",
      filterStatus: locale === "es" ? "Estado" : "Status",
      all: locale === "es" ? "Todos" : "All",
      active: locale === "es" ? "Activo" : "Active",
      inactive: locale === "es" ? "Inactivo" : "Inactive",

      legalName: locale === "es" ? "Razón social" : "Legal name",
      commercialName:
        locale === "es" ? "Nombre comercial" : "Commercial name",
      taxId: locale === "es" ? "RUC / Tax ID" : "Tax ID",
      email: locale === "es" ? "Email principal" : "Primary email",
      phone: locale === "es" ? "Teléfono principal" : "Primary phone",
      statusLabel: locale === "es" ? "Estado" : "Status",
      actions: locale === "es" ? "Acciones" : "Actions",

      loading:
        locale === "es"
          ? "Cargando organizaciones..."
          : "Loading organizations...",
      noResults:
        locale === "es" ? "Sin resultados." : "No results.",

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
          ? "Error cargando organizaciones."
          : "Error loading organizations.",
      saveError:
        locale === "es"
          ? "Error al guardar la organización."
          : "Error saving organization.",
      deactivateSuccess:
        locale === "es"
          ? "Organizaciones desactivadas correctamente."
          : "Organizations deactivated successfully.",
      deactivateError:
        locale === "es"
          ? "Error desactivando organizaciones."
          : "Error deactivating organizations.",
      bulkSummary: (ok: number, fail: number) =>
        locale === "es"
          ? `Se desactivaron ${ok} organización(es), pero ${fail} fallaron.`
          : `${ok} organization(s) deactivated, but ${fail} failed.`,

      confirmDeactivateTitle:
        locale === "es"
          ? "Confirmar desactivación"
          : "Confirm deactivation",
      confirmDeactivateMessage:
        locale === "es"
          ? "¿Desactivar las organizaciones seleccionadas? Esta acción no elimina registros y puede revertirse después."
          : "Deactivate selected organizations? This action does not delete records and can be reverted later.",
      cancel: locale === "es" ? "Cancelar" : "Cancel",
      deactivate: locale === "es" ? "Desactivar" : "Deactivate",

      editOrganization:
        locale === "es" ? "Editar organización" : "Edit organization",
      statusActiveText: locale === "es" ? "Activo" : "Active",
      statusInactiveText: locale === "es" ? "Inactivo" : "Inactive",
    }),
    [locale]
  );

  /* =============================================================================
   * Main state
   * ============================================================================= */

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | "all">("all");

  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);

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

        const [organizationsRes, settingsRes] = await Promise.all([
          fetch("/api/admin/organizations", { cache: "no-store" }),
          fetch("/api/admin/settings", { cache: "no-store" }),
        ]);

        if (!organizationsRes.ok || !settingsRes.ok) {
          throw new Error("API error");
        }

        const [organizationsRaw, settingsRaw] = await Promise.all([
          safeJson(organizationsRes),
          safeJson(settingsRes),
        ]);

        setOrganizations(normalizeOrganizationsResponse(organizationsRaw));

        const settingsData = normalizeArray<SystemSettingDTO>(settingsRaw, [
          "settings",
          "data",
        ]);

        const perPageCfg = settingsData.find(
          (s) => s.key === "recordsPerPageOrganizations"
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

  async function refreshOrganizations() {
    try {
      setRefreshing(true);

      const res = await fetch("/api/admin/organizations", {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Organizations refresh failed");

      const raw = await safeJson(res);
      setOrganizations(normalizeOrganizationsResponse(raw));
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
  }, [searchName, searchEmail, statusFilter]);

  const filtered = useMemo(() => {
    return organizations.filter((organization) => {
      const legalName = organization.legalName.toLowerCase();
      const commercialName = getString(organization.commercialName).toLowerCase();
      const taxId = organization.taxId.toLowerCase();
      const primaryEmail = organization.primaryEmail.toLowerCase();

      const normalizedName = searchName.trim().toLowerCase();
      const normalizedEmail = searchEmail.trim().toLowerCase();

      const matchName =
        !normalizedName ||
        legalName.includes(normalizedName) ||
        commercialName.includes(normalizedName) ||
        taxId.includes(normalizedName);

      const matchEmail =
        !normalizedEmail || primaryEmail.includes(normalizedEmail);

      const matchStatus =
        statusFilter === "all" || organization.status === statusFilter;

      return matchName && matchEmail && matchStatus;
    });
  }, [organizations, searchName, searchEmail, statusFilter]);

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
    const validIds = new Set(organizations.map((organization) => organization._id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [organizations]);

  const selectablePageIds = paginated
    .filter((organization) => organization.status !== "inactive")
    .map((organization) => organization._id);

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

  const handleEdit = (organization: Organization) => {
    setEditing(organization);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleOrganizationSaved = (savedOrganization: Organization) => {
    setOrganizations((prev) => upsertOrganization(prev, savedOrganization));
    setModalOpen(false);
    setEditing(null);
  };

  /* =============================================================================
   * Logical deactivate
   * ============================================================================= */

  const deactivateOneRequest = async (organization: Organization): Promise<boolean> => {
    const res = await fetch(`/api/admin/organizations/${organization._id}`, {
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

  const deactivateSelectedOrganizations = async () => {
    if (selectedIds.length === 0) return;

    setBulkDeactivating(true);

    try {
      let ok = 0;
      let fail = 0;

      const selectedOrganizations = organizations.filter((organization) =>
        selectedIds.includes(organization._id)
      );

      for (const organization of selectedOrganizations) {
        if (organization.status === "inactive") {
          continue;
        }

        const updated = await deactivateOneRequest(organization);

        if (updated) ok += 1;
        else fail += 1;
      }

      if (ok > 0) {
        setOrganizations((prev) => applyInactiveStatus(prev, selectedIds));
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

  /* =============================================================================
   * Render
   * ============================================================================= */

  return (
    <>
      <GlobalDataGridShell
        title={t.title}
        subtitle={t.subtitle}
        icon={<Building2 className="h-7 w-7 text-brand-primaryStrong" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <GlobalButton
              variant="secondary"
              size="sm"
              loading={refreshing}
              leftIcon={<RefreshCw size={14} />}
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={() => void refreshOrganizations()}
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
              {t.newOrganization}
            </GlobalButton>
          </div>
        }
        filters={
          <div className="flex flex-col gap-3">
            <div className="grid max-w-5xl gap-3 md:grid-cols-3">
              <div className="flex flex-col">
                <label
                  htmlFor="organization-filter-name"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.legalName}
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="organization-filter-name"
                    name="organization-filter-name"
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
                  htmlFor="organization-filter-email"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.email}
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="organization-filter-email"
                    name="organization-filter-email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder={t.filterEmail}
                    autoComplete="off"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="organization-filter-status"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.filterStatus}
                </label>

                <select
                  id="organization-filter-status"
                  name="organization-filter-status"
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
                  id="organizations-select-all"
                  name="organizations-select-all"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                <label htmlFor="organizations-select-all" className="sr-only">
                  Select all
                </label>
              </th>

              <th className="px-3 py-3">{t.legalName}</th>
              <th className="px-3 py-3">{t.commercialName}</th>
              <th className="px-3 py-3">{t.taxId}</th>
              <th className="px-3 py-3">{t.email}</th>
              <th className="px-3 py-3">{t.phone}</th>
              <th className="px-3 py-3">{t.statusLabel}</th>
              <th className="px-3 py-3 text-right">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-5 text-center text-text-secondary">
                  {t.loading}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-5 text-center text-text-muted">
                  {t.noResults}
                </td>
              </tr>
            ) : (
              paginated.map((organization, idx) => {
                const checked = selectedIds.includes(organization._id);
                const isInactive = organization.status === "inactive";

                return (
                  <tr
                    key={organization._id}
                    className={`border-b border-border transition ${
                      checked ? "bg-surface-soft" : "bg-surface"
                    } hover:bg-surface-soft`}
                  >
                    <td className="px-3 py-3 text-text-secondary">
                      {(currentPage - 1) * recordsPerPage + idx + 1}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <input
                        id={`organizations-row-${organization._id}`}
                        name={`organizations-row-${organization._id}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        disabled={isInactive}
                        onChange={() => toggleOne(organization._id)}
                      />
                      <label
                        htmlFor={`organizations-row-${organization._id}`}
                        className="sr-only"
                      >
                        Select organization {formatOrganizationName(organization)}
                      </label>
                    </td>

                    <td className="px-3 py-3 font-semibold text-brand-primaryStrong">
                      {organization.legalName}
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      {getString(organization.commercialName).trim() || "—"}
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      {organization.taxId}
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      {organization.primaryEmail}
                    </td>

                    <td className="px-3 py-3 text-text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <Phone size={13} className="text-text-muted" />
                        {organization.primaryPhone || "—"}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                          organization.status === "active"
                            ? "border border-brand-primary bg-brand-secondary text-text-primary"
                            : "border border-border bg-surface-soft text-text-secondary"
                        }`}
                      >
                        {organization.status === "active"
                          ? t.statusActiveText
                          : t.statusInactiveText}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          aria-label={`${t.editOrganization} ${formatOrganizationName(
                            organization
                          )}`}
                          className="rounded-md border border-border bg-surface p-1.5 text-text-primary transition hover:bg-surface-soft"
                          onClick={() => handleEdit(organization)}
                        >
                          <Edit3 size={16} />
                        </button>

                        {!isInactive ? (
                          <button
                            type="button"
                            aria-label={`${t.deactivate} ${formatOrganizationName(
                              organization
                            )}`}
                            className="rounded-md border border-status-error bg-surface p-1.5 text-status-error transition hover:bg-surface-soft"
                            onClick={() => {
                              setSelectedIds([organization._id]);
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
        onConfirm={() => void deactivateSelectedOrganizations()}
      />

      <OrganizationModal
        isOpen={modalOpen}
        organization={editing}
        onClose={handleModalClose}
        onSaved={handleOrganizationSaved}
      />
    </>
  );
}