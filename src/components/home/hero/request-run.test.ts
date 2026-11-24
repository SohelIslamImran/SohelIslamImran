import { describe, expect, it } from "vitest";
import { initialRun, runReducer } from "./request-run";

const send = { type: "send" } as const;
const toggle = { type: "toggle" } as const;
const step = { type: "step", last: 2 } as const;
const finish = { type: "finish" } as const;
const cancel = { type: "cancel" } as const;

describe("request playback", () => {
	it("starts at Interface, steps, holds the cursor while paused, then resumes and finishes", () => {
		const started = runReducer(initialRun, send);
		expect(started).toEqual({ status: "running", layer: 0, ran: false, key: 1 });
		const second = runReducer(started, step);
		const paused = runReducer(second, toggle);
		expect(paused).toEqual({ ...second, status: "paused" });
		expect(paused.layer).toBe(1);
		expect(runReducer(paused, step)).toBe(paused);
		expect(runReducer(paused, finish)).toBe(paused);
		const resumed = runReducer(paused, toggle);
		expect(resumed).toEqual(second);
		const last = runReducer(resumed, step);
		expect(last.layer).toBe(2);
		expect(runReducer(last, step)).toBe(last);
		expect(runReducer(last, finish)).toEqual({ ...last, status: "done", ran: true });
	});

	it("cancels an active run to Send and a paused replay to Replay", () => {
		const first = runReducer(initialRun, send);
		expect(runReducer(first, cancel).status).toBe("idle");
		expect(runReducer(runReducer(first, toggle), cancel).status).toBe("idle");

		const last = runReducer(runReducer(first, step), step);
		const done = runReducer(last, finish);
		const replay = runReducer(done, send);
		expect(replay).toEqual({ status: "running", layer: 0, ran: true, key: 2 });
		expect(runReducer(replay, cancel).status).toBe("done");
		expect(runReducer(runReducer(replay, toggle), cancel).status).toBe("done");
	});

	it("ignores playback events while idle or done", () => {
		const first = runReducer(initialRun, send);
		const done = runReducer(runReducer(runReducer(first, step), step), finish);
		for (const state of [initialRun, done]) {
			for (const event of [toggle, step, finish, cancel]) {
				expect(runReducer(state, event)).toBe(state);
			}
		}
	});
});
