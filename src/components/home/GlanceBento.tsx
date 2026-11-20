import type { ReactNode } from "react";
import type {
	CapabilityContent,
	ExperienceContent,
	IdentityContent,
	MetricContent,
	ProjectContent,
	TestimonialContent,
} from "../../types/content";
import { CopyButton, CountUp } from "@/components/motion";
import {
	DatedLabel,
	MonoLabel,
	Section,
	SectionHeading,
	StatusDot,
} from "@/components/ui/portfolio";
import { groupExperienceByCompany } from "@/lib/experience";
import { cn } from "@/lib/utils";
import { ENGINEERING_PRINCIPLES } from "../EngineeringPrinciples";
import { Testimonial } from "../Testimonial";
import { RemoteMap, type RemoteMapTeam } from "./RemoteMap";
import { REMOTE_TEAMS } from "./remote-map";
import { MiniTerminal, type TerminalFacts } from "./sections/MiniTerminal";
import { TiltTile } from "./sections/TiltTile";
import { UpdatePhone } from "./sections/UpdatePhone";
import { WebStack } from "./sections/WebStack";

const INSTALL_COMMAND = "npx expo install expo-in-app-updates";
const OPEN_SOURCE_ID = "expo-in-app-updates";
const TILE_PAD = "p-[clamp(22px,2.8vw,34px)]";

function TileLabel({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<p className={cn("mono-label m-0 flex items-center gap-2 text-muted-foreground", className)}>
			{children}
		</p>
	);
}

function startOf(period: string) {
	return period.split(/\s*[—–-]\s*/u)[0]?.trim() || period.trim();
}

/** A metric belongs to a project when its label names the project. */
function mentions(metric: MetricContent, project?: ProjectContent) {
	if (!project) return false;
	const label = metric.label.toLowerCase();
	return label.includes(project.id.toLowerCase()) || label.includes(project.title.toLowerCase());
}

/**
 * The lead tile: the current role, shown as a small living web product (one
 * save runs through the stack), its published highlights, and the promotions
 * at the company below.
 */
function NowTile({
	experience,
	className,
}: {
	experience: ExperienceContent[];
	className?: string;
}) {
	const groups = groupExperienceByCompany(experience);
	const group = groups.find((item) => item.current) ?? groups[0];
	const lead = group?.roles.find((role) => role.current) ?? group?.roles[0];
	if (!group || !lead) return null;
	const role = lead.role.trim() || "Engineer";
	const company = lead.company.trim();
	const path = [...group.roles].reverse();
	return (
		<TiltTile
			max={2.5}
			frameClassName={className}
			className={cn("relative flex flex-col overflow-hidden", TILE_PAD)}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -top-32 -right-32 -z-10 size-[460px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--theme-accent)_9%,transparent),transparent)]"
			/>
			<TileLabel>
				<StatusDot />
				<span>Now</span>
			</TileLabel>
			<h3 data-par="2" className="mt-5 mb-0 max-w-[22ch] text-headline text-balance">
				{role}
				{company ? (
					<>
						{" "}
						<span className="text-muted-foreground">at</span> {company}
					</>
				) : null}
			</h3>
			{lead.summary.trim() ? (
				<p className="mt-3 mb-0 max-w-[54ch] text-[1.0625rem] leading-[1.5] text-ink-soft">
					{lead.summary.trim()}
				</p>
			) : null}
			<WebStack role={lead} className="mt-7 flex-1 content-between" />
			{path.length > 1 ? (
				<ol
					aria-label={`Roles at ${company || "this company"}, oldest first`}
					className="mt-6 mb-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line p-0 pt-5"
				>
					{path.map((item, index) => (
						<li key={item.id} className="flex min-w-0 items-center gap-2">
							{index > 0 ? (
								<span aria-hidden="true" className="text-line-strong">
									→
								</span>
							) : null}
							<span
								className={cn(
									"text-[13.5px]",
									item.id === lead.id ? "font-medium text-foreground" : "text-muted-foreground",
								)}
							>
								{item.role}
							</span>
							<span className="mono-label text-muted-foreground">{startOf(item.period)}</span>
						</li>
					))}
				</ol>
			) : (
				<p className="mono-label mt-6 mb-0 text-muted-foreground">{lead.period}</p>
			)}
		</TiltTile>
	);
}

/** "people reached … · Sep 3, 2026" → the claim and its date, shown apart. */
function splitDated(label: string) {
	const match = label.match(/^(.*?)\s*·\s*([^·]*\d{4})\s*$/u);
	return match ? { text: match[1]?.trim() ?? label, date: match[2]?.trim() } : { text: label };
}

/**
 * A single number. The figure and its label sit together at the foot of the
 * tile; a dated metric keeps its date as a quiet stamp at the top.
 */
