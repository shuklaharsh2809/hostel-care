import { z } from "zod";

/** Reusable Zod pieces for request bodies. Money is always integer paise. */
export const optText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD");
export const optDate = isoDate.nullish().or(z.literal("")).transform((v) => v || null);
export const paise = z.number().int("Amounts must be whole paise").min(0);
export const uuid = z.string().uuid();
