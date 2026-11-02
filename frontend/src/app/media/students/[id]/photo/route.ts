import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/api";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "") + "/api";

/**
 * Streams a student's photo from the API. Photos are personal data, so they are never public:
 * the browser hits this route with its session cookie, and we forward the bearer token.
 * URLs carry ?v=<storage key>, so a new upload gets a new URL and the old one can be cached.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token || !/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });

  const res = await fetch(`${API_URL}/students/${id}/photo`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok || !res.body) return new Response(null, { status: res.status === 401 ? 401 : 404 });
  return new Response(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
