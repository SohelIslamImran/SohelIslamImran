import { useRef, type CSSProperties } from "react";
import type { HeroContent, IdentityContent } from "../../types/content";
import { LocalTime, Magnetic } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { MonoLabel, StatusDot } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";
import { PortfolioImage } from "../PortfolioImage";
import { HERO_CSS } from "./hero/hero-css";
import { splitHeadline } from "./hero/headline";
import { useHeroScroll } from "./hero/useHeroScroll";
import { SmartLink } from "./links";
import { StackTrace } from "./StackTrace";

const FALLBACK_PORTRAIT = "/images/sohel-linkedin-400.webp";
const WORD_START_MS = 160;
const WORD_STEP_MS = 60;

/**
 * The CMS headline, word by word, for a CSS-only rise. The text is final in
 * the server HTML; the animation only plays as styles arrive and is skipped
 * under reduced motion. The clause after the last comma (or the last word)
 * takes the accent ink and starts its own line.
 */
function Headline({ title }: { title: string }) {
	const { lead, accent } = splitHeadline(title);
	const word = (text: string, index: number, accented: boolean) => (
		<span
			key={`${text}-${index}`}
			className={cn("hero-word", accented && "text-accent-gradient pr-[0.04em] pb-[0.06em]")}
			style={{ "--w": index } as CSSProperties}
		>
			{text}
		</span>
	);
	const join = (words: string[], offset: number, accented: boolean) =>
		words.flatMap((text, index) => [index > 0 ? " " : null, word(text, offset + index, accented)]);
	return (
		<>
			{join(lead, 0, false)}
			{accent.length > 0 ? (
				<>
					{" "}
					<span className="hero-accent">{join(accent, lead.length, true)}</span>
				</>
			) : null}
		</>
	);
}

interface HomeHeroProps {
	identity: IdentityContent;
	hero: HeroContent;
	portraitSrc?: string;
	portraitAlt: string;
}

export function HomeHero({ identity, hero, portraitSrc, portraitAlt }: HomeHeroProps) {
	const sectionRef = useRef<HTMLElement>(null);
	useHeroScroll(sectionRef);
	const actions = hero.actions.filter((action) => action.href.trim()).slice(0, 2);
	const availability = identity.availability.trim();
	const timeZone = identity.timezone.trim() || "Asia/Dhaka";
	const city = (identity.location.trim() || "Dhaka").split(",")[0]?.trim() || "Dhaka";
	const wordCount = hero.title.split(/\s+/u).filter(Boolean).length;
	const afterTitle = WORD_START_MS + wordCount * WORD_STEP_MS;
	const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

	return (
		<section
			ref={sectionRef}
			aria-labelledby="hero-title"
			data-slot="home-hero"
			className="relative min-w-0 overflow-x-clip pt-[clamp(16px,3vw,40px)] pb-[calc(var(--section-space)/2)] lg:flex lg:min-h-[min(calc(100svh-var(--dock-space-top)),980px)] lg:flex-col lg:justify-center lg:pb-[clamp(72px,8vw,112px)]"
		>
			<style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />
			<div className="grid min-w-0 items-center gap-x-[clamp(32px,5vw,72px)] gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<div className="hero-copy min-w-0">
					<div className="hero-fade flex min-w-0 items-center gap-4" style={delay(0)}>
						<span className="relative block size-14 shrink-0 rounded-full p-[3px] shadow-[0_0_0_1px_var(--theme-line),0_10px_24px_-8px_var(--theme-shadow-strong)]">
							<PortfolioImage
								src={portraitSrc ?? FALLBACK_PORTRAIT}
								alt={portraitAlt}
								width={112}
								height={112}
								loading="eager"
								fetchPriority="high"
								sizes="56px"
								srcSet={
									portraitSrc
										? undefined
										: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
								}
								className="size-full rounded-full bg-muted object-cover object-[center_18%] [&]:aspect-square"
							/>
						</span>
						<span className="grid min-w-0 gap-0.5 leading-tight">
							<span className="truncate text-[16px] font-semibold tracking-[-0.015em] text-foreground">
								{identity.name}
							</span>
							<span className="truncate text-[14px] text-muted-foreground">{hero.eyebrow}</span>
						</span>
					</div>

					<MonoLabel
						tone="muted"
						className="hero-fade mt-8 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2"
						style={delay(70)}
					>
						{availability ? (
							<span className="inline-flex min-w-0 items-center gap-2.5 text-ink-soft">
								<StatusDot />
								{availability}
							</span>
						) : null}
						{availability ? (
							<span aria-hidden="true" className="h-3 w-px bg-line-strong max-sm:hidden" />
						) : null}
						<span className="whitespace-nowrap">
							{city} <LocalTime timeZone={timeZone} showOffset className="text-foreground" />
						</span>
					</MonoLabel>

					<h1
						id="hero-title"
						className="mt-6 mb-0 min-w-0 text-display [text-wrap:wrap] lg:text-[clamp(3.25rem,5vw,5.25rem)]"
					>
						<Headline title={hero.title} />
					</h1>

					<p
						className="hero-fade mt-8 mb-0 max-w-[40ch] text-lead text-ink-soft"
						style={delay(afterTitle + 80)}
					>
						{hero.intro}
					</p>

					{actions.length > 0 ? (
						<div
							className="hero-fade mt-10 flex min-w-0 flex-wrap items-center gap-3 max-sm:grid max-sm:grid-cols-1"
							style={delay(afterTitle + 180)}
						>
							{actions.map((action, index) => {
								const link = (
									<SmartLink
										link={action}
										className={cn(
											buttonVariants({ variant: index === 0 ? "default" : "outline", size: "lg" }),
											"gap-2.5 max-sm:w-full",
										)}
									/>
								);
								return index === 0 ? (
									<Magnetic key={`${action.href}-${action.label}`} className="max-sm:w-full">
										{link}
									</Magnetic>
								) : (
									<span
										key={`${action.href}-${action.label}`}
										className="inline-flex max-w-full max-sm:w-full"
									>
										{link}
									</span>
								);
							})}
						</div>
					) : null}
				</div>

				<div className="hero-side min-w-0 w-full max-lg:mx-auto max-lg:max-w-[560px]">
					<StackTrace />
				</div>
			</div>
		</section>
	);
}
