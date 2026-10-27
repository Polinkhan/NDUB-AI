import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("@/lib/portal/client", () => ({ refreshPortalSession: vi.fn() }));

import { ACCESS_COOKIE, clearPortalCookies, REFRESH_COOKIE, setPortalCookies } from "./session";

beforeEach(() => {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
});

describe("portal session cookies", () => {
  it("stores both tokens as persistent HTTP-only strict cookies", async () => {
    await setPortalCookies({ accessToken: "access", refreshToken: "refresh" });

    expect(cookieStore.set).toHaveBeenCalledTimes(2);
    expect(cookieStore.set).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      "access",
      expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/", maxAge: 604800 }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      "refresh",
      expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/", maxAge: 604800 }),
    );
  });

  it("expires both cookies on logout", async () => {
    await clearPortalCookies();
    expect(cookieStore.set).toHaveBeenCalledWith(ACCESS_COOKIE, "", expect.objectContaining({ maxAge: 0 }));
    expect(cookieStore.set).toHaveBeenCalledWith(REFRESH_COOKIE, "", expect.objectContaining({ maxAge: 0 }));
  });
});
