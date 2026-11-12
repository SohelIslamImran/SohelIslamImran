import { createFileRoute } from "@tanstack/react-router";
import { HowIWork } from "../components/Capabilities";
import { CareerTimeline } from "../components/CareerTimeline";
import { SelectedWork } from "../components/SelectedWork";
import { BackgroundSection } from "../components/home/BackgroundSection";
import { ContactSection } from "../components/home/ContactSection";
import { GlanceBento } from "../components/home/GlanceBento";
import { HomeHero } from "../components/home/HomeHero";
import { PageShell } from "../components/ui/portfolio";
import { getPublishedContent } from "../server/content";
import { jsonLd, pageHead } from "../lib/seo";
import { mediaHref } from "../lib/media";

export const Route = createFileRoute("/")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const name = loaderData.identity.name.trim() || "Sohel Islam Imran";
		const role = loaderData.identity.role.trim() || "Product engineer";
		const description =
			loaderData.site.description.trim() ||
			"Product engineering work, from interface behavior to cloud delivery.";
		return {
			...pageHead(loaderData, `${name} — ${role}`, description, "/", "/images/social-home.png", [
				{
					...jsonLd(loaderData, "ProfilePage", `${name} portfolio`, "/"),
					mainEntity: {
						"@type": "Person",
						name,
						jobTitle: role,
					},
				},
			]),
		};
	},
	component: Home,
});

function Home() {
	const content = Route.useLoaderData();
	const identity = {
		...content.identity,
		name: content.identity.name.trim() || "Sohel Islam Imran",
		role: content.identity.role.trim() || "Product engineer",
		availability: content.identity.availability.trim(),
	};
	const hero = {
		...content.hero,
		eyebrow: content.hero.eyebrow.trim() || identity.role,
		title:
			content.hero.title.trim() ||
			"I build product systems from interface behavior to cloud delivery.",
		intro:
			content.hero.intro.trim() ||
			"I work across product interfaces, services, data, and delivery.",
	};
	const aboutParagraphs = content.about.paragraphs
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0);
	const aboutTitle = content.about.title.trim() || "I learned by building.";
	const testimonial = content.testimonials.find((item) => item.quote.trim().length > 0);
	const contactTitle = content.contact.title.trim() || "What are you working on?";
	const contactIntro =
		content.contact.intro.trim() ||
		"Tell me about the product, the team, or the problem you want to solve.";
	const email = (content.identity.email || content.contact.email || "").trim();
	const contactLinks = content.contact.links.filter((link) => link.href.trim().length > 0);

	return (
		<PageShell spacing="none" data-page="home" className="pb-[calc(var(--section-space)/2)]">
			<HomeHero
				identity={identity}
				hero={hero}
				portraitSrc={mediaHref(content.identity.avatar)}
				portraitAlt={content.identity.avatar?.alt?.trim() || `Portrait of ${identity.name}`}
			/>
			<GlanceBento
				identity={identity}
				metrics={content.hero.metrics}
				experience={content.experience}
				projects={content.projects}
				capabilities={content.capabilities}
				testimonial={testimonial}
			/>
			<SelectedWork projects={content.projects} />
			<CareerTimeline experience={content.experience} />
			<HowIWork capabilities={content.capabilities} />
			<BackgroundSection
				title={aboutTitle}
				paragraphs={aboutParagraphs}
				facts={content.about.facts}
			/>
			<ContactSection
				title={contactTitle}
				intro={contactIntro}
				availability={identity.availability}
				responseTime={content.contact.responseTime?.trim()}
				email={email}
				links={contactLinks}
			/>
		</PageShell>
	);
}