function MetricTile({ metric, className }: { metric: MetricContent; className?: string }) {
	const value = metric.value.trim() || "—";
	const { text, date } = splitDated(metric.label.trim());
	return (
		<TiltTile
			as="div"
			frameClassName={className}
			className="flex min-h-[150px] flex-col justify-between gap-6 p-[clamp(18px,2.4vw,28px)]"
		>
			<p className="mono-label m-0 flex items-center gap-2 text-muted-foreground">
				<span aria-hidden="true" className="h-px w-4 bg-[var(--theme-accent-line)]" />
				{date ? <span>As of {date}</span> : <span>So far</span>}
			</p>
			<div>
				<p
					data-par="3"
					className="m-0 text-[clamp(2rem,3.6vw,3rem)] leading-none font-[620] tracking-[-0.045em] text-foreground"
				>
					<CountUp value={value} />
				</p>
				{text ? (
					<p className="mt-2.5 mb-0 max-w-[30ch] text-[13.5px] leading-[1.45] text-muted-foreground">
						{text}
					</p>
				) : null}
			</div>
		</TiltTile>
	);
}

/** Inside the project's own tile, "npm downloads of expo-in-app-updates" reads as "npm downloads". */
function withoutProjectName(label: string, project?: ProjectContent) {
	if (!project) return label;
	const names = [project.id, project.title]
		.map((name) => name.trim())
		.filter(Boolean)
		.map((name) => name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"));
	if (names.length === 0) return label;
	return label.replace(
		new RegExp(`\\s+(?:of|on|for)\\s+(?:${names.join("|")})(?=\\s|$)`, "iu"),
		"",
	);
}

function OpenSourceTile({
	project,
	metrics,
	className,
}: {
	project?: ProjectContent;
	metrics: MetricContent[];
	className?: string;
}) {
	const repository = project?.repository?.trim();
	const packageHref = project?.href?.trim();
	const version = project?.status.match(/v\d+(?:\.\d+)*/u)?.[0];
	const summary = project?.summary.trim();
	return (
		<TiltTile
			max={3}
			frameClassName={className}
			className={cn(
				"relative grid min-w-0 gap-6 overflow-hidden sm:grid-cols-[minmax(0,1fr)_208px] sm:gap-6",
				TILE_PAD,
			)}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-24 -bottom-24 -z-10 size-[420px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--theme-accent)_10%,transparent),transparent)]"
			/>
			<div className="flex min-w-0 flex-col">
				<div className="flex items-center gap-3">
					<TileLabel>Open source</TileLabel>
					{version ? <MonoLabel tone="accent">{version}</MonoLabel> : null}
				</div>
				<h3 data-par="2" className="mt-5 mb-0 text-headline text-balance">
					App updates, one API.
				</h3>
				<p className="mt-3 mb-0 max-w-[44ch] text-[1rem] leading-[1.5] text-ink-soft">
					{summary || "My open-source Expo module for in-app update prompts on Android and iOS."}
				</p>
				{metrics.length > 0 ? (
					<dl className="m-0 mt-6 grid grid-cols-2 gap-x-5 gap-y-5">
						{metrics.map((metric, index) => (
							<div key={`${metric.label}-${index}`} className="min-w-0">
								<dd className="m-0 text-[clamp(1.5rem,2.4vw,2rem)] leading-none font-[620] tracking-[-0.04em] text-foreground">
									<CountUp value={metric.value.trim() || "—"} />
								</dd>
								<dt className="mt-2 text-[13px] leading-[1.4] text-muted-foreground">
									<DatedLabel label={withoutProjectName(metric.label.trim(), project)} />
								</dt>
							</div>
						))}
					</dl>
				) : null}
				<div className="mt-6 flex min-w-0 items-center gap-2 rounded-[18px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] py-1 pr-1 pl-4">
					<code className="min-w-0 flex-1 py-2 font-mono text-[13px] leading-[1.45] text-foreground [overflow-wrap:anywhere]">
						{INSTALL_COMMAND}
					</code>
					<CopyButton
						value={INSTALL_COMMAND}
						label={null}
						aria-label="Copy install command"
						announcement="Install command copied."
						variant="ghost"
						size="icon"
						className="shrink-0"
					/>
				</div>
				{repository || packageHref ? (
					<div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-4">
						{repository ? (
							<a
								href={repository}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-primary-text no-underline underline-offset-4 hover:underline"
							>
								Source on GitHub <span aria-hidden="true">↗</span>
								<span className="sr-only">, opens in a new tab</span>
							</a>
						) : null}
						{packageHref ? (
							<a
								href={packageHref}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-primary-text no-underline underline-offset-4 hover:underline"
							>
								Package on npm <span aria-hidden="true">↗</span>
								<span className="sr-only">, opens in a new tab</span>
							</a>
						) : null}
					</div>
				) : null}
			</div>
			<figure className="m-0 flex min-w-0 flex-col items-center justify-center">
				<UpdatePhone compact />
				<figcaption className="sr-only">
					A demo of the update flow expo-in-app-updates gives an app.
				</figcaption>
			</figure>
		</TiltTile>
	);
}

