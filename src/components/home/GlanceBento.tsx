import { useEffect, useState, type ReactNode } from "react";
import type {
	CapabilityContent,
	ExperienceContent,
	IdentityContent,
	MetricContent,
	ProjectContent,
	TestimonialContent,
} from "../../types/content";
import { CopyButton, CountUp, LocalTime, Stagger, useLocalTime } from "@/components/motion";
import { MonoLabel, Section, SectionHeading, StatusDot } from "@/components/ui/portfolio";
import { groupExperienceByCompany } from "@/lib/experience";
import { cn } from "@/lib/utils";
import { ENGINEERING_PRINCIPLES } from "../EngineeringPrinciples";
import { Testimonial } from "../Testimonial";
import { DottedGlobe, isDaylightAtPin } from "./DottedGlobe";
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

function hostOf(href?: string) {
	if (!href) return undefined;
	try {
		return new URL(href).hostname.replace(/^www\./u, "");
	} catch {
		return undefined;
	}
}

/**
 * The lead tile: the current role, told as one web product taken apart from
 * the interface to the release, with the promotions at the company below.
 */
function NowTile({
	experience,
	projects,
	className,
}: {
	experience: ExperienceContent[];
	projects: ProjectContent[];
	className?: string;
}) {
	const groups = groupExperienceByCompany(experience);
	const group = groups.find((item) => item.current) ?? groups[0];
	const lead = group?.roles.find((role) => role.current) ?? group?.roles[0];
	if (!group || !lead) return null;
	const role = lead.role.trim() || "Engineer";
	const company = lead.company.trim();
	const product = projects.find(
		(item) => company && item.title.trim().toLowerCase() === company.toLowerCase(),
	);
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
				{lead.location?.trim() ? (
					<>
						<span aria-hidden="true">·</span>
						<span>{lead.location.trim()}</span>
					</>
				) : null}
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
			<WebStack role={lead} host={hostOf(product?.href)} className="mt-6 flex-1 content-end" />
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

function MetricTile({ metric, className }: { metric: MetricContent; className?: string }) {
	const value = metric.value.trim() || "—";
	const label = metric.label.trim();
	return (
		<TiltTile
			as="div"
			frameClassName={className}
			className="flex min-h-[150px] flex-col justify-between gap-5 p-[clamp(18px,2.4vw,28px)]"
		>
			<p
				data-par="3"
				className="m-0 text-[clamp(2rem,3.6vw,3rem)] leading-none font-[620] tracking-[-0.045em] text-foreground"
			>
				<CountUp value={value} />
			</p>
			{label ? (
				<p className="m-0 max-w-[30ch] text-[13.5px] leading-[1.45] text-muted-foreground">
					{label}
				</p>
			) : null}
		</TiltTile>
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
				"relative grid min-w-0 gap-6 overflow-hidden sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-6",
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
				<h3 data-par="2" className="mt-5 mb-0 text-headline">
					App updates, one API.
				</h3>
				<p className="mt-3 mb-0 max-w-[44ch] text-[1rem] leading-[1.5] text-ink-soft">
					{summary ||
						"I maintain expo-in-app-updates for Expo developers building on Android and iOS."}
				</p>
				{metrics.length > 0 ? (
					<dl className="m-0 mt-6 grid grid-cols-2 gap-x-5 gap-y-5">
						{metrics.map((metric, index) => (
							<div key={`${metric.label}-${index}`} className="min-w-0">
								<dd className="m-0 text-[clamp(1.5rem,2.4vw,2rem)] leading-none font-[620] tracking-[-0.04em] text-foreground">
									<CountUp value={metric.value.trim() || "—"} />
								</dd>
								<dt className="mt-2 text-[13px] leading-[1.4] text-muted-foreground">
									{metric.label.trim()}
								</dt>
							</div>
						))}
					</dl>
				) : null}
				<div className="mt-6 flex min-w-0 items-center gap-2 rounded-[18px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] py-1 pr-1 pl-4">
					<code className="min-w-0 flex-1 py-2 font-mono text-[13px] leading-[1.45] text-foreground [overflow-wrap:anywhere]">
						<span aria-hidden="true" className="mr-2 text-muted-foreground select-none">
							$
						</span>
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

function DaylightLabel() {
	const [day, setDay] = useState<boolean | null>(null);
	useEffect(() => {
		const update = () => setDay(isDaylightAtPin(new Date()));
		update();
		const timer = window.setInterval(update, 60_000);
		return () => window.clearInterval(timer);
	}, []);
	if (day === null) return null;
	return <span>{day ? "Daylight here" : "Night here"}</span>;
}

function LocationTile({ identity, className }: { identity: IdentityContent; className?: string }) {
	const timeZone = identity.timezone.trim() || "Asia/Dhaka";
	const place = identity.location.trim() || "Dhaka, Bangladesh";
	const { offset } = useLocalTime(timeZone);
	const offsetLabel = offset ?? (timeZone === "Asia/Dhaka" ? "UTC+6" : "");
	return (
		<TiltTile
			frameClassName={className}
			className={cn("relative flex flex-col overflow-hidden", TILE_PAD)}
		>
			<TileLabel>Based in</TileLabel>
			<h3 data-par="2" className="mt-5 mb-0 text-headline">
				{place}
			</h3>
			<p className="mt-2 mb-0 flex flex-wrap items-baseline gap-x-2.5 text-muted-foreground">
				<LocalTime
					timeZone={timeZone}
					className="text-[1.75rem] leading-none font-[600] tracking-[-0.03em] text-foreground"
				/>
				{offsetLabel ? <span className="mono-label">{offsetLabel}</span> : null}
			</p>
			<div data-par="-2" className="relative mt-4 flex flex-1 items-center justify-center">
				<DottedGlobe className="w-full max-w-[260px]" />
			</div>
			<p className="mono-label mt-3 mb-0 flex justify-between gap-3 text-muted-foreground">
				<span>
					23.81°N <span className="text-line-strong">/</span> 90.41°E
				</span>
				<DaylightLabel />
			</p>
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
				title="A little context."
				description="Where I work, what I ship, and the tools I give away."
			/>
			<Stagger className="depth-bento grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-12">
				{hasNow ? (
					<NowTile
						experience={experience}
						projects={projects}
						className="md:col-span-2 lg:col-span-7 lg:row-span-2"
					/>
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
				<LocationTile identity={identity} className="md:col-span-2 lg:col-span-5" />
				<OpenSourceTile
					project={project}
					metrics={projectMetrics}
					className="md:col-span-2 lg:col-span-7"
				/>
				<TerminalTile facts={facts} className="md:col-span-2 lg:col-span-5" />
			</Stagger>
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
