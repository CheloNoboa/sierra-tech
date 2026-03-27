/** ✅ src/components/admin/PrivacyEditor.tsx
 * --------------------------------------------------------------
 * 📝 Editor de Políticas (multilenguaje ES/EN)
 * --------------------------------------------------------------
 * - Permite editar títulos y secciones
 * - Guarda automáticamente en MongoDB (API PUT)
 * - Responsive + modo oscuro
 * --------------------------------------------------------------
 */

"use client";

import { useState } from "react";
import { ROUTES } from "@/constants/routes";

interface Section {
  heading: string;
  content: string;
}

interface Policy {
  lang: string;
  title: string;
  sections: Section[];
}

export default function PrivacyEditor({ policy }: { policy: Policy }) {
  const [data, setData] = useState<Policy>(policy);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (i: number, field: keyof Section, value: string) => {
    const updated = [...data.sections];
    updated[i][field] = value;
    setData({ ...data, sections: updated });
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      setMessage("");
      const res = await fetch(ROUTES.API.PRIVACY_ADMIN, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error guardando");
      setMessage("✅ Guardado correctamente");
    } catch {
      setMessage("❌ Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-semibold text-yellow-400 mb-4">
        {data.lang === "es" ? "Versión en Español" : "English Version"}
      </h2>

      {/* 🔹 Título */}
      <input
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
        className="w-full bg-gray-900 text-gray-200 border border-gray-700 rounded px-3 py-2 mb-4"
      />

      {/* 🔸 Secciones */}
      {data.sections.map((sec, i) => (
        <div key={i} className="mb-4">
          <input
            value={sec.heading}
            onChange={(e) => handleChange(i, "heading", e.target.value)}
            className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded px-3 py-1 mb-2"
            placeholder="Encabezado / Heading"
          />
          <textarea
            value={sec.content}
            onChange={(e) => handleChange(i, "content", e.target.value)}
            className="w-full bg-gray-900 text-gray-200 border border-gray-700 rounded px-3 py-2"
            rows={4}
          />
        </div>
      ))}

      {/* 🟢 Botón Guardar */}
      <button
        onClick={saveChanges}
        disabled={saving}
        className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-semibold"
      >
        {saving ? "Guardando..." : "Guardar Cambios"}
      </button>

      {message && <p className="mt-3 text-sm text-gray-300">{message}</p>}
    </div>
  );
}
