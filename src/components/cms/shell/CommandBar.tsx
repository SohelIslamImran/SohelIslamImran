/**
 * CMS Command Bar (`⌘K` / `Ctrl+K` only — no bare `/`).
 * Fuzzy searches pages, content sections, individual collection items from the
 * draft store, release actions, analytics opt-out, and theme mode switches.
 */
import {
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
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
import { useDraftSelector, useDraftStore, usePublicOrigin } from "../draft/context";
import { REDUCED, SPRING_MOVE } from "../motion";
import { SECTIONS } from "../sections/registry";
import {
	ActivityIcon,
	AnalyticsIcon,
	CloseIcon,
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
import { useCommittedPathname } from "./CmsShell";
import { draftActionAvailability, saveDraftIfAvailable } from "./draft-actions";
import { useLiveReducedMotion } from "./use-live-reduced-motion";

/** After a navigation command, land on the destination's heading (or `main`). */
function focusDestination(previousPath: string) {
	const main = document.getElementById("main-content");
	const heading = main?.querySelector<HTMLElement>("h1");
	const target = heading ?? main;
	if (!target) return;
	const toolbar = document.querySelector(".cms-topbar")?.getBoundingClientRect().bottom ?? 0;
	const rect = target.getBoundingClientRect();
	if (rect.top < toolbar || rect.top >= window.innerHeight) {
		if (location.pathname === previousPath) {
			// An item-only jump keeps the editor's scroll position.
			document
				.querySelector<HTMLElement>('[data-slot="cms-command-trigger"]')
				?.focus({ preventScroll: true });
			return;
		}
		target.scrollIntoView({ block: "start", behavior: "instant" });
	}
	if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
	target.focus({ preventScroll: true });
}

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
	/**
	 * A returned promise is a navigation: focus moves to the destination heading
	 * once it commits. A returned function runs after the bar has closed and
	 * released focus. Otherwise focus returns to the opener.
	 */
	run: (origin?: Element | null) => void | Promise<void> | (() => void);
}

export function CommandBar({
	opener,
	open,
	onOpenChange,
	onRequestPublish,
	onToggleRail,
}: {
	opener: RefObject<HTMLElement | null>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRequestPublish: () => void;
	onToggleRail: () => void;
}) {
	// The portal retains the content through the closing transition.
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<CommandBarOpen
					opener={opener}
					onOpenChange={onOpenChange}
					onRequestPublish={onRequestPublish}
					onToggleRail={onToggleRail}
				/>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function CommandBarOpen({
	opener,
	onOpenChange,
	onRequestPublish,
	onToggleRail,
}: {
	opener: RefObject<HTMLElement | null>;
	onOpenChange: (open: boolean) => void;
	onRequestPublish: () => void;
	onToggleRail: () => void;
}) {
	const reduce = useLiveReducedMotion();
	const popupRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const pathname = useCommittedPathname();
	const afterClose = useRef<(() => void) | null>(null);
	const finalFocus = () => {
		const next = afterClose.current;
		if (!next) return opener.current;
		// Run once the dialog's focus trap has been removed.
		requestAnimationFrame(next);
		return false;
	};
	const store = useDraftStore();
	const draft = useDraftSelector((state) => state.draft);
	const dirty = useDraftSelector((state) => state.dirty);
	const ahead = useDraftSelector((state) => state.ahead);
	const issueCount = useDraftSelector((state) => state.issues.all.length);
	const { canSave, canPublish } = useDraftSelector(draftActionAvailability);
	const appearance = useAppearance();
	const publicOrigin = usePublicOrigin();
	const [desktop, setDesktop] = useState(false);
	useLayoutEffect(() => {
		const query = window.matchMedia("(min-width: 1024px)");
		const sync = () => setDesktop(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	const [query, setQuery] = useState("");
	const [activeId, setActiveId] = useState<string | null>(null);
	const [keyboardNav, setKeyboardNav] = useState(false);
	const pointer = useRef<{ x: number; y: number } | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const listboxId = useId();
	const optionPrefix = useId();

	const entries = useMemo<CommandEntry[]>(() => {
		const openItem = (section: string, item: string) =>
			navigate({
				to: "/cms/content/$section",
				params: { section },
				search: { item },
				resetScroll: pathname.replace(/^\/cms(?=\/)/u, "") !== `/content/${section}`,
			});
		const pages: CommandEntry[] = [
			{
				id: "page-overview",
				group: "Pages",
				label: "Overview",
				detail: "Signals and content health",
				keywords: "home dashboard status signals",
				icon: <OverviewIcon />,
				run: () => navigate({ to: "/cms" }),
			},
			{
				id: "page-analytics",
				group: "Pages",
				label: "Analytics",
				detail: "Visitors, pages, referrers, countries",
				keywords: "traffic stats views metrics",
				icon: <AnalyticsIcon />,
				// `/cms/analytics` is owned by the analytics workstream; keep wide string until merged.
				run: () => navigate({ to: "/cms/analytics" as string }),
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
				run: () => navigate({ to: "/cms/release" }),
			},
			{
				id: "page-history",
				group: "Pages",
				label: "Revision history",
				detail: "Inspect past drafts and published snapshots, restore",
				keywords: "revisions rollback restore snapshots timeline",
				icon: <HistoryIcon />,
				run: () => navigate({ to: "/cms/history" }),
			},
			{
				id: "page-activity",
				group: "Pages",
				label: "Activity log",
				detail: "Audit trail of saves, publishes, restores, and media updates",
				keywords: "audit events log history",
				icon: <ActivityIcon />,
				run: () => navigate({ to: "/cms/activity" }),
			},
			{
				id: "page-library",
				group: "Pages",
				label: "Media library",
				detail: "Assets, alt text, and draft usage",
				keywords: "images photos uploads r2 files assets",
				icon: <MediaLibraryIcon />,
				run: () => navigate({ to: "/cms/library" }),
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
				run: () => navigate({ to: "/cms/content/$section", params: { section: section.id } }),
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
				run: () => openItem("projects", project.id),
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
				run: () => openItem("experience", exp.id),
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
				run: () => openItem("capabilities", cap.id),
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
				run: () => openItem("testimonials", testimonial.id),
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
				run: () => openItem("credentials", cred.id),
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
				run: () => openItem("writing", post.id),
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
				run: () => openItem("links", link.id),
			});
		}
		for (const chapter of draft.story.chapters) {
			items.push({
				id: `item-chapter-${chapter.id}`,
				group: "Items",
				label: chapter.title.trim() || chapter.id,
				detail: `Story · ${chapter.eyebrow}`,
				icon: <SectionIcon id="story" />,
				run: () => navigate({ to: "/cms/content/$section", params: { section: "story" } }),
			});
		}
		for (const entry of draft.travel.entries) {
			items.push({
				id: `item-travel-${entry.id}`,
				group: "Items",
				label: entry.place.trim() || entry.id,
				detail: `Travel · ${entry.region} · ${entry.season}`,
				icon: <SectionIcon id="travel" />,
				run: () => openItem("travel", entry.id),
			});
		}

		const analyticsOptOut = new URL("/?analytics=off", publicOrigin).href;
		const actions: CommandEntry[] = [
			{
				id: "action-save",
				group: "Actions",
				label: "Save draft",
				detail: dirty ? "Write current edits to D1" : "No unsaved edits",
				keywords: "save commit sync",
				shortcut: "⌘S",
				icon: <SaveIcon />,
				disabled: !canSave,
				run: () => saveDraftIfAvailable(store),
			},
			{
				id: "action-publish",
				group: "Actions",
				label: "Publish draft to live",
				detail: `Promote the validated draft to ${new URL(publicOrigin).host}`,
				keywords: "publish deploy release ship live",
				icon: <PublishIcon />,
				disabled: !canPublish,
				run: () => () => {
					opener.current?.focus({ preventScroll: true });
					onRequestPublish();
				},
			},
			{
				id: "action-discard",
				group: "Actions",
				label: "Discard draft to live",
				detail: "Review changes and reset draft to the published revision",
				keywords: "revert reset discard rollback",
				icon: <DiscardIcon />,
				disabled: !ahead && !dirty,
				run: () => navigate({ to: "/cms/release" }),
			},
			{
				id: "action-live-site",
				group: "Actions",
				label: "Open live site",
				detail: publicOrigin,
				keywords: "public site preview visit",
				icon: <ExternalArrowIcon />,
				external: true,
				run: () => void window.open(publicOrigin, "_blank", "noopener,noreferrer"),
			},
			{
				id: "action-exclude-analytics",
				group: "Actions",
				label: "Exclude this browser from analytics",
				detail: analyticsOptOut,
				keywords: "analytics opt out ignore self browser privacy",
				icon: <AnalyticsIcon />,
				external: true,
				run: () => void window.open(analyticsOptOut, "_blank", "noopener,noreferrer"),
			},
		];
		if (desktop) {
			actions.push({
				id: "action-toggle-rail",
				group: "Actions",
				label: "Toggle sidebar width",
				detail: "Switch between full rail and icon rail",
				keywords: "sidebar rail collapse expand narrow",
				shortcut: "⌘\\ / Ctrl+\\",
				icon: <SidebarToggleIcon />,
				run: () => onToggleRail(),
			});
		}

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
		canPublish,
		canSave,
		desktop,
		dirty,
		draft,
		issueCount,
		navigate,
		onRequestPublish,
		onToggleRail,
		opener,
		pathname,
		publicOrigin,
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
		listRef.current?.scrollTo({ top: 0 });
	}, [query]);

	useEffect(() => {
		if (!activeItem) return;
		document
			.getElementById(`${optionPrefix}-${activeItem.id}`)
			?.scrollIntoView({ block: "nearest" });
	}, [activeItem, optionPrefix]);

	const execute = (item: CommandEntry, origin?: Element | null) => {
		if (item.disabled) return;
		if (!item.stayOpen) onOpenChange(false);
		const previousPath = location.pathname;
		const result = item.run(origin ?? document.getElementById(`${optionPrefix}-${item.id}`));
		afterClose.current =
			typeof result === "function"
				? result
				: result instanceof Promise
					? () => void result.then(() => focusDestination(previousPath))
					: null;
	};

	const move = (nextIndex: number) => {
		if (!flat.length) return;
		setKeyboardNav(true);
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
			case "Enter":
				if (activeItem && !activeItem.disabled) {
					event.preventDefault();
					execute(activeItem);
				}
				break;
		}
	};

	useLayoutEffect(() => {
		const trigger = document.querySelector<HTMLElement>('[data-slot="cms-command-trigger"]');
		const popup = popupRef.current;
		if (!trigger || !popup) return;

		// offsetWidth/Height are the resting size, independent of the entry scale.
		const anchor = trigger.getBoundingClientRect();
		const box = popup.getBoundingClientRect();
		popup.style.transformOrigin = `${anchor.left + anchor.width / 2 - (box.left + box.width / 2) + popup.offsetWidth / 2}px ${anchor.bottom - box.top}px`;
	}, []);

	return (
		<>
			<Dialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette)" />
			<Dialog.Popup
				ref={popupRef}
				data-slot="cms-command-bar"
				initialFocus={inputRef}
				finalFocus={finalFocus}
				className="cms-command-popup cms-overlay cms-glass fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-(--z-palette) flex max-h-[min(600px,calc(100dvh-28px))] flex-col overflow-hidden rounded-[19px] border text-foreground outline-hidden md:inset-x-auto md:top-[max(10vh,70px)] md:left-1/2 md:max-h-[min(540px,74dvh)] md:w-[min(560px,calc(100vw-32px))] md:-translate-x-1/2"
			>
				<Dialog.Title className="sr-only">Control plane command bar</Dialog.Title>
				<Dialog.Description className="sr-only">
					Search sections, collection items, pages, and release actions. Use arrow keys to move and
					Enter to open.
				</Dialog.Description>

				<div className="cms-command-search flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-1">
					<SearchIcon className="size-4 text-muted-foreground" />
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						aria-expanded={flat.length > 0}
						aria-controls={flat.length > 0 ? listboxId : undefined}
						aria-activedescendant={activeItem ? `${optionPrefix}-${activeItem.id}` : undefined}
						aria-autocomplete="list"
						aria-label="Search commands"
						value={query}
						onChange={(event) => {
							setActiveId(null);
							setQuery(event.target.value);
						}}
						onKeyDown={onKeyDown}
						placeholder="Search pages, content, and actions…"
						className="h-12 w-full min-w-0 bg-transparent text-base md:text-[14.5px] text-foreground outline-hidden placeholder:text-ink-soft"
					/>
					{query ? (
						<button
							type="button"
							onClick={() => {
								setActiveId(null);
								setQuery("");
								inputRef.current?.focus();
							}}
							className="cms-chrome-control cms-command-secondary cms-press min-h-8 shrink-0 rounded-full px-2.5 text-[12px] pointer-coarse:min-h-11"
						>
							Clear
						</button>
					) : null}
					<Dialog.Close
						className="cms-chrome-control cms-press grid min-h-8 min-w-8 shrink-0 place-items-center rounded-lg text-muted-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11"
						aria-label="Close commands"
					>
						<CloseIcon />
					</Dialog.Close>
				</div>

				<div role="status">
					{flat.length === 0 ? (
						<div className="cms-result-enter grid justify-items-center gap-2 px-4 py-9 text-center">
							<span className="grid size-10 place-items-center rounded-[12px] bg-primary-soft text-primary-text">
								<SearchIcon />
							</span>
							<p className="m-0 text-[14px] font-semibold text-foreground">No matches</p>
							<p className="m-0 max-w-72 cms-command-secondary text-[13px]">
								Try a page name, a project title, or an action like “save”.
							</p>
						</div>
					) : null}
				</div>
				{flat.length > 0 ? (
					<motion.div
						layoutScroll
						ref={listRef}
						id={listboxId}
						role="listbox"
						aria-label="Commands"
						// Options are driven from the combobox (aria-activedescendant); keep
						// the scrollable list itself out of the Tab sequence too.
						tabIndex={-1}
						data-keyboard-nav={keyboardNav || undefined}
						className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-2"
					>
						{filtered.map((section, sectionIndex) => (
							<div
								key={section.group ?? "results"}
								role={section.group ? "group" : undefined}
								aria-label={section.group ?? undefined}
								className={cn("cms-result-enter", sectionIndex > 0 && "mt-2.5")}
							>
								{section.group ? (
									<p
										aria-hidden="true"
										className="cms-command-secondary m-0 px-2.5 py-1 text-[11px] font-medium"
									>
										{section.group}
									</p>
								) : null}
								<div className="grid grid-cols-1 gap-0.5">
									{section.items.map((item) => {
										const isActive = activeItem?.id === item.id;
										return (
											<button
												key={item.id}
												id={`${optionPrefix}-${item.id}`}
												type="button"
												role="option"
												tabIndex={-1}
												aria-selected={isActive}
												aria-disabled={item.disabled || undefined}
												onPointerMove={(event) => {
													if (event.pointerType !== "mouse") return;
													// Scrolling the active option into view moves rows under a
													// resting pointer; only a real move takes over from the keys.
													const last = pointer.current;
													pointer.current = { x: event.screenX, y: event.screenY };
													if (
														keyboardNav &&
														(!last || (last.x === event.screenX && last.y === event.screenY))
													) {
														return;
													}
													setKeyboardNav(false);
													if (activeId !== item.id) setActiveId(item.id);
												}}
												onMouseDown={(event) => event.preventDefault()}
												onClick={(event) => execute(item, event.currentTarget)}
												className={cn(
													"cms-command-row cms-chrome-control cms-press relative isolate flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-left",
													item.disabled && "cursor-not-allowed opacity-45",
												)}
											>
												{isActive ? (
													<motion.span
														layoutId={reduce ? undefined : "cms-command-highlight"}
														aria-hidden="true"
														initial={reduce ? { opacity: 0 } : false}
														animate={{ opacity: 1 }}
														transition={reduce ? REDUCED : SPRING_MOVE}
														className="cms-command-highlight pointer-events-none absolute inset-0 -z-10 rounded-[10px]"
														style={{ borderRadius: 10 }}
													/>
												) : null}
												<span className="flex min-w-0 items-center gap-2.5">
													<span
														className={cn(
															"grid size-8 shrink-0 place-items-center rounded-[9px] bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]",
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
															<span className="cms-command-secondary block truncate text-[12px]">
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
						))}
					</motion.div>
				) : null}

				<footer className="cms-command-secondary flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-2 font-mono text-[11px] pointer-coarse:hidden">
					<span className="flex items-center gap-3">
						<span>
							<Kbd className="text-inherit">↑</Kbd> <Kbd className="text-inherit">↓</Kbd> navigate
						</span>
						<span>
							<Kbd className="text-inherit">↵</Kbd> open
						</span>
						<span className="hidden sm:inline">
							<Kbd className="text-inherit">⌘S</Kbd> save
						</span>
					</span>
					<span>
						<Kbd className="text-inherit">esc</Kbd> close
					</span>
				</footer>
			</Dialog.Popup>
		</>
	);
}
