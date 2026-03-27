/**
 * ✅ src/lib/getUiMessage.ts
 * -------------------------------------------------------------------
 * Hook para obtener mensajes traducidos en el frontend (UI)
 * -------------------------------------------------------------------
 * - Usa el idioma activo desde useTranslation()
 * - Totalmente tipado según apiMessages.ts
 * - Devuelve siempre un string seguro
 * -------------------------------------------------------------------
 */

import { useTranslation } from "@/hooks/useTranslation";
import { apiMessages, ApiLocale, ApiSection, ApiKey } from "@/constants/apiMessages";

/**
 * Hook de mensajes UI traducidos
 * @returns función que recibe sección + clave y devuelve el texto traducido
 */
export function useUiMessage() {
  const { locale } = useTranslation();

  return function <
    L extends ApiLocale,
    S extends ApiSection<L>,
    K extends ApiKey<L, S>
  >(section: S, key: K): string {
    try {
      const lang = (locale ?? "es") as L;
      const sectionMessages = apiMessages[lang][section] as Record<string, string>;
      const message = sectionMessages[key as string];
      return message ?? apiMessages["es"].global.unknown;
    } catch {
      return apiMessages["es"].global.unknown;
    }
  };
}
