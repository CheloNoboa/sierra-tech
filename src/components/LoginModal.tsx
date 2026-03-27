// File: src/components/LoginModal.tsx
"use client";

/**
 * =============================================================================
 * 📌 Component: LoginModal — Public Authentication Modal
 * Path: src/components/LoginModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal público de autenticación para Sierra Tech.
 * - Incluye:
 *   - login con credenciales
 *   - login con Google
 *   - recuperación de contraseña
 *   - sincronización cross-tab de sesión
 *
 * Decisiones:
 * - NO usa getSession()
 * - NO depende del dominio anterior
 * - Resuelve redirección post-login consultando la sesión actual
 * - Conserva acceso al panel administrativo cuando el rol corresponde
 *
 * Nota importante:
 * - La mayor parte del look visual del modal se controla desde:
 *   "@/components/auth/authModalStyles"
 * - Este archivo solo corrige los elementos visuales hardcodeados locales
 *   para alinearlos con Sierra Tech.
 *
 * EN:
 * - Public authentication modal for Sierra Tech.
 * =============================================================================
 */

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
import { AUTH_MODAL_STYLES } from "@/components/auth/authModalStyles";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffGoogle?: boolean;
}

interface SessionResponseUser {
  role?: string | null;
}

interface SessionResponse {
  user?: SessionResponseUser | null;
}

function mapRoleToPostLoginPath(role: string | null | undefined): string {
  if (role === "superadmin" || role === "admin" || role === "user") {
    return "/admin/dashboard";
  }

  return "/user/home";
}

export default function LoginModal({
  isOpen,
  onClose,
  staffGoogle = false,
}: LoginModalProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("lastEmail");
    if (saved) {
      setEmail(saved);
    }
  }, []);

  const handleClose = (): void => {
    setError("");
    setShowRecovery(false);
    setRecoveryEmail("");
    setShowPassword(false);
    onClose();
  };

  async function resolvePostLoginPathFromSession(): Promise<string> {
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as SessionResponse | null;
      const role = data?.user?.role ?? null;

      return mapRoleToPostLoginPath(role);
    } catch {
      return "/user/home";
    }
  }

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError("");

    if (typeof window !== "undefined") {
      localStorage.setItem("lastEmail", email);
    }

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError(t.login.error);
      return;
    }

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("session-updates");
        channel.postMessage("refresh-session");
        channel.close();
      }
    } catch {
      /* noop */
    }

    handleClose();
    router.refresh();

    const nextPath = await resolvePostLoginPathFromSession();
    router.push(nextPath);
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setError("");

    if (staffGoogle) {
      await signIn("google", { callbackUrl: "/admin/dashboard" });
      return;
    }

    await signIn("google", { callbackUrl: "/google-complete" });
  };

  const handlePasswordReset = async (): Promise<void> => {
    if (!recoveryEmail.trim()) {
      toast.error(locale === "es" ? "Ingresa tu correo." : "Enter your email.");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail }),
      });

      if (!res.ok) {
        toast.error(
          locale === "es"
            ? "No se pudo enviar el correo."
            : "Could not send email."
        );
        return;
      }

      toast.success(
        locale === "es"
          ? "Te enviamos un enlace de recuperación."
          : "We sent you a recovery link."
      );

      setShowRecovery(false);
      setRecoveryEmail("");
    } catch {
      toast.error(
        locale === "es"
          ? "No se pudo enviar el correo."
          : "Could not send email."
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className={AUTH_MODAL_STYLES.overlay}>
      <div className={AUTH_MODAL_STYLES.panel}>
        <button
          type="button"
          onClick={handleClose}
          aria-label={locale === "es" ? "Cerrar modal" : "Close modal"}
          className={AUTH_MODAL_STYLES.closeButton}
        >
          ✕
        </button>

        <h2 className={AUTH_MODAL_STYLES.title}>{t.login.title}</h2>

        <button
          type="button"
          onClick={() => void handleGoogleLogin()}
          className={AUTH_MODAL_STYLES.googleButton}
        >
          <Image
            src="/icons/google_logo.png"
            alt="Google"
            width={20}
            height={20}
          />
          {t.login.google}
        </button>

        <div className={AUTH_MODAL_STYLES.dividerWrap}>
          <div className={AUTH_MODAL_STYLES.dividerLine} />
          <span className={AUTH_MODAL_STYLES.dividerText}>{t.login.or}</span>
          <div className={AUTH_MODAL_STYLES.dividerLine} />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          <label htmlFor="login-email" className="sr-only">
            Email
          </label>
          <input
            id="login-email"
            name="login-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.login.email}
            className={`${AUTH_MODAL_STYLES.inputBase} ${AUTH_MODAL_STYLES.inputNormalBorder}`}
          />

          <label htmlFor="login-password" className="sr-only">
            Password
          </label>

          <div className="relative">
            <input
              id="login-password"
              name="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.login.password}
              className={`${AUTH_MODAL_STYLES.inputPassword} ${AUTH_MODAL_STYLES.inputNormalBorder}`}
            />

            <div className={AUTH_MODAL_STYLES.eyeWrap}>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? locale === "es"
                      ? "Ocultar contraseña"
                      : "Hide password"
                    : locale === "es"
                      ? "Mostrar contraseña"
                      : "Show password"
                }
                aria-pressed={showPassword}
                className={AUTH_MODAL_STYLES.eyeButton}
              >
                {showPassword ? (
                  <HiOutlineEyeOff className="h-5 w-5" />
                ) : (
                  <HiOutlineEye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-status-error">{error}</p> : null}

          <button type="submit" className={AUTH_MODAL_STYLES.submitButton}>
            {t.login.submit}
          </button>
        </form>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowRecovery(true)}
            className="text-sm text-brand-primaryStrong underline transition hover:opacity-80"
          >
            {locale === "es"
              ? "¿Olvidaste tu contraseña?"
              : "Forgot your password?"}
          </button>
        </div>
      </div>

      {showRecovery && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className={AUTH_MODAL_STYLES.panel}>
            <h3 className="text-center text-lg font-semibold text-text-primary">
              {locale === "es" ? "Recuperar contraseña" : "Password recovery"}
            </h3>

            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder={
                locale === "es" ? "Correo electrónico" : "Email address"
              }
              className={AUTH_MODAL_STYLES.inputFull}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRecovery(false)}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-soft hover:text-text-primary"
              >
                {locale === "es" ? "Cancelar" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => void handlePasswordReset()}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
              >
                {locale === "es" ? "Enviar enlace" : "Send link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}