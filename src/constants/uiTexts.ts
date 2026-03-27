/**
 * ✅ src/constants/uiTexts.ts
 * ------------------------------------------------------------
 * Textos UI mínimos compartidos.
 * No reemplaza el sistema de traducción actual.
 * Solo centraliza literales verdaderamente reutilizados.
 * ------------------------------------------------------------
 */
export const UI_TEXTS = {
  loading: {
    es: "Cargando...",
    en: "Loading...",
  },
  maintenance: {
    title: {
      es: "Mantenimiento",
      en: "Maintenance",
    },
    sectionTitle: {
      es: "Mantenimiento de Condiciones de Uso y Privacidad",
      en: "Privacy & Terms Maintenance",
    },
  },
  lastUpdated: {
    es: "Última actualización",
    en: "Last updated",
  },
} as const;