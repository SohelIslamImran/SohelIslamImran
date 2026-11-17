import { Link } from "@tanstack/react-router";
import { dateTimeFromPeriod } from "@/lib/content-dates";
import type {
	CredentialContent,
	ExperienceContent,
	ProjectContent,
	TestimonialContent,
} from "@/types/content";
import { EmptyState, StatusDot } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";
import { Marked, TokenLine, useSkillTarget } from "./skills";

export function SectionTitle({
	id,
	index,
	children,
}: {
	id: string;
	index: string;
	children: string;
}) {
	return (
		<h2
			id={id}
			data-slot="resume-section-title"
			className="m-0 mb-5 flex items-baseline gap-3 border-b border-line pb-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground"
		>
			<span aria-hidden="true" className="font-mono text-[11px] font-normal text-primary-text">
				{index}
			</span>
			{children}
		</h2>
	);
}

/** Start and end of a human period ("Dec 2023 — Jan 2025"). */
export function splitPeriod(period: string): [string, string] | null {
	const parts = period.split(/\s+[—–-]\s+/u).map((part) => part.trim());
	return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : null;
}

/** Consecutive roles at one company, newest first (content order). */
export function groupByCompany(experience: ExperienceContent[]) {
	const groups: { company: string; roles: ExperienceContent[] }[] = [];
	for (const role of experience) {
		const company = role.company.trim();
		const last = groups.at(-1);
		if (last && last.company.toLowerCase() === company.toLowerCase()) last.roles.push(role);
		else groups.push({ company, roles: [role] });
	}
	return groups;
}

function companySpan(roles: ExperienceContent[]) {
	const newest = splitPeriod(roles[0].period);
	const oldest = splitPeriod(roles.at(-1)?.period ?? "");
	return newest && oldest ? `${oldest[0]} — ${newest[1]}` : null;
}

function Role({ role }: { role: ExperienceContent }) {
	const targetId = `role-${role.id}`;
	const { state, era } = useSkillTarget(targetId);
	const highlights = role.highlights.map((item) => item.trim()).filter(Boolean);
	return (
		<li data-slot="resume-role" className="relative min-w-0">
			<span aria-hidden="true" data-slot="resume-node" />
			<article
				id={targetId}
				data-slot="resume-entry"
				data-skill-state={state}
				data-era={era}
				className="min-w-0 rounded-inner"
			>
				<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
					<h3
						className="m-0 text-[17px] font-semibold leading-snug tracking-[-0.015em]"
						aria-label={`${role.role} at ${role.company}`}
					>
						{role.role}
					</h3>
					<time
						className="mono-label shrink-0 text-muted-foreground"
						dateTime={dateTimeFromPeriod(role.period)}
					>
						{role.period}
					</time>
				</div>
				{role.summary.trim() ? (
					<p className="mt-1.5 text-small leading-relaxed text-ink-soft">
						<Marked text={role.summary} />
					</p>
				) : null}
				{highlights.length ? (
					<ul className="mt-2.5 grid list-none gap-1.5 p-0 text-small leading-relaxed text-muted-foreground">
						{highlights.map((highlight) => (
							<li key={highlight} data-slot="resume-bullet">
								<Marked text={highlight} />
							</li>
						))}
					</ul>
				) : null}
				<TokenLine label="Stack" tokens={role.technologies} targetId={targetId} />
			</article>
		</li>
	);
}

export function ExperienceSection({
	experience,
	number,
	className,
}: {
	experience: ExperienceContent[];
	number: string;
	className?: string;
}) {
	const groups = groupByCompany(experience);
	return (
		<section
			aria-labelledby="resume-experience-title"
			data-slot="resume-section"
			id="experience"
			className={className}
		>
			<SectionTitle id="resume-experience-title" index={number}>
				Experience
			</SectionTitle>
			{groups.length ? (
				<div className="grid gap-8 print:gap-[3mm]">
					{groups.map((group) => {
						const span = group.roles.length > 1 ? companySpan(group.roles) : null;
						const current = group.roles.some((role) => role.current);
						return (
							<div
								key={`${group.company}-${group.roles[0].id}`}
								data-slot="resume-company"
								className="min-w-0"
							>
								<div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
									<p className="m-0 text-[22px] font-semibold leading-tight tracking-[-0.025em] text-foreground">
										{group.company}
									</p>
									{current ? (
										<span className="mono-label inline-flex items-center gap-1.5 text-primary-text">
											<StatusDot pulse={false} />
											Current
										</span>
									) : null}
									{span ? (
										<span className="mono-label text-muted-foreground">
											{group.roles.length} roles · {span}
										</span>
									) : null}
								</div>
								<ol
									data-slot="resume-roles"
									data-multi={group.roles.length > 1 || undefined}
									className="m-0 grid list-none gap-6 p-0 print:gap-[2.2mm]"
								>
									{group.roles.map((role) => (
										<Role key={role.id} role={role} />
									))}
								</ol>
							</div>
						);
					})}
				</div>
			) : (
				<EmptyState
					title="Experience is being updated."
					description="Verified roles will appear here."
				/>
			)}
		</section>
	);
}

function classifyHref(href: string) {
	const value = href.trim();
	const external = /^(?:https?:)?\/\//iu.test(value) || /^[a-z][a-z\d+.-]*:/iu.test(value);
	return { value, external };
}

