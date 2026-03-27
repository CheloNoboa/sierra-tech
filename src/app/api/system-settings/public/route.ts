/**
 * =============================================================================
 * 📌 API Route: System Settings (Public)
 * Path: src/app/api/system-settings/public/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint público seguro para exponer configuraciones públicas de la plataforma.
 *
 * Funcionalidad:
 * - Expone SOLO keys permitidas mediante allow-list
 * - Permite consultar múltiples keys por query string
 * - Devuelve shape estable alineado con hooks públicos
 *
 * Contrato:
 * - ok:true  => { data: Array<{ key, value }> }
 * - ok:false => { message: string }
 *
 * EN:
 * Public safe settings endpoint for reusable platform branding/settings.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import SystemSettings from "@/models/SystemSettings";

type PublicSettingRow = {
  key: string;
  value: unknown;
};

type PublicSettingsResponse =
  | { ok: true; data: PublicSettingRow[] }
  | { ok: false; message: string };

/**
 * Allow-list:
 * - Only public-safe keys can be queried here.
 */
const ALLOWED_KEYS = new Set<string>([
  "businessName",
  "businessLogotipo",
  "businessCountry",
  "tax.enabled",
  "tax.ratePercent",
  "tax.label",
]);

function parseKeysParam(raw: string | null): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(list));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requested = parseKeysParam(url.searchParams.get("keys"));

    if (requested.length === 0) {
      const out: PublicSettingsResponse = { ok: true, data: [] };
      return NextResponse.json(out, {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const keys = requested.filter((key) => ALLOWED_KEYS.has(key));

    if (keys.length === 0) {
      const out: PublicSettingsResponse = { ok: true, data: [] };
      return NextResponse.json(out, {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    await connectToDB();

    const rows = await SystemSettings.find({ key: { $in: keys } })
      .select({ key: 1, value: 1, _id: 0 })
      .lean<Array<{ key?: unknown; value?: unknown }>>();

    const foundMap = new Map<string, unknown>();

    for (const row of rows) {
      const key = typeof row?.key === "string" ? row.key.trim() : "";
      if (!key) continue;
      foundMap.set(key, row.value);
    }

    const data: PublicSettingRow[] = keys.map((key) => ({
      key,
      value: foundMap.has(key) ? foundMap.get(key) : "",
    }));

    const out: PublicSettingsResponse = { ok: true, data };

    return NextResponse.json(out, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const out: PublicSettingsResponse = { ok: false, message };

    return NextResponse.json(out, { status: 500 });
  }
}