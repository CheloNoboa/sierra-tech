/**
 * 🔧 Utilidades globales del proyecto
 * - clsx → combina clases condicionales
 * - cn → mergea Tailwind + clsx
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 
 * Unifica clases dinámicas sin romper Tailwind
 * Ejemplo:
 *   cn("p-4", condition && "bg-red-500")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
