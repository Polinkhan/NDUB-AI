function parseOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isSameOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;

  const origin = parseOrigin(originHeader);
  if (!origin) return false;
  if (origin === new URL(request.url).origin) return true;

  const configuredOrigin = process.env.APP_ORIGIN;
  return configuredOrigin ? origin === parseOrigin(configuredOrigin) : false;
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}
