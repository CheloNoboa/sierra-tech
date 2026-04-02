"use client";

/**
 * =============================================================================
 * 📄 Page: Public Contact
 * Path: src/app/contact/page.tsx
 * =============================================================================
 *
 * ES:
 * Página pública de contacto con soporte para múltiples intenciones dentro
 * de un único flujo:
 *
 * - general
 * - advisory
 * - quote
 * - support
 *
 * Además:
 * - consume catálogo público de clases de servicio
 * - muestra selector dinámico cuando aplica
 *
 * EN:
 * Public contact page with intent-based variants.
 * =============================================================================
 */

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type ContactIntent = "general" | "advisory" | "quote" | "support";

interface LocalizedText {
  es: string;
  en: string;
}

interface ContactIntentConfig {
  title: LocalizedText;
  description: LocalizedText;
  submitLabel: LocalizedText;
  showServiceSelector: boolean;
  serviceRequired: boolean;
}

interface ServiceClassOption {
  key: string;
  label: LocalizedText;
}

interface ContactFormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  serviceClassKey: string;
  message: string;
}

interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
  serviceClassKey?: string;
}

interface ContactApiPayload {
  intent: ContactIntent;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  location?: string;
  serviceClassKey?: string;
  message: string;
}

interface ContactApiResponse {
  ok?: boolean;
  message?: string;
}

interface PublicServiceClassesResponse {
  ok?: boolean;
  items?: ServiceClassOption[];
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const CONTACT_INTENT_CONFIG: Record<ContactIntent, ContactIntentConfig> = {
  general: {
    title: {
      es: "Contáctanos",
      en: "Contact us",
    },
    description: {
      es: "Envíanos tu mensaje y nuestro equipo te responderá a la brevedad.",
      en: "Send us your message and our team will get back to you shortly.",
    },
    submitLabel: {
      es: "Enviar mensaje",
      en: "Send message",
    },
    showServiceSelector: true,
    serviceRequired: false,
  },

  advisory: {
    title: {
      es: "Solicitar asesoría",
      en: "Request advisory support",
    },
    description: {
      es: "Recibe orientación técnica para identificar la mejor solución para tu proyecto.",
      en: "Get technical guidance to identify the best solution for your project.",
    },
    submitLabel: {
      es: "Solicitar asesoría",
      en: "Request advisory",
    },
    showServiceSelector: true,
    serviceRequired: true,
  },

  quote: {
    title: {
      es: "Solicitar cotización",
      en: "Request a quote",
    },
    description: {
      es: "Indícanos los detalles de tu proyecto y te enviaremos una propuesta.",
      en: "Tell us about your project and we will send you a proposal.",
    },
    submitLabel: {
      es: "Solicitar cotización",
      en: "Request quote",
    },
    showServiceSelector: true,
    serviceRequired: true,
  },

  support: {
    title: {
      es: "Soporte",
      en: "Support",
    },
    description: {
      es: "¿Necesitas ayuda? Escríbenos y te asistimos.",
      en: "Need help? Contact us and we will assist you.",
    },
    submitLabel: {
      es: "Enviar solicitud",
      en: "Send request",
    },
    showServiceSelector: false,
    serviceRequired: false,
  },
};

const EMPTY_FORM: ContactFormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  location: "",
  serviceClassKey: "",
  message: "",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getLocalizedText(value: LocalizedText, locale: Locale): string {
  return locale === "es" ? value.es : value.en;
}

function normalizeIntent(value: string | null): ContactIntent {
  if (value === "advisory") return "advisory";
  if (value === "quote") return "quote";
  if (value === "support") return "support";
  return "general";
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function buildPayload(
  form: ContactFormState,
  intent: ContactIntent
): ContactApiPayload {
  return {
    intent,
    name: form.name.trim(),
    company: form.company.trim() || undefined,
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    location: form.location.trim() || undefined,
    serviceClassKey: form.serviceClassKey.trim() || undefined,
    message: form.message.trim(),
  };
}

function validateForm(
  form: ContactFormState,
  intent: ContactIntent,
  locale: Locale
): ContactFormErrors {
  const errors: ContactFormErrors = {};
  const requiresServiceClass = CONTACT_INTENT_CONFIG[intent].serviceRequired;

  if (!form.name.trim()) {
    errors.name =
      locale === "es" ? "Ingresa tu nombre." : "Enter your name.";
  }

  if (!isValidEmail(form.email)) {
    errors.email =
      locale === "es"
        ? "Ingresa un correo válido."
        : "Enter a valid email address.";
  }

  if (requiresServiceClass && !form.serviceClassKey.trim()) {
    errors.serviceClassKey =
      locale === "es"
        ? "Selecciona una clase de servicio."
        : "Select a service class.";
  }

  if (!form.message.trim()) {
    errors.message =
      locale === "es" ? "Escribe tu mensaje." : "Write your message.";
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Client content                                                             */
/* -------------------------------------------------------------------------- */

function ContactPageContent() {
  const searchParams = useSearchParams();
  const { locale } = useTranslation();

  const lang: Locale = locale === "en" ? "en" : "es";
  const intent = normalizeIntent(searchParams.get("intent"));
  const config = CONTACT_INTENT_CONFIG[intent];

  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [serviceClasses, setServiceClasses] = useState<ServiceClassOption[]>([]);

  useEffect(() => {
    async function loadServiceClasses() {
      try {
        const response = await fetch("/api/public/service-classes", {
          method: "GET",
          cache: "no-store",
        });

        const result: PublicServiceClassesResponse = await response
          .json()
          .catch(() => ({ ok: false, items: [] }));

        if (!response.ok || result.ok === false) {
          setServiceClasses([]);
          return;
        }

        setServiceClasses(Array.isArray(result.items) ? result.items : []);
      } catch (error) {
        console.error("[ContactPage] service classes load error:", error);
        setServiceClasses([]);
      }
    }

    void loadServiceClasses();
  }, []);

  const content = useMemo(
    () => ({
      badge: lang === "es" ? "Contacto" : "Contact",
      formTitle: lang === "es" ? "Formulario" : "Form",
      name: lang === "es" ? "Nombre" : "Name",
      company: lang === "es" ? "Empresa" : "Company",
      email: "Email",
      phone: lang === "es" ? "Teléfono" : "Phone",
      location: lang === "es" ? "Ciudad / provincia" : "City / region",
      serviceClass:
        lang === "es" ? "Clase de servicio" : "Service class",
      serviceClassPlaceholder:
        lang === "es"
          ? "Selecciona una opción"
          : "Select an option",
      message: lang === "es" ? "Mensaje" : "Message",
      success:
        lang === "es"
          ? "Tu solicitud fue enviada correctamente."
          : "Your request was sent successfully.",
      error:
        lang === "es"
          ? "No se pudo enviar la solicitud. Inténtalo nuevamente."
          : "The request could not be sent. Please try again.",
    }),
    [lang]
  );

  const handleChange = (
    field: keyof ContactFormState,
    value: string
  ): void => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));

    if (submitSuccess) setSubmitSuccess("");
    if (submitError) setSubmitError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(form, intent, lang);
    setErrors(nextErrors);
    setSubmitSuccess("");
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = buildPayload(form, intent);

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: ContactApiResponse = await response
        .json()
        .catch(() => ({ ok: response.ok }));

      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "CONTACT_REQUEST_FAILED");
      }

