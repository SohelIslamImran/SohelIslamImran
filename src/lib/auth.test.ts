import { describe, expect, it } from "vitest";
import {
	CSRF_COOKIE_NAME,
	createCsrfCookie,
	createCsrfToken,
	isOwner,
	readCookie,
	verifyCsrfToken,
} from "../../app/lib/auth.server";

describe("owner mutation guards", () => {
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
