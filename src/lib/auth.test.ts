import { describe, expect, it } from "vitest";
import {
	CSRF_COOKIE_NAME,
	authenticateAccess,
	createCsrfCookie,
	createCsrfToken,
	isOwner,
	readCookie,
	verifyCsrfToken,
} from "../server/auth.server";

describe("owner mutation guards", () => {
	it("allows the configured owner only on loopback development requests", async () => {
		const environment = {
			ENVIRONMENT: "development",
			OWNER_EMAIL: "SohelIslamImran@GMAIL.COM",
		};
		await expect(
			authenticateAccess(new Request("http://127.0.0.1:5190/cms"), environment),
		).resolves.toEqual({
			authenticated: true,
			identity: { email: "sohelislamimran@gmail.com", subject: "local-development" },
		});
		await expect(
			authenticateAccess(new Request("https://cms.sohelislamimran.com/cms"), environment),
		).resolves.toEqual({ authenticated: false, reason: "missing_token" });
		await expect(
			authenticateAccess(new Request("http://127.0.0.1:5190/cms"), {
				...environment,
				ENVIRONMENT: "production",
			}),
		).resolves.toEqual({ authenticated: false, reason: "missing_token" });
	});

	it("compares the normalized configured owner email", () => {
		expect(
			isOwner(
				{ email: "sohelislamimran@gmail.com", subject: "access-subject" },
				{ OWNER_EMAIL: "sohelislamimran@gmail.com" },
			),
		).toBe(true);
		expect(
			isOwner(
				{ email: "someone-else@example.com", subject: "access-subject" },
				{ OWNER_EMAIL: "SohelIslamImran@GMAIL.COM" },
			),
		).toBe(false);
	});

	it("requires the same-origin CSRF cookie and submitted token", () => {
		const token = createCsrfToken();
		const request = new Request("https://cms.sohelislamimran.com/cms", {
			method: "POST",
			headers: {
				Origin: "https://cms.sohelislamimran.com",
				Cookie: createCsrfCookie(token),
			},
		});

		expect(readCookie(request, CSRF_COOKIE_NAME)).toBe(token);
		expect(() => verifyCsrfToken(request, token, "https://cms.sohelislamimran.com")).not.toThrow();
		expect(() =>
			verifyCsrfToken(request, `${token.slice(0, -1)}x`, "https://cms.sohelislamimran.com"),
		).toThrow();

		const crossOrigin = new Request(request, {
			headers: {
				Origin: "https://malicious.example",
				Cookie: createCsrfCookie(token),
			},
		});
		expect(() => verifyCsrfToken(crossOrigin, token, "https://cms.sohelislamimran.com")).toThrow();
	});
});
