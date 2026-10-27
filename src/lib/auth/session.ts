import { cookies } from "next/headers";
import { refreshPortalSession } from "@/lib/portal/client";
import type { PortalTokens } from "@/lib/portal/types";

export const ACCESS_COOKIE = "ndub_portal_access";
export const REFRESH_COOKIE = "ndub_portal_refresh";
const FALLBACK_SESSION_SECONDS = 60 * 60 * 24 * 7;

function tokenLifetime(token: string, fallback = FALLBACK_SESSION_SECONDS) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return fallback;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { exp?: number };
    if (!payload.exp) return fallback;
    return Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    return fallback;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

export async function setPortalCookies(tokens: PortalTokens) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokenLifetime(tokens.accessToken)));
  store.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(tokenLifetime(tokens.refreshToken)));
}

export async function clearPortalCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", { ...cookieOptions(0), expires: new Date(0) });
  store.set(REFRESH_COOKIE, "", { ...cookieOptions(0), expires: new Date(0) });
}

export async function hasPortalSession() {
  return Boolean((await cookies()).get(REFRESH_COOKIE)?.value);
}

export async function refreshAuthenticatedSession() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const tokens = await refreshPortalSession(refreshToken);
    await setPortalCookies(tokens);
    return tokens;
  } catch {
    await clearPortalCookies();
    return null;
  }
}
