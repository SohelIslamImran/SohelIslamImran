import { Link, createFileRoute } from "@tanstack/react-router";
import { CareerTimeline, GlassRouteHero, PortfolioImage, WorkFocusTabs } from "../components";
import { getPublishedContent } from "../server/content";
import { pageHead, jsonLd } from "../lib/seo";
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
	component: MigrationHome,
});

function MigrationHome() {
	const content = Route.useLoaderData();
	const kunoExperience = content.experience.filter((item) => item.company.toLowerCase() === "kuno");
	return (
		<main className="route-page min-h-screen overflow-clip">
			<GlassRouteHero
				identity={content.identity}
				experience={content.experience}
				portraitSrc={mediaHref(content.identity.avatar)}
				portraitAlt={content.identity.avatar?.alt ?? "Portrait of Sohel Islam Imran"}
			/>
			<section
				className="proof-strip mx-auto grid w-[min(1180px,calc(100%-40px))] grid-cols-3 border-y border-line max-[800px]:block"
				aria-label="At a glance"
			>
				<p className="proof-item m-0 px-5 py-[18px] text-sm text-muted max-[800px]:px-0">
					<span className="proof-label mb-1 block text-xs font-extrabold uppercase tracking-[.1em] text-signal">
						Now
					</span>{" "}
					{content.identity.role} at Kuno
				</p>
				<p className="proof-item m-0 border-l border-line px-5 py-[18px] text-sm text-muted max-[800px]:border-l-0 max-[800px]:border-t max-[800px]:px-0">
					<span className="proof-label mb-1 block text-xs font-extrabold uppercase tracking-[.1em] text-signal">
						Based
					</span>{" "}
					{content.identity.location} · {content.identity.timezone}
				</p>
				<p className="proof-item m-0 border-l border-line px-5 py-[18px] text-sm text-muted max-[800px]:border-l-0 max-[800px]:border-t max-[800px]:px-0">
					<span className="proof-label mb-1 block text-xs font-extrabold uppercase tracking-[.1em] text-signal">
						Focus
					</span>{" "}
					Products, platforms, and delivery systems
				</p>
			</section>
			<CareerTimeline experience={kunoExperience.length ? kunoExperience : content.experience} />
			<WorkFocusTabs projects={content.projects} />
			<section
				className="about mx-auto w-[min(1180px,calc(100%-40px))] py-[88px] max-[800px]:py-[68px]"
				aria-labelledby="about-title"
			>
				<div className="section-intro mb-16 grid grid-cols-[1fr_1.3fr] gap-x-[60px] gap-y-5 max-[800px]:mb-12 max-[800px]:block">
					<p className="kicker section-intro-kicker">03 · The practice</p>
					<h2
						className="section-intro-title m-0 text-[clamp(2.5rem,4.4vw,4.35rem)] font-[760] leading-none tracking-[-.055em] [text-wrap:balance] max-[800px]:my-[15px]"
						id="about-title"
					>
						Follow the whole problem.
					</h2>
					<p className="section-intro-copy max-w-[490px] self-end text-lg leading-[1.55] text-muted max-[800px]:text-base">
						{content.about.paragraphs[0]}
					</p>
				</div>
				<div className="about-grid grid grid-cols-[1.05fr_.95fr] items-center gap-[clamp(32px,8vw,110px)] max-[800px]:grid-cols-1">
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
						<p className="about-copy mb-[26px] mt-0 max-w-[470px] text-lg leading-[1.6] text-muted">
							{content.about.paragraphs[1]}
						</p>
						<Link className="text-link font-[750] text-primary no-underline" to="/story">
							Read the longer story <span aria-hidden="true">↗</span>
						</Link>
					</div>
				</div>
			</section>
			<section
				className="contact mx-auto w-[min(1180px,calc(100%-40px))] px-0 py-[82px] pb-[105px] text-center max-[800px]:py-[68px]"
				aria-labelledby="contact-title"
			>
				<p className="kicker">04 · Open channel</p>
				<h2
					className="contact-title mx-auto my-[18px] max-w-[720px] text-[clamp(2.7rem,5vw,5rem)] font-[760] leading-[.98] tracking-[-.055em]"
					id="contact-title"
				>
					{content.contact.title}
				</h2>
				<p className="contact-copy mx-auto mb-[30px] mt-0 text-lg text-muted">
					{content.contact.intro}
				</p>
				<a
					className="button button-primary inline-flex min-h-12 items-center gap-[15px] rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground no-underline shadow-[0_10px_24px_var(--theme-accent-glow)] transition-[transform,background-color,box-shadow] duration-180 ease-route hover:-translate-y-0.5"
					href={`mailto:${content.contact.email}`}
				>
					Start a conversation <span aria-hidden="true">↗</span>
				</a>
			</section>
		</main>
	);
}
