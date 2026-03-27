"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Services
 * Path: src/app/admin/dashboard/services/page.tsx
 * =============================================================================
 *
 * ES:
 *   Pantalla administrativa para gestionar los servicios públicos del sitio.
 *
 *   Responsabilidad:
 *   - Listar servicios existentes
 *   - Crear nuevos servicios
 *   - Editar servicios
 *   - Eliminar servicios
 *
 *   Alcance actual:
 *   - CRUD funcional
 *   - Formulario estructurado
 *   - Configuración superior de la página pública /services
 *     desde el mismo módulo Services
 *
 *   Decisión de estructura:
 *   - La cabecera pública de /services ya no forma parte de cada servicio.
 *   - La cabecera se administra como estado global de esta pantalla.
 *   - El CRUD de servicios permanece aislado de esa configuración global.
 *
 * EN:
 *   Administrative page used to manage public website services.
 * =============================================================================
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Pencil,
  Trash2,
  Wrench,
  X,
  Save,
  Star,
  StarOff,
} from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { useToast } from "@/components/ui/GlobalToastProvider";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type AllowedRole = "admin" | "superadmin";
type ServiceStatus = "draft" | "published";

interface LocalizedText {
  es: string;
  en: string;
}

interface ServiceGalleryItem {
  url: string;
  alt: LocalizedText;
  order: number;
}

interface ServiceSeo {
  metaTitle: LocalizedText;
  metaDescription: LocalizedText;
  image: string;
}

interface ServiceTechnicalSpecs {
  capacity: LocalizedText;
  flowRate: LocalizedText;
  material: LocalizedText;
  application: LocalizedText;
  technology: LocalizedText;
}

interface ServiceAttachmentRef {
  documentId: string;
  title?: string;
}

/**
 * Cabecera global de la página pública /services.
 *
 * NOTA:
 * - No pertenece a un servicio individual.
 * - Se administra a nivel de pantalla.
 */
interface ServicePageHeader {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  primaryCtaLabel: LocalizedText;
  primaryCtaHref: string;
  secondaryCtaLabel: LocalizedText;
  secondaryCtaHref: string;
}

interface ServicePayload {
  title: LocalizedText;
  slug: string;
  category: string;
  summary: LocalizedText;
  description: LocalizedText;
  coverImage: string;
  gallery: ServiceGalleryItem[];
  technicalSpecs: ServiceTechnicalSpecs;
  order: number;
  featured: boolean;
  status: ServiceStatus;
  seo: ServiceSeo;
  attachments: ServiceAttachmentRef[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

interface ServiceListItem extends ServicePayload {
  _id?: string;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = { es: "", en: "" };

const EMPTY_PAGE_HEADER: ServicePageHeader = {
  eyebrow: { es: "", en: "" },
  title: { es: "", en: "" },
  subtitle: { es: "", en: "" },
  primaryCtaLabel: { es: "", en: "" },
  primaryCtaHref: "",
  secondaryCtaLabel: { es: "", en: "" },
  secondaryCtaHref: "",
};

const SERVICE_DEFAULTS: ServicePayload = {
  title: { es: "", en: "" },
  slug: "",
  category: "",
  summary: { es: "", en: "" },
  description: { es: "", en: "" },
  coverImage: "",
  gallery: [],
  technicalSpecs: {
    capacity: { es: "", en: "" },
    flowRate: { es: "", en: "" },
    material: { es: "", en: "" },
    application: { es: "", en: "" },
    technology: { es: "", en: "" },
  },
  order: 1,
  featured: false,
  status: "draft",
  seo: {
    metaTitle: { es: "", en: "" },
    metaDescription: { es: "", en: "" },
    image: "",
  },
  attachments: [],
  createdAt: "",
  updatedAt: "",
  updatedBy: "",
  updatedByEmail: "",
};

const SERVICE_CATEGORIES = [
  "tratamiento-agua",
  "control-olores",
  "biorremediacion",
  "energia-solar",
  "procesos-microbiologicos",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
  return role === "admin" || role === "superadmin";
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText = EMPTY_LOCALIZED_TEXT
): LocalizedText {
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es, fallback.es),
    en: normalizeString(record.en, fallback.en),
  };
}

function normalizeGallery(value: unknown): ServiceGalleryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): ServiceGalleryItem | null => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      return {
        url: normalizeString(record.url),
        alt: normalizeLocalizedText(record.alt),
        order: Math.max(1, normalizeNumber(record.order, index + 1)),
      };
    })
    .filter((item): item is ServiceGalleryItem => item !== null)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index + 1,
    }));
}

