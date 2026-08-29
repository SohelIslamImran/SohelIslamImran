import { Link, createFileRoute } from "@tanstack/react-router";
import { CareerTimeline, GlassRouteHero, PrismImage, WorkFocusTabs } from "../components";
import { getPublishedContent } from "../server/content";
import { pageHead, jsonLd } from "../lib/seo";

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
		<main className="prism-route-page">
			<GlassRouteHero identity={content.identity} experience={content.experience} />
			<section className="prism-proof-strip" aria-label="At a glance">
				<p>
					<span>Now</span> {content.identity.role} at Kuno
				</p>
				<p>
					<span>Based</span> {content.identity.location} · {content.identity.timezone}
				</p>
				<p>
					<span>Focus</span> Products, platforms, and delivery systems
				</p>
			</section>
			<CareerTimeline experience={kunoExperience.length ? kunoExperience : content.experience} />
			<WorkFocusTabs projects={content.projects} />
			<section className="prism-about" aria-labelledby="about-title">
				<div className="prism-section-intro">
					<p className="prism-kicker">03 · The practice</p>
					<h2 id="about-title">Follow the whole problem.</h2>
					<p>{content.about.paragraphs[0]}</p>
				</div>
				<div className="prism-about__grid">
					<PrismImage
						src="/images/kuno-systems-724.webp"
						alt="Abstract glass architecture representing the systems Sohel builds"
						width={724}
						height={543}
						sizes="(max-width: 800px) calc(100vw - 40px), 560px"
						srcSet="/images/kuno-systems-724.webp 724w, /images/kuno-systems-1448.webp 1448w"
					/>
					<div>
						<p>{content.about.paragraphs[1]}</p>
						<Link className="prism-text-link" to="/story">
							Read the longer story <span aria-hidden="true">↗</span>
						</Link>
					</div>
				</div>
			</section>
			<section className="prism-contact" aria-labelledby="contact-title">
				<p className="prism-kicker">04 · Open channel</p>
				<h2 id="contact-title">{content.contact.title}</h2>
				<p>{content.contact.intro}</p>
				<a className="prism-button prism-button--primary" href={`mailto:${content.contact.email}`}>
					Start a conversation <span aria-hidden="true">↗</span>
				</a>
			</section>
		</main>
	);
}
