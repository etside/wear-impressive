import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "BDT"): string {
  if (currency === "BDT") {
    return `৳${amount.toLocaleString("en-BD")}`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}
