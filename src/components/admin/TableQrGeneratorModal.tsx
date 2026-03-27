"use client";

/**
 * =============================================================================
 * 📌 Modal: TableQrGeneratorModal (Production)
 * Path: src/components/admin/TableQrGeneratorModal.tsx
 * =============================================================================
 * ES:
 * - Genera tarjetas imprimibles por mesa con branding + QR seguro.
 * - UI:
 *   - Selector de Sucursal
 *   - Rango de mesas (from/to) por tableNumber
 *   - Carrusel (prev/next) con preview "chévere"
 *   - Descargar PNG (mesa actual)
 *   - Imprimir (mesa actual) o imprimir TODO (abre ventana)
 *
 * EN:
 * - Generates printable table cards with branding + secure QR.
 * =============================================================================
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalButton from "@/components/ui/GlobalButton";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

type Lang = "es" | "en";

type BranchLite = { _id: string; name: { es: string; en: string } };

type QrCardItem = {
  tableId: string;
  tableNumber: number;
  tableName: { es: string; en: string };
  branchId: string;
  branchName: { es: string; en: string };
  qrUrl: string; // ✅ already secured (tokenized)
};

type QrCardsApiOk = {
  ok: true;
  brand: {
    businessName?: string;
    businessLogo?: string; // URL
  };
  items: QrCardItem[];
};
type QrCardsApiFail = { ok: false; message: string };
type QrCardsApiResponse = QrCardsApiOk | QrCardsApiFail;

/* ============================================================================= */
/* Canvas helpers (no @ts-expect-error)                                           */
/* ============================================================================= */
function pathRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));

  // If available, use roundRect (modern browsers).
  const anyCtx = ctx as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
  };

  if (typeof anyCtx.roundRect === "function") {
    anyCtx.roundRect(x, y, w, h, radius);
    return;
  }

  // Fallback for older browsers.
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function safeInt(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function pickLabel(b: { es: string; en: string }, locale: string): string {
  const lang: Lang = locale === "es" ? "es" : "en";
  const main = (lang === "es" ? b.es : b.en) || b.es || b.en || "";
  return String(main).trim();
}

function clampRange(from: number, to: number): { from: number; to: number } {
  const a = Math.max(1, safeInt(from, 1));
  const b = Math.max(1, safeInt(to, a));
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function openPrintWindow(images: { title: string; dataUrl: string }[]) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print</title>
    <style>
      body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .page { page-break-after: always; display: flex; justify-content: center; align-items: center; }
      img { width: 100%; max-width: 850px; height: auto; border: 1px solid #e5e7eb; border-radius: 16px; }
      h2 { margin: 0 0 10px 0; font-size: 14px; color: #111827; }
      @media print { body { padding: 0; } img { border: none; border-radius: 0; } }
    </style>
  </head>
  <body>
    ${images
      .map(
        (it) => `
      <div class="page">
        <div>
          <h2>${it.title}</h2>
          <img src="${it.dataUrl}" />
        </div>
      </div>`
      )
      .join("")}
    <script>
      setTimeout(() => { window.focus(); window.print(); }, 250);
    </script>
  </body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

async function renderCardToPngDataUrl(args: {
  locale: string;
  brandName: string;
  brandLogoUrl: string;
  branchName: string;
  tableLabel: string;
  qrUrl: string;
}): Promise<string> {
  // Canvas size for "nice" print: 1080x1350 (~4:5)
  const W = 1080;
  const H = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background
  ctx.fillStyle = "#0B0B0F";
  ctx.fillRect(0, 0, W, H);

  // Card container
  const pad = 60;
  const cardX = pad;
  const cardY = pad;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;

  // Rounded rect container
  const r = 46;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  pathRoundedRect(ctx, cardX, cardY, cardW, cardH, r);
  ctx.fill();
  ctx.stroke();

  // Header area
  const headerH = 250;
  const headerX = cardX + 46;
  const headerY = cardY + 46;

  // Logo
  let logoImg: HTMLImageElement | null = null;
  if (args.brandLogoUrl.trim()) {
    try {
      logoImg = await loadImage(args.brandLogoUrl.trim());
    } catch {
      logoImg = null;
    }
  }

  const logoSize = 130;
  if (logoImg) {
    // logo container
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;

    const lx = headerX;
    const ly = headerY;
    const lr = 28;

    ctx.beginPath();
    pathRoundedRect(ctx, lx, ly, logoSize, logoSize, lr);
    ctx.fill();
    ctx.stroke();

    // draw logo inside (clipped)
    ctx.save();
    ctx.beginPath();
    pathRoundedRect(ctx, lx + 10, ly + 10, logoSize - 20, logoSize - 20, 22);
    ctx.clip();
    ctx.drawImage(logoImg, lx + 10, ly + 10, logoSize - 20, logoSize - 20);
    ctx.restore();
  }

  // Brand text
  const brandX = headerX + (logoImg ? logoSize + 28 : 0);
  const brandY = headerY + 10;

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto";
  const brandName = args.brandName || (args.locale === "es" ? "Menú" : "Menu");
  ctx.fillText(brandName, brandX, brandY + 62);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "600 30px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(args.branchName, brandX, brandY + 112);

  // Table label big
  ctx.fillStyle = "#FBBF24"; // amber
  ctx.font = "900 92px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(args.tableLabel, headerX, headerY + headerH);

  // Divider line
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 46, cardY + headerH + 95);
  ctx.lineTo(cardX + cardW - 46, cardY + headerH + 95);
  ctx.stroke();

  // QR area
  const qrBoxW = 520;
  const qrBoxH = 520;
  const qrBoxX = cardX + (cardW - qrBoxW) / 2;
  const qrBoxY = cardY + headerH + 130;

  // QR box bg
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  pathRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 38);
  ctx.fill();
  ctx.stroke();

  // draw QR into its own canvas then onto main canvas
  const QRCode = (await import("qrcode")).default;

  const qrCanvas = document.createElement("canvas");
  qrCanvas.width = 460;
  qrCanvas.height = 460;

  await QRCode.toCanvas(qrCanvas, args.qrUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 460,
  });

  ctx.drawImage(qrCanvas, qrBoxX + 30, qrBoxY + 30, 460, 460);

  // Footer hint
  const hint = args.locale === "es" ? "Escanea para ver el menú" : "Scan to view the menu";
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, Roboto";
  const m = ctx.measureText(hint);
  ctx.fillText(hint, (W - m.width) / 2, qrBoxY + qrBoxH + 90);

  // Small security note
  const note = args.locale === "es" ? "QR seguro por mesa" : "Secure per-table QR";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 22px system-ui, -apple-system, Segoe UI, Roboto";
  const m2 = ctx.measureText(note);
  ctx.fillText(note, (W - m2.width) / 2, qrBoxY + qrBoxH + 132);

  return canvas.toDataURL("image/png");
}

export default function TableQrGeneratorModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;

  const { locale } = useTranslation();
  const toast = useToast();
  const lang: Lang = locale === "es" ? "es" : "en";

  // branches
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(false);

  // range
  const [fromTable, setFromTable] = useState<number>(1);
  const [toTable, setToTable] = useState<number>(10);

  // generation
  const [loadingCards, setLoadingCards] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");

  const [items, setItems] = useState<QrCardItem[]>([]);
  const [index, setIndex] = useState(0);

  // rendered images cache
  const imgCacheRef = useRef<Record<string, string>>({});
  const [currentPng, setCurrentPng] = useState<string>("");

  const t = useMemo(() => {
    return {
      title: locale === "es" ? "Generar QR por mesas" : "Generate table QR",
      branch: locale === "es" ? "Sucursal" : "Branch",
      from: locale === "es" ? "Mesa inicial" : "Start table",
      to: locale === "es" ? "Mesa final" : "End table",
      generate: locale === "es" ? "Generar" : "Generate",
      loading: locale === "es" ? "Generando..." : "Generating...",
      prev: locale === "es" ? "Anterior" : "Prev",
      next: locale === "es" ? "Siguiente" : "Next",
      download: locale === "es" ? "Descargar PNG" : "Download PNG",
      print: locale === "es" ? "Imprimir" : "Print",
      printAll: locale === "es" ? "Imprimir todo" : "Print all",
      empty: locale === "es" ? "No hay mesas en ese rango." : "No tables in that range.",
      close: locale === "es" ? "Cerrar" : "Close",
    };
  }, [locale]);

  const selectedBranch = useMemo(() => branches.find((b) => b._id === branchId) ?? null, [branches, branchId]);

  useEffect(() => {
    if (!open) return;

    void (async () => {
      try {
        setLoadingBranches(true);

        // Ajusta al endpoint que ya usas en admin:
        const res = await fetch("/api/admin/branches", { cache: "no-store" });
        const raw = (await res.json().catch(() => null)) as unknown;

        const parsed = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const ok = parsed.ok === true;
        const list = Array.isArray(parsed.branches) ? (parsed.branches as BranchLite[]) : [];

        if (!res.ok || !ok) {
          toast.error(locale === "es" ? "No se pudieron cargar sucursales." : "Could not load branches.");
          setBranches([]);
          return;
        }

        setBranches(list);

        if (!branchId && list.length > 0) setBranchId(list[0]._id);
      } catch {
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function generate(): Promise<void> {
    if (!branchId) {
      toast.error(locale === "es" ? "Selecciona una sucursal." : "Select a branch.");
      return;
    }

    const { from, to } = clampRange(fromTable, toTable);

    setLoadingCards(true);
    setItems([]);
    setIndex(0);
    setCurrentPng("");
    imgCacheRef.current = {};

    try {
      const qs = new URLSearchParams({
        branchId,
        from: String(from),
        to: String(to),
      });

      const res = await fetch(`/api/admin/qr/table-cards?${qs.toString()}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as QrCardsApiResponse | null;

      if (!res.ok || !data || typeof data !== "object" || !("ok" in data) || data.ok !== true) {
        const msg =
          data && typeof data === "object" && "message" in (data as Record<string, unknown>)
            ? String((data as { message?: unknown }).message ?? "")
            : "";
        throw new Error(msg || "Failed to generate.");
      }

      setBrandName((data.brand.businessName ?? "").trim());
      setBrandLogo((data.brand.businessLogo ?? "").trim());

      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      setIndex(0);

      if (list.length === 0) {
        toast.error(t.empty);
        return;
      }

      // Render first immediately
      await renderIndex(0, list, data.brand.businessName ?? "", data.brand.businessLogo ?? "");
    } catch (e) {
      toast.error(locale === "es" ? `Error: ${(e as Error).message}` : `Error: ${(e as Error).message}`);
    } finally {
      setLoadingCards(false);
    }
  }

  async function renderIndex(nextIndex: number, list: QrCardItem[], bName: string, bLogo: string): Promise<void> {
    const it = list[nextIndex];
    if (!it) return;

    const cacheKey = `${it.branchId}:${it.tableNumber}:${lang}`;
    const cached = imgCacheRef.current[cacheKey];
    if (cached) {
      setCurrentPng(cached);
      return;
    }

    const branchName = pickLabel(it.branchName, locale);
    const tableLabel = pickLabel(it.tableName, locale) || (locale === "es" ? `Mesa ${it.tableNumber}` : `Table ${it.tableNumber}`);

    const png = await renderCardToPngDataUrl({
      locale,
      brandName: (bName || "").trim(),
      brandLogoUrl: (bLogo || "").trim(),
      branchName,
      tableLabel,
      qrUrl: it.qrUrl,
    });

    imgCacheRef.current[cacheKey] = png;
    setCurrentPng(png);
  }

  async function go(delta: number) {
    if (items.length === 0) return;
    const next = (index + delta + items.length) % items.length;
    setIndex(next);
    try {
      await renderIndex(next, items, brandName, brandLogo);
    } catch {
      // no-op
    }
  }

  async function printCurrent() {
    if (!items[index] || !currentPng) return;
    const current = items[index];
    const title = `${pickLabel(current.tableName, locale) || `Table ${current.tableNumber}`}`;
    openPrintWindow([{ title, dataUrl: currentPng }]);
  }

  async function printAll() {
    if (items.length === 0) return;

    const images: { title: string; dataUrl: string }[] = [];

    // Render all sequentially to avoid heavy blocking
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const cacheKey = `${it.branchId}:${it.tableNumber}:${lang}`;
      let png = imgCacheRef.current[cacheKey];

      if (!png) {
        const branchName = pickLabel(it.branchName, locale);
        const tableLabel = pickLabel(it.tableName, locale) || (locale === "es" ? `Mesa ${it.tableNumber}` : `Table ${it.tableNumber}`);

        png = await renderCardToPngDataUrl({
          locale,
          brandName: brandName.trim(),
          brandLogoUrl: brandLogo.trim(),
          branchName,
          tableLabel,
          qrUrl: it.qrUrl,
        });

        imgCacheRef.current[cacheKey] = png;
      }

      images.push({
        title: pickLabel(it.tableName, locale) || `Table ${it.tableNumber}`,
        dataUrl: png,
      });
    }

    openPrintWindow(images);
  }

  function downloadCurrent() {
    const current = items[index] ?? null;
    if (!current || !currentPng) return;
    const label = pickLabel(current.tableName, locale) || `Table_${current.tableNumber}`;
    const file = `${label.replace(/\s+/g, "_")}.png`;
    downloadDataUrl(file, currentPng);
  }

  useEffect(() => {
    if (!open) return;
    if (!items.length) return;
    void renderIndex(index, items, brandName, brandLogo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <GlobalModal open={open} onClose={onClose} title={t.title} size="xl">
      <div className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-zinc-200">{t.branch}</label>
            <select
              value={branchId}
              disabled={loadingBranches}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-11 w-full rounded-2xl border border-zinc-700 bg-zinc-950/70 px-3 text-sm text-zinc-100 outline-none"
              style={{ colorScheme: "dark" }}
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id} className="bg-zinc-900 text-zinc-100">
                  {b.name?.[locale as Lang] ?? b.name?.es ?? ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-200">{t.from}</label>
            <input
              value={String(fromTable)}
              onChange={(e) => setFromTable(safeInt(e.target.value, 1) || 1)}
              className="h-11 w-full rounded-2xl border border-zinc-700 bg-zinc-950/40 px-3 text-sm text-zinc-100 outline-none"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-200">{t.to}</label>
            <input
              value={String(toTable)}
              onChange={(e) => setToTable(safeInt(e.target.value, 1) || 1)}
              className="h-11 w-full rounded-2xl border border-zinc-700 bg-zinc-950/40 px-3 text-sm text-zinc-100 outline-none"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-300">
            {selectedBranch ? <span className="font-semibold text-zinc-100">{selectedBranch.name?.[lang] ?? ""}</span> : null}
            {items.length > 0 ? <span className="ml-2 text-zinc-400">{`${index + 1}/${items.length}`}</span> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <GlobalButton onClick={() => void generate()} disabled={loadingCards || !branchId}>
              {loadingCards ? t.loading : t.generate}
            </GlobalButton>

            <GlobalButton variant="secondary" onClick={() => void go(-1)} disabled={items.length === 0}>
              {t.prev}
            </GlobalButton>
            <GlobalButton variant="secondary" onClick={() => void go(+1)} disabled={items.length === 0}>
              {t.next}
            </GlobalButton>

            <GlobalButton variant="secondary" onClick={downloadCurrent} disabled={!currentPng}>
              {t.download}
            </GlobalButton>
            <GlobalButton variant="secondary" onClick={() => void printCurrent()} disabled={!currentPng}>
              {t.print}
            </GlobalButton>
            <GlobalButton variant="secondary" onClick={() => void printAll()} disabled={items.length === 0}>
              {t.printAll}
            </GlobalButton>

            <GlobalButton variant="ghost" onClick={onClose}>
              {t.close}
            </GlobalButton>
          </div>
        </div>

        {/* Carousel preview */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4">
          {items.length === 0 ? (
            <div className="text-sm text-zinc-400">{t.empty}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-3">
                {currentPng ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentPng} alt="QR Card" className="w-full rounded-2xl border border-zinc-800 bg-black" />
                ) : (
                  <div className="flex h-[520px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/30 text-sm text-zinc-400">
                    {loadingCards ? t.loading : "—"}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <div className="text-sm text-zinc-400">{locale === "es" ? "Vista" : "Preview"}</div>
                  <div className="mt-1 text-lg font-extrabold text-zinc-100">
                    {items[index] ? pickLabel(items[index].tableName, locale) : ""}
                  </div>
                  <div className="mt-1 text-sm text-zinc-300">{items[index] ? pickLabel(items[index].branchName, locale) : ""}</div>
                  <div className="mt-3 break-all rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-300">
                    {items[index]?.qrUrl ?? ""}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                  {locale === "es" ? (
                    <ul className="list-disc space-y-1 pl-5">
                      <li>El QR es seguro (firmado) y específico por mesa.</li>
                      <li>Descarga e imprime en tamaño 4x5 o A5 para que se vea “pro”.</li>
                      <li>Si cambias logo/nombre en Settings, se refleja al generar.</li>
                    </ul>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5">
                      <li>QR is secure (signed) and per-table.</li>
                      <li>Download and print in 4x5 or A5 for a pro look.</li>
                      <li>If you change logo/name in Settings, it updates on next generate.</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlobalModal>
  );
}