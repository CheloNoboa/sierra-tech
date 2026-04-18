/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			/**
			 * ==========================================================================
			 * Sierra Tech — Design Tokens bridged into Tailwind
			 * ==========================================================================
			 * ES:
			 * - Estos colores NO deben quemarse directamente en componentes.
			 * - La fuente oficial de verdad vive en globals.css mediante variables CSS.
			 * - Aquí solo exponemos esas variables para usarlas con clases Tailwind.
			 *
			 * EN:
			 * - These colors should NOT be hardcoded across components.
			 * - The official source of truth lives in globals.css as CSS variables.
			 * - This file only maps those variables into Tailwind utility classes.
			 * ==========================================================================
			 */
			colors: {
				brand: {
					primary: "var(--color-brand-primary)",
					primaryStrong: "var(--color-brand-primary-strong)",
					secondary: "var(--color-brand-secondary)",
					accent: "var(--color-brand-accent)",
					ink: "var(--color-brand-ink)",
				},
				background: "var(--color-bg)",
				surface: {
					DEFAULT: "var(--color-surface)",
					soft: "var(--color-surface-soft)",
				},
				border: "var(--color-border)",
				text: {
					primary: "var(--color-text-primary)",
					secondary: "var(--color-text-secondary)",
					muted: "var(--color-text-muted)",
				},
				status: {
					success: "var(--color-success)",
					warning: "var(--color-warning)",
					error: "var(--color-error)",
					info: "var(--color-info)",
				},
			},

			/**
			 * ==========================================================================
			 * Shared animations
			 * ==========================================================================
			 */
			keyframes: {
				"slide-in-left": {
					"0%": { opacity: "0", transform: "translateX(-30px)" },
					"100%": { opacity: "1", transform: "translateX(0)" },
				},
				fadeIn: {
					from: { opacity: "0", transform: "translateY(8px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				slideInLeft: {
					"0%": { opacity: "0", transform: "translateX(-40px)" },
					"60%": { opacity: "0.6", transform: "translateX(-10px)" },
					"100%": { opacity: "1", transform: "translateX(0)" },
				},
				slideOutLeft: {
					"0%": { opacity: "1", transform: "translateX(0)" },
					"40%": { opacity: "0.5", transform: "translateX(-15px)" },
					"100%": { opacity: "0", transform: "translateX(-40px)" },
				},
				overlayFade: {
					from: { opacity: "0" },
					to: { opacity: "0.6" },
				},
				checkMark: {
					"0%": { strokeDashoffset: "20" },
					"100%": { strokeDashoffset: "0" },
				},
				pingSoft: {
					"0%": { transform: "scale(1)", opacity: "1" },
					"75%, 100%": { transform: "scale(1.5)", opacity: "0" },
				},
				"spin-fast": {
					"100%": { transform: "rotate(360deg)" },
				},
			},

			animation: {
				"slide-in-left": "slide-in-left 0.4s ease-out forwards",
				fadeIn: "fadeIn 0.8s ease-out forwards",
				slideInLeft: "slideInLeft 0.5s ease-out forwards",
				slideOutLeft: "slideOutLeft 0.4s ease-in forwards",
				overlay: "overlayFade 0.3s ease-in forwards",
				check: "checkMark 0.6s ease forwards 0.3s",
				"ping-soft": "pingSoft 1.2s cubic-bezier(0, 0, 0.2, 1) infinite",
				"spin-fast": "spin-fast 0.8s linear infinite",
			},

			transitionDelay: {
				100: "100ms",
				200: "200ms",
				300: "300ms",
				400: "400ms",
			},
		},
	},
	safelist: [
		"animate-slide-in-left",
		"animate-fadeIn",
		"animate-slideInLeft",
		"animate-slideOutLeft",
		"animate-overlay",
		"animate-check",
		"animate-ping-soft",
		"animate-spin-fast",
		"delay-100",
		"delay-200",
		"delay-300",
		"delay-400",
	],
	plugins: [],
};
