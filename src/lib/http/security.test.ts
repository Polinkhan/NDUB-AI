import { afterEach, describe, expect, it } from "vitest";
import { isSameOrigin } from "./security";

afterEach(() => {
  delete process.env.APP_ORIGIN;
});

describe("same-origin request protection", () => {
  it("allows requests without an Origin header", () => {
    expect(isSameOrigin(new Request("http://127.0.0.1:5050/api/chat"))).toBe(true);
  });

  it("allows the request URL origin", () => {
    const request = new Request("http://127.0.0.1:5050/api/chat", {
      headers: { Origin: "http://127.0.0.1:5050" },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("allows the configured public origin behind a reverse proxy", () => {
    process.env.APP_ORIGIN = "https://ndub.polinkhan.com/";
    const request = new Request("http://127.0.0.1:5050/api/chat", {
      headers: { Origin: "https://ndub.polinkhan.com" },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("rejects untrusted and malformed origins", () => {
    process.env.APP_ORIGIN = "https://ndub.polinkhan.com";

    expect(
      isSameOrigin(
        new Request("http://127.0.0.1:5050/api/chat", {
          headers: { Origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
    expect(
      isSameOrigin(
        new Request("http://127.0.0.1:5050/api/chat", {
          headers: { Origin: "not a URL" },
        }),
      ),
    ).toBe(false);
  });
});
