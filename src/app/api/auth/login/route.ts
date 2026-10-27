import { z } from "zod";
import { clearPortalCookies, setPortalCookies } from "@/lib/auth/session";
import { isSameOrigin, noStoreJson } from "@/lib/http/security";
import { loginToPortal, PortalApiError, PortalClient, toSafeStudentSummary } from "@/lib/portal/client";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return noStoreJson({ error: "Invalid request origin." }, { status: 403 });

  try {
    const input = loginSchema.parse(await request.json());
    const tokens = await loginToPortal(input.username, input.password);
    const profile = await new PortalClient(tokens.accessToken).getStudentProfile();
    await setPortalCookies(tokens);
    return noStoreJson({ student: toSafeStudentSummary(profile) });
  } catch (error) {
    await clearPortalCookies();
    if (error instanceof z.ZodError) {
      return noStoreJson({ error: "Enter a valid student ID and password." }, { status: 400 });
    }
    if (error instanceof PortalApiError) {
      const status = error.code === "AUTH" ? 401 : 502;
      return noStoreJson({ error: error.message }, { status });
    }
    return noStoreJson({ error: "Unable to sign in right now. Please try again." }, { status: 500 });
  }
}
