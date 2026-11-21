import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../../../content/initial";
import { CmsDraftProvider } from "../draft/context";
import { DateField, MediaField } from "../fields";
import { CollectionEditor } from "./CollectionEditor";

function renderEditor(
	element: React.ReactNode,
	draft = structuredClone(INITIAL_PORTFOLIO_CONTENT),
) {
	return renderToStaticMarkup(
		createElement(CmsDraftProvider, {
			snapshot: {
				draft,
				published: structuredClone(INITIAL_PORTFOLIO_CONTENT),
				draftRevision: 1,
				publishedRevision: 1,
				draftUpdatedAt: "",
				publishedAt: null,
			},
			session: { owner: "local", csrfToken: "", mediaEnabled: true },
			api: {
				save: async () => {
					throw new Error("Unexpected save");
				},
				publish: async () => {
					throw new Error("Unexpected publish");
				},
			},
			children: element,
		}),
	);
}

describe("CMS editor rendering", () => {
	it("shows a legacy date as saved and exposes a calendar conversion", () => {
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.resume.updatedAt = "Winter 2024";
		const element = createElement(DateField, {
			path: "resume.updatedAt",
			label: "Last updated",
			optional: true,
		});
		const legacy = renderEditor(element, draft);
		expect(legacy).toContain('value="Winter 2024"');
		expect(legacy).toContain("Choose a calendar date");
		const iso = renderEditor(element);
		expect(iso).toContain('type="date"');
		expect(iso).toContain('value="2026-10-27"');
	});

	it("shows a private portrait's alt without requesting its media URL", () => {
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.identity.avatar = { id: "asset-draft-only", key: "private-key", alt: "Custom alt" };
		draft.media.push({ ...draft.identity.avatar, alt: "Library default" });
		const html = renderEditor(
			createElement(MediaField, { path: "identity.avatar", label: "Portrait" }),
			draft,
		);
		expect(html).toContain("Library default");
		expect(html).toContain('value="Custom alt"');
		expect(html).not.toContain("/media/asset-draft-only");
		expect(html).not.toContain("private-key");
	});

	it("renders a way back from a stale collection item URL", () => {
		const html = renderEditor(
			createElement(CollectionEditor, {
				item: "missing",
				select: async () => {},
				path: "projects",
				label: "Projects",
				itemLabel: "Project",
				nameLabel: "Project title",
				nameLimit: 240,
				create: (_, id) => ({ id }),
				describe: (row) => ({ title: row.id }),
				Editor: () => null,
			}),
		);
		expect(html).toContain("Item unavailable");
		expect(html).toContain("Return to list");
	});
});
