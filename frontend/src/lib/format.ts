const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format integer paise as ₹ (₹1,500 for whole rupees, ₹1,500.50 otherwise) */
export function money(paise: number | null | undefined) {
  const p = paise ?? 0;
  return (p % 100 === 0 ? inr : inrPaise).format(p / 100);
}

/** Parse a rupee string from a form ("1,500.50") into integer paise */
export function toPaise(value: FormDataEntryValue | string | null | undefined): number {
  if (value == null) return 0;
  const n = Number(String(value).replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Paise to a plain rupee number for form default values */
export function rupees(paise: number | null | undefined) {
  return ((paise ?? 0) / 100).toString();
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value + (value.length === 10 ? "T00:00:00" : "")) : value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthLabel(iso = todayISO()) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
