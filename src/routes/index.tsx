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
import { PERSON_ID, pageHead } from "../lib/seo";
import { mediaHref } from "../lib/media";

export const Route = createFileRoute("/")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const name = loaderData.identity.name.trim() || "Sohel Islam Imran";
		const role = loaderData.identity.role.trim() || "Full-stack engineer";
		const description =
			loaderData.site.description.trim() ||
			"Full-stack product engineering, from interface to release.";
		return pageHead(loaderData, {
			title: `${name} — ${role}`,
			description,
			path: "/",
			image: "/images/social-home.png",
			type: "profile",
			page: { "@type": "ProfilePage", mainEntity: { "@id": PERSON_ID } },
		});
	},
	component: Home,
});

function Home() {
	const content = Route.useLoaderData();
	const identity = {
		...content.identity,
		name: content.identity.name.trim() || "Sohel Islam Imran",
		role: content.identity.role.trim() || "Full-stack engineer",
		availability: content.identity.availability.trim(),
	};
	const hero = {
		...content.hero,
		eyebrow: content.hero.eyebrow.trim() || identity.role,
		title:
			content.hero.title.trim() || "I build every layer of a product, from interface to release.",
		intro: content.hero.intro.trim() || "I work on interfaces, services, data, and releases.",
	};
	const aboutParagraphs = content.about.paragraphs
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0);
	const aboutTitle = content.about.title.trim() || "I learned by building.";
	const testimonial = content.testimonials.find((item) => item.quote.trim().length > 0);
	const contactTitle = content.contact.title.trim() || "What are you building?";
	const contactIntro = content.contact.intro.trim() || "Tell me about it and where it's stuck.";
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
				timeZone={identity.timezone.trim() || undefined}
			/>
		</PageShell>
	);
}