      setSubmitSuccess(result.message?.trim() || content.success);
      setForm(EMPTY_FORM);
      setErrors({});
    } catch (error) {
      console.error("[ContactPage] Submit error:", error);
      setSubmitError(content.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-10 pt-28 md:px-10 md:pb-12 md:pt-32">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full border border-lime-200 bg-lime-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
              {content.badge}
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-950 md:text-5xl xl:text-[4rem]">
              {getLocalizedText(config.title, lang)}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg md:leading-9">
              {getLocalizedText(config.description, lang)}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[30px] border border-slate-200 bg-slate-50 p-7 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
              Sierra Tech
            </p>

            <h2 className="mt-4 text-2xl font-semibold text-slate-950 md:text-3xl">
              {content.formTitle}
            </h2>

            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 md:text-base">
              <p>
                {lang === "es"
                  ? "Usa este formulario para comunicarte con nuestro equipo. La información enviada se clasifica según la intención seleccionada."
                  : "Use this form to contact our team. Submitted information is classified according to the selected intent."}
              </p>

              {config.showServiceSelector ? (
                <p>
                  {lang === "es"
                    ? "Selecciona la clase de servicio relacionada con tu necesidad para facilitar una atención más precisa."
                    : "Select the service class related to your needs for a more accurate response."}
                </p>
              ) : (
                <p>
                  {lang === "es"
                    ? "Si tu requerimiento necesita seguimiento técnico o comercial, nuestro equipo te orientará en el siguiente paso."
                    : "If your request requires technical or commercial follow-up, our team will guide you on the next step."}
                </p>
              )}
            </div>
          </aside>

          <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-8">
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {content.name}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                  />
                  {errors.name ? (
                    <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="contact-company"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {content.company}
                  </label>
                  <input
                    id="contact-company"
                    type="text"
                    value={form.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {content.email}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                  />
                  {errors.email ? (
                    <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="contact-phone"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {content.phone}
                  </label>
                  <input
                    id="contact-phone"
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-location"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  {content.location}
                </label>
                <input
                  id="contact-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
              </div>

              {config.showServiceSelector ? (
                <div>
                  <label
                    htmlFor="contact-service-class"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {content.serviceClass}
                  </label>
                  <select
                    id="contact-service-class"
                    value={form.serviceClassKey}
                    onChange={(e) =>
                      handleChange("serviceClassKey", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                  >
                    <option value="">{content.serviceClassPlaceholder}</option>
                    {serviceClasses.map((serviceClass) => (
                      <option key={serviceClass.key} value={serviceClass.key}>
                        {getLocalizedText(serviceClass.label, lang)}
                      </option>
                    ))}
                  </select>
                  {errors.serviceClassKey ? (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.serviceClassKey}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  {content.message}
                </label>
                <textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  rows={7}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
                {errors.message ? (
                  <p className="mt-2 text-sm text-red-600">{errors.message}</p>
                ) : null}
              </div>

              {submitSuccess ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {submitSuccess}
                </div>
              ) : null}

              {submitError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-lime-500 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting
                    ? lang === "es"
                      ? "Enviando..."
                      : "Sending..."
                    : getLocalizedText(config.submitLabel, lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Page wrapper                                                               */
/* -------------------------------------------------------------------------- */

export default function ContactPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <ContactPageContent />
    </Suspense>
  );
}