"use client";

/**
 * ============================================================================
 * 📌 SidebarContext — FIX DEFINITIVO Móvil ↔ Escritorio
 * ----------------------------------------------------------------------------
 * ES:
 *   - Móvil: sidebar oculto por defecto.
 *   - Escritorio: sidebar visible SIEMPRE al cargar o redimensionar.
 *   - Cambio entre móvil ↔ escritorio corrige automáticamente el estado.
 *
 * EN:
 *   - Mobile: sidebar hidden by default.
 *   - Desktop: sidebar always visible on load or resize.
 *   - Switch between mobile ↔ desktop auto-normalizes the state.
 * ============================================================================
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

interface SidebarContextValue {
	isCollapsed: boolean;
	toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
	isCollapsed: false,
	toggleSidebar: () => {},
});

interface SidebarProviderProps {
	children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
	const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

	/**
	 * Al montar:
	 * - Si es móvil → sidebar oculto (isCollapsed=true)
	 * - Si es escritorio → sidebar visible (isCollapsed=false)
	 */
	useEffect(() => {
		if (typeof window === "undefined") return;

		const isMobile = window.innerWidth < 768;
		setIsCollapsed(isMobile);
	}, []);

	/**
	 * FIX IMPORTANTE:
	 * Cuando la pantalla cambia entre móvil ↔ escritorio:
	 * - Escritorio (>=768px) → sidebar visible automáticamente
	 * - Móvil (<768px) → sidebar oculto automáticamente
	 */
	useEffect(() => {
		function handleResize() {
			const isMobile = window.innerWidth < 768;

			if (isMobile) {
				setIsCollapsed(true); // drawer oculto
			} else {
				setIsCollapsed(false); // sidebar visible
			}
		}

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const toggleSidebar = useCallback(() => {
		setIsCollapsed((prev) => !prev);
	}, []);

	return (
		<SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebar(): SidebarContextValue {
	return useContext(SidebarContext);
}
