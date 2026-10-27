import { clearPortalCookies } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/http/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  await clearPortalCookies();
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
