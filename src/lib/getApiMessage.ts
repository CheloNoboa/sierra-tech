/**
 * ✅ src/lib/getApiMessage.ts
 * -------------------------------------------------------------------
 * Helper para obtener mensajes traducidos en el backend (API Routes)
 * -------------------------------------------------------------------
 * - Usa tipado inferido desde apiMessages.ts (sin any)
 * - Garantiza compatibilidad entre idiomas y secciones
 * - Devuelve un string siempre seguro
 * -------------------------------------------------------------------
 */

import { apiMessages, ApiLocale, ApiSection, ApiKey } from "@/constants/apiMessages";

/**
 * Obtiene un mensaje traducido del diccionario centralizado.
 *
 * @param locale Idioma ("es" | "en"), por defecto "es"
 * @param section Sección del diccionario (global, roles, users, settings)
 * @param key Clave del mensaje dentro de la sección
 * @returns string — mensaje traducido
 */
export function getApiMessage<
  L extends ApiLocale,
  S extends ApiSection<L>,
  K extends ApiKey<L, S>
>(locale: L = "es" as L, section: S, key: K): string {
  try {
    const sectionMessages = apiMessages[locale][section] as Record<string, string>;
    const message = sectionMessages[key as string];
    return message ?? apiMessages["es"].global.unknown;
  } catch {
    return apiMessages["es"].global.unknown;
  }
}
