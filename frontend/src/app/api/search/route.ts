import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/api";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "") + "/api";

/** Proxy for the Cmd+K palette: the browser never sees the API token. */
export async function GET(req: Request) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return Response.json({ message: "Not signed in" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q.slice(0, 100))}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
