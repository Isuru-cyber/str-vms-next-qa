import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(amount: number | string | null | undefined, decimals: number = 2): string {
  const num = Number(amount) || 0;
  return num.toLocaleString("en-LK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