function TerminalTile({ facts, className }: { facts: TerminalFacts; className?: string }) {
	return (
		<TiltTile max={2} frameClassName={className} className="flex flex-col overflow-hidden">
			<div className="flex items-center justify-between gap-3 px-[clamp(22px,2.8vw,34px)] pt-[clamp(22px,2.8vw,30px)] pb-4">
				<TileLabel>Ask the terminal</TileLabel>
				<MonoLabel>try: ls, open, ghost</MonoLabel>
			</div>
			<MiniTerminal
				facts={facts}
				className="mx-3 mb-3 flex-1 rounded-[22px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3.5%,var(--theme-surface-solid))]"
			/>
		</TiltTile>
	);
}

/**
 * Where my remote teams were, with an arc from home to each team.
 */
function RemoteTile({
	experience,
	className,
}: {
	experience: ExperienceContent[];
	className?: string;
}) {
	const groups = groupExperienceByCompany(experience);
	const teams: RemoteMapTeam[] = REMOTE_TEAMS.flatMap((team) => {
		const group = groups.find((item) => item.company.trim() === team.company);
		if (!group) return [];
		return [{ ...team, period: group.period.trim().replace(/\bpresent\b/u, "now") }];
	});
	if (teams.length === 0) return null;
	return (
		<TiltTile
			frameClassName={className}
			className={cn("relative flex flex-col overflow-hidden", TILE_PAD)}
		>
			<TileLabel>Remote work</TileLabel>
			<h3 data-par="2" className="mt-5 mb-0 text-headline">
				Remote since 2021.
			</h3>
			<div className="mt-6 flex flex-1 flex-col justify-center">
				<RemoteMap teams={teams} />
			</div>
		</TiltTile>
	);
}

interface GlanceBentoProps {
	identity: IdentityContent;
	metrics: MetricContent[];
	experience: ExperienceContent[];
	projects: ProjectContent[];
	capabilities: CapabilityContent[];
	testimonial?: TestimonialContent;
}

export function GlanceBento({
	identity,
	metrics,
	experience,
	projects,
	capabilities,
	testimonial,
}: GlanceBentoProps) {
	const visibleMetrics = metrics.filter((metric) => metric.value.trim() || metric.label.trim());
	const project = projects.find((item) => item.id === OPEN_SOURCE_ID);
	const projectMetrics = visibleMetrics.filter((metric) => mentions(metric, project));
	const otherMetrics = visibleMetrics.filter((metric) => !mentions(metric, project));
	const tools = [
		...new Set(capabilities.flatMap((capability) => capability.tools.map((tool) => tool.trim()))),
	].filter(Boolean);
	const groups = groupExperienceByCompany(experience);
	const current = groups.find((group) => group.current) ?? groups[0];
	const lead = current?.roles.find((role) => role.current) ?? current?.roles[0];
	const facts: TerminalFacts = {
		name: identity.name,
		role: identity.role,
		location: identity.location.trim() || "Dhaka, Bangladesh",
		timeZone: identity.timezone.trim() || "Asia/Dhaka",
		email: identity.email.trim(),
		now: lead ? `${lead.role.trim()} at ${lead.company.trim()} · ${lead.period.trim()}` : undefined,
		projects: projects
			.filter((item) => item.slug.trim())
			.map((item) => ({
				slug: item.slug.trim(),
				title: item.title.trim(),
				summary: item.summary.trim(),
			})),
		tools,
		rule: ENGINEERING_PRINCIPLES.find((item) => item.id === "boundaries")?.title,
	};
	const hasNow = experience.length > 0;

	return (
		<Section aria-labelledby="glance-title" id="at-a-glance">
			<SectionHeading
				id="glance-title"
				index="00"
				eyebrow="At a glance"
				title="Where things stand."
				description="What I'm working on, what I've shipped, and the tools I give away."
			/>
			<div className="depth-bento grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-12">
				{hasNow ? (
					<NowTile experience={experience} className="md:col-span-2 lg:col-span-7 lg:row-span-2" />
				) : null}
				{otherMetrics.length > 0 ? (
					<div
						className={cn(
							"grid min-w-0 grid-cols-2 gap-3 sm:gap-4 md:col-span-2 lg:col-span-5",
							otherMetrics.length === 1 && "grid-cols-1",
						)}
					>
						{otherMetrics.map((metric, index) => (
							<MetricTile
								key={`${metric.label}-${index}`}
								metric={metric}
								className={cn(
									otherMetrics.length % 2 === 1 &&
										index === otherMetrics.length - 1 &&
										otherMetrics.length > 1 &&
										"col-span-2",
								)}
							/>
						))}
					</div>
				) : null}
				<RemoteTile experience={experience} className="md:col-span-2 lg:col-span-5" />
				<OpenSourceTile
					project={project}
					metrics={projectMetrics}
					className="md:col-span-2 lg:col-span-7"
				/>
				<TerminalTile facts={facts} className="md:col-span-2 lg:col-span-5" />
			</div>
			{testimonial ? (
				<Testimonial
					testimonial={testimonial}
					variant="feature"
					label="From a client"
					className="mt-[clamp(72px,10vw,136px)]"
				/>
			) : null}
		</Section>
	);
}
