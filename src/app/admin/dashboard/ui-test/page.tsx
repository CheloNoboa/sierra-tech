"use client";

/**
 * =============================================================================
 * 🌐 Página de pruebas UI — _ui-test
 * =============================================================================
 * ES:
 *   Esta página permite probar los componentes maestros sin afectar módulos
 *   reales. Aquí se validan estilos, interacción, layout y comportamiento.
 *
 * EN:
 *   Visual sandbox for validating master UI components before integration.
 * =============================================================================
 */

import { useState } from "react";
import GlobalButton from "@/components/ui/GlobalButton";
import { GlobalToastProvider, useToast } from "@/components/ui/GlobalToastProvider";
import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import GlobalInput from "@/components/ui/GlobalInput";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalCard from "@/components/ui/GlobalCard";

export default function UITestPage() {
  const [openModal, setOpenModal] = useState(false);

  // IMPORTANTÍSIMO:
  // useToast SOLO funciona si se llama dentro de GlobalToastProvider.
  // Por eso lo definimos DENTRO del Provider (ver estructura abajo).
  const ToastSection = () => {
    const toast = useToast();

    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-100">Buttons</h2>

        <div className="flex gap-4 flex-wrap">
          <GlobalButton onClick={() => toast.success("Success!")}>
            Primary
          </GlobalButton>

          <GlobalButton variant="secondary" onClick={() => toast.info("Info message")}>
            Secondary
          </GlobalButton>

          <GlobalButton variant="danger" onClick={() => toast.error("Error!")}>
            Danger
          </GlobalButton>

          <GlobalButton variant="ghost" onClick={() => toast.warning("Warning!")}>
            Ghost
          </GlobalButton>

          <GlobalButton loading>Loading…</GlobalButton>
        </div>
      </section>
    );
  };

  return (
    <GlobalToastProvider>
      <div className="p-6 space-y-10">

        {/* ============================================================
         *  BOTONES + TOASTS
         * ============================================================ */}
        <ToastSection />

        {/* ============================================================
         *  INPUT
         * ============================================================ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">Inputs</h2>

          <div className="w-72">
            <GlobalInput label="Nombre" placeholder="Escribe algo..." />
          </div>
        </section>

        {/* ============================================================
         *  CARD
         * ============================================================ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">Card</h2>

          <GlobalCard className="p-4">
            <p className="text-gray-300">Este es un GlobalCard.</p>
          </GlobalCard>
        </section>

        {/* ============================================================
         *  MODAL
         * ============================================================ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">Modal</h2>

          <GlobalButton onClick={() => setOpenModal(true)}>Abrir Modal</GlobalButton>

          <GlobalModal
            title="Demo Modal"
            open={openModal}        // ← Prop correcta según tu GlobalModal original
            onClose={() => setOpenModal(false)}
            footer={
              <GlobalButton onClick={() => setOpenModal(false)}>
                Cerrar
              </GlobalButton>
            }
          >
            <p className="text-gray-300">Contenido dentro del modal.</p>
          </GlobalModal>
        </section>

        {/* ============================================================
         *  DATAGRID SHELL
         * ============================================================ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">DataGrid Shell</h2>

          <GlobalDataGridShell
            title="Demo DataGrid"
            filters={
              <div className="grid grid-cols-3 gap-3">
                <GlobalInput label="Buscar nombre" />
                <GlobalInput label="Filtrar código" />
                <GlobalInput label="Estado" />
              </div>
            }
            actions={
              <GlobalButton>
                Acción
              </GlobalButton>
            }
            footer={<p className="text-gray-400 text-sm">Paginación aquí</p>}
          >
            <p className="text-gray-300">
              Aquí iría un DataGrid real. Esto es solo un placeholder para validar el layout.
            </p>
          </GlobalDataGridShell>
        </section>
      </div>
    </GlobalToastProvider>
  );
}
