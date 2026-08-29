import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
	const reducedMotion = useReducedMotion();
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
		<section className="work" id="work-focus" aria-labelledby={`${baseId}-title`}>
			<div className="section-intro">
				<p className="kicker section-intro-kicker">{sectionNumber} · Selected work</p>
				<h2 className="section-intro-title" id={`${baseId}-title`}>
					What the work needs.
				</h2>
				<p className="section-intro-copy">
					Start with Kuno’s product systems, then move through matching and delivery work.
				</p>
			</div>
			<div className="work-tabs" role="tablist" aria-label="Work focus" data-focus={focus}>
				<motion.span
					className="work-tabs-indicator"
					aria-hidden="true"
					initial={false}
					animate={{
						transform: `translateX(calc(${["identity", "matching", "delivery"].indexOf(focus)} * (100% + 4px)))`,
					}}
					transition={
						reducedMotion ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.08 }
					}
				/>
				{(Object.keys(labels) as Focus[]).map((key) => (
					<button
						key={key}
						className="work-tab"
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
			<AnimatePresence initial={false} mode="wait">
				<motion.div
					className="work-panel"
					id={panelId}
					role="tabpanel"
					aria-labelledby={`${baseId}-${focus}`}
					key={focus}
					initial={
						reducedMotion
							? { opacity: 0 }
							: {
									opacity: 0,
									clipPath: "inset(0 0 10% 0 round 22px)",
									transform: "translateY(8px)",
								}
					}
					animate={
						reducedMotion
							? { opacity: 1 }
							: { opacity: 1, clipPath: "inset(0 0 0% 0 round 22px)", transform: "translateY(0px)" }
					}
					exit={
						reducedMotion
							? { opacity: 0 }
							: {
									opacity: 0,
									clipPath: "inset(0 0 10% 0 round 22px)",
									transform: "translateY(-5px)",
								}
					}
					transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
				>
					<div className="work-panel-head">
						<span>{labels[focus]} systems</span>
						<span>{String(items.length).padStart(2, "0")} proofs</span>
					</div>
					<div className="work-cards">
						{items.length > 0 ? (
							items.map((project, index) => (
								<motion.article
									className="work-card glass"
									key={project.id}
									whileHover={reducedMotion ? undefined : { y: -5, rotateX: 2 }}
									whileTap={reducedMotion ? undefined : { scale: 0.992 }}
									style={{ transformPerspective: 900 }}
									initial={
										reducedMotion
											? { opacity: 0 }
											: { opacity: 0, transform: "translateY(10px) scale(0.985)" }
									}
									animate={
										reducedMotion
											? { opacity: 1 }
											: { opacity: 1, transform: "translateY(0px) scale(1)" }
									}
									transition={{
										duration: reducedMotion ? 0 : 0.25,
										delay: reducedMotion ? 0 : 0.04 * index,
										ease: [0.22, 1, 0.36, 1],
									}}
								>
									<PrismImage
										src={
											project.cover?.id
												? `/media/${project.cover.id}`
												: "/images/kuno-systems-724.webp"
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
										className="work-card-image"
									/>
									<span>{project.year}</span>
									<h3 className="work-card-title">{project.title}</h3>
									<p className="work-card-copy">{project.summary}</p>
									<div className="tags">
										{project.tags.slice(0, 3).map((tag) => (
											<span className="tag" key={tag}>
												{tag}
											</span>
										))}
									</div>
									{(project.repository ?? project.href) && (
										<a
											className="work-card-link"
											href={project.repository ?? project.href}
											target="_blank"
											rel="noreferrer"
										>
											Open proof <span aria-hidden="true">↗</span>
										</a>
									)}
								</motion.article>
							))
						) : (
							<motion.article
								className="work-card glass work-card--empty"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
							>
								<span>In progress</span>
								<h3>{labels[focus]} notes are being prepared.</h3>
								<p>
									The public case studies will appear here as this part of the route is ready to
									share.
								</p>
							</motion.article>
						)}
					</div>
				</motion.div>
			</AnimatePresence>
		</section>
	);
}
