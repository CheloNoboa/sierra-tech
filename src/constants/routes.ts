/**
 * ✅ src/constants/routes.ts
 * ------------------------------------------------------------
 * Centraliza rutas de navegación y endpoints API.
 * - Evita “strings mágicos” repartidos por el código.
 * - Si cambias una ruta, lo haces en un solo lugar.
 * ------------------------------------------------------------
 */

export const ROUTES = {
  HOME: "/",
  MENU: "/menu",
  PRIVACY_PAGE: "/privacy",
  TERMS_PAGE: "/terms",
  COOKIES_PAGE: "/cookies",

  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    PRIVACY: "/admin/dashboard/privacy",
    TERMS: "/admin/dashboard/terms",
    COOKIES: "/admin/dashboard/cookies",
    PRODUCTS: "/admin/dashboard/products",
  },

  API: {
    // 🌎 Endpoints públicos (multilenguaje)
    PRIVACY_PUBLIC: (lang: "es" | "en") => `/api/privacy?lang=${lang}`,
    TERMS_PUBLIC: (lang: "es" | "en") => `/api/terms?lang=${lang}`,
    COOKIES_PUBLIC: (lang: "es" | "en") => `/api/cookies?lang=${lang}`,

    // 🕓 Última actualización
    PRIVACY_LAST_UPDATE: (lang: "es" | "en") =>
      `/api/privacy/last-update?lang=${lang}`,
    TERMS_LAST_UPDATE: (lang: "es" | "en") =>
      `/api/terms/last-update?lang=${lang}`,
    COOKIES_LAST_UPDATE: (lang: "es" | "en") =>
      `/api/cookies/last-update?lang=${lang}`,

    // 🔒 Endpoints administrativos
    PRIVACY_ADMIN: "/api/admin/privacy",
    TERMS_ADMIN: "/api/admin/terms",
    COOKIES_ADMIN: "/api/admin/cookies",
    PRODUCTS_ADMIN: "/api/admin/products",
  },
} as const;
