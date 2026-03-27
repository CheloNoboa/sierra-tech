"use client";

/**
 * =============================================================================
 * 📌 Page: /google-complete — Generic Google profile completion
 * Path: src/app/google-complete/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla puente para usuarios que entran con Google y todavía necesitan
 * completar datos mínimos del perfil.
 *
 * Campos actuales:
 * - name
 * - phone (E.164)
 *
 * Reglas:
 * 1) Si no hay sesión => redirect "/"
 * 2) Si el usuario ya está registrado y tiene phone => redirect "/user/home"
 * 3) Si aún falta información => permitir completar perfil
 * 4) Al guardar => actualizar vía /api/register, refrescar sesión y redirigir
 *
 * Importante:
 * - Ya NO depende de sucursales
 * - Ya NO depende de branch-detect
 * - Queda lista para ampliarse en el futuro con address/map si el proyecto lo requiere
 *
 * EN:
 * Bridge page for Google users who still need to complete basic profile data.
 * =============================================================================
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import PhoneField, { type PhoneValue } from "@/components/phone/PhoneField";
import { useTranslation } from "@/hooks/useTranslation";

/* =============================================================================
 * Types
 * ============================================================================= */

type RegisterResponse =
  | { message?: string }
  | null;

/* =============================================================================
 * Runtime helpers
 * ============================================================================= */

function getMessageIfAny(v: unknown): string {
  if (!v || typeof v !== "object") return "";
  const maybe = (v as { message?: unknown }).message;
  return typeof maybe === "string" ? maybe : "";
}

/* =============================================================================
 * Page
 * ============================================================================= */

export default function GoogleCompletePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { locale } = useTranslation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState<PhoneValue>({
    countryCode: "US",
    dialCode: "+1",
    nationalNumber: "",
    e164: "",
  });

  const [errName, setErrName] = useState("");
  const [errPhone, setErrPhone] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const loading = status === "loading";

  /* ===========================================================================
   * Initialize fields from session
   * ======================================================================== */
  useEffect(() => {
    if (!session?.user) return;

    setName(typeof session.user.name === "string" ? session.user.name : "");
  }, [session]);

  /* ===========================================================================
   * Auth/session guard
   * ======================================================================== */
  useEffect(() => {
    if (loading) return;

    if (!session?.user) {
      router.replace("/");
      return;
    }

    const hasPhone =
      typeof session.user.phone === "string" &&
      session.user.phone.trim().length > 0;

    if (session.user.isRegistered && hasPhone) {
      router.replace("/user/home");
    }
  }, [loading, session, router]);

  /* ===========================================================================
   * Validation
   * ======================================================================== */
  const validate = (): boolean => {
    let valid = true;

    setErrName("");
    setErrPhone("");
    setSubmitError("");

    if (!name.trim()) {
      setErrName(locale === "es" ? "Ingresa tu nombre." : "Enter your name.");
      valid = false;
    }

    if (!phone.nationalNumber.trim() || !phone.e164.trim()) {
      setErrPhone(locale === "es" ? "Ingresa tu teléfono." : "Enter your phone.");
      valid = false;
    }

    return valid;
  };

  /* ===========================================================================
   * Save completion
   * - Uses generic /api/register
   * ======================================================================== */
  const handleComplete = async (): Promise<void> => {
    if (!session?.user?.email) return;
    if (!validate()) return;

    setSaving(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: session.user.email,
          phone: phone.e164,
          provider: "google",
          role: "user",
        }),
      });

      const json = (await res.json().catch(() => null)) as RegisterResponse;

      if (!res.ok) {
        const msg =
          getMessageIfAny(json) ||
          (locale === "es"
            ? "Error guardando registro."
            : "Error saving registration.");

        setSubmitError(msg);
        return;
      }

      setSuccess(true);

      await update();

      setTimeout(() => {
        router.replace("/user/home");
      }, 1200);
    } catch {
      setSubmitError(
        locale === "es"
          ? "Error guardando registro."
          : "Error saving registration."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ===========================================================================
   * Render
   * ======================================================================== */
  if (loading || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        {locale === "es" ? "Cargando..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-gray-100">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold">
          {locale === "es"
            ? "Completa tu registro"
            : "Complete your registration"}
        </h1>

        {success ? (
          <div className="py-8 text-center text-green-400">
            {locale === "es" ? "Registro completo" : "Registration complete"}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1 block text-sm">
                {locale === "es" ? "Nombre" : "Name"}
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded border bg-gray-700 p-2 ${
                  errName ? "border-red-500" : "border-gray-600"
                }`}
                placeholder={locale === "es" ? "Nombre" : "Name"}
              />

              {errName ? (
                <p className="mt-1 text-xs text-red-400">{errName}</p>
              ) : null}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm">
                {locale === "es" ? "Teléfono" : "Phone"}
              </label>

              <div className={errPhone ? "rounded border border-red-500 p-1" : ""}>
                <PhoneField value={phone} onChange={setPhone} />
              </div>

              {errPhone ? (
                <p className="mt-1 text-xs text-red-400">{errPhone}</p>
              ) : null}
            </div>

            {submitError ? (
              <p className="mb-2 text-center text-red-400">{submitError}</p>
            ) : null}

            <button
              onClick={() => void handleComplete()}
              disabled={saving}
              className="w-full rounded bg-yellow-600 py-2 font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {saving
                ? locale === "es"
                  ? "Guardando..."
                  : "Saving..."
                : locale === "es"
                  ? "Guardar"
                  : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}