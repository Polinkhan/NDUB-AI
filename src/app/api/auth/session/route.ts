import { clearPortalCookies, refreshAuthenticatedSession } from "@/lib/auth/session";
import { noStoreJson } from "@/lib/http/security";
import { PortalClient, toSafeStudentSummary } from "@/lib/portal/client";

export async function GET() {
  const tokens = await refreshAuthenticatedSession();
  if (!tokens) return noStoreJson({ authenticated: false }, { status: 401 });

  try {
    const profile = await new PortalClient(tokens.accessToken).getStudentProfile();
    return noStoreJson({ authenticated: true, student: toSafeStudentSummary(profile) });
  } catch {
    await clearPortalCookies();
    return noStoreJson({ authenticated: false }, { status: 401 });
  }
}
