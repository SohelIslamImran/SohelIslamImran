import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LinkContent } from "../../types/content";
import {
	LocalTime,
	Magnetic,
	TraceLine,
	useCopyToClipboard,
	useSpotlight,
} from "@/components/motion";
import { MonoLabel, Section, StatusDot } from "@/components/ui/portfolio";
import { SmartLink } from "./links";

interface ContactSectionProps {
	title: string;
	intro: string;
	availability: string;
	responseTime?: string;
	email: string;
	links: LinkContent[];
	/** IANA zone for the live clock. */
	timeZone?: string;
	/** City shown with the clock. */
	city?: string;
}

const SPRING = { type: "spring", stiffness: 420, damping: 26, mass: 0.7 } as const;

/**
 * The address as the main control: one press copies it, with a springy
 * check, a ring that spreads from the button, and a polite announcement.
 * Magnetic on a mouse; a plain button for touch and keyboard.
 */
function CopyEmail({ email }: { email: string }) {
	const { status, copy } = useCopyToClipboard(2400);
	const reduceMotion = useReducedMotion() === true;
	const [burst, setBurst] = useState(0);
	const copied = status === "copied";
	const failed = status === "failed";
	return (
		<>
			<Magnetic max={10} className="max-w-full">
				<motion.button
					type="button"
					onClick={async () => {
						const ok = await copy(email);
						if (ok) setBurst((value) => value + 1);
					}}
					whileTap={{ scale: 0.96 }}
					transition={SPRING}
					aria-label={`Copy my email address, ${email}`}
					className="contact-copy group/copy relative isolate inline-flex min-h-16 max-w-full items-center gap-3 rounded-full bg-primary py-3 pr-2.5 pl-5 sm:gap-4 sm:pr-3 sm:pl-7 text-left text-primary-foreground shadow-accent outline-offset-4"
				>
					<AnimatePresence>
						{burst > 0 && !reduceMotion ? (
							<motion.span
								key={burst}
								aria-hidden="true"
								initial={{ opacity: 0.55, scale: 1 }}
								animate={{ opacity: 0, scale: 1.35 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
								className="pointer-events-none absolute inset-0 -z-10 rounded-full border-2 border-primary-line"
							/>
						) : null}
					</AnimatePresence>
					<span className="min-w-0 text-[clamp(0.9375rem,3.8vw,1.5rem)] leading-tight font-[600] tracking-[-0.02em] [overflow-wrap:anywhere]">
						{email}
					</span>
					<span
						aria-hidden="true"
						className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,currentColor_18%,transparent)]"
					>
						<AnimatePresence mode="popLayout" initial={false}>
							{copied ? (
								<motion.svg
									key="check"
									viewBox="0 0 16 16"
									className="size-[18px] fill-none stroke-current stroke-[2] [stroke-linecap:round] [stroke-linejoin:round]"
									initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
									animate={{ scale: 1, opacity: 1, rotate: 0 }}
									exit={{ scale: 0.4, opacity: 0 }}
									transition={SPRING}
								>
									<motion.path
										d="m3.5 8.4 3 2.85 6-6.5"
										initial={{ pathLength: reduceMotion ? 1 : 0 }}
										animate={{ pathLength: 1 }}
										transition={{ duration: 0.35, delay: 0.05 }}
									/>
								</motion.svg>
							) : (
								<motion.svg
									key="copy"
									viewBox="0 0 16 16"
									className="size-[18px] fill-none stroke-current stroke-[1.5] [stroke-linejoin:round]"
									initial={{ scale: 0.4, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.4, opacity: 0 }}
									transition={SPRING}
								>
									<rect x="5.25" y="5.25" width="8" height="8" rx="2" />
									<path d="M10.75 5.25v-1.5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1.5" />
								</motion.svg>
							)}
						</AnimatePresence>
					</span>
				</motion.button>
			</Magnetic>
			<p className="mono-label m-0 min-h-5 text-muted-foreground" aria-live="polite">
				{copied ? (
					<span className="text-success">Copied. Talk soon.</span>
				) : failed ? (
					<span className="text-destructive">Could not copy. Use the mail link.</span>
				) : (
					<span>Press to copy</span>
				)}
			</p>
		</>
	);
}

