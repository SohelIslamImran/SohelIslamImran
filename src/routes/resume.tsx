import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { dateTimeFromPeriod } from "../lib/content-dates";
import { mediaHref } from "../lib/media";
import { EMPTY_PORTFOLIO_CONTENT, type ProjectContent } from "../types/content";
import { PortfolioImage } from "../components/PortfolioImage";
import { Testimonial } from "../components/Testimonial";
import {
	EmptyState,
	PageHeader,
	PageShell,
	StatusBadge,
	Surface,
	TagList,
} from "../components/ui/portfolio";
import { Button, buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

const updatedDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "long",
	timeZone: "UTC",
	year: "numeric",
});

function formatUpdatedDate(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : updatedDateFormatter.format(date);
}

type DestinationKind = "repository" | "site" | "email";

type ResumeDestination = {
	arrow: string;
	label: string;
	opensNewTab: boolean;
};

function classifyDestination(href: string, kind: DestinationKind): ResumeDestination {
	const value = href.trim();
	const protocol = value.match(/^([a-z][a-z\d+.-]*):/i)?.[1].toLowerCase();
	if (kind === "email" || protocol === "mailto") {
		return { arrow: "@", label: "Email", opensNewTab: false };
	}
	if (protocol === "tel") return { arrow: "☎", label: "Phone", opensNewTab: false };
	if (value.startsWith("#")) return { arrow: "↓", label: "Page section", opensNewTab: false };
	const opensNewTab = /^(?:https?:)?\/\//iu.test(value) || Boolean(protocol);
	const label =
		kind === "repository"
			? opensNewTab
				? "View repository"
				: "Open repository"
			: opensNewTab
				? "Visit project"
				: "View project";
	return { arrow: opensNewTab ? "↗" : "→", label, opensNewTab };
}

export const Route = createFileRoute("/resume")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		const role = c.identity.role.trim() || "Product engineer";
		const employer = c.experience.find((item) => item.current)?.company.trim() || undefined;
		return pageHead(
			c,
			`${name} — Résumé`,
			`${role}. Experience, selected projects, and how I work.`,
			"/resume",
			"/images/social-resume.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "ProfilePage",
					name: `${name} résumé`,
					mainEntity: {
						"@type": "Person",
						name,
						jobTitle: role,
						...(employer ? { worksFor: { "@type": "Organization", name: employer } } : {}),
					},
				},
			],
		);
	},
	component: Resume,
});

function ResumeProjectLink({ project }: { project: ProjectContent }) {
	const title = project.title.trim() || "Untitled project";
	const role = project.role.trim() || "Project contributor";
	const summary = project.summary.trim();
	const repository = project.repository?.trim() || undefined;
	const href = repository || project.href?.trim() || undefined;
	const destinationKind = repository ? "repository" : "site";
	const content = (
		<>
			<h3 className="m-0 min-w-0 max-w-full break-words text-sm font-bold text-foreground [overflow-wrap:anywhere]">
				{title}
			</h3>
			<span className="min-w-0 max-w-full break-words text-xs leading-[1.45] text-muted-foreground [overflow-wrap:anywhere]">
				{role}
			</span>
			{summary ? (
				<span className="min-w-0 max-w-full break-words text-xs leading-[1.45] text-muted-foreground [overflow-wrap:anywhere]">
					{summary}
				</span>
			) : null}
		</>
	);
	const className =
		"grid min-h-11 w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-1 border-t border-border py-3.5 text-primary-text no-underline [overflow-wrap:anywhere]";

	if (!href) {
		return (
			<div className={className} data-slot="resume-side-entry">
				{content}
			</div>
		);
	}

	const destination = classifyDestination(href, destinationKind);

	return (
		<a
			data-slot="resume-side-entry"
			aria-label={`${destination.label} for ${title}${destination.opensNewTab ? ", opens in a new tab" : ""}`}
			className={cn(
				className,
				"transition-colors duration-200 ease-route hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
			)}
			href={href}
			target={destination.opensNewTab ? "_blank" : undefined}
			rel={destination.opensNewTab ? "noopener noreferrer" : undefined}
		>
			{content}
			<span className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-1 text-xs font-bold text-primary-text">
				<span className="min-w-0 break-words [overflow-wrap:anywhere]">{destination.label}</span>
				<span className="shrink-0" aria-hidden="true">
					{destination.arrow}
				</span>
			</span>
		</a>
	);
}

