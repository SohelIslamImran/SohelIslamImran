import { useEffect, useId, useState } from "react";
import type { ProjectContent } from "../types/content";
import { PrismImage } from "./PrismImage";

type Focus = "identity" | "matching" | "delivery";
const labels: Record<Focus, string> = {
	identity: "Identity",
	matching: "Matching",
	delivery: "Delivery",
};

export function WorkFocusTabs({
	projects,
	initialFocus,
	onFocusChange,
	sectionNumber = "02",
}: {
	projects: ProjectContent[];
	initialFocus?: Focus;
	onFocusChange?: (focus: Focus) => void;
	sectionNumber?: "01" | "02";
}) {
	const [localFocus, setLocalFocus] = useState<Focus>(initialFocus ?? "identity");
	const focus = localFocus;
	useEffect(() => {
		if (initialFocus) setLocalFocus(initialFocus);
	}, [initialFocus]);
	const changeFocus = (next: Focus) => {
		setLocalFocus(next);
		onFocusChange?.(next);
	};
	const baseId = useId();
	const panelId = `${baseId}-panel`;
	const visible = projects
		.filter((project) => {
			if (focus === "identity")
				return (
					project.tags.some((tag) => /identity|product|kuno/i.test(tag)) ||
					project.id === "kuno-platform"
				);
			if (focus === "matching")
				return project.tags.some((tag) => /matching|learning|react|expo/i.test(tag));
			return project.tags.some((tag) => /delivery|cloud|cli|native|swift/i.test(tag));
		})
		.slice(0, 3);
	const visibleIds = new Set(visible.map((project) => project.id));
	const items = [...visible, ...projects.filter((project) => !visibleIds.has(project.id))].slice(
		0,
		3,
	);
	const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		const keys: Focus[] = ["identity", "matching", "delivery"];
		const index = keys.indexOf(focus);
		const next =
			event.key === "ArrowRight"
				? (index + 1) % keys.length
				: event.key === "ArrowLeft"
					? (index - 1 + keys.length) % keys.length
					: event.key === "Home"
						? 0
						: event.key === "End"
							? keys.length - 1
							: -1;
		if (next < 0) return;
		event.preventDefault();
		changeFocus(keys[next]);
		document.getElementById(`${baseId}-${keys[next]}`)?.focus();
	};
	return (
		<section className="prism-work" id="work-focus" aria-labelledby={`${baseId}-title`}>
			<div className="prism-section-intro">
				<p className="prism-kicker">{sectionNumber} · Selected work</p>
				<h2 id={`${baseId}-title`}>What the work needs.</h2>
				<p>Start with Kuno’s product systems, then move through matching and delivery work.</p>
			</div>
			<div className="prism-tabs" role="tablist" aria-label="Work focus" data-focus={focus}>
				<span className="prism-tabs__indicator" aria-hidden="true" />
				{(Object.keys(labels) as Focus[]).map((key) => (
					<button
						key={key}
						id={`${baseId}-${key}`}
						type="button"
						role="tab"
						aria-selected={focus === key}
						aria-controls={panelId}
						tabIndex={focus === key ? 0 : -1}
						onKeyDown={onKeyDown}
						onClick={() => changeFocus(key)}
					>
						{labels[key]}
					</button>
				))}
			</div>
			<div
				className="prism-work__panel"
				id={panelId}
				role="tabpanel"
				aria-labelledby={`${baseId}-${focus}`}
				key={focus}
			>
				<div className="prism-work__panel-head">
					<span>{labels[focus]} systems</span>
					<span>{String(items.length).padStart(2, "0")} proofs</span>
				</div>
				<div className="prism-work__cards">
					{items.map((project) => (
						<article className="prism-work-card prism-glass-card" key={project.id}>
							<PrismImage
								src={
									project.cover?.id ? `/media/${project.cover.id}` : "/images/kuno-systems-724.webp"
								}
								alt={`${project.title} visual placeholder`}
								width={724}
								height={543}
								sizes="(max-width: 800px) calc(100vw - 88px), 340px"
								srcSet={
									project.cover?.id
										? undefined
										: "/images/kuno-systems-724.webp 724w, /images/kuno-systems-1448.webp 1448w"
								}
								className="prism-work-card__image"
							/>
							<span>{project.year}</span>
							<h3>{project.title}</h3>
							<p>{project.summary}</p>
							<div className="prism-tags">
								{project.tags.slice(0, 3).map((tag) => (
									<span key={tag}>{tag}</span>
								))}
							</div>
							{(project.repository ?? project.href) && (
								<a
									className="prism-work-card__link"
									href={project.repository ?? project.href}
									target="_blank"
									rel="noreferrer"
								>
									Open proof <span aria-hidden="true">↗</span>
								</a>
							)}
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
