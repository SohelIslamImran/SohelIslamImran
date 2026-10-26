import type { TestimonialContent } from "../types/content";
import { cn } from "../lib/utils";
import { Surface } from "./ui/portfolio";

function classifyTestimonialHref(href: string) {
	const value = href.trim();
	if (/^mailto:/iu.test(value)) return { arrow: "@", external: false, label: "Email destination" };
	if (/^tel:/iu.test(value)) return { arrow: "☎", external: false, label: "Phone destination" };
	if (value.startsWith("#")) return { arrow: "↓", external: false, label: "Page section" };
	const protocol = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1].toLowerCase();
	if (/^(?:https?:)?\/\//iu.test(value) || protocol) {
		return { arrow: "↗", external: true, label: "External destination, opens in a new tab" };
	}
	return { arrow: "→", external: false, label: "Internal destination" };
}

/** One vouched quote, kept with its attribution and date so it stays checkable. */
export function Testimonial({
	testimonial,
	className,
}: {
	testimonial: TestimonialContent;
	className?: string;
}) {
	const quote =
		testimonial.quote.trim() || "A recommendation will appear here when it is ready to share.";
	const author = testimonial.author.trim() || "Reference";
	const role = testimonial.role.trim() || "Client";
	const date = testimonial.date?.trim() || "";
	const href = testimonial.href?.trim() || undefined;
	const destination = href ? classifyTestimonialHref(href) : undefined;
	const linkLabel = href?.toLowerCase().includes("linkedin")
		? "Read it on LinkedIn"
		: "Read the recommendation";

	return (
		<Surface
			data-slot="testimonial"
			className={cn(
				"grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-0 p-[clamp(22px,3vw,30px)] print:[break-inside:avoid] print:[page-break-inside:avoid]",
				className,
			)}
		>
			<figure className="m-0 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] print:[break-inside:avoid] print:[page-break-inside:avoid]">
				<span
					className="block text-[3rem] font-[760] leading-[0.6] text-primary/25"
					aria-hidden="true"
				>
					“
				</span>
				<blockquote className="mt-3 min-w-0 max-w-full break-words text-pretty text-[clamp(1.15rem,2vw,1.4rem)] font-[720] leading-[1.3] tracking-[-0.03em] [overflow-wrap:anywhere]">
					{quote}
				</blockquote>
				<figcaption className="mt-5 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-0.5 text-sm text-muted-foreground">
					<span className="min-w-0 break-words font-[720] text-foreground [overflow-wrap:anywhere]">
						{author}
					</span>
					<span className="min-w-0 break-words [overflow-wrap:anywhere]">
						{role}
						{date ? ` · ${date}` : null}
					</span>
					{href && destination ? (
						<a
							aria-label={`${linkLabel}, ${destination.label}`}
							className="mt-1 grid min-h-11 w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 text-[13px] font-bold text-primary-text no-underline hover:underline focus-visible:outline-2 focus-visible:outline-ring"
							href={href}
							target={destination.external ? "_blank" : undefined}
							rel={destination.external ? "noopener noreferrer" : undefined}
						>
							<span className="min-w-0 break-words [overflow-wrap:anywhere]">{linkLabel}</span>
							<span className="shrink-0" aria-hidden="true">
								{destination.arrow}
							</span>
						</a>
					) : null}
				</figcaption>
			</figure>
		</Surface>
	);
}
