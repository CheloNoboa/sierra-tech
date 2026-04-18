"use client";

/**
 * =====================================================================
 * 📌 PhoneField — Master phone input
 * Path: src/components/phone/PhoneField.tsx
 * =====================================================================
 * ES:
 * - Campo maestro para teléfonos con selector de país.
 * - Corrige generación de E.164.
 * - Limpia caracteres no válidos.
 * - Mantiene el número nacional separado del dialCode.
 * - Ecuador queda como país por defecto.
 *
 * EN:
 * - Master phone input with country selector.
 * - Ensures safe E.164 generation.
 * - Cleans invalid characters.
 * - Keeps national number separate from dialCode.
 * - Ecuador is the default country.
 * =====================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export type SupportedCountryCode = "EC" | "US" | "MX" | "CO" | "CA";

interface Country {
	code: SupportedCountryCode;
	dialCode: string;
	name: { es: string; en: string };
	flag: string;
	example: string;
}

const COUNTRIES: Country[] = [
	{
		code: "EC",
		dialCode: "+593",
		name: { es: "Ecuador", en: "Ecuador" },
		flag: "🇪🇨",
		example: "099 123 4567",
	},
	{
		code: "US",
		dialCode: "+1",
		name: { es: "Estados Unidos", en: "United States" },
		flag: "🇺🇸",
		example: "555 123 4567",
	},
	{
		code: "MX",
		dialCode: "+52",
		name: { es: "México", en: "Mexico" },
		flag: "🇲🇽",
		example: "55 1234 5678",
	},
	{
		code: "CO",
		dialCode: "+57",
		name: { es: "Colombia", en: "Colombia" },
		flag: "🇨🇴",
		example: "300 123 4567",
	},
	{
		code: "CA",
		dialCode: "+1",
		name: { es: "Canadá", en: "Canada" },
		flag: "🇨🇦",
		example: "416 123 4567",
	},
];

const DEFAULT_COUNTRY: Country = COUNTRIES[0];

export interface PhoneValue {
	countryCode: SupportedCountryCode;
	dialCode: string;
	nationalNumber: string;
	e164: string;
}

/* ===================================================================== */
/* Helpers                                                               */
/* ===================================================================== */

function toDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function toE164Safe(
	dial: string,
	national: string,
	countryCode: SupportedCountryCode,
): string {
	let digits = toDigits(national);

	if (countryCode === "US" || countryCode === "CA") {
		digits = digits.slice(0, 10);
	}

	if (countryCode === "EC") {
		digits = digits.slice(0, 10);
	}

	const dialDigits = toDigits(dial);

	if (!digits) return dial;

	return `+${dialDigits}${digits}`;
}

/**
 * Formato visual simple para el número nacional.
 * No altera el valor almacenado, solo la presentación.
 */
