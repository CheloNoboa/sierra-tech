"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Contact Requests
 * Path: src/app/admin/dashboard/contact-requests/page.tsx
 * =============================================================================
 *
 * ES:
 * Vista administrativa para revisar y gestionar solicitudes públicas de contacto.
 *
 * Responsabilidades:
 * - Consultar /api/admin/contact-requests
 * - Permitir búsqueda básica
 * - Filtrar por intención y estado
 * - Mostrar solicitudes recientes primero
 * - Permitir cambio de estado por fila
 * - Mostrar clase de servicio usando snapshot
 *
 * EN:
 * Admin page for reviewing and managing public contact requests.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type ContactIntent = "general" | "advisory" | "quote" | "support";
type ContactStatus = "new" | "in_review" | "closed";

interface LocalizedSnapshot {
  es: string;
  en: string;
}

interface ContactRequestItem {
  _id: string;
  intent: ContactIntent;
  name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  serviceClassKey: string;
  serviceClassSnapshot: LocalizedSnapshot;
  message: string;
  source: string;
  status: ContactStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ContactRequestsResponse {
  ok?: boolean;
  message?: string;
  items?: ContactRequestItem[];
}

interface UpdateStatusResponse {
  ok?: boolean;
  message?: string;
  item?: {
    _id: string;
    status: ContactStatus;
    updatedAt: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value: string | null, locale: Locale): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getIntentLabel(intent: ContactIntent, locale: Locale): string {
  const map: Record<ContactIntent, { es: string; en: string }> = {
    general: { es: "General", en: "General" },
    advisory: { es: "Asesoría", en: "Advisory" },
    quote: { es: "Cotización", en: "Quote" },
    support: { es: "Soporte", en: "Support" },
  };

  return locale === "es" ? map[intent].es : map[intent].en;
}

function getStatusLabel(status: ContactStatus, locale: Locale): string {
  const map: Record<ContactStatus, { es: string; en: string }> = {
    new: { es: "Nueva", en: "New" },
    in_review: { es: "En revisión", en: "In review" },
    closed: { es: "Cerrada", en: "Closed" },
  };

  return locale === "es" ? map[status].es : map[status].en;
}

function getStatusBadgeClass(status: ContactStatus): string {
  if (status === "new") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "in_review") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminContactRequestsPage() {
  const { locale } = useTranslation();
  const lang: Locale = locale === "en" ? "en" : "es";

  const [items, setItems] = useState<ContactRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState<"" | ContactIntent>("");
  const [statusFilter, setStatusFilter] = useState<"" | ContactStatus>("");

  const [updatingId, setUpdatingId] = useState<string>("");

  const text = useMemo(
    () => ({
      title: lang === "es" ? "Solicitudes de contacto" : "Contact requests",
      subtitle:
        lang === "es"
          ? "Revisión administrativa de leads y mensajes públicos."
          : "Administrative review of public leads and messages.",
      search: lang === "es" ? "Buscar" : "Search",
      searchPlaceholder:
        lang === "es"
          ? "Nombre, email, empresa o mensaje"
          : "Name, email, company or message",
      intent: lang === "es" ? "Intención" : "Intent",
      status: lang === "es" ? "Estado" : "Status",
      all: lang === "es" ? "Todas" : "All",
      loading: lang === "es" ? "Cargando..." : "Loading...",
      empty:
        lang === "es"
          ? "No se encontraron solicitudes."
          : "No requests found.",
      error:
        lang === "es"
          ? "No se pudo cargar la información."
          : "The information could not be loaded.",
      updateError:
        lang === "es"
          ? "No se pudo actualizar el estado."
          : "The status could not be updated.",
      name: lang === "es" ? "Nombre" : "Name",
      company: lang === "es" ? "Empresa" : "Company",
      email: "Email",
      phone: lang === "es" ? "Teléfono" : "Phone",
      location: lang === "es" ? "Ubicación" : "Location",
      serviceClass:
        lang === "es" ? "Clase de servicio" : "Service class",
      message: lang === "es" ? "Mensaje" : "Message",
      createdAt: lang === "es" ? "Fecha" : "Created",
    }),
    [lang]
  );

  useEffect(() => {
    async function loadItems() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("q", search.trim());
        }

        if (intentFilter) {
          params.set("intent", intentFilter);
        }

        if (statusFilter) {
          params.set("status", statusFilter);
        }

        const response = await fetch(
          `/api/admin/contact-requests${params.toString() ? `?${params.toString()}` : ""}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result: ContactRequestsResponse = await response
          .json()
          .catch(() => ({ ok: false, items: [] }));

        if (!response.ok || result.ok === false) {
          throw new Error(result.message || "LOAD_CONTACT_REQUESTS_FAILED");
        }

        setItems(Array.isArray(result.items) ? result.items : []);
      } catch (fetchError) {
        console.error("[AdminContactRequestsPage] load error:", fetchError);
        setItems([]);
        setError(text.error);
      } finally {
        setLoading(false);
      }
    }

    const timeout = window.setTimeout(() => {
      void loadItems();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [intentFilter, search, statusFilter, text.error]);

  const handleStatusChange = async (
    id: string,
    nextStatus: ContactStatus
  ): Promise<void> => {
    const previous = items;

    setUpdatingId(id);
    setError("");

    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, status: nextStatus } : item
      )
    );

    try {
      const response = await fetch(
        `/api/admin/contact-requests/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const result: UpdateStatusResponse = await response
        .json()
        .catch(() => ({ ok: false }));

      if (!response.ok || result.ok === false || !result.item) {
        throw new Error(result.message || "UPDATE_CONTACT_STATUS_FAILED");
      }

      setItems((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                status: result.item?.status ?? nextStatus,
                updatedAt: result.item?.updatedAt ?? item.updatedAt,
              }
            : item
        )
      );
    } catch (updateError) {
      console.error("[AdminContactRequestsPage] status update error:", updateError);
      setItems(previous);
      setError(text.updateError);
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">{text.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{text.subtitle}</p>
        </header>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {text.search}
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={text.searchPlaceholder}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {text.intent}
              </label>
              <select
                value={intentFilter}
                onChange={(e) =>
                  setIntentFilter((e.target.value as ContactIntent) || "")
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              >
                <option value="">{text.all}</option>
                <option value="general">{getIntentLabel("general", lang)}</option>
                <option value="advisory">
                  {getIntentLabel("advisory", lang)}
                </option>
                <option value="quote">{getIntentLabel("quote", lang)}</option>
                <option value="support">{getIntentLabel("support", lang)}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {text.status}
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter((e.target.value as ContactStatus) || "")
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              >
                <option value="">{text.all}</option>
                <option value="new">{getStatusLabel("new", lang)}</option>
                <option value="in_review">
                  {getStatusLabel("in_review", lang)}
                </option>
                <option value="closed">{getStatusLabel("closed", lang)}</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              {text.loading}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              {text.empty}
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lime-700">
                    {getIntentLabel(item.intent, lang)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                      item.status
                    )}`}
                  >
                    {getStatusLabel(item.status, lang)}
                  </span>

                  <span className="text-xs text-slate-500">
                    {text.createdAt}: {formatDate(item.createdAt, lang)}
                  </span>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {text.status}
                  </label>
                  <select
                    value={item.status}
                    disabled={updatingId === item._id}
                    onChange={(e) =>
                      void handleStatusChange(
                        item._id,
                        e.target.value as ContactStatus
                      )
                    }
                    className="w-full max-w-[240px] rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <option value="new">{getStatusLabel("new", lang)}</option>
                    <option value="in_review">
                      {getStatusLabel("in_review", lang)}
                    </option>
                    <option value="closed">
                      {getStatusLabel("closed", lang)}
                    </option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">{item.name || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text.company}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {item.company || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text.email}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">{item.email || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text.phone}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">{item.phone || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text.location}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {item.location || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text.serviceClass}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {item.serviceClassSnapshot?.[lang]?.trim() || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {text.message}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {item.message || "-"}
                  </p>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}