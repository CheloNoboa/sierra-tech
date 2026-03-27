/**
 * ✅ src/lib/validationMessages.ts
 * -------------------------------------------------------------------
 * 🎯 Helper centralizado para mensajes de validación bilingües
 * -------------------------------------------------------------------
 */

export type Locale = "es" | "en";

export const validationMessages = {
  es: {
    role: {
      name_es: "El nombre en español es obligatorio.",
      name_en: "El nombre en inglés es obligatorio.",
      description_es: "La descripción en español es obligatoria.",
      description_en: "La descripción en inglés es obligatoria.",
    },
  },
  en: {
    role: {
      name_es: "Spanish name is required.",
      name_en: "English name is required.",
      description_es: "Spanish description is required.",
      description_en: "English description is required.",
    },
  },
};

/**
 * 🔹 Devuelve el mensaje según idioma y clave
 */
export const getValidationMessage = (
  key: keyof typeof validationMessages["es"]["role"],
  locale: Locale = "es"
): string => {
  return validationMessages[locale]?.role[key] ?? "Validation error";
};