function Resume() {
	const content = Route.useLoaderData();
	const identityName = content.identity.name.trim() || "Sohel Islam Imran";
	const identityRole = content.identity.role.trim() || "Product engineer";
	const professionalWork = content.projects.filter((project) => project.category === "product");
	const publicWork = content.projects.filter(
		(project) =>
			project.category === "open-source" &&
			Boolean(project.repository?.trim() || project.href?.trim()),
	);
	const employer = content.experience.find((item) => item.current)?.company.trim() || undefined;
	const testimonial = content.testimonials.find((item) => item.quote.trim().length > 0);
	const resumeDescription =
		content.resume.summary?.trim() ||
		content.about.paragraphs.find((paragraph) => paragraph.trim()) ||
		"Experience, selected projects, and how I work.";
	const availability = content.identity.availability.trim();
	const updatedAt = content.resume.updatedAt?.trim() || null;
	const email = content.identity.email.trim();
	const emailDestination = email ? classifyDestination(`mailto:${email}`, "email") : undefined;

	return (
		<PageShell width="default" data-page="resume" className="w-full max-w-[1160px]">
			<Surface
				data-slot="resume-header"
				className="grid min-w-0 max-w-full overflow-visible grid-cols-[minmax(0,1fr)_minmax(0,168px)] items-center gap-[clamp(30px,6vw,72px)] p-[clamp(28px,4vw,48px)] max-[960px]:grid-cols-1 max-[960px]:gap-6"
			>
				<PageHeader
					eyebrow={
						<span className="break-words">
							{employer ? `${identityRole} · ${employer}` : identityRole}
						</span>
					}
					title={
						<span data-slot="resume-title" className="break-words">
							{identityName}
						</span>
					}
					description={
						<span className="break-words [overflow-wrap:anywhere]">{resumeDescription}</span>
					}
					className="mb-0 min-w-0 [overflow-wrap:anywhere]"
				>
					<div className="mt-5 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
						{email && emailDestination ? (
							<a
								aria-label={`${emailDestination.label} ${email}`}
								className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-control px-2 font-bold text-primary-text no-underline transition-colors duration-200 ease-route hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
								href={`mailto:${email}`}
							>
								<span className="min-w-0 break-all">{email}</span>
								<span className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em]">
									{emailDestination.label} <span aria-hidden="true">{emailDestination.arrow}</span>
								</span>
							</a>
						) : null}
						{updatedAt ? (
							<time
								className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]"
								dateTime={updatedAt}
							>
								Updated {formatUpdatedDate(updatedAt)}
							</time>
						) : null}
					</div>
					<div data-slot="resume-actions" className="mt-7 flex flex-wrap gap-2.5">
						<Button size="lg" type="button" onClick={() => window.print()}>
							Print / save PDF{" "}
							<span data-icon="inline-end" aria-hidden="true">
								↓
							</span>
						</Button>
						<Link
							className={cn(
								buttonVariants({ variant: "outline", size: "lg" }),
								"border-[color-mix(in_srgb,var(--theme-accent)_14%,var(--theme-line))]",
							)}
							to="/links"
							search={{ kind: "all" }}
						>
							All links <span aria-hidden="true">→</span>
						</Link>
					</div>
				</PageHeader>
				<div
					data-slot="resume-portrait"
					className="block aspect-square h-auto w-full max-w-[168px] rotate-2 rounded-[24px] border-[7px] border-surface-solid shadow-float max-[960px]:max-w-[128px] print:order-none print:rotate-0"
				>
					<PortfolioImage
						src={mediaHref(content.identity.avatar) ?? "/images/sohel-linkedin-800.webp"}
						alt={content.identity.avatar?.alt ?? "Portrait of Sohel Islam Imran"}
						width={800}
						height={800}
						loading="eager"
						fetchPriority="high"
						sizes="(max-width: 960px) 128px, 180px"
						srcSet={
							content.identity.avatar
								? undefined
								: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
						}
						className="block size-full rounded-[17px] object-cover object-[center_16%]"
					/>
				</div>
			</Surface>

			<div
				data-slot="resume-layout"
				className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_minmax(0,clamp(220px,28%,310px))] gap-[clamp(40px,6vw,72px)] pt-16 max-[960px]:grid-cols-1 max-[960px]:gap-14"
			>
				<div
					data-slot="resume-main"
					className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] content-start gap-12 max-[800px]:contents print:grid print:grid-cols-[minmax(0,1fr)] print:gap-6"
				>
					<section
						className="min-w-0 max-w-full max-[800px]:order-1"
						aria-labelledby="resume-experience-title"
					>
						<PageHeader
							eyebrow="Experience"
							title={<span id="resume-experience-title">Professional Experience</span>}
							level={2}
							className="mb-5"
						/>
						{content.experience.length > 0 ? (
							content.experience.map((item) => (
								<article
									data-slot="resume-entry"
									className="grid min-w-0 max-w-full grid-cols-[minmax(120px,150px)_minmax(0,1fr)] gap-6 border-t border-border py-7 [overflow-wrap:anywhere] max-[800px]:grid-cols-1 max-[800px]:gap-2.5"
									key={item.id}
								>
									<time
										className="block min-w-0 max-w-[140px] break-words text-[13px] font-[750] leading-[1.4] text-primary-text max-[800px]:max-w-none"
										dateTime={dateTimeFromPeriod(item.period)}
									>
										{item.period}
									</time>
									<div className="min-w-0 max-w-full">
										<div className="flex min-w-0 flex-wrap items-center gap-2.5 text-[15px] text-foreground">
											<strong className="min-w-0 break-words">{item.company}</strong>
											{item.current ? <StatusBadge>Current</StatusBadge> : null}
										</div>
										<h3
											aria-label={item.company ? `${item.role} at ${item.company}` : undefined}
											className="mb-2.5 mt-2 min-w-0 max-w-full break-words text-[clamp(1.35rem,2.5vw,1.8rem)] font-[760] tracking-[-0.04em] [overflow-wrap:anywhere]"
										>
											{item.role}
										</h3>
										{item.summary ? (
											<p className="m-0 min-w-0 max-w-full break-words text-[15px] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
												{item.summary}
											</p>
										) : null}
										{item.highlights.length > 0 ? (
											<ul className="my-4 grid min-w-0 max-w-full gap-2 pl-[18px] text-[15px] leading-[1.55] text-muted-foreground">
												{item.highlights.map((highlight) => (
													<li
														className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]"
														key={highlight}
													>
														{highlight}
													</li>
												))}
											</ul>
										) : null}
										{item.technologies.length > 0 ? (
											<TagList className="[overflow-wrap:anywhere]" items={item.technologies} />
										) : null}
									</div>
								</article>
							))
						) : (
							<EmptyState
								level={2}
								title="Experience is being updated."
								description="The public résumé will return when there is a verified role to share."
							/>
						)}
					</section>
					{testimonial ? (
						<section
							data-slot="resume-reference"
							aria-labelledby="resume-reference-title"
							className="min-w-0 max-w-full max-[800px]:order-3"
						>
							<PageHeader
								eyebrow="Reference"
								title={<span id="resume-reference-title">Client Recommendation</span>}
								level={2}
								className="mb-5"
							/>
							<Testimonial
								className="print:[break-inside:avoid] print:[page-break-inside:avoid]"
								testimonial={testimonial}
							/>
						</section>
					) : null}
				</div>

				<aside
					aria-label="Résumé sidebar"
					data-slot="resume-side"
					className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] content-start gap-10 border-l border-border pl-8 max-[800px]:order-2 max-[960px]:border-l-0 max-[960px]:border-t max-[960px]:pl-0 max-[960px]:pt-8"
				>
					<section
						aria-labelledby="resume-capabilities-title"
						className="min-w-0 max-w-full print:[break-inside:avoid] print:[page-break-inside:avoid]"
					>
						<PageHeader
							eyebrow="Core Competencies"
							title={<span id="resume-capabilities-title">Architectural Scope</span>}
							level={2}
							className="mb-5"
						/>
						{content.capabilities.length > 0 ? (
							content.capabilities.map((capability) => (
								<article
									data-slot="resume-side-entry"
									className="min-w-0 max-w-full border-t border-border py-5 [overflow-wrap:anywhere]"
									key={capability.id}
								>
									<h3 className="mb-1.5 mt-0 break-words text-base font-[760] tracking-[-0.02em]">
										{capability.title}
									</h3>
									<p className="mb-3 mt-0 break-words text-sm leading-[1.55] text-muted-foreground">
										{capability.description}
									</p>
									{capability.tools.length > 0 ? (
										<TagList className="[overflow-wrap:anywhere]" items={capability.tools} />
									) : null}
								</article>
							))
						) : (
							<EmptyState
								level={2}
								title="Capabilities are being updated."
								description="The next version of the résumé will include the current systems I work on."
							/>
						)}
					</section>
					<section
						aria-labelledby="resume-professional-title"
						className="min-w-0 max-w-full print:[break-inside:avoid] print:[page-break-inside:avoid]"
					>
						<PageHeader
							eyebrow="Professional work"
							title={<span id="resume-professional-title">Product Systems</span>}
							level={2}
							className="mb-5"
						/>
						{professionalWork.length > 0 ? (
							<div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]">
								{professionalWork.map((project) => (
									<ResumeProjectLink key={project.id} project={project} />
								))}
							</div>
						) : (
							<EmptyState
								level={2}
								title="Professional work is being updated."
								description="Verified product roles will appear here when the public record is ready."
							/>
						)}
					</section>
					<section
						aria-labelledby="resume-proof-title"
						className="min-w-0 max-w-full print:[break-inside:avoid] print:[page-break-inside:avoid]"
					>
						<PageHeader
							eyebrow="Public work"
							title={<span id="resume-proof-title">Open Source & Packages</span>}
							level={2}
							className="mb-5"
						/>
						{publicWork.length > 0 ? (
							<div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]">
								{publicWork.map((project) => (
									<ResumeProjectLink key={project.id} project={project} />
								))}
							</div>
						) : (
							<EmptyState
								level={2}
								title="Public proof is being updated."
								description="Selected builds will return when their public links are verified."
							/>
						)}
					</section>
					{content.credentials.length > 0 ? (
						<section
							aria-labelledby="resume-credentials-title"
							className="min-w-0 max-w-full print:[break-inside:avoid] print:[page-break-inside:avoid]"
						>
							<PageHeader
								eyebrow="Credentials"
								title={<span id="resume-credentials-title">Training & Certifications</span>}
								level={2}
								className="mb-5"
							/>
							{content.credentials.map((credential) => (
								<article
									data-slot="resume-side-entry"
									className="min-w-0 max-w-full border-t border-border py-4 [overflow-wrap:anywhere]"
									key={credential.id}
								>
									<h3 className="m-0 break-words text-sm font-[760] tracking-[-0.02em]">
										{credential.title}
									</h3>
									{credential.issuer || credential.issuedAt ? (
										<p className="m-0 mt-1 break-words text-xs text-muted-foreground">
											{credential.issuer}
											{credential.issuer && credential.issuedAt ? " · " : null}
											{credential.issuedAt}
										</p>
									) : null}
								</article>
							))}
						</section>
					) : null}
					<section
						aria-label="Availability"
						className="min-w-0 max-w-full rounded-[18px] border border-signal/40 bg-signal/10 p-[18px] [overflow-wrap:anywhere] print:[break-inside:avoid] print:[page-break-inside:avoid]"
					>
						<h2 className="mb-2 min-w-0 max-w-full break-words text-xs font-extrabold uppercase tracking-[0.11em] text-signal [overflow-wrap:anywhere]">
							Career Direction
						</h2>
						<p className="m-0 min-w-0 max-w-full break-words text-sm leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
							{availability ? `${availability}. ` : ""}Focused on high-standard full-stack and
							mobile systems with room for remote international collaboration.
						</p>
					</section>
				</aside>
			</div>
		</PageShell>
	);
}
