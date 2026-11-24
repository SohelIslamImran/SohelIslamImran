import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusMark } from "./StatusMark";

describe("StatusMark", () => {
	it.each(["synced", "saved", "saving", "dirty", "ahead", "invalid"] as const)(
		"renders a decorative 14px %s mark at rest on the server",
		(phase) => {
			const html = renderToStaticMarkup(<StatusMark phase={phase} />);
			expect(html).toContain('aria-hidden="true"');
			expect(html).toContain('width="14" height="14" viewBox="0 0 16 16"');
			expect(html).not.toMatch(/opacity:0|scale\(0\.6\)/);
		},
	);

	it("only rotates the saving arc and draws the saved check", () => {
		const render = (phase: "saving" | "saved" | "synced") =>
			renderToStaticMarkup(<StatusMark phase={phase} />);
		expect(render("saving")).toContain("cms-status-arc");
		expect(render("synced")).not.toContain("cms-status-arc");
		expect(render("synced")).not.toContain("stroke-dasharray");
		expect(render("saved")).toContain('stroke-dasharray="1px 1px"');
	});
});