function ExternalLink({ href, children }: { href: string; children: string }) {
	const { value, external } = classifyHref(href);
	return (
		<a
			className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full print:min-h-0"
			href={value}
			target={external ? "_blank" : undefined}
			rel={external ? "noopener noreferrer" : undefined}
		>
			{children} <span aria-hidden="true">{external ? "↗" : "→"}</span>
			{external ? <span className="sr-only">, opens in a new tab</span> : null}
		</a>
	);
}

function Project({ project }: { project: ProjectContent }) {
	const targetId = `project-${project.id}`;
	const { state, era } = useSkillTarget(targetId);
	const title = project.title.trim() || "Untitled project";
	const metrics = (project.metrics ?? []).filter((metric) => metric.value.trim());
	return (
		<article
			id={targetId}
			data-slot="resume-side-entry"
			data-skill-state={state}
			data-era={era}
			className="min-w-0 rounded-inner [overflow-wrap:anywhere]"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
				<h3 className="m-0 text-[17px] font-semibold leading-snug tracking-[-0.015em]">{title}</h3>
				{project.year.trim() ? (
					<span className="mono-label shrink-0 text-muted-foreground">{project.year}</span>
				) : null}
			</div>
			{project.role.trim() ? (
				<p className="mt-0.5 text-caption font-medium text-ink-soft">{project.role}</p>
			) : null}
			{project.summary.trim() ? (
				<p className="mt-1.5 text-small leading-relaxed text-ink-soft">
					<Marked text={project.summary} />
				</p>
			) : null}
			{metrics.length ? (
				<dl className="m-0 mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
					{metrics.map((metric) => (
						<div key={metric.label} className="flex min-w-0 items-baseline gap-1.5">
							<dd className="m-0 text-[15px] font-semibold tabular-nums text-foreground">
								{metric.value}
							</dd>
							<dt className="text-caption text-muted-foreground">{metric.label}</dt>
						</div>
					))}
				</dl>
			) : null}
			<TokenLine label="Tags" tokens={project.tags} targetId={targetId} />
			<div
				data-slot="resume-project-links"
				className="mt-1 flex flex-wrap gap-x-4 text-caption font-semibold text-primary-text"
			>
				{project.slug.trim() ? (
					<Link
						className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full print:hidden"
						to="/work/$slug"
						params={{ slug: project.slug }}
					>
						Project <span aria-hidden="true">→</span>
					</Link>
				) : null}
				{project.href?.trim() ? <ExternalLink href={project.href}>Visit site</ExternalLink> : null}
				{project.repository?.trim() ? (
					<ExternalLink href={project.repository}>Source</ExternalLink>
				) : null}
			</div>
		</article>
	);
}

export function ProjectsSection({
	projects,
	number,
	className,
}: {
	projects: ProjectContent[];
	number: string;
	className?: string;
}) {
	if (!projects.length) return null;
	return (
		<section
			aria-labelledby="resume-projects-title"
			data-slot="resume-section"
			id="projects"
			className={className}
		>
			<SectionTitle id="resume-projects-title" index={number}>
				Selected projects
			</SectionTitle>
			<div className="grid gap-5 print:gap-[2.4mm]">
				{projects.map((project) => (
					<Project key={project.id} project={project} />
				))}
			</div>
		</section>
	);
}

export function ReferenceSection({
	testimonial,
	number,
	className,
}: {
	testimonial: TestimonialContent;
	number: string;
	className?: string;
}) {
	const meta = [testimonial.role.trim(), testimonial.date?.trim()].filter(Boolean).join(" · ");
	return (
		<section
			data-slot="resume-reference"
			aria-labelledby="resume-reference-title"
			className={cn("min-w-0", className)}
		>
			<SectionTitle id="resume-reference-title" index={number}>
				Reference
			</SectionTitle>
			<figure className="m-0 grid gap-2 border-l-2 border-primary-line pl-4">
				<blockquote className="m-0 text-[19px] font-medium leading-snug tracking-[-0.015em] text-foreground">
					“{testimonial.quote.trim()}”
				</blockquote>
				<figcaption className="text-caption text-muted-foreground">
					<span className="font-semibold text-ink-soft">{testimonial.author}</span>
					{meta ? ` · ${meta}` : null}
					{testimonial.href?.trim() ? (
						<>
							{" · "}
							<a
								href={testimonial.href.trim()}
								target="_blank"
								rel="noopener noreferrer"
								className="font-semibold text-primary-text"
							>
								Read on LinkedIn<span className="sr-only">, opens in a new tab</span>
								<span aria-hidden="true"> ↗</span>
							</a>
						</>
					) : null}
				</figcaption>
			</figure>
		</section>
	);
}

export function CoursesSection({
	credentials,
	number,
	className,
}: {
	credentials: CredentialContent[];
	number: string;
	className?: string;
}) {
	if (!credentials.length) return null;
	return (
		<section
			aria-labelledby="resume-credentials-title"
			data-slot="resume-courses"
			className={cn("min-w-0", className)}
		>
			<SectionTitle id="resume-credentials-title" index={number}>
				Courses
			</SectionTitle>
			<ul className="m-0 grid list-none gap-3 p-0 print:gap-[1.4mm]">
				{credentials.map((credential) => (
					<li key={credential.id} className="min-w-0 [overflow-wrap:anywhere]">
						<p className="m-0 text-small font-semibold leading-snug text-foreground">
							{credential.title}
						</p>
						{credential.issuer || credential.issuedAt ? (
							<p className="m-0 mt-0.5 text-caption text-muted-foreground">
								{[credential.issuer, credential.issuedAt].filter(Boolean).join(" · ")}
							</p>
						) : null}
					</li>
				))}
			</ul>
		</section>
	);
}
