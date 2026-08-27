import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AccessAuthEnvironment {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUDIENCE?: string;
  ACCESS_AUD?: string;
  OWNER_EMAIL?: string;
  APP_ORIGIN?: string;
}

export interface AccessIdentity {
  email: string;
  subject: string;
  name?: string;
}

export type AuthenticationFailure =
  | "missing_token"
  | "invalid_token"
  | "configuration_missing";

export type AuthenticationResult =
  | { authenticated: true; identity: AccessIdentity }
  | { authenticated: false; reason: AuthenticationFailure };

export type OwnerAuthorization =
  | { ok: true; identity: AccessIdentity }
  | {
      ok: false;
      status: 401 | 403 | 503;
      reason: "unauthenticated" | "forbidden" | "configuration_missing";
    };

export const CSRF_COOKIE_NAME = "__Host-portfolio-csrf";
export const CSRF_TOKEN_MAX_AGE_SECONDS = 60 * 60;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function normalizeTeamDomain(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function configuredAudience(env: AccessAuthEnvironment): string | null {
  const audience = env.ACCESS_AUDIENCE ?? env.ACCESS_AUD;
  return audience && audience.trim().length > 0 ? audience.trim() : null;
}

function configuredOwnerEmail(env: AccessAuthEnvironment): string | null {
  const email = env.OWNER_EMAIL?.trim().toLowerCase();
  return email && email.length > 0 ? email : null;
}

function identityFromPayload(payload: Record<string, unknown>): AccessIdentity | null {
  const email = payload.email;
  const subject = payload.sub;

  if (typeof email !== "string" || typeof subject !== "string") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length === 0) {
    return null;
  }

  const name = typeof payload.name === "string" ? payload.name : undefined;
  return name === undefined
    ? { email: normalizedEmail, subject }
    : { email: normalizedEmail, subject, name };
}

/**
 * Verify the Access assertion on every owner request. The JWKS URL is kept
 * dynamic so Access key rotation does not require a deploy.
 */
export async function authenticateAccess(
  request: Request,
  env: AccessAuthEnvironment,
): Promise<AuthenticationResult> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    return { authenticated: false, reason: "missing_token" };
  }

  const teamDomain = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN);
  const audience = configuredAudience(env);
  if (!teamDomain || !audience) {
    return { authenticated: false, reason: "configuration_missing" };
  }

  try {
    const jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: teamDomain,
      audience,
    });

    if (payload.type !== "app") {
      return { authenticated: false, reason: "invalid_token" };
    }

    const identity = identityFromPayload(payload as Record<string, unknown>);
    return identity === null
      ? { authenticated: false, reason: "invalid_token" }
      : { authenticated: true, identity };
  } catch {
    return { authenticated: false, reason: "invalid_token" };
  }
}

export function isOwner(identity: AccessIdentity, env: AccessAuthEnvironment): boolean {
  const ownerEmail = configuredOwnerEmail(env);
  return ownerEmail !== null && identity.email === ownerEmail;
}

export async function authorizeOwner(
  request: Request,
  env: AccessAuthEnvironment,
): Promise<OwnerAuthorization> {
  const authentication = await authenticateAccess(request, env);

  if (!authentication.authenticated) {
    if (authentication.reason === "configuration_missing") {
      return { ok: false, status: 503, reason: "configuration_missing" };
    }

    return { ok: false, status: 401, reason: "unauthenticated" };
  }

  if (!isOwner(authentication.identity, env)) {
    return { ok: false, status: 403, reason: "forbidden" };
  }

  return { ok: true, identity: authentication.identity };
}

/** Throw a response suitable for a React Router loader or action. */
export async function requireOwner(
  request: Request,
  env: AccessAuthEnvironment,
): Promise<AccessIdentity> {
  const authorization = await authorizeOwner(request, env);
  if (authorization.ok) {
    return authorization.identity;
  }

  if (authorization.status === 503) {
    throw new Response("Owner authentication is not configured.", { status: 503 });
  }

  throw new Response(authorization.status === 403 ? "Forbidden" : "Unauthorized", {
    status: authorization.status,
  });
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);

  if (leftBytes.byteLength !== rightBytes.byteLength) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }

  return difference === 0;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function createCsrfToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

export function createCsrfCookie(token: string): string {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error("Invalid CSRF token");
  }

  return [
    `${CSRF_COOKIE_NAME}=${token}`,
    `Max-Age=${CSRF_TOKEN_MAX_AGE_SECONDS}`,
    "Path=/",
    "Secure",
    "HttpOnly",
    "SameSite=Strict",
  ].join("; ");
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) {
    return null;
  }

  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const key = pair.slice(0, separator).trim();
    if (key === name) {
      return pair.slice(separator + 1).trim() || null;
    }
  }

  return null;
}

export function getCsrfToken(request: Request): {
  token: string;
  setCookie: string | null;
} {
  const existingToken = readCookie(request, CSRF_COOKIE_NAME);
  if (existingToken && TOKEN_PATTERN.test(existingToken)) {
    return { token: existingToken, setCookie: null };
  }

  const token = createCsrfToken();
  return { token, setCookie: createCsrfCookie(token) };
}

export function sameOrigin(request: Request, expectedOrigin: string): boolean {
  const requestOrigin = request.headers.get("Origin");
  if (!requestOrigin) {
    return false;
  }

  try {
    return new URL(requestOrigin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: Request, expectedOrigin: string): void {
  if (!sameOrigin(request, expectedOrigin)) {
    throw new Response("Origin check failed.", { status: 403 });
  }
}

export function verifyCsrfToken(
  request: Request,
  submittedToken: string | null | undefined,
  expectedOrigin: string,
): void {
  assertSameOrigin(request, expectedOrigin);

  const cookieToken = readCookie(request, CSRF_COOKIE_NAME);
  if (
    !cookieToken ||
    !submittedToken ||
    !TOKEN_PATTERN.test(cookieToken) ||
    !TOKEN_PATTERN.test(submittedToken) ||
    !constantTimeEqual(cookieToken, submittedToken)
  ) {
    throw new Response("CSRF validation failed.", { status: 403 });
  }
}
