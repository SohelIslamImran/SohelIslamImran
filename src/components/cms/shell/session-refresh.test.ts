import { describe, expect, it, vi } from "vitest";
import { createSessionRefresh, withCsrfRetry } from "./session-refresh";

describe("CSRF retry", () => {
	it("retries a 403 once using the adopted session", async () => {
		let session = "old";
		const call = vi.fn(async () => {
			if (session === "old") throw new Response(null, { status: 403 });
			return session;
		});
		const refresh = createSessionRefresh(
			"owner",
			async () => ({ ok: true, owner: "owner", session: "new" }),
			(next) => {
				session = next;
			},
		);
		await expect(withCsrfRetry(call, refresh)).resolves.toBe("new");
		expect(call).toHaveBeenCalledTimes(2);
	});

	it("surfaces a second 403", async () => {
		const forbidden = new Response(null, { status: 403 });
		const call = vi.fn().mockRejectedValue(forbidden);
		const refresh = vi.fn().mockResolvedValue(true);
		await expect(withCsrfRetry(call, refresh)).rejects.toBe(forbidden);
		expect(call).toHaveBeenCalledTimes(2);
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it("never refreshes or retries a 401", async () => {
		const expired = new Response(null, { status: 401 });
		const call = vi.fn().mockRejectedValue(expired);
		const refresh = vi.fn();
		await expect(withCsrfRetry(call, refresh)).rejects.toBe(expired);
		expect(call).toHaveBeenCalledTimes(1);
		expect(refresh).not.toHaveBeenCalled();
	});

	it("shares one refresh across concurrent 403s", async () => {
		const read = vi.fn(async () => ({ ok: true, owner: "owner", session: "fresh" }) as const);
		const adopt = vi.fn();
		const refresh = createSessionRefresh("owner", read, adopt);
		const attempt = () => vi.fn().mockRejectedValueOnce({ status: 403 }).mockResolvedValue(true);
		await expect(
			Promise.all([withCsrfRetry(attempt(), refresh), withCsrfRetry(attempt(), refresh)]),
		).resolves.toEqual([true, true]);
		expect(read).toHaveBeenCalledTimes(1);
		expect(adopt).toHaveBeenCalledOnce();
	});

	it("does not adopt a session for a different owner", async () => {
		const adopt = vi.fn();
		const refresh = createSessionRefresh(
			"owner",
			async () => ({ ok: true, owner: "other", session: "fresh" }),
			adopt,
		);
		const forbidden = { status: 403 };
		const call = vi.fn().mockRejectedValue(forbidden);
		await expect(withCsrfRetry(call, refresh)).rejects.toBe(forbidden);
		expect(call).toHaveBeenCalledTimes(1);
		expect(adopt).not.toHaveBeenCalled();
	});
});