/**
 * The closing block. Left: the question and the one clear action, copy the
 * address. Right: everything else you need to decide to write, the local
 * time and availability, and the other ways to reach me.
 */
export function ContactSection({
	title,
	intro,
	availability,
	responseTime,
	email,
	links,
	timeZone = "Asia/Dhaka",
	city = "Dhaka",
}: ContactSectionProps) {
	const spotlight = useSpotlight<HTMLDivElement>({ size: 640 });
	const rowClass =
		"group/row flex min-h-14 w-full min-w-0 items-center justify-between gap-4 border-b border-line py-3 text-[15.5px] font-medium text-foreground no-underline transition-colors duration-200 pointer-fine:hover:text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
	return (
		<Section aria-labelledby="contact-title" id="contact">
			<div
				{...spotlight}
				className="relative isolate min-w-0 overflow-hidden rounded-tile border border-line bg-surface-solid px-[clamp(24px,6vw,88px)] pt-[clamp(40px,6vw,88px)] pb-[clamp(32px,5vw,72px)] shadow-surface"
			>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70%] bg-[radial-gradient(60%_80%_at_85%_0%,color-mix(in_srgb,var(--theme-accent)_10%,transparent),transparent_70%)]"
				/>
				<TraceLine
					orientation="horizontal"
					duration={6}
					restAt={0.62}
					className="absolute inset-x-[clamp(24px,6vw,88px)] top-0 w-auto"
				/>
				<div className="grid min-w-0 gap-x-[clamp(48px,6vw,96px)] gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
					<div className="min-w-0">
						<p className="mono-label m-0 flex items-center gap-2.5 text-muted-foreground">
							<span className="text-primary-text">05</span>
							<span aria-hidden="true" className="h-px w-5 bg-line-strong" />
							<span>Contact</span>
						</p>
						<h2
							id="contact-title"
							className="mt-6 mb-0 max-w-[13ch] text-[clamp(2.75rem,6.4vw,6rem)] leading-[0.96] font-[620] tracking-[-0.05em] text-balance [overflow-wrap:anywhere]"
						>
							{title}
						</h2>
						<p className="mt-7 mb-0 max-w-[46ch] text-lead text-ink-soft">{intro}</p>
						{email ? (
							<div className="mt-10 grid min-w-0 justify-items-start gap-3 md:mt-12">
								<CopyEmail email={email} />
							</div>
						) : null}
					</div>

					<div className="flex min-w-0 flex-col justify-start gap-10 border-t border-line pt-8 lg:mt-[calc(var(--text-mono-label,12px)+2.25rem)] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-[clamp(32px,4vw,56px)]">
						<dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-1">
							<div className="min-w-0">
								<dt className="mono-label text-muted-foreground">{city} time</dt>
								<dd className="m-0 mt-2 text-[1.75rem] leading-none font-[600] tracking-[-0.03em] text-foreground">
									<LocalTime
										timeZone={timeZone}
										showOffset
										className="[&>span]:ml-[0.6ch] [&>span]:font-mono [&>span]:text-[13px] [&>span]:font-normal [&>span]:tracking-normal"
									/>
								</dd>
							</div>
							{availability || responseTime ? (
								<div className="min-w-0">
									<dt className="mono-label text-muted-foreground">Availability</dt>
									<dd className="m-0 mt-2 flex items-start gap-2.5 text-[15.5px] leading-snug text-ink-soft">
										<StatusDot className="mt-[0.45em]" />
										<span>
											{availability}
											{availability && responseTime ? <br /> : null}
											{responseTime ? (
												<span className="text-muted-foreground">{responseTime}</span>
											) : null}
										</span>
									</dd>
								</div>
							) : null}
						</dl>
						<div className="min-w-0">
							<MonoLabel className="block">Or reach me</MonoLabel>
							<ul className="m-0 mt-2 grid list-none border-t border-line p-0">
								{email ? (
									<li className="min-w-0">
										<a href={`mailto:${email}`} className={rowClass}>
											<span>Open in your mail app</span>
											<span aria-hidden="true" className="text-muted-foreground">
												@
											</span>
										</a>
									</li>
								) : null}
								{links.map((link, index) => (
									<li key={`${link.href}-${index}`} className="min-w-0">
										<SmartLink link={link} describe className={rowClass} />
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</Section>
	);
}
