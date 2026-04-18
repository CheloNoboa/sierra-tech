/**
 * =============================================================================
 * 📄 Helper: formatLastAccess
 * Path: src/lib/format/formatLastAccess.ts
 * =============================================================================
 *
 * ES:
 *   Formatea la fecha de último acceso para uso administrativo.
 *
 *   Propósito:
 *   - evitar mostrar fechas crudas o vacías en grillas
 *   - devolver "Nunca" cuando no existe acceso registrado
 *   - mostrar formato legible y consistente para operadores
 *
 *   Regla:
 *   - si no hay fecha válida, devuelve "Nunca"
 *   - si hay fecha válida, devuelve formato local dd/mm/yyyy hh:mm
 * =============================================================================
 */

export function formatLastAccess(
	value: string | Date | null | undefined,
	locale: "es" | "en" = "es",
): string {
	if (!value) {
		return locale === "es" ? "Nunca" : "Never";
	}

	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return locale === "es" ? "Nunca" : "Never";
	}

	return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}
