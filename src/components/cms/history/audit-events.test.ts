import { describe, expect, it } from "vitest";
import type { AuditEventItem } from "../../../server/cms-storage.server";
import { auditRevisionTarget } from "./audit-events";

const target = (eventType: string, details: AuditEventItem["details"] = null) =>
	auditRevisionTarget({
		id: "event",
		eventType,
		details,
		actorEmail: "",
		revision: 5,
		createdAt: "",
	});

describe("activity revision links", () => {
	it("distinguishes a saved draft and its same-number publication", () => {
		expect(target("draft.save")).toMatchObject({
			search: { kind: "draft", revision: 5 },
			label: "Draft r5 in history",
		});
		expect(target("draft.publish")).toMatchObject({
			search: { kind: "published", revision: 5 },
			label: "Published r5 in history",
		});
	});

	it("uses the restore source id or its exact kind and revision", () => {
		expect(
			target("revision.restore", { sourceId: 9, sourceKind: "published", sourceRevision: 2 }),
		).toMatchObject({
			search: { id: 9 },
			label: "Published r2 in history",
		});
		expect(target("revision.restore", { sourceKind: "draft", sourceRevision: 2 })?.search).toEqual({
			kind: "draft",
			revision: 2,
		});
	});

	it("links discard to the copied publication or its legacy draft revision", () => {
		expect(target("draft.discard", { publishedRevision: 2 })?.search).toEqual({
			kind: "published",
			revision: 2,
		});
		expect(target("draft.discard")?.search).toEqual({ kind: "draft", revision: 5 });
		expect(target("media.upload")).toBeNull();
	});
});
