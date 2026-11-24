import { describe, expect, it } from "vitest";
import { publishStep } from "./publish-steps";

const state = {
	status: "idle",
	revision: 12,
	dirty: false,
	ahead: true,
	attempting: false,
	unconfirmed: false,
	published: false,
} as const;

describe("publish trace", () => {
	it("states readiness from the saved revision or unsaved edits", () => {
		expect(publishStep(state)).toEqual({ step: "publish", text: "Ready to publish r12." });
		expect(publishStep({ ...state, dirty: true })).toEqual({
			step: "save",
			text: "Unsaved edits will be saved first.",
		});
		expect(publishStep({ ...state, ahead: false })).toBeNull();
	});

	it("reports saving, publishing, and live from real state changes", () => {
		expect(publishStep({ ...state, status: "saving", attempting: true })).toEqual({
			step: "save",
			text: "Saving draft…",
		});
		expect(publishStep({ ...state, status: "publishing", revision: 13 })).toEqual({
			step: "publish",
			text: "Publishing r13…",
		});
		expect(publishStep({ ...state, ahead: false, published: true })).toEqual({
			step: "live",
			text: "Live r12.",
		});
	});

	it("reports an autosave in flight before a publish is attempted", () => {
		expect(publishStep({ ...state, status: "saving", dirty: true })).toEqual({
			step: "save",
			text: "Saving draft…",
		});
	});

	it("offers an idempotent retry for an unconfirmed publish and defers conflicts", () => {
		expect(publishStep({ ...state, status: "error", unconfirmed: true })).toMatchObject({
			step: "publish",
			unconfirmed: true,
			text: expect.stringContaining("if r12 already went live"),
		});
		expect(publishStep({ ...state, status: "conflict", unconfirmed: true })).toBeNull();
	});
});
