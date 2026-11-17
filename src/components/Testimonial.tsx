import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { TestimonialContent } from "../types/content";
import { cn } from "../lib/utils";
import { useHydrated } from "./motion/hooks";
import { classifyLink, LINK_ARROWS, LINK_DESTINATIONS } from "./home/links";
import { Surface } from "./ui/portfolio";

/**
 * One vouched quote, kept with its attribution and date so it stays checkable.
 * `card` (default) renders its own surface, as on the résumé; `plain` renders
 * only the figure so a parent tile can provide the chrome.
 */
export function Testimonial({
	testimonial,
	className,
	variant = "card",
	label,
}: {
	testimonial: TestimonialContent;
	className?: string;
	/** `feature` is the home page's editorial quote with a layered quote mark. */
	variant?: "card" | "plain" | "feature";
	/** Optional mono label above the quote, e.g. "From a client". */
	label?: string;
}) {
	const quote =
		testimonial.quote.trim() || "A recommendation will appear here when it is ready to share.";
	const author = testimonial.author.trim() || "Reference";
	const role = testimonial.role.trim() || "Client";
	const date = testimonial.date?.trim() || "";
	const href = testimonial.href?.trim() || undefined;
	const kind = href ? classifyLink(href) : undefined;
	const external = kind === "external";
	const linkLabel = href?.toLowerCase().includes("linkedin")
		? "Read it on LinkedIn"
		: "Read the recommendation";
	const initials = author
		.split(/\s+/u)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");

	if (variant === "feature") {
		return (
			<FeatureQuote
				className={className}
				label={label}
				quote={quote}
				author={author}
				role={role}
				date={date}
				initials={initials}
				link={href && kind ? { href, kind, label: linkLabel, external } : undefined}
			/>
		);
	}

	const figure = (
		<figure
			data-slot={variant === "plain" ? "testimonial" : undefined}
			className={cn(
				"m-0 flex h-full min-w-0 max-w-full flex-col print:[break-inside:avoid] print:[page-break-inside:avoid]",
				variant === "plain" && className,
			)}
		>
			{label ? <p className="mono-label m-0 mb-5 text-muted-foreground">{label}</p> : null}
			<span
				aria-hidden="true"
				className="block font-serif text-[3.25rem] leading-[0.5] text-primary-text opacity-70 print:hidden"
			>
				“
			</span>
			<blockquote className="m-0 mt-4 min-w-0 max-w-[30ch] text-[clamp(1.375rem,2.4vw,1.875rem)] leading-[1.18] font-[600] tracking-[-0.025em] text-balance text-foreground [overflow-wrap:anywhere]">
				{quote}
			</blockquote>
			<figcaption className="mt-auto flex min-w-0 max-w-full flex-wrap items-center gap-x-3.5 gap-y-2 pt-7 text-[14px] text-muted-foreground">
				<span
					aria-hidden="true"
					className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] text-[13px] font-semibold tracking-[0.02em] text-ink-soft print:hidden"
				>
					{initials || "“"}
				</span>
				<span className="grid min-w-0 flex-1 basis-40 gap-0.5">
					<span className="min-w-0 font-semibold text-foreground [overflow-wrap:anywhere]">
						{author}
					</span>
					<span className="min-w-0 [overflow-wrap:anywhere]">
						{role}
						{date ? ` · ${date}` : null}
					</span>
				</span>
				{href && kind ? (
					<a
						aria-label={`${linkLabel}, ${LINK_DESTINATIONS[kind]}`}
						className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-full text-[14px] font-medium text-primary-text no-underline decoration-from-font underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:min-h-0"
						href={href}
						target={external ? "_blank" : undefined}
						rel={external ? "noopener noreferrer" : undefined}
					>
						<span className="min-w-0 [overflow-wrap:anywhere]">{linkLabel}</span>
						<span className="shrink-0" aria-hidden="true">
							{LINK_ARROWS[kind]}
						</span>
					</a>
				) : null}
			</figcaption>
		</figure>
	);

	if (variant === "plain") return figure;

	return (
		<Surface
			data-slot="testimonial"
			className={cn(
				"grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-0 p-[clamp(22px,3vw,32px)] print:[break-inside:avoid] print:[page-break-inside:avoid]",
				className,
			)}
		>
			{figure}
		</Surface>
	);
}

/**
 * The home page quote, set big. A large quote mark hangs above the first line
 * (never behind the letters) and drifts a little slower than the words as you
 * scroll. Still under reduced motion.
 */
function FeatureQuote({
	className,
	label,
	quote,
	author,
	role,
	date,
	initials,
	link,
}: {
	className?: string;
	label?: string;
	quote: string;
	author: string;
	role: string;
	date: string;
	initials: string;
	link?: { href: string; kind: ReturnType<typeof classifyLink>; label: string; external: boolean };
}) {
	const ref = useRef<HTMLElement>(null);
	const reduceMotion = useReducedMotion() === true;
	// Server HTML and the hydration render carry no transform, so they always match.
	const animate = useHydrated() && !reduceMotion;
	const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
	const markY = useTransform(scrollYProgress, [0, 1], [16, -16]);
	const quoteY = useTransform(scrollYProgress, [0, 1], [24, -24]);
	return (
		<figure
			ref={ref}
			data-slot="testimonial"
			className={cn("relative isolate m-0 min-w-0 pt-[clamp(24px,5vw,64px)]", className)}
		>
			{label ? (
				<p className="mono-label m-0 flex items-center gap-2.5 text-muted-foreground">
					<span aria-hidden="true" className="h-px w-5 bg-line-strong" />
					{label}
				</p>
			) : null}
			<motion.span
				aria-hidden="true"
				style={animate ? { y: markY } : undefined}
				className="pointer-events-none mt-[clamp(16px,2.4vw,28px)] block h-[0.42em] overflow-visible font-serif text-[clamp(5.5rem,11vw,9rem)] leading-[0.82] text-primary-text opacity-40 select-none"
			>
				“
			</motion.span>
			<motion.blockquote
				style={animate ? { y: quoteY } : undefined}
				className="m-0 mt-0 min-w-0 max-w-[18ch] text-[clamp(2.5rem,6.6vw,5.75rem)] leading-[1] font-[620] tracking-[-0.045em] text-balance text-foreground [overflow-wrap:anywhere]"
			>
				{quote}
			</motion.blockquote>
			<figcaption className="mt-[clamp(32px,5vw,56px)] flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-6 text-[15px] text-muted-foreground">
				<span
					aria-hidden="true"
					className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold tracking-[0.02em] text-primary-text"
				>
					{initials || "“"}
				</span>
				<span className="grid min-w-0 flex-1 basis-48 gap-0.5">
					<span className="min-w-0 font-semibold text-foreground [overflow-wrap:anywhere]">
						{author}
					</span>
					<span className="min-w-0 [overflow-wrap:anywhere]">
						{role}
						{date ? ` · ${date}` : null}
					</span>
				</span>
				{link ? (
					<a
						aria-label={`${link.label}, ${LINK_DESTINATIONS[link.kind]}`}
						className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-full text-[15px] font-medium text-primary-text no-underline underline-offset-4 hover:underline"
						href={link.href}
						target={link.external ? "_blank" : undefined}
						rel={link.external ? "noopener noreferrer" : undefined}
					>
						<span className="min-w-0 [overflow-wrap:anywhere]">{link.label}</span>
						<span className="shrink-0" aria-hidden="true">
							{LINK_ARROWS[link.kind]}
						</span>
					</a>
				) : null}
			</figcaption>
		</figure>
	);
}
