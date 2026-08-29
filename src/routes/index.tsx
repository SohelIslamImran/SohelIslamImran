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
		<main className="route-page">
			<GlassRouteHero identity={content.identity} experience={content.experience} />
			<section className="proof-strip" aria-label="At a glance">
				<p className="proof-item">
					<span className="proof-label">Now</span> {content.identity.role} at Kuno
				</p>
				<p className="proof-item">
					<span className="proof-label">Based</span> {content.identity.location} ·{" "}
					{content.identity.timezone}
				</p>
				<p className="proof-item">
					<span className="proof-label">Focus</span> Products, platforms, and delivery systems
				</p>
			</section>
			<CareerTimeline experience={kunoExperience.length ? kunoExperience : content.experience} />
			<WorkFocusTabs projects={content.projects} />
			<section className="about" aria-labelledby="about-title">
				<div className="section-intro">
					<p className="kicker section-intro-kicker">03 · The practice</p>
					<h2 className="section-intro-title" id="about-title">
						Follow the whole problem.
					</h2>
					<p className="section-intro-copy">{content.about.paragraphs[0]}</p>
				</div>
				<div className="about-grid">
					<PrismImage
						src="/images/kuno-systems-724.webp"
						alt="Abstract glass architecture representing the systems Sohel builds"
						width={724}
						height={543}
						sizes="(max-width: 800px) calc(100vw - 40px), 560px"
						srcSet="/images/kuno-systems-724.webp 724w, /images/kuno-systems-1448.webp 1448w"
					/>
					<div>
						<p className="about-copy">{content.about.paragraphs[1]}</p>
						<Link className="text-link" to="/story">
							Read the longer story <span aria-hidden="true">↗</span>
						</Link>
					</div>
				</div>
			</section>
			<section className="contact" aria-labelledby="contact-title">
				<p className="kicker">04 · Open channel</p>
				<h2 className="contact-title" id="contact-title">
					{content.contact.title}
				</h2>
				<p className="contact-copy">{content.contact.intro}</p>
				<a className="button button-primary" href={`mailto:${content.contact.email}`}>
					Start a conversation <span aria-hidden="true">↗</span>
				</a>
			</section>
		</main>
	);
}
