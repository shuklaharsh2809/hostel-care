import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local-disk file storage for uploads (student photos).
 * Keys are relative paths like "photos/<orgId>/<studentId>-<ts>.jpg".
 * To move to S3 / R2 / Vercel Blob later, re-implement these three functions.
 */
const ROOT = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid file key");
  return full;
}

export async function saveFile(key: string, data: Buffer) {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readStoredFile(key: string) {
  return readFile(resolveKey(key));
}

export async function deleteFile(key: string) {
  await unlink(resolveKey(key)).catch(() => undefined);
}

/** Detect image type from magic bytes (never trust the client's mimetype). */
export function sniffImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