function normalizeAttachments(value: unknown): ServiceAttachmentRef[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ServiceAttachmentRef | null => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      return {
        documentId: normalizeString(record.documentId),
        title: normalizeString(record.title),
      };
    })
    .filter((item): item is ServiceAttachmentRef => item !== null);
}

function normalizeService(value: unknown): ServicePayload {
  if (!value || typeof value !== "object") {
    return structuredClone(SERVICE_DEFAULTS);
  }

  const record = value as Record<string, unknown>;
  const technicalSpecs = (record.technicalSpecs ?? {}) as Record<string, unknown>;
  const seo = (record.seo ?? {}) as Record<string, unknown>;

  return {
    title: normalizeLocalizedText(record.title),
    slug: normalizeString(record.slug),
    category: normalizeString(record.category),
    summary: normalizeLocalizedText(record.summary),
    description: normalizeLocalizedText(record.description),
    coverImage: normalizeString(record.coverImage),
    gallery: normalizeGallery(record.gallery),
    technicalSpecs: {
      capacity: normalizeLocalizedText(technicalSpecs.capacity),
      flowRate: normalizeLocalizedText(technicalSpecs.flowRate),
      material: normalizeLocalizedText(technicalSpecs.material),
      application: normalizeLocalizedText(technicalSpecs.application),
      technology: normalizeLocalizedText(technicalSpecs.technology),
    },
    order: Math.max(1, normalizeNumber(record.order, 1)),
    featured: normalizeBoolean(record.featured, false),
    status: record.status === "published" ? "published" : "draft",
    seo: {
      metaTitle: normalizeLocalizedText(seo.metaTitle),
      metaDescription: normalizeLocalizedText(seo.metaDescription),
      image: normalizeString(seo.image),
    },
    attachments: normalizeAttachments(record.attachments),
    createdAt: normalizeString(record.createdAt),
    updatedAt: normalizeString(record.updatedAt),
    updatedBy: normalizeString(record.updatedBy),
    updatedByEmail: normalizeString(record.updatedByEmail),
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* -------------------------------------------------------------------------- */
/* Small UI helpers                                                           */
/* -------------------------------------------------------------------------- */

function SectionCard(props: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-text-primary">
          {props.title}
        </h3>
        {props.subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-5">{props.children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-text-primary">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${
        props.className ?? ""
      }`}
    />
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-text-primary">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      <span>{props.label}</span>
    </label>
  );
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50 ${
        props.className ?? ""
      }`}
    />
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        props.className ?? ""
      }`}
    />
  );
}

function ServiceModal(props: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {props.title}
          </h2>

          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-soft hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">{props.children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ServicesPage() {
  const { locale } = useTranslation();
  const lang: Locale = locale === "es" ? "es" : "en";

  const { data: session, status } = useSession();
  const toast = useToast();

  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServicePayload>(SERVICE_DEFAULTS);

  /**
   * --------------------------------------------------------------------------
   * Header global de la página pública /services
   * --------------------------------------------------------------------------
   * ES:
   *   Estado independiente del CRUD de servicios.
   *   No pertenece a ningún servicio individual.
   *
   * EN:
   *   Global state for the public /services page header.
   * --------------------------------------------------------------------------
   */
  const [servicesHeader, setServicesHeader] = useState<ServicePageHeader>(
    structuredClone(EMPTY_PAGE_HEADER)
  );

  const role = session?.user?.role;
  const hasAccess = isAllowedRole(role);

  const modalTitle = editingId
    ? lang === "es"
      ? "Editar servicio"
      : "Edit service"
    : lang === "es"
      ? "Crear servicio"
      : "Create service";

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.order - b.order);
  }, [services]);

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch("/api/admin/services", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const payload: unknown = await response.json().catch(() => null);

        const payloadRecord =
          payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : {};

        const dataRecord =
          payloadRecord.data && typeof payloadRecord.data === "object"
            ? (payloadRecord.data as Record<string, unknown>)
            : {};

        const rows = Array.isArray(dataRecord.services) ? dataRecord.services : [];

        const pageRecord =
          dataRecord.page && typeof dataRecord.page === "object"
            ? (dataRecord.page as Record<string, unknown>)
            : {};

        const headerRecord =
          pageRecord.header && typeof pageRecord.header === "object"
            ? pageRecord.header
            : null;

        if (headerRecord) {
          const safeHeader = headerRecord as Record<string, unknown>;

          setServicesHeader({
            eyebrow: normalizeLocalizedText(safeHeader.eyebrow),
            title: normalizeLocalizedText(safeHeader.title),
            subtitle: normalizeLocalizedText(safeHeader.subtitle),
            primaryCtaLabel: normalizeLocalizedText(safeHeader.primaryCtaLabel),
            primaryCtaHref: normalizeString(safeHeader.primaryCtaHref),
            secondaryCtaLabel: normalizeLocalizedText(safeHeader.secondaryCtaLabel),
            secondaryCtaHref: normalizeString(safeHeader.secondaryCtaHref),
          });
        } else {
          setServicesHeader(structuredClone(EMPTY_PAGE_HEADER));
        }

        const normalized: ServiceListItem[] = rows.map((row) => {
          const record =
            row && typeof row === "object"
              ? (row as Record<string, unknown>)
              : {};

          return {
            ...normalizeService(row),
            _id: normalizeString(record._id),
          };
        });

        setServices(normalized);
      } catch (error) {
        console.error("[ServicesPage] Error loading services:", error);
        toast.error(
          lang === "es"
            ? "No se pudieron cargar los servicios."
            : "Could not load services."
        );
      } finally {
        setLoading(false);
      }
    }

    if (status !== "authenticated" || !hasAccess) {
      setLoading(false);
      return;
    }

    void loadServices();
  }, [status, hasAccess, toast, lang]);

  function openCreateModal(): void {
    const nextOrder = services.length + 1;

    setEditingId(null);
    setForm({
      ...structuredClone(SERVICE_DEFAULTS),
      order: nextOrder,
    });
    setModalOpen(true);
  }

  function openEditModal(item: ServiceListItem): void {
    setEditingId(item._id ?? null);
    setForm(normalizeService(item));
    setModalOpen(true);
  }

  function closeModal(): void {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(structuredClone(SERVICE_DEFAULTS));
  }

  async function handleDelete(id: string): Promise<void> {
    const confirmed = window.confirm(
      lang === "es"
        ? "¿Deseas eliminar este servicio?"
        : "Do you want to delete this service?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      setServices((prev) => prev.filter((item) => item._id !== id));

      toast.success(
        lang === "es"
          ? "Servicio eliminado correctamente."
          : "Service deleted successfully."
      );
    } catch (error) {
      console.error("[ServicesPage] Error deleting service:", error);
      toast.error(
        lang === "es"
          ? "No se pudo eliminar el servicio."
          : "Could not delete service."
      );
    }
  }

  async function handleSave(): Promise<void> {
    try {
      setSaving(true);

      const payload: ServicePayload = {
        ...form,
        slug: slugify(form.slug || form.title.es || form.title.en),
      };

      const isEditing = Boolean(editingId);
      const url = isEditing
        ? `/api/admin/services/${editingId}`
        : "/api/admin/services";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody: unknown = await response.json().catch(() => null);
        console.error("[ServicesPage] Save error response:", errorBody);
        throw new Error(`HTTP_${response.status}`);
      }

      const saved: unknown = await response.json().catch(() => null);
      const savedRecord =
        saved && typeof saved === "object"
          ? (saved as Record<string, unknown>)
          : {};

      const normalized: ServiceListItem = {
        ...normalizeService(saved),
        _id: normalizeString(savedRecord._id, editingId ?? ""),
      };

      setServices((prev) => {
        if (isEditing) {
          return prev.map((item) =>
            item._id === editingId ? normalized : item
          );
        }

        return [...prev, normalized];
      });

      toast.success(
        lang === "es"
          ? "Servicio guardado correctamente."
          : "Service saved successfully."
      );

      closeModal();
    } catch (error) {
      console.error("[ServicesPage] Error saving service:", error);
      toast.error(
        lang === "es"
          ? "No se pudo guardar el servicio."
          : "Could not save service."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateLocalizedField(
    field: "title" | "summary" | "description",
    localeKey: Locale,
    value: string
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [localeKey]: value,
      },
    }));
  }

  function updateTechnicalSpecField(
    field: keyof ServiceTechnicalSpecs,
    localeKey: Locale,
    value: string
  ): void {
    setForm((prev) => ({
      ...prev,
      technicalSpecs: {
        ...prev.technicalSpecs,
        [field]: {
          ...prev.technicalSpecs[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateSeoField(
    field: "metaTitle" | "metaDescription",
    localeKey: Locale,
    value: string
  ): void {
    setForm((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: {
          ...prev.seo[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateServicesHeaderField(
    field:
      | "eyebrow"
      | "title"
      | "subtitle"
      | "primaryCtaLabel"
      | "secondaryCtaLabel",
    localeKey: Locale,
    value: string
  ): void {
    setServicesHeader((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [localeKey]: value,
      },
    }));
  }

  async function handleSaveServicesHeader(): Promise<void> {
    try {
      setSaving(true);

      const response = await fetch("/api/admin/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageHeader: servicesHeader }),
      });

      if (!response.ok) {
        const errorBody: unknown = await response.json().catch(() => null);
        console.error(
          "[ServicesPage] Save services header error response:",
          errorBody
        );
        throw new Error(`HTTP_${response.status}`);
      }

      toast.success(
        lang === "es"
          ? "Cabecera de servicios guardada correctamente."
          : "Services header saved successfully."
      );
    } catch (error) {
      console.error("[ServicesPage] Error saving services header:", error);
      toast.error(
        lang === "es"
          ? "No se pudo guardar la cabecera de servicios."
          : "Could not save services header."
      );
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es" ? "Cargando sesión..." : "Loading session..."}
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
          {lang === "es"
            ? "Acceso restringido a administradores."
            : "Admin access only."}
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es" ? "Cargando servicios..." : "Loading services..."}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader
        icon={<Wrench className="h-6 w-6 text-brand-primaryStrong" />}
        title={lang === "es" ? "Servicios" : "Services"}
        subtitle={
          lang === "es"
            ? "Administra los servicios públicos del sitio."
            : "Manage the public website services."
        }
      />

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-text-secondary">
          {lang === "es"
            ? `${sortedServices.length} servicio(s) registrados`
            : `${sortedServices.length} service(s) registered`}
        </div>

        <PrimaryButton onClick={openCreateModal}>
          <Plus size={18} />
          <span>{lang === "es" ? "Nuevo servicio" : "New service"}</span>
        </PrimaryButton>
      </div>

      <SectionCard
        title={
          lang === "es"
            ? "Cabecera global de la página de servicios"
            : "Global services page header"
        }
        subtitle={
          lang === "es"
            ? "Configura el contenido superior de /services una sola vez. Este contenido ya no forma parte de cada servicio individual."
            : "Configure the top content of /services once. This content no longer belongs to each individual service."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Eyebrow ES</FieldLabel>
            <TextInput
              value={servicesHeader.eyebrow.es}
              onChange={(e) =>
                updateServicesHeaderField("eyebrow", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Eyebrow EN</FieldLabel>
            <TextInput
              value={servicesHeader.eyebrow.en}
              onChange={(e) =>
                updateServicesHeaderField("eyebrow", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Título superior ES</FieldLabel>
            <TextInput
              value={servicesHeader.title.es}
              onChange={(e) =>
                updateServicesHeaderField("title", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Top title EN</FieldLabel>
            <TextInput
              value={servicesHeader.title.en}
              onChange={(e) =>
                updateServicesHeaderField("title", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Subtítulo ES</FieldLabel>
            <TextArea
              value={servicesHeader.subtitle.es}
              onChange={(e) =>
                updateServicesHeaderField("subtitle", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Subtitle EN</FieldLabel>
            <TextArea
              value={servicesHeader.subtitle.en}
              onChange={(e) =>
                updateServicesHeaderField("subtitle", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>CTA principal ES</FieldLabel>
            <TextInput
              value={servicesHeader.primaryCtaLabel.es}
              onChange={(e) =>
                updateServicesHeaderField(
                  "primaryCtaLabel",
                  "es",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <FieldLabel>Primary CTA EN</FieldLabel>
            <TextInput
              value={servicesHeader.primaryCtaLabel.en}
              onChange={(e) =>
                updateServicesHeaderField(
                  "primaryCtaLabel",
                  "en",
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <div>
          <FieldLabel>
            {lang === "es" ? "URL CTA principal" : "Primary CTA URL"}
          </FieldLabel>
          <TextInput
            value={servicesHeader.primaryCtaHref}
            onChange={(e) =>
              setServicesHeader((prev) => ({
                ...prev,
                primaryCtaHref: e.target.value,
              }))
            }
            placeholder="/contact"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>CTA secundario ES</FieldLabel>
            <TextInput
              value={servicesHeader.secondaryCtaLabel.es}
              onChange={(e) =>
                updateServicesHeaderField(
                  "secondaryCtaLabel",
                  "es",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <FieldLabel>Secondary CTA EN</FieldLabel>
            <TextInput
              value={servicesHeader.secondaryCtaLabel.en}
              onChange={(e) =>
                updateServicesHeaderField(
                  "secondaryCtaLabel",
                  "en",
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <div>
          <FieldLabel>
            {lang === "es" ? "URL CTA secundario" : "Secondary CTA URL"}
          </FieldLabel>
          <TextInput
            value={servicesHeader.secondaryCtaHref}
            onChange={(e) =>
              setServicesHeader((prev) => ({
                ...prev,
                secondaryCtaHref: e.target.value,
              }))
            }
            placeholder="/projects"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton
            disabled={saving}
            onClick={() => void handleSaveServicesHeader()}
          >
            <Save size={18} />
            <span>
              {saving
                ? lang === "es"
                  ? "Guardando..."
                  : "Saving..."
                : lang === "es"
                  ? "Guardar cabecera"
                  : "Save header"}
            </span>
          </PrimaryButton>
        </div>
      </SectionCard>

      {sortedServices.length === 0 ? (
        <SectionCard
          title={lang === "es" ? "Sin servicios" : "No services yet"}
          subtitle={
            lang === "es"
              ? "Todavía no existen servicios registrados en el sistema."
              : "There are no registered services yet."
          }
        >
          <div className="flex justify-start">
            <ActionButton onClick={openCreateModal}>
              <Plus size={18} />
              <span>{lang === "es" ? "Crear primero" : "Create first"}</span>
            </ActionButton>
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-4">
          {sortedServices.map((item) => (
            <div
              key={item._id || item.slug || `service-row-${item.order}`}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {lang === "es"
                        ? item.title.es || "(Sin título)"
                        : item.title.en || item.title.es || "(Untitled)"}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status === "published"
                        ? lang === "es"
                          ? "Publicado"
                          : "Published"
                        : lang === "es"
                          ? "Borrador"
                          : "Draft"}
                    </span>

                    <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium text-text-secondary">
                      {item.category || "-"}
                    </span>

                    <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium text-text-secondary">
                      {lang === "es" ? "Orden" : "Order"}: {item.order}
                    </span>

                    {item.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-secondary px-2.5 py-1 text-xs font-medium text-text-primary">
                        <Star size={12} />
                        {lang === "es" ? "Destacado" : "Featured"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium text-text-secondary">
                        <StarOff size={12} />
                        {lang === "es" ? "Normal" : "Standard"}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-text-secondary">
                    {item.slug || "-"}
                  </p>

                  <p className="text-sm leading-6 text-text-secondary">
                    {lang === "es"
                      ? item.summary.es || item.description.es || "-"
                      : item.summary.en ||
                        item.summary.es ||
                        item.description.en ||
                        item.description.es ||
                        "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ActionButton onClick={() => openEditModal(item)}>
                    <Pencil size={16} />
                    <span>{lang === "es" ? "Editar" : "Edit"}</span>
                  </ActionButton>

                  <ActionButton
                    onClick={() => {
                      if (!item._id) return;
                      void handleDelete(item._id);
                    }}
                    className="hover:border-status-error hover:text-status-error"
                  >
                    <Trash2 size={16} />
                    <span>{lang === "es" ? "Eliminar" : "Delete"}</span>
                  </ActionButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceModal open={modalOpen} title={modalTitle} onClose={closeModal}>
        <div className="space-y-6">
          <SectionCard
            title={lang === "es" ? "Identidad del servicio" : "Service identity"}
            subtitle={
              lang === "es"
                ? "Define título, slug, categoría, orden y visibilidad."
                : "Define title, slug, category, order and visibility."
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Título ES</FieldLabel>
                <TextInput
                  value={form.title.es}
                  onChange={(e) =>
                    updateLocalizedField("title", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Title EN</FieldLabel>
                <TextInput
                  value={form.title.en}
                  onChange={(e) =>
                    updateLocalizedField("title", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <FieldLabel>Slug</FieldLabel>
                <TextInput
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
              </div>

              <div>
                <FieldLabel>{lang === "es" ? "Categoría" : "Category"}</FieldLabel>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
                >
                  <option value="">
                    {lang === "es" ? "Selecciona una categoría" : "Select category"}
                  </option>
                  {SERVICE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>{lang === "es" ? "Orden" : "Order"}</FieldLabel>
                <TextInput
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      order: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <Toggle
                label={lang === "es" ? "Destacado" : "Featured"}
                checked={form.featured}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, featured: value }))
                }
              />

              <div className="flex items-center gap-3">
                <FieldLabel>{lang === "es" ? "Estado" : "Status"}</FieldLabel>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status:
                        e.target.value === "published" ? "published" : "draft",
                    }))
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
                >
                  <option value="draft">
                    {lang === "es" ? "Borrador" : "Draft"}
                  </option>
                  <option value="published">
                    {lang === "es" ? "Publicado" : "Published"}
                  </option>
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={lang === "es" ? "Contenido principal" : "Main content"}
            subtitle={
              lang === "es"
                ? "Resumen, descripción e imagen principal."
                : "Summary, description and main image."
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Resumen ES</FieldLabel>
                <TextArea
                  value={form.summary.es}
                  onChange={(e) =>
                    updateLocalizedField("summary", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Summary EN</FieldLabel>
                <TextArea
                  value={form.summary.en}
                  onChange={(e) =>
                    updateLocalizedField("summary", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Descripción ES</FieldLabel>
                <TextArea
                  value={form.description.es}
                  onChange={(e) =>
                    updateLocalizedField("description", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Description EN</FieldLabel>
                <TextArea
                  value={form.description.en}
                  onChange={(e) =>
                    updateLocalizedField("description", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <FieldLabel>Cover Image</FieldLabel>
              <TextInput
                value={form.coverImage}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, coverImage: e.target.value }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title={lang === "es" ? "Especificaciones técnicas" : "Technical specifications"}
            subtitle={
              lang === "es"
                ? "Información técnica estructurada del servicio."
                : "Structured technical information for the service."
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Aplicación ES</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.application.es}
                  onChange={(e) =>
                    updateTechnicalSpecField("application", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Application EN</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.application.en}
                  onChange={(e) =>
                    updateTechnicalSpecField("application", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Capacidad ES</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.capacity.es}
                  onChange={(e) =>
                    updateTechnicalSpecField("capacity", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Capacity EN</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.capacity.en}
                  onChange={(e) =>
                    updateTechnicalSpecField("capacity", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Caudal ES</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.flowRate.es}
                  onChange={(e) =>
                    updateTechnicalSpecField("flowRate", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Flow Rate EN</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.flowRate.en}
                  onChange={(e) =>
                    updateTechnicalSpecField("flowRate", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Material ES</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.material.es}
                  onChange={(e) =>
                    updateTechnicalSpecField("material", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Material EN</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.material.en}
                  onChange={(e) =>
                    updateTechnicalSpecField("material", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>Tecnología ES</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.technology.es}
                  onChange={(e) =>
                    updateTechnicalSpecField("technology", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Technology EN</FieldLabel>
                <TextInput
                  value={form.technicalSpecs.technology.en}
                  onChange={(e) =>
                    updateTechnicalSpecField("technology", "en", e.target.value)
                  }
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="SEO"
            subtitle={
              lang === "es"
                ? "Metadatos básicos del servicio."
                : "Basic service metadata."
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>SEO Meta Title ES</FieldLabel>
                <TextInput
                  value={form.seo.metaTitle.es}
                  onChange={(e) =>
                    updateSeoField("metaTitle", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>SEO Meta Title EN</FieldLabel>
                <TextInput
                  value={form.seo.metaTitle.en}
                  onChange={(e) =>
                    updateSeoField("metaTitle", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>SEO Meta Description ES</FieldLabel>
                <TextArea
                  value={form.seo.metaDescription.es}
                  onChange={(e) =>
                    updateSeoField("metaDescription", "es", e.target.value)
                  }
                />
              </div>

              <div>
                <FieldLabel>SEO Meta Description EN</FieldLabel>
                <TextArea
                  value={form.seo.metaDescription.en}
                  onChange={(e) =>
                    updateSeoField("metaDescription", "en", e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <FieldLabel>SEO Image</FieldLabel>
              <TextInput
                value={form.seo.image}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, image: e.target.value },
                  }))
                }
              />
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton disabled={saving} onClick={() => void handleSave()}>
              <Save size={18} />
              <span>
                {saving
                  ? lang === "es"
                    ? "Guardando..."
                    : "Saving..."
                  : lang === "es"
                    ? "Guardar servicio"
                    : "Save service"}
              </span>
            </PrimaryButton>

            <ActionButton disabled={saving} onClick={closeModal}>
              <X size={18} />
              <span>{lang === "es" ? "Cancelar" : "Cancel"}</span>
            </ActionButton>
          </div>
        </div>
      </ServiceModal>
    </main>
  );
}