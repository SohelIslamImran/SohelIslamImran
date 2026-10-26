import { Link, createFileRoute } from "@tanstack/react-router";
import { Capabilities } from "../components/Capabilities";
import { CareerTimeline } from "../components/CareerTimeline";
import { EngineeringPrinciples } from "../components/EngineeringPrinciples";
import { GlassRouteHero } from "../components/GlassRouteHero";
import { SelectedWork } from "../components/SelectedWork";
import { Testimonial } from "../components/Testimonial";
import { ButtonLink, SectionIntro } from "../components/ui/portfolio";
import { buttonVariants } from "../components/ui/button";
import { getPublishedContent } from "../server/content";
import { jsonLd, pageHead } from "../lib/seo";
import { mediaHref } from "../lib/media";
import { cn } from "../lib/utils";

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

type ContactDestination = {
	arrow: string;
	internal: boolean;
	label: string;
	opensNewTab: boolean;
};

function classifyContactDestination(href: string, markedExternal = false): ContactDestination {
	const value = href.trim();
	if (/^mailto:/iu.test(value)) {
		return { arrow: "@", internal: false, label: "Email destination", opensNewTab: false };
	}
	if (/^tel:/iu.test(value)) {
		return { arrow: "☎", internal: false, label: "Phone destination", opensNewTab: false };
	}
	if (value.startsWith("#")) {
		return { arrow: "↓", internal: false, label: "Page section", opensNewTab: false };
	}
	const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1].toLowerCase();
	const external =
		/^(?:https?:)?\/\//iu.test(value) ||
		Boolean(protocol) ||
		(markedExternal && !value.startsWith("/"));
	return external
		? {
				arrow: "↗",
				internal: false,
				label: "External destination, opens in a new tab",
				opensNewTab: true,
			}
		: { arrow: "→", internal: true, label: "Internal destination", opensNewTab: false };
}

