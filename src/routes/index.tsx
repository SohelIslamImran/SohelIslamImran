import { Link, createFileRoute } from "@tanstack/react-router";
import { CareerTimeline } from "../components/CareerTimeline";
import { GlassRouteHero } from "../components/GlassRouteHero";
import { PortfolioImage } from "../components/PortfolioImage";
import { WorkFocusTabs } from "../components/WorkFocusTabs";
import { ButtonLink, SectionIntro } from "../components/ui/portfolio";
import { getPublishedContent } from "../server/content";
import { jsonLd, pageHead } from "../lib/seo";
import { mediaHref } from "../lib/media";

export const Route = createFileRoute("/")({
	loader: getPublishedContent,
	head: ({ loaderData }) =>
		loaderData
			? {
					...pageHead(
						loaderData,
						`${loaderData.identity.name} — ${loaderData.identity.role}`,
						loaderData.site.description,
						"/",
						"/images/social-home.png",
						[
							{
								...jsonLd(loaderData, "ProfilePage", `${loaderData.identity.name} portfolio`, "/"),
								mainEntity: {
									"@type": "Person",
									name: loaderData.identity.name,
									jobTitle: loaderData.identity.role,
								},
							},
						],
					),
				}
			: {},
	component: Home,
});

function Home() {
	const content = Route.useLoaderData();
	const kunoExperience = content.experience.filter((item) => item.company.toLowerCase() === "kuno");
	const metrics = content.hero.metrics
		.filter((metric) => metric.value || metric.label)
		.filter((metric) => !/public repositories?/iu.test(metric.label))
		.slice(0, 4);
	const aboutParagraphs = content.about.paragraphs.filter(Boolean);

	return (
		<main className="min-h-screen overflow-clip bg-[radial-gradient(circle_at_78%_6%,color-mix(in_srgb,var(--theme-accent)_10%,var(--theme-paper))_0,transparent_32rem),var(--theme-paper)]">
			<GlassRouteHero
				identity={content.identity}
				hero={content.hero}
				experience={content.experience}
				portraitSrc={mediaHref(content.identity.avatar)}
				portraitAlt={content.identity.avatar?.alt ?? "Portrait of Sohel Islam Imran"}
			/>
			{metrics.length > 0 ? (
				<section
					className="mx-auto grid w-full max-w-[1200px] grid-cols-2 border-y border-border px-5 sm:px-8 min-[720px]:grid-cols-4"
					aria-label="At a glance"
				>
					{metrics.map((metric, index) => (
						<div
							className="min-w-0 border-border px-4 py-5 first:pl-0 last:pr-0 max-[719px]:border-b max-[719px]:last:border-b-0 max-[719px]:px-0 max-[719px]:odd:border-r min-[720px]:border-l min-[720px]:first:border-l-0"
							key={`${metric.label}-${index}`}
						>
							<strong
								className={`block [font-variant-numeric:tabular-nums] text-[clamp(1.35rem,2.5vw,2rem)] font-[760] tracking-[-0.045em] ${index === 0 ? "text-primary-text" : "text-foreground"}`}
							>
								{metric.value}
							</strong>
							<span className="mt-1 block max-w-[17rem] text-pretty text-sm leading-[1.4] text-muted-foreground">
								{metric.label}
							</span>
						</div>
					))}
				</section>
			) : null}
			<div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
				<WorkFocusTabs projects={content.projects} sectionNumber="01" />
				<CareerTimeline
					experience={kunoExperience.length ? kunoExperience : content.experience}
					sectionNumber="02"
				/>
				<section className="w-full py-[clamp(68px,8vw,96px)]" aria-labelledby="about-title">
					<SectionIntro
						eyebrow="03 · The practice"
						title={<span id="about-title">{content.about.title}</span>}
						description={aboutParagraphs[0]}
					/>
					<div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] items-center gap-[clamp(32px,8vw,110px)] max-[800px]:grid-cols-1">
						<PortfolioImage
							src="/images/kuno-systems-724.webp"
							alt="Abstract glass architecture representing the systems Sohel builds"
							width={724}
							height={543}
							sizes="(max-width: 800px) calc(100vw - 40px), 560px"
							srcSet="/images/kuno-systems-724.webp 724w, /images/kuno-systems-1448.webp 1448w"
							className="aspect-[1.5] h-auto w-full rounded-[20px] object-cover"
						/>
						<div>
							{aboutParagraphs[1] ? (
								<p className="mb-6 mt-0 max-w-[500px] text-lg leading-[1.6] text-muted-foreground">
									{aboutParagraphs[1]}
								</p>
							) : null}
							<Link
								className="font-[750] text-primary-text no-underline transition-[color,transform,translate,scale,rotate] duration-180 ease-route hover:underline focus-visible:outline-2 focus-visible:outline-ring"
								to="/story"
							>
								Read the longer story <span aria-hidden="true">↗</span>
							</Link>
						</div>
					</div>
				</section>
				<section
					className="w-full px-0 py-[clamp(68px,8vw,96px)] text-center"
					aria-labelledby="contact-title"
				>
					<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
						04 · Open channel
					</p>
					<h2
						className="mx-auto my-4 max-w-[760px] text-[clamp(2.7rem,5vw,5rem)] font-[760] leading-[0.96] tracking-[-0.06em] text-balance"
						id="contact-title"
					>
						{content.contact.title}
					</h2>
					<p className="mx-auto mb-2 mt-0 text-lg text-muted-foreground">{content.contact.intro}</p>
					{content.contact.responseTime ? (
						<p className="m-0 text-sm text-muted-foreground">{content.contact.responseTime}</p>
					) : null}
					<div className="mt-7 flex flex-wrap justify-center gap-2.5">
						<ButtonLink href={`mailto:${content.contact.email}`} size="lg">
							Start a conversation <span aria-hidden="true">↗</span>
						</ButtonLink>
						{content.contact.links.slice(0, 2).map((link) => (
							<ButtonLink
								variant="outline"
								size="lg"
								href={link.href}
								key={link.label}
								target={link.external ? "_blank" : undefined}
								rel={link.external ? "noreferrer" : undefined}
							>
								{link.label} <span aria-hidden="true">↗</span>
								{link.external ? <span className="sr-only">, opens in a new tab</span> : null}
							</ButtonLink>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