function formatNational(
	raw: string,
	countryCode: SupportedCountryCode,
): string {
	const digits = toDigits(raw);

	if (!digits) return "";

	if (countryCode === "US" || countryCode === "CA") {
		if (digits.length <= 3) return digits;
		if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
		return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
	}

	if (countryCode === "EC") {
		if (digits.length <= 3) return digits;
		if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
		return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
	}

	if (digits.length <= 3) return digits;
	if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
	return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

/* ===================================================================== */
/* Props                                                                 */
/* ===================================================================== */

interface PhoneFieldProps {
	label?: string;
	value?: PhoneValue | null;
	onChange: (value: PhoneValue) => void;
	required?: boolean;
	disabled?: boolean;
	id?: string;
	name?: string;
	autoComplete?: string;
}

/* ===================================================================== */
/* Component                                                             */
/* ===================================================================== */

export default function PhoneField({
	label,
	value,
	onChange,
	required,
	disabled,
	id,
	name,
	autoComplete,
}: PhoneFieldProps) {
	const { locale } = useTranslation();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const ref = useRef<HTMLDivElement | null>(null);

	const active = useMemo(() => {
		if (!value?.countryCode) return DEFAULT_COUNTRY;
		return (
			COUNTRIES.find((country) => country.code === value.countryCode) ??
			DEFAULT_COUNTRY
		);
	}, [value?.countryCode]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();

		if (!query) return COUNTRIES;

		return COUNTRIES.filter((country) => {
			const countryName =
				locale === "es"
					? country.name.es.toLowerCase()
					: country.name.en.toLowerCase();

			return (
				countryName.includes(query) ||
				country.dialCode.includes(query) ||
				toDigits(country.example).includes(query)
			);
		});
	}, [search, locale]);

	/**
	 * Si no viene valor inicial, normalizamos automáticamente a Ecuador.
	 * Esto garantiza un default consistente en formularios nuevos.
	 */
	useEffect(() => {
		if (value) return;

		onChange({
			countryCode: DEFAULT_COUNTRY.code,
			dialCode: DEFAULT_COUNTRY.dialCode,
			nationalNumber: "",
			e164: DEFAULT_COUNTRY.dialCode,
		});
	}, [value, onChange]);

	useEffect(() => {
		function handleOutsideClick(event: MouseEvent) {
			if (!ref.current) return;
			if (!ref.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		if (open) {
			document.addEventListener("mousedown", handleOutsideClick);
		}

		return () => {
			document.removeEventListener("mousedown", handleOutsideClick);
		};
	}, [open]);

	function handleSelect(country: Country) {
		const raw = value?.nationalNumber ?? "";
		const safeE164 = toE164Safe(country.dialCode, raw, country.code);

		onChange({
			countryCode: country.code,
			dialCode: country.dialCode,
			nationalNumber: raw,
			e164: safeE164,
		});

		setOpen(false);
		setSearch("");
	}

	function handleNumber(nextValue: string) {
		let digits = toDigits(nextValue);

		if (active.code === "US" || active.code === "CA") {
			digits = digits.slice(0, 10);
		}

		if (active.code === "EC") {
			digits = digits.slice(0, 10);
		}

		const safeE164 = toE164Safe(active.dialCode, digits, active.code);

		onChange({
			countryCode: active.code,
			dialCode: active.dialCode,
			nationalNumber: digits,
			e164: safeE164,
		});
	}

	const nationalFormatted = value?.nationalNumber
		? formatNational(value.nationalNumber, active.code)
		: "";

	return (
		<div className="w-full" ref={ref}>
			{label ? (
				<label
					htmlFor={id}
					className="mb-1 block text-xs font-medium text-text-secondary"
				>
					{label}{" "}
					{required ? <span className="text-status-error">*</span> : null}
				</label>
			) : null}

			<div className="flex gap-2">
				{/* Country selector */}
				<button
					type="button"
					disabled={disabled}
					onClick={() => setOpen((prev) => !prev)}
					className="flex min-w-[150px] items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary shadow-sm transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span>{active.flag}</span>

					<div className="flex flex-col text-left leading-tight">
						<span className="text-xs font-medium">
							{locale === "es" ? active.name.es : active.name.en}
						</span>
						<span className="text-[11px] text-text-muted">
							{active.dialCode}
						</span>
					</div>

					<ChevronDown size={14} className="ml-auto text-text-muted" />
				</button>

				{/* Phone input */}
				<input
					id={id}
					name={name}
					autoComplete={autoComplete}
					type="tel"
					disabled={disabled}
					value={nationalFormatted}
					onChange={(e) => handleNumber(e.target.value)}
					placeholder={active.example}
					className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-60"
					required={required}
				/>
			</div>

			{/* Dropdown */}
			{open && !disabled ? (
				<div className="absolute z-50 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
					<div className="flex items-center border-b border-border bg-surface px-3 py-2">
						<Search size={14} className="mr-2 text-text-muted" />
						<input
							type="text"
							autoFocus
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={
								locale === "es" ? "Buscar país..." : "Search country..."
							}
							className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
						/>
					</div>

					<div className="max-h-64 overflow-auto text-xs">
						{filtered.map((country) => (
							<button
								key={country.code}
								type="button"
								onClick={() => handleSelect(country)}
								className={`flex w-full items-center justify-between px-3 py-2 text-left text-text-secondary transition hover:bg-surface-soft ${
									country.code === active.code ? "bg-surface-soft" : ""
								}`}
							>
								<div className="flex items-center gap-2">
									<span>{country.flag}</span>

									<div className="flex flex-col leading-tight">
										<span className="text-xs font-medium text-text-primary">
											{locale === "es" ? country.name.es : country.name.en}
										</span>
										<span className="text-[11px] text-text-muted">
											{country.dialCode} · {country.example}
										</span>
									</div>
								</div>
							</button>
						))}
					</div>
				</div>
			) : null}

			{/* E164 preview */}
			<p className="mt-1 text-[11px] text-text-muted">
				{locale === "es" ? "Se guardará como" : "Stored as"}{" "}
				<span className="font-medium text-text-secondary">
					{value?.e164 || active.dialCode}
				</span>
			</p>
		</div>
	);
}
