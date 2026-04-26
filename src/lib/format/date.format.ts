/**
 * =============================================================================
 * 📄 Formatter: App Date
 * Path: src/lib/format/date.format.ts
 * =============================================================================
 */

export type AppDateFormat = "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";

export const DEFAULT_APP_DATE_FORMAT: AppDateFormat = "MM/dd/yyyy";

export function isAppDateFormat(value: unknown): value is AppDateFormat {
	return (
		value === "MM/dd/yyyy" ||
		value === "dd/MM/yyyy" ||
		value === "yyyy-MM-dd"
	);
}

export function normalizeAppDateFormat(value: unknown): AppDateFormat {
	return isAppDateFormat(value) ? value : DEFAULT_APP_DATE_FORMAT;
}

export function toDateOnly(value: string | Date | null | undefined): string {
	if (!value) return "";

	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return "";
		return value.toISOString().split("T")[0] ?? "";
	}

	return value.split("T")[0]?.trim() ?? "";
}

export function formatAppDate(
	value: string | Date | null | undefined,
	dateFormat: AppDateFormat = DEFAULT_APP_DATE_FORMAT,
): string {
	const dateOnly = toDateOnly(value);

	if (!dateOnly) return "—";

	const [year, month, day] = dateOnly.split("-");

	if (!year || !month || !day) return "—";

	if (dateFormat === "dd/MM/yyyy") return `${day}/${month}/${year}`;
	if (dateFormat === "yyyy-MM-dd") return `${year}-${month}-${day}`;

	return `${month}/${day}/${year}`;
}