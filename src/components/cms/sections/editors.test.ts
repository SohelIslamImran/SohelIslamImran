import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MAX_COLLECTION_ITEMS } from "../../../lib/validation";
import { INITIAL_PORTFOLIO_CONTENT } from "../../../content/initial";
import { CmsDraftProvider } from "../draft/context";
import { DateField, MediaField } from "../fields";
import { HeroEditor, StoryEditor } from "./object-editors";
import { CollectionEditor } from "./CollectionEditor";
import { LinksEditor, ProjectsEditor } from "./collection-editors";
import { sectionSearch } from "../../../routes/cms/content.$section";

vi.mock("../../../server/cms-history.functions", () => ({ listMedia: vi.fn() }));

vi.mock("@tanstack/react-start", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-start")>()),
	useServerFn: vi.fn(),
}));

function renderEditor(
	element: React.ReactNode,
	draft = structuredClone(INITIAL_PORTFOLIO_CONTENT),
	mediaEnabled = true,
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
			session: { owner: "local", csrfToken: "", mediaEnabled },
			api: {
				save: async () => {
					throw new Error("Unexpected save");
				},
				publish: vi.fn(),
				restore: vi.fn(),
				discard: vi.fn(),
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
			false,
		);
		expect(html).toContain("Media storage is not connected.");
		expect(html).toMatch(/<textarea[^>]*>Custom alt<\/textarea>/u);
		expect(html).not.toContain("/media/asset-draft-only");
		expect(html).not.toContain("private-key");
	});

	it("renders a slug editor with a URL warning and profile-specific destination hint", () => {
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.profileLinks = [{ id: "draft-new-link", label: "Link", platform: "Web", href: "/work" }];
		const html = renderEditor(
			createElement(LinksEditor, { item: "draft-new-link", select: vi.fn() }),
			draft,
		);
		expect(html).toContain("Public link slug");
		expect(html).toContain("Apply slug");
		expect(html).toContain("update references to its previous URL");
		expect(html).not.toContain("anchor like #contact");
	});

	it("ignores malformed item and tab query values", () => {
		expect(sectionSearch.parse({ item: ["one"], tab: "bad" })).toEqual({
			item: undefined,
			tab: undefined,
		});
		expect(sectionSearch.parse({ item: "x".repeat(161), tab: "social" })).toEqual({
			item: undefined,
			tab: "social",
		});
	});

	it("keeps an overflowing collection's disabled Add control inside a focusable field", () => {
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		const row = draft.profileLinks[0]!;
		draft.profileLinks = Array.from({ length: MAX_COLLECTION_ITEMS + 1 }, (_, index) => ({
			...row,
			id: `link-${index}`,
		}));
		const html = renderEditor(createElement(LinksEditor, { select: vi.fn() }), draft);
		expect(html).toMatch(
			/<section[^>]*aria-label="Profile links list"[^>]*data-slot="cms-field"[^>]*tabindex="-1"/u,
		);
		expect(html).toMatch(/<button[^>]*id="cms-field-profileLinks"[^>]*disabled=""/u);
		expect(html).toContain(`must contain no more than ${MAX_COLLECTION_ITEMS} items`);
	});

	it("disables Add chapter at the chapter limit and exposes move shortcuts", () => {
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		const chapter = draft.story.chapters[0]!;
		draft.story.chapters = Array.from({ length: 30 }, (_, index) => ({
			...chapter,
			id: `chapter-${index}`,
		}));
		const html = renderEditor(createElement(StoryEditor), draft);
		expect(html).toContain("30/30");
		expect(html).toMatch(/<button[^>]*id="cms-field-story-chapters"[^>]*disabled=""/u);
		expect(html).toContain('aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"');
	});

	it("shows the project detail immediately in server-rendered HTML", () => {
		const html = renderEditor(createElement(ProjectsEditor, { item: "kuno", select: vi.fn() }));
		expect(html).toMatch(
			/style="opacity:1;transform:none"[^>]*><section[^>]*data-slot="cms-editor-group"/u,
		);
	});

	it("server-renders a compact headline textarea and a persistent error region", () => {
		const html = renderEditor(createElement(HeroEditor));
		expect(html).toMatch(/<textarea[^>]*id="cms-field-hero-title"[^>]*rows="1"/u);
		expect(html).toMatch(/aria-live="polite"[^>]*><p id="cms-field-hero-title-error"/u);
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
