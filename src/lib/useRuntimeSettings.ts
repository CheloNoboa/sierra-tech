// src/hooks/useRuntimeSettings.ts
"use client";

/**
 * =============================================================================
 * 📄 Hook: useRuntimeSettings
 * Path: src/hooks/useRuntimeSettings.ts
 * =============================================================================
 * ES:
 *  - Carga settings runtime por keys y expone estado listo para UI.
 *  - Evita duplicar fetch en cada módulo.
 *
 * EN:
 *  - Loads runtime settings by keys and exposes UI-friendly state.
 *  - Avoids duplicating fetch logic across modules.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { getSettingsByKeys, type SettingsKey, type SettingsMap } from "@/lib/settingsRuntimeClient";

export type RuntimeSettingsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; values: SettingsMap }
  | { kind: "error"; message: string };

export function useRuntimeSettings(keys: SettingsKey[]) {
  const stableKey = useMemo(() => keys.slice().sort().join("|"), [keys]);
  const [state, setState] = useState<RuntimeSettingsState>({ kind: "idle" });

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setState({ kind: "loading" });

      const res = await getSettingsByKeys(keys);
      if (!alive) return;

      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }

      setState({ kind: "ready", values: res.values });
    };

    void run();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  return state;
}
