import type { PortfolioContent } from "@/types/content";
import { mediaHref } from "@/lib/media";
import { cn } from "@/lib/utils";
import { PortfolioImage } from "@/components/PortfolioImage";
import { CopyButton, LocalTime, useCopyToClipboard } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/portfolio";
import { usePointerTilt } from "./usePointerTilt";

function ShareGlyph() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 16 16"
			className="size-4 fill-none stroke-current stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]"
		>
			<path d="M8 10V2.5M5 5.25 8 2.25l3 3M3.5 8.5v4a1.25 1.25 0 0 0 1.25 1.25h6.5a1.25 1.25 0 0 0 1.25-1.25v-4" />
		</svg>
	);
}

/** Native share sheet where the browser has one (most phones); otherwise copies the page link. */
function ShareButton({
	url,
	title,
	onCopied,
}: {
	url: string;
	title: string;
	onCopied: (value: string) => void;
}) {
	const { status, copy } = useCopyToClipboard();
	return (
		<>
			<button
				type="button"
				data-status={status}
				className={cn(
					buttonVariants({ variant: "outline", size: "lg" }),
					"w-full whitespace-nowrap px-4",
				)}
				onClick={async () => {
					const target = url || window.location.href;
					if (typeof navigator.share === "function") {
						try {
							await navigator.share({ title, url: target });
							return;
						} catch (error) {
							if (error instanceof DOMException && error.name === "AbortError") return;
						}
					}
					if (await copy(target)) onCopied(target);
				}}
			>
				<ShareGlyph />
				{status === "copied" ? "Link copied" : "Share"}
			</button>
			<span role="status" aria-live="polite" className="sr-only">
				{status === "copied" ? "Page link copied." : ""}
			</span>
		</>
	);
}

/**
 * The hub's calling card: a solid card resting on two others, tilting toward
 * a mouse with a soft light; still for touch, keyboard, and reduced motion.
 */
export function ProfileCard({
	content,
	onCopied,
}: {
	content: PortfolioContent;
	onCopied: (value: string) => void;
}) {
	const tilt = usePointerTilt<HTMLDivElement>();
	const name = content.identity.name.trim() || "Sohel Islam Imran";
	const role = content.identity.role.trim();
	const handle = content.identity.handle.trim();
	const email = content.identity.email.trim();
	const availability = content.identity.availability.trim();
	const location = content.identity.location.trim();
	const timezone = content.identity.timezone.trim() || "Asia/Dhaka";
	const siteUrl = content.site.url?.trim().replace(/\/$/u, "");
	const pageUrl = siteUrl ? `${siteUrl}/links` : "";

	return (
		<section aria-labelledby="links-title" data-slot="links-profile" {...tilt}>
			<span aria-hidden="true" data-card-back="2" />
			<span aria-hidden="true" data-card-back="1" />
			<div data-slot="links-card">
				<span aria-hidden="true" data-card-light="" />
				<div className="flex items-center gap-4">
					<div data-depth="" className="shrink-0">
						<PortfolioImage
							src={mediaHref(content.identity.avatar) ?? "/images/sohel-linkedin-400.webp"}
							alt={content.identity.avatar?.alt ?? "Portrait of Sohel Islam Imran"}
							width={160}
							height={160}
							loading="eager"
							fetchPriority="high"
							className="block size-[76px] rounded-[20px] border border-line object-cover object-[center_16%] sm:size-[88px] sm:rounded-[22px]"
						/>
					</div>
					<div className="min-w-0">
						<p className="mono-label m-0 text-primary-text">Links{handle ? ` · @${handle}` : ""}</p>
						<h1
							id="links-title"
							className="m-0 mt-1.5 text-[clamp(1.6rem,4.6vw,2rem)] font-[640] leading-[1.05] tracking-[-0.035em] [overflow-wrap:anywhere]"
						>
							{name}
						</h1>
						{role ? <p className="m-0 mt-1 text-small text-ink-soft">{role}</p> : null}
					</div>
				</div>
				<p className="m-0 mt-5 text-[16px] leading-relaxed text-ink-soft">
					My work, profiles, and a direct way to get in touch.
				</p>
				<ul className="m-0 mt-4 grid list-none gap-1.5 p-0 text-caption text-muted-foreground">
					{availability ? (
						<li className="flex items-center gap-2">
							<StatusDot />
							{availability}
						</li>
					) : null}
					{location ? (
						<li className="flex flex-wrap items-center gap-x-2 pl-[18px]">
							{location}
							<span aria-hidden="true">·</span>
							<LocalTime timeZone={timezone} showOffset />
						</li>
					) : null}
				</ul>
				<div className="mt-6 grid grid-cols-2 gap-2.5">
					{email ? (
						<CopyButton
							value={email}
							variant="default"
							size="lg"
							label="Copy email"
							announcement="Email copied. Talk soon."
							onCopied={() => onCopied(email)}
							className="w-full whitespace-nowrap px-4"
						/>
					) : null}
					<ShareButton url={pageUrl} title={`${name} — Links`} onCopied={onCopied} />
				</div>
			</div>
		</section>
	);
}
