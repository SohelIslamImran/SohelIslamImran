import { describe, expect, it } from "vitest";
import { workGroups } from "./project-utils";
import { readWorkOrigin } from "./work-origin";

describe("readWorkOrigin", () => {
	it.each(workGroups)("preserves the %s group", (workGroup) => {
		expect(readWorkOrigin({ workGroup, __TSR_index: 1 })).toBe(workGroup);
	});

	it.each([null, undefined, "experiment", {}, { workGroup: "invalid" }, { workGroup: 1 }])(
		"defaults to all for %j",
		(state) => expect(readWorkOrigin(state)).toBe("all"),
	);
});
