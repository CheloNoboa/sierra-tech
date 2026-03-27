// src/lib/settingsRuntimeClient.ts
"use client";

/**
 * =============================================================================
 * 📄 Client: settingsRuntimeClient
 * Path: src/lib/settingsRuntimeClient.ts
 * =============================================================================
 * ES:
 *  - Lectura liviana de Settings por keys específicas (runtime).
 *  - NO asume un shape único del API: soporta varios formatos comunes.
 *  - Pensado para UI (TableFlow, Reservas, etc.) sin duplicar lógica.
 *
 * EN:
 *  - Lightweight runtime Settings fetch by specific keys.
 *  - Does NOT assume a single API response shape; supports common variants.
 *  - Meant for UI modules (TableFlow, Reservations, etc.) without duplicating logic.
 * =============================================================================
 */

export type SettingsKey =
  | "reservationPenaltyFee"
  | "reserveTolerance"
  | "stateTimeForReservation";

export type SettingsValue = string;

export type SettingsMap = Partial<Record<SettingsKey, SettingsValue>>;

type SettingsRow = {
  key: string;
  value: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toSettingsRowArray(payload: unknown): SettingsRow[] {
  // Case A: array direct
  if (Array.isArray(payload)) return payload.filter(isObject) as SettingsRow[];

  if (!isObject(payload)) return [];

  // Case B: { settings: [...] }
  if (Array.isArray(payload.settings)) {
    return payload.settings.filter(isObject) as SettingsRow[];
  }

  // Case C: { data: [...] }
  if (Array.isArray(payload.data)) {
    return payload.data.filter(isObject) as SettingsRow[];
  }

  return [];
}

function normalizeValue(v: unknown): string | null {
  // ES/EN: El "por qué": guardamos en Settings como string para UI y consistencia.
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return null;
}

export type GetSettingsResult =
  | { ok: true; values: SettingsMap }
  | { ok: false; error: string };

export async function getSettingsByKeys(keys: SettingsKey[]): Promise<GetSettingsResult> {
  try {
    // Usamos query param estándar: keys=...
    const q = encodeURIComponent(keys.join(","));
    const res = await fetch(`/api/admin/settings?keys=${q}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const raw = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      const msg =
        (isObject(raw) && typeof raw.message === "string" && raw.message) ||
        (isObject(raw) && typeof raw.error === "string" && raw.error) ||
        `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    const rows = toSettingsRowArray(raw);

    const out: SettingsMap = {};
    for (const row of rows) {
      const k = row.key;
      if (!keys.includes(k as SettingsKey)) continue;

      const v = normalizeValue(row.value);
      if (v !== null) out[k as SettingsKey] = v;
    }

    return { ok: true, values: out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
