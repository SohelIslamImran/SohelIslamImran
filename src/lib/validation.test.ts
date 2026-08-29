import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { parseStoredContent, validatePortfolioContent } from "./validation";

describe("portfolio content validation", () => {
	it("accepts the published seed and round-trips it through storage JSON", () => {
		const result = validatePortfolioContent(INITIAL_PORTFOLIO_CONTENT);

		expect(result.ok).toBe(true);
		expect(parseStoredContent(JSON.stringify(INITIAL_PORTFOLIO_CONTENT)).schemaVersion).toBe(2);
	});

	it("rejects unsafe redirect targets", () => {
		const invalid = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		invalid.profileLinks[0].href = "javascript:alert(1)";

		const result = validatePortfolioContent(invalid);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues.some((issue) => issue.path.includes("profileLinks[0].href"))).toBe(true);
		}
	});
});
