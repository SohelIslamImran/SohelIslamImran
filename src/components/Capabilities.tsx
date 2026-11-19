import { useState } from "react";
import type { CapabilityContent } from "../types/content";
import { ArrowRightIcon } from "./chrome/icons";
import { Section, SectionHeading } from "./ui/portfolio";

const exampleNotes: ReadonlyMap<string, { title: string; description: string }> = new Map([
	[
		"product",
		{
			title: "Build the screen and the API together",
			description: "The role picker sends the same values the typed API accepts.",
		},
	],
	[
		"data",
		{
			title: "Version any schema change",
			description:
				"If the schema changes, review the PostgreSQL migration with the code that uses it.",
		},
	],
	[
		"access",
		{
			title: "Check who can change a role",
			description:
				"After sign-in, the API checks permissions and scopes the update to the caller’s organization.",
		},
	],
	[
		"mobile",
		{
			title: "Keep the same access on mobile",
			description:
				"Keep the same API checks in React Native. Use Kotlin or Swift where the platforms differ.",
		},
	],
	[
		"delivery",
		{
			title: "Check the change before deploying",
			description:
				"Test the allowed and denied paths before deploying to AWS, with a way to roll back the release.",
		},
	],
]);

const organizations = ["Same organization", "Other organization"] as const;
const resultClassName =
	"col-start-1 row-start-1 flex items-baseline gap-2.5 opacity-0 data-[active=true]:opacity-100 motion-safe:translate-y-1 motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-out motion-safe:data-[active=true]:translate-y-0 motion-reduce:transition-none";

export function HowIWork({ capabilities }: { capabilities: CapabilityContent[] }) {
	const [organization, setOrganization] =
		useState<(typeof organizations)[number]>("Same organization");

	if (capabilities.length === 0) return null;

	const showsExample = capabilities.some(({ id }) => exampleNotes.has(id));
	const allowed = organization === "Same organization";

	return (
		<Section
			aria-labelledby="approach-title"
			id="how-i-work"
			spacing="compact"
			className="text-foreground"
		>
			<div className="grid min-w-0 items-start gap-x-[clamp(32px,6vw,96px)] gap-y-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
				<div className="grid min-w-0 items-start gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:gap-8">
					<SectionHeading
						id="approach-title"
						index="03"
						eyebrow="How I work"
						title="What a feature touches."
						className="mb-0"
					/>
					{showsExample ? (
						<figure className="m-0 grid min-w-0 gap-4 rounded-card border border-line bg-surface-solid p-5 sm:p-6">
							<figcaption className="min-w-0">
								<span className="mono-label block text-primary-text">Example change</span>
								<span className="mt-2 block text-[clamp(1.125rem,1.7vw,1.5rem)] leading-tight font-semibold tracking-tight">
									Give a teammate a new role
								</span>
							</figcaption>
							<div
								role="group"
								aria-label="Teammate’s organization"
								className="relative isolate grid grid-cols-2 rounded-inner-sm border border-line bg-muted p-1"
							>
								<span
									aria-hidden="true"
									className={`pointer-events-none absolute inset-y-1 left-1 -z-10 w-[calc(50%-4px)] rounded-[8px] border border-primary-line bg-primary-soft motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${allowed ? "" : "translate-x-full"}`}
								/>
								{organizations.map((option) => (
									<button
										key={option}
										type="button"
										aria-pressed={organization === option}
										onClick={() => setOrganization(option)}
										className="min-h-11 min-w-0 cursor-pointer rounded-[8px] px-2 py-1 text-caption leading-tight font-medium wrap-anywhere text-ink-soft hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-pressed:text-primary-text"
									>
										{option}
									</button>
								))}
							</div>
							<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
								<span className="rounded-inner-sm bg-muted px-2 py-2 font-mono text-caption wrap-anywhere text-ink-soft">
									<span className="block font-sans text-xs">Before</span>
									Member
								</span>
								<ArrowRightIcon
									aria-hidden="true"
									className={`size-4 ${allowed ? "text-primary-text" : "text-muted-foreground"}`}
								/>
								<span
									className={`rounded-inner-sm px-2 py-2 font-mono text-caption wrap-anywhere ${allowed ? "bg-primary-soft text-primary-text" : "bg-muted text-ink-soft"}`}
								>
									<span className="block font-sans text-xs">After</span>
									{allowed ? "Manager" : "Member"}
								</span>
							</div>
							<div className="relative grid border-t border-line pt-3 text-caption">
								<span aria-live="polite" aria-atomic="true" className="sr-only">
									{allowed
										? "Role updated. Current role is Manager."
										: "Not allowed. Different organization. Current role is still Member."}
								</span>
								<span aria-hidden="true" data-active={allowed} className={resultClassName}>
									<span className="rounded bg-success/10 px-1.5 py-0.5 font-mono font-semibold text-success">
										200
									</span>
									<span className="text-foreground">Role updated</span>
								</span>
								<span aria-hidden="true" data-active={!allowed} className={resultClassName}>
									<span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono font-semibold text-destructive">
										403
									</span>
									<span className="text-foreground">Not allowed: different organization</span>
								</span>
							</div>
						</figure>
					) : null}
				</div>

				<ul
					aria-label="Engineering decisions"
					role="list"
					className="m-0 list-none border-b border-line p-0"
				>
					{capabilities.map((capability, index) => (
						<CapabilityNote
							key={`${capability.id}-${index}`}
							capability={capability}
							highlighted={!allowed && capability.id === "access"}
						/>
					))}
				</ul>
			</div>
		</Section>
	);
}

function CapabilityNote({
	capability,
	highlighted,
}: {
	capability: CapabilityContent;
	highlighted: boolean;
}) {
	const note = exampleNotes.get(capability.id);
	const title = capability.title.trim() || "Untitled capability";
	const description = capability.description.trim();
	const tools = capability.tools.map((tool) => tool.trim()).filter(Boolean);
	const content = (
		<span className="block min-w-0 wrap-anywhere">
			<span className="block text-[clamp(1rem,1.55vw,1.1875rem)] leading-snug font-semibold tracking-tight">
				{note?.title ?? title}
			</span>
			{note || description ? (
				<span className="mt-1 block text-small text-ink-soft">
					{note?.description ?? description}
				</span>
			) : null}
		</span>
	);

	return (
		<li className="min-w-0 border-t border-line">
			{note || tools.length > 0 ? (
				<details className="group">
					<summary
						data-highlighted={highlighted}
						className="grid min-w-0 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-inner-sm px-3 py-3.5 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-4 sm:py-4 data-[highlighted=true]:bg-primary-soft [&::-webkit-details-marker]:hidden"
					>
						{content}
						<ArrowRightIcon
							aria-hidden="true"
							className="size-4 rotate-90 text-primary-text motion-safe:transition-transform motion-safe:duration-200 group-open:-rotate-90"
						/>
					</summary>
					<div className="grid min-w-0 gap-2 px-3 pb-4 wrap-anywhere sm:px-4">
						{note ? (
							<p className="m-0 text-small text-ink-soft">
								<span className="block font-semibold text-foreground">{title}</span>
								{description}
							</p>
						) : null}
						{tools.length > 0 ? (
							<p className="m-0 font-mono text-caption text-muted-foreground">
								<span className="sr-only">Tools and techniques </span>
								{tools.join(" · ")}
							</p>
						) : null}
					</div>
				</details>
			) : (
				<div className="px-3 py-3.5 sm:px-4 sm:py-4">{content}</div>
			)}
		</li>
	);
}
