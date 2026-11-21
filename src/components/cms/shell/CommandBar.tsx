/**
 * CMS Command Bar (`⌘K` / `Ctrl+K` only — no bare `/`).
 * Fuzzy searches pages, content sections, individual collection items from the
 * draft store, release actions, analytics opt-out, and theme mode switches.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";
import {
	applyThemeMode,
	themeModeLabels,
	themeModes,
	ThemeModeIcon,
	useAppearance,
} from "../../AccentSwitcher";
import { scoreItem } from "../../chrome/fuzzy";
import { Kbd } from "../../ui/portfolio";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { SECTIONS } from "../sections/registry";
import {
	ActivityIcon,
	AnalyticsIcon,
	DiscardIcon,
	ExternalArrowIcon,
	HistoryIcon,
	MediaLibraryIcon,
	OverviewIcon,
	PublishIcon,
	ReleaseChangesIcon,
	SaveIcon,
	SearchIcon,
	SectionIcon,
	SidebarToggleIcon,
} from "./cms-icons";
import { PUBLIC_SITE_ORIGIN } from "./CmsShell";

type CommandGroup = "Pages" | "Sections" | "Items" | "Actions" | "Appearance";
const GROUP_ORDER: readonly CommandGroup[] = [
	"Pages",
	"Sections",
	"Items",
	"Actions",
	"Appearance",
];

interface CommandEntry {
	id: string;
	group: CommandGroup;
	label: string;
	detail?: string;
	keywords?: string;
	icon: ReactNode;
	badge?: ReactNode;
	shortcut?: string;
	external?: boolean;
	disabled?: boolean;
	stayOpen?: boolean;
	run: (origin?: Element | null) => void;
}

export function CommandBar({
	open,
	onOpenChange,
	onRequestPublish,
	onToggleRail,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRequestPublish: () => void;
	onToggleRail: () => void;
}) {
	// Only subscribe to the draft tree while the dialog is open so typing in
	// content editors never re-renders the command index.
	if (!open) return null;
	return (
		<CommandBarOpen
			onOpenChange={onOpenChange}
			onRequestPublish={onRequestPublish}
			onToggleRail={onToggleRail}
		/>
	);
}

function CommandBarOpen({
	onOpenChange,
	onRequestPublish,
	onToggleRail,
}: {
	onOpenChange: (open: boolean) => void;
	onRequestPublish: () => void;
	onToggleRail: () => void;
}) {
	const open = true;
	const navigate = useNavigate();
	const store = useDraftStore();
	const draft = useDraftSelector((state) => state.draft);
	const dirty = useDraftSelector((state) => state.dirty);
	const ahead = useDraftSelector((state) => state.ahead);
	const issueCount = useDraftSelector((state) => state.issues.all.length);
	const conflict = useDraftSelector((state) => state.conflict !== null);
	const appearance = useAppearance();

	const [query, setQuery] = useState("");
	const [activeId, setActiveId] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const listboxId = useId();
	const optionPrefix = useId();

	const entries = useMemo<CommandEntry[]>(() => {
		const pages: CommandEntry[] = [
			{
				id: "page-overview",
				group: "Pages",
				label: "Overview",
				detail: "Signals and content health",
				keywords: "home dashboard status signals",
				icon: <OverviewIcon />,
				run: () => void navigate({ to: "/cms" }),
			},
			{
				id: "page-analytics",
				group: "Pages",
				label: "Analytics",
				detail: "Visitors, pages, referrers, countries",
				keywords: "traffic stats views metrics",
				icon: <AnalyticsIcon />,
				// `/cms/analytics` is owned by the analytics workstream; keep wide string until merged.
				run: () => void navigate({ to: "/cms/analytics" as string }),
			},
			{
				id: "page-release",
				group: "Pages",
				label: "Changes & Release",
				detail: "Diff vs live, publish, discard, JSON import/export",
				keywords: "diff publish deploy release json export import",
				icon: <ReleaseChangesIcon />,
				badge:
					ahead || dirty ? (
						<span className="font-mono text-[11px] text-primary-text">Δ</span>
					) : undefined,
				run: () => void navigate({ to: "/cms/release" }),
			},
			{
				id: "page-history",
				group: "Pages",
				label: "Revision history",
				detail: "Inspect past drafts and published snapshots, restore",
				keywords: "revisions rollback restore snapshots timeline",
				icon: <HistoryIcon />,
				run: () => void navigate({ to: "/cms/history" }),
			},
			{
				id: "page-activity",
				group: "Pages",
				label: "Activity log",
				detail: "Audit trail of saves, publishes, restores, and media updates",
				keywords: "audit events log history",
				icon: <ActivityIcon />,
				run: () => void navigate({ to: "/cms/activity" }),
			},
			{
				id: "page-library",
				group: "Pages",
				label: "Media library",
				detail: "Assets, alt text, and draft usage",
				keywords: "images photos uploads r2 files assets",
				icon: <MediaLibraryIcon />,
				run: () => void navigate({ to: "/cms/library" }),
			},
		];

		const sections: CommandEntry[] = SECTIONS.map((section) => {
			const state = store.getState();
			const errors = section.paths.reduce((n, p) => n + state.issues.under(p).length, 0);
			const changed = section.paths.some((p) => store.changedAt(p, state));
			return {
				id: `section-${section.id}`,
				group: "Sections",
				label: section.label,
				detail: section.summary,
				keywords: `${section.id} ${section.group} ${section.paths.join(" ")}`,
				icon: <SectionIcon id={section.id} />,
				badge: errors ? (
					<span className="font-mono text-[11px] text-destructive">!{errors}</span>
				) : changed ? (
					<span className="font-mono text-[11px] text-primary-text">Δ</span>
				) : undefined,
				run: () => void navigate({ to: "/cms/content/$section", params: { section: section.id } }),
			};
		});

		const items: CommandEntry[] = [];
		for (const project of draft.projects) {
			items.push({
				id: `item-project-${project.id}`,
				group: "Items",
				label: project.title.trim() || project.slug || project.id,
				detail: `Project · ${project.category}${project.year ? ` · ${project.year}` : ""}`,
				keywords: `${project.slug} ${project.role} ${project.tags.join(" ")}`,
				icon: <SectionIcon id="projects" />,
				run: () =>
					void navigate({
						to: "/cms/content/$section",
						params: { section: "projects" },
						search: { item: project.id },
					}),
			});
		}
		for (const exp of draft.experience) {
			items.push({
				id: `item-exp-${exp.id}`,
				group: "Items",
				label: `${exp.role.trim() || "Role"} · ${exp.company.trim() || exp.id}`,
				detail: `Experience · ${exp.period}`,
				keywords: `${exp.company} ${exp.technologies.join(" ")}`,
				icon: <SectionIcon id="experience" />,
				run: () =>
					void navigate({
						to: "/cms/content/$section",
						params: { section: "experience" },
						search: { item: exp.id },
					}),
			});
		}
		for (const cap of draft.capabilities) {
			items.push({
				id: `item-cap-${cap.id}`,
				group: "Items",
				label: cap.title.trim() || cap.id,
				detail: "Capability",
				keywords: cap.tools.join(" "),
				icon: <SectionIcon id="capabilities" />,
				run: () =>
					void navigate({
						to: "/cms/content/$section",
						params: { section: "capabilities" },
						search: { item: cap.id },
					}),
			});
		}
		for (const testimonial of draft.testimonials) {
			items.push({
				id: `item-testimonial-${testimonial.id}`,
				group: "Items",
				label: testimonial.author.trim() || testimonial.id,
				detail: `Testimonial · ${testimonial.role}`,
				keywords: testimonial.quote,
				icon: <SectionIcon id="testimonials" />,
				run: () =>
					void navigate({
						to: "/cms/content/$section",
						params: { section: "testimonials" },
						search: { item: testimonial.id },
					}),
			});
		}
		for (const cred of draft.credentials) {
			items.push({
				id: `item-cred-${cred.id}`,
				group: "Items",
				label: cred.title.trim() || cred.id,
				detail: `Credential · ${cred.issuer}`,
				keywords: cred.issuedAt,
				icon: <SectionIcon id="credentials" />,
				run: () =>
					void navigate({
						to: "/cms/content/$section",
						params: { section: "credentials" },
						search: { item: cred.id },
					}),
			});
		}
		for (const post of draft.writing) {
			items.push({
				id: `item-writing-${post.id}`,
				group: "Items",
				label: post.title.trim() || post.id,
				detail: `Field note · ${post.publishedAt}`,
				keywords: post.tags.join(" "),
				icon: <SectionIcon id="writing" />,
				run: () =>
					void navigate({
						to: "/cms/content/$section",
						params: { section: "writing" },
						search: { item: post.id },
					}),
			});
		}
		for (const link of draft.profileLinks) {
			items.push({
				id: `item-link-${link.id}`,
				group: "Items",
				label: link.label.trim() || link.platform.trim() || link.id,
				detail: `Profile link · ${link.handle?.trim() || link.href}`,
				keywords: `${link.platform} ${link.kind ?? ""}`,
				icon: <SectionIcon id="links" />,
				run: () =>
					void navigate({
						to: "/cms/content/$section",
						params: { section: "links" },
						search: { item: link.id },
					}),
			});
		}
		for (const chapter of draft.story.chapters) {
			items.push({
				id: `item-chapter-${chapter.id}`,
				group: "Items",
				label: chapter.title.trim() || chapter.id,
				detail: `Story · ${chapter.eyebrow}`,
				icon: <SectionIcon id="story" />,
				run: () => void navigate({ to: "/cms/content/$section", params: { section: "story" } }),
			});
		}
		for (const entry of draft.travel.entries) {
			items.push({
				id: `item-travel-${entry.id}`,
				group: "Items",
				label: entry.place.trim() || entry.id,
				detail: `Travel · ${entry.region} · ${entry.season}`,
				icon: <SectionIcon id="travel" />,
				run: () => void navigate({ to: "/cms/content/$section", params: { section: "travel" } }),
			});
		}

		const actions: CommandEntry[] = [
			{
				id: "action-save",
				group: "Actions",
				label: "Save draft",
				detail: dirty ? "Write current edits to D1" : "No unsaved edits",
				keywords: "save commit sync",
				shortcut: "⌘S",
				icon: <SaveIcon />,
				disabled: !dirty || issueCount > 0 || conflict,
				run: () => void store.save(),
			},
			{
				id: "action-publish",
				group: "Actions",
				label: "Publish draft to live",
				detail: "Promote the validated draft to sohelislamimran.com",
				keywords: "publish deploy release ship live",
				icon: <PublishIcon />,
				disabled: (!ahead && !dirty) || issueCount > 0 || conflict,
				run: () => onRequestPublish(),
			},
			{
				id: "action-discard",
				group: "Actions",
				label: "Discard draft to live",
				detail: "Review changes and reset draft to the published revision",
				keywords: "revert reset discard rollback",
				icon: <DiscardIcon />,
				disabled: !ahead && !dirty,
				run: () => void navigate({ to: "/cms/release" }),
			},
			{
				id: "action-live-site",
				group: "Actions",
				label: "Open live site",
				detail: PUBLIC_SITE_ORIGIN,
				keywords: "public site preview visit",
				icon: <ExternalArrowIcon />,
				external: true,
				run: () => window.open(PUBLIC_SITE_ORIGIN, "_blank", "noopener,noreferrer"),
			},
			{
				id: "action-exclude-analytics",
				group: "Actions",
				label: "Exclude this browser from analytics",
				detail: `${PUBLIC_SITE_ORIGIN}/?analytics=off`,
				keywords: "analytics opt out ignore self browser privacy",
				icon: <AnalyticsIcon />,
				external: true,
				run: () =>
					window.open(`${PUBLIC_SITE_ORIGIN}/?analytics=off`, "_blank", "noopener,noreferrer"),
			},
			{
				id: "action-toggle-rail",
				group: "Actions",
				label: "Toggle sidebar width",
				detail: "Switch between full rail and icon rail",
				keywords: "sidebar rail collapse expand narrow",
				shortcut: "[",
				icon: <SidebarToggleIcon />,
				run: () => onToggleRail(),
			},
		];

		const appearanceEntries: CommandEntry[] = themeModes.map((mode) => ({
			id: `theme-${mode}`,
			group: "Appearance",
			label:
				mode === "auto"
					? "Follow system theme"
					: `Switch to ${themeModeLabels[mode].toLowerCase()} theme`,
			keywords: `theme appearance ${mode} dark light system`,
			icon: <ThemeModeIcon mode={mode} />,
			badge:
				appearance.theme === mode ? (
					<span className="font-mono text-[11px] text-primary-text">✓</span>
				) : undefined,
			stayOpen: true,
			run: (origin) => {
				if (!appearance.transitioning) void applyThemeMode(mode, origin);
			},
		}));

		return [...pages, ...sections, ...items, ...actions, ...appearanceEntries];
	}, [
		ahead,
		appearance.theme,
		appearance.transitioning,
		conflict,
		dirty,
		draft,
		issueCount,
		navigate,
		onRequestPublish,
		onToggleRail,
		store,
	]);

	const filtered = useMemo(() => {
		const trimmed = query.trim();
		if (!trimmed) {
			return GROUP_ORDER.map((group) => ({
				group,
				// Keep the initial list compact; items appear cleanly as you search or browse.
				items: entries
					.filter((item) => item.group === group)
					.slice(0, group === "Items" ? 6 : undefined),
			})).filter((section) => section.items.length > 0);
		}
		const scored = entries
			.map((item, order) => ({
				item,
				order,
				score: scoreItem(
					trimmed,
					item.label,
					`${item.detail ?? ""} ${item.keywords ?? ""} ${item.group}`,
				),
			}))
			.filter(
				(candidate): candidate is { item: CommandEntry; order: number; score: number } =>
					candidate.score !== null,
			)
			.sort((a, b) => b.score - a.score || a.order - b.order)
			.map((candidate) => candidate.item);
		return scored.length ? [{ group: null as CommandGroup | null, items: scored }] : [];
	}, [entries, query]);

	const flat = useMemo(() => filtered.flatMap((section) => section.items), [filtered]);
	const activeIndex = Math.max(
		0,
		flat.findIndex((item) => item.id === activeId),
	);
	const activeItem = flat[activeIndex];

	useEffect(() => {
		setActiveId(flat[0]?.id ?? null);
		listRef.current?.scrollTo({ top: 0 });
	}, [query, open]);

	useEffect(() => {
		if (!activeItem) return;
		document
			.getElementById(`${optionPrefix}-${activeItem.id}`)
			?.scrollIntoView({ block: "nearest" });
	}, [activeItem, optionPrefix]);

	const execute = (item: CommandEntry, origin?: Element | null) => {
		if (item.disabled) return;
		if (!item.stayOpen) onOpenChange(false);
		item.run(origin ?? document.getElementById(`${optionPrefix}-${item.id}`));
	};

	const move = (nextIndex: number) => {
		if (!flat.length) return;
		const wrapped = (nextIndex + flat.length) % flat.length;
		setActiveId(flat[wrapped]?.id ?? null);
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.nativeEvent.isComposing) return;
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				move(activeIndex + 1);
				break;
			case "ArrowUp":
				event.preventDefault();
				move(activeIndex - 1);
				break;
			case "Home":
				event.preventDefault();
				move(0);
				break;
			case "End":
				event.preventDefault();
				move(flat.length - 1);
				break;
			case "Enter":
				if (activeItem && !activeItem.disabled) {
					event.preventDefault();
					execute(activeItem);
				}
				break;
		}
	};

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next, details) => {
				if (!next && details.reason === "escape-key" && inputRef.current?.value) {
					details.cancel();
					setQuery("");
					return;
				}
				onOpenChange(next);
			}}
			onOpenChangeComplete={(isOpenNow) => {
				if (!isOpenNow) setQuery("");
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.28)] dark:bg-[rgb(0_0_0/0.55)]" />
				<Dialog.Popup
					data-slot="cms-command-bar"
					initialFocus={inputRef}
					className={cn(
						"cms-dialog-popup cms-glass fixed z-(--z-palette) flex flex-col overflow-hidden border text-foreground outline-hidden",
						"inset-x-0 bottom-0 max-h-[min(84dvh,640px)] rounded-t-[20px] pb-[env(safe-area-inset-bottom)]",
						"md:inset-x-auto md:bottom-auto md:top-[max(11vh,72px)] md:left-1/2 md:max-h-[min(540px,74vh)] md:w-[min(620px,calc(100vw-32px))] md:-translate-x-1/2 md:rounded-[18px] md:pb-0",
					)}
				>
					<Dialog.Title className="sr-only">Control plane command bar</Dialog.Title>
					<Dialog.Description className="sr-only">
						Search sections, collection items, pages, and release actions. Use arrow keys to move
						and Enter to open.
					</Dialog.Description>

					<div className="flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-1">
						<SearchIcon className="size-4 text-muted-foreground" />
						<input
							ref={inputRef}
							type="text"
							role="combobox"
							aria-expanded={true}
							aria-controls={listboxId}
							aria-activedescendant={activeItem ? `${optionPrefix}-${activeItem.id}` : undefined}
							aria-autocomplete="list"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={onKeyDown}
							placeholder="Jump to a section, project, experience, or action…"
							className="h-12 w-full min-w-0 bg-transparent text-[14.5px] text-foreground outline-hidden placeholder:text-muted-foreground/75"
						/>
						{query ? (
							<button
								type="button"
								onClick={() => {
									setQuery("");
									inputRef.current?.focus();
								}}
								className="rounded-full px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
							>
								Clear
							</button>
						) : (
							<Kbd>esc</Kbd>
						)}
					</div>

					<div
						ref={listRef}
						id={listboxId}
						role="listbox"
						aria-label="Commands"
						className="min-h-0 flex-1 overflow-y-auto p-2"
					>
						{filtered.length === 0 ? (
							<p className="m-0 py-10 text-center text-[13.5px] text-muted-foreground">
								No match for &ldquo;{query.trim()}&rdquo;.
							</p>
						) : (
							filtered.map((section, sectionIndex) => (
								<div key={section.group ?? "results"} className={cn(sectionIndex > 0 && "mt-2.5")}>
									{section.group ? (
										<p className="mono-label m-0 px-2.5 py-1 text-[10px] text-muted-foreground">
											{section.group}
										</p>
									) : null}
									<div className="grid gap-0.5">
										{section.items.map((item) => {
											const isActive = activeItem?.id === item.id;
											return (
												<button
													key={item.id}
													id={`${optionPrefix}-${item.id}`}
													type="button"
													role="option"
													aria-selected={isActive}
													aria-disabled={item.disabled || undefined}
													onPointerMove={() => {
														if (activeId !== item.id) setActiveId(item.id);
													}}
													onClick={(event) => execute(item, event.currentTarget)}
													className={cn(
														"flex min-h-10 w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-100 pointer-coarse:min-h-11",
														isActive
															? "bg-[color-mix(in_srgb,var(--theme-ink)_7%,transparent)] text-foreground"
															: "text-ink-soft hover:bg-[color-mix(in_srgb,var(--theme-ink)_4.5%,transparent)]",
														item.disabled && "cursor-not-allowed opacity-45",
													)}
												>
													<span className="flex min-w-0 items-center gap-2.5">
														<span
															className={cn(
																"grid size-7 shrink-0 place-items-center rounded-[8px] border border-line bg-surface-solid",
																isActive ? "text-primary-text" : "text-muted-foreground",
															)}
														>
															{item.icon}
														</span>
														<span className="min-w-0">
															<span className="block truncate text-[13.5px] font-medium text-foreground">
																{item.label}
															</span>
															{item.detail ? (
																<span className="block truncate text-[12px] text-muted-foreground">
																	{item.detail}
																</span>
															) : null}
														</span>
													</span>
													<span className="flex shrink-0 items-center gap-2">
														{item.badge}
														{item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
														{item.external ? (
															<span
																aria-hidden="true"
																className="font-mono text-[11px] text-muted-foreground"
															>
																↗
															</span>
														) : null}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							))
						)}
					</div>

					<footer className="hidden shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-2 font-mono text-[11px] text-muted-foreground sm:flex">
						<span className="flex items-center gap-3">
							<span>
								<Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
							</span>
							<span>
								<Kbd>↵</Kbd> open
							</span>
							<span>
								<Kbd>⌘S</Kbd> save
							</span>
							<span>
								<Kbd>[</Kbd> rail
							</span>
						</span>
						<span>
							<Kbd>esc</Kbd> close
						</span>
					</footer>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
