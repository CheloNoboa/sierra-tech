// src/hooks/useRuntimeSettings.ts
"use client";

/**
 * =============================================================================
 * 📄 Hook: useRuntimeSettings
 * Path: src/hooks/useRuntimeSettings.ts
 * =============================================================================
 *
 * ES:
 * - Hook cliente para cargar configuraciones runtime por lista de keys.
 * - Centraliza el fetch y entrega un estado simple para consumo de UI.
 * - Evita que cada módulo repita su propia lógica de carga.
 *
 * Responsabilidades:
 * - Normalizar la lista de keys para obtener una dependencia estable.
 * - Ejecutar la carga cuando las keys realmente cambian.
 * - Evitar actualizar estado si el componente se desmonta.
 * - Exponer un contrato de estado claro: idle | loading | ready | error.
 *
 * Decisiones:
 * - Se deduplican y ordenan las keys para evitar recargas innecesarias.
 * - Si no existen keys válidas, el hook responde inmediatamente con ready vacío.
 * - La petición activa queda protegida contra race conditions con un flag local.
 *
 * EN:
 * - Client hook for loading runtime settings by key list.
 * - Centralizes fetch logic and exposes a simple UI-friendly state contract.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  getSettingsByKeys,
  type SettingsKey,
  type SettingsMap,
} from "@/lib/settingsRuntimeClient";

export type RuntimeSettingsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; values: SettingsMap }
  | { kind: "error"; message: string };

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeKeys(keys: SettingsKey[]): SettingsKey[] {
  const normalized = keys.filter(
    (key): key is SettingsKey => typeof key === "string" && key.trim().length > 0
  );

  return Array.from(new Set(normalized)).sort();
}

export function useRuntimeSettings(keys: SettingsKey[]) {
  const normalizedKeys = useMemo(() => normalizeKeys(keys), [keys]);

  const stableKey = useMemo(() => normalizedKeys.join("|"), [normalizedKeys]);

  const [state, setState] = useState<RuntimeSettingsState>({ kind: "idle" });

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (normalizedKeys.length === 0) {
        setState({ kind: "ready", values: {} as SettingsMap });
        return;
      }

      setState({ kind: "loading" });

      try {
        const response = await getSettingsByKeys(normalizedKeys);

        if (!alive) {
          return;
        }

        if (!response.ok) {
          setState({
            kind: "error",
            message: response.error || "Failed to load runtime settings.",
          });
          return;
        }

        setState({
          kind: "ready",
          values: response.values,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load runtime settings.",
        });
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [normalizedKeys, stableKey]);

  return state;
}