function Home() {
	const content = Route.useLoaderData();
	const identity = {
		...content.identity,
		name: content.identity.name.trim() || "Sohel Islam Imran",
		role: content.identity.role.trim() || "Product engineer",
	};
	const hero = {
		...content.hero,
		eyebrow: content.hero.eyebrow.trim() || "Product engineer",
		title:
			content.hero.title.trim() ||
			"I build product systems from interface behavior to cloud delivery.",
		intro:
			content.hero.intro.trim() ||
			"I work across product interfaces, services, data, and delivery.",
	};
	const metrics = content.hero.metrics
		.filter((metric) => metric.value.trim() || metric.label.trim())
		.slice(0, 2);
	const aboutParagraphs = content.about.paragraphs.filter(
		(paragraph) => paragraph.trim().length > 0,
	);
	const aboutTitle =
		content.about.title.trim() || "A product engineer who keeps the whole change in view.";
	const aboutDescription =
		aboutParagraphs[0] || "I keep the whole change in view, not only the screen where it starts.";
	const testimonial = content.testimonials.find((item) => item.quote.trim().length > 0);
	const availability = content.identity.availability.trim();
	const contactTitle = content.contact.title.trim() || "Let's talk about the problem.";
	const contactIntro =
		content.contact.intro.trim() || "I am interested in thoughtful product and engineering work.";
	const email = content.identity.email.trim();
	const contactLinks = content.contact.links
		.filter((link) => link.href.trim().length > 0)
		.slice(0, 2);

	return (
		<main
			id="main-content"
			tabIndex={-1}
			aria-label="Main content"
			className="min-h-screen w-full min-w-0 max-w-full overflow-clip bg-[radial-gradient(circle_at_78%_6%,color-mix(in_srgb,var(--theme-accent)_10%,var(--theme-paper))_0,transparent_32rem),var(--theme-paper)] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]"
		>
			<GlassRouteHero
				identity={identity}
				hero={hero}
				experience={content.experience}
				portraitSrc={mediaHref(content.identity.avatar)}
				portraitAlt={content.identity.avatar?.alt?.trim() || `Portrait of ${identity.name}`}
			/>
			{metrics.length > 0 ? (
				<section
					className="mx-auto grid min-w-0 w-full max-w-[1200px] grid-cols-1 border-y border-border py-4 sm:grid-cols-2"
					aria-label="At a glance"
				>
					{metrics.map((metric, index) => {
						const value = metric.value.trim() || "—";
						const label = metric.label.trim() || "Metric";
						return (
							<div
								className="flex min-w-0 items-baseline gap-3 overflow-hidden border-b border-border py-2 last:border-b-0 sm:border-b-0 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0"
								key={`${metric.label}-${index}`}
							>
								<strong
									className={`min-w-0 break-words [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere] text-[clamp(1.2rem,2vw,1.55rem)] font-[760] tracking-[-0.04em] ${index === 0 ? "text-primary-text" : "text-foreground"}`}
								>
									{value}
								</strong>
								<span className="min-w-0 max-w-[28ch] break-words text-pretty text-sm leading-[1.4] text-muted-foreground [overflow-wrap:anywhere]">
									{label}
								</span>
							</div>
						);
					})}
				</section>
			) : null}
			<div className="mx-auto min-w-0 w-full max-w-[1200px]">
				<SelectedWork projects={content.projects} />
				<CareerTimeline experience={content.experience} />
				<Capabilities capabilities={content.capabilities} />
				<EngineeringPrinciples />
				<section
					className="w-full min-w-0 border-t border-border/70 py-[clamp(56px,7vw,84px)]"
					aria-labelledby="about-title"
				>
					<SectionIntro
						eyebrow="Background"
						title={<span id="about-title">{aboutTitle}</span>}
						description={aboutDescription}
						className="mb-[clamp(34px,5vw,52px)] [&_h2]:text-[clamp(1.9rem,3.4vw,3rem)] [&_h2]:leading-[1.04]"
					/>
					<div className="grid min-w-0 grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] items-start gap-[clamp(28px,6vw,72px)] max-[860px]:grid-cols-1">
						<div className="min-w-0">
							{aboutParagraphs.slice(1).map((paragraph) => (
								<p
									className="mb-6 mt-0 min-w-0 max-w-[58ch] break-words text-pretty text-lg leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]"
									key={paragraph}
								>
									{paragraph}
								</p>
							))}
							<Link
								className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 font-[750] text-primary-text no-underline transition-[color,transform,translate,scale,rotate] duration-200 ease-route motion-safe:pointer-fine:hover:translate-x-0.5 motion-reduce:translate-x-0 hover:underline focus-visible:translate-x-0 focus-visible:outline-2 focus-visible:outline-ring [overflow-wrap:anywhere]"
								to="/story"
							>
								Read the whole story <span aria-hidden="true">→</span>
							</Link>
						</div>
						{testimonial ? (
							<Testimonial
								className="print:[break-inside:avoid] print:[page-break-inside:avoid]"
								testimonial={testimonial}
							/>
						) : null}
					</div>
				</section>
				<section
					className="w-full min-w-0 border-t border-border/70 py-[clamp(56px,7vw,84px)]"
					aria-labelledby="contact-title"
				>
					<div className="grid min-w-0 max-w-full gap-7 max-[760px]:grid-cols-1">
						<div className="min-w-0">
							<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
								Contact
							</p>
							<h2
								className="m-0 min-w-0 max-w-[720px] break-words text-pretty text-[clamp(2rem,4vw,3.4rem)] font-[760] leading-[1] tracking-[-0.055em] [overflow-wrap:anywhere]"
								id="contact-title"
							>
								{contactTitle}
							</h2>
							<p className="mt-4 min-w-0 max-w-[54ch] break-words text-pretty text-lg leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
								{contactIntro}
							</p>
							{availability ? (
								<p className="mt-2 min-w-0 max-w-[54ch] break-words text-pretty text-sm font-semibold text-primary-text [overflow-wrap:anywhere]">
									{availability}
								</p>
							) : null}
							{content.contact.responseTime?.trim() ? (
								<p className="mt-2 min-w-0 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
									{content.contact.responseTime.trim()}
								</p>
							) : null}
						</div>
						<div className="flex min-w-0 max-w-full flex-wrap content-start gap-2.5 lg:justify-end">
							{email ? (
								<ButtonLink href={`mailto:${email}`} size="lg" aria-label="Email me">
									Email me <span aria-hidden="true">✉</span>
								</ButtonLink>
							) : null}
							{contactLinks.map((link, index) => {
								const href = link.href.trim();
								const destination = classifyContactDestination(href, link.external);
								const label =
									link.label.trim() ||
									(destination.internal
										? "Open page"
										: destination.opensNewTab
											? "Open link"
											: "Contact");
								const actionClass = cn(
									buttonVariants({ variant: "outline", size: "lg" }),
									"min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]",
								);
								const actionContent = (
									<>
										{label} <span aria-hidden="true">{destination.arrow}</span>
										{destination.opensNewTab ? (
											<span className="sr-only">, opens in a new tab</span>
										) : null}
									</>
								);
								if (destination.internal) {
									return (
										<Link
											aria-label={`${label}, ${destination.label}`}
											className={actionClass}
											key={`${href}-${index}`}
											to={href}
										>
											{actionContent}
										</Link>
									);
								}
								return (
									<ButtonLink
										aria-label={`${label}, ${destination.label}`}
										className="min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]"
										href={href}
										key={`${href}-${index}`}
										rel={destination.opensNewTab ? "noopener noreferrer" : undefined}
										size="lg"
										target={destination.opensNewTab ? "_blank" : undefined}
										variant="outline"
									>
										{actionContent}
									</ButtonLink>
								);
							})}
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
