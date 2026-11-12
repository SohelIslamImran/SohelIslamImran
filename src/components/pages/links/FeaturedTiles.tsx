import { Link } from "@tanstack/react-router";
import type { ProfileLinkContent } from "@/types/content";
import { LinkIcon } from "@/components/LinkIcon";
import type { LinkKind } from "@/components/LinksFilter";
import { classifyDestination, destinationArrows, linkTitles } from "./link-utils";
import { usePointerTilt } from "./usePointerTilt";

function Tile({ link, kind }: { link: ProfileLinkContent; kind: LinkKind }) {
	const tilt = usePointerTilt<HTMLDivElement>();
	const destination = classifyDestination(link.href);
	const opensNewTab = destination === "web";
	const { platform, title, detail } = linkTitles(link);
	const description = link.description?.trim();
	return (
		<div data-slot="link-tile" className="group" {...tilt}>
			<span aria-hidden="true" data-tile-light="" />
			<div data-tile-face="" className="flex items-start justify-between gap-3">
				<LinkIcon platform={platform} size="lg" />
				<span
					aria-hidden="true"
					data-tile-arrow=""
					className="text-lg leading-none text-primary-text"
				>
					{destinationArrows[destination]}
				</span>
			</div>
			<h3 className="m-0 mt-auto min-w-0 pt-5 text-[17px] font-semibold leading-tight tracking-[-0.015em] sm:text-[19px]">
				<Link
					to="/links/$linkId"
					params={{ linkId: link.id }}
					search={{ kind }}
					target={opensNewTab ? "_blank" : undefined}
					rel={opensNewTab ? "noopener noreferrer" : undefined}
					aria-describedby={description ? `${link.id}-tile-description` : undefined}
					className="rounded-[inherit] after:absolute after:inset-0 after:z-[3] after:rounded-[inherit] focus-visible:outline-none"
				>
					{title}
					{opensNewTab ? <span className="sr-only">, opens in a new tab</span> : null}
				</Link>
			</h3>
			{detail ? (
				<p className="m-0 mt-1 truncate font-mono text-[11.5px] text-muted-foreground">{detail}</p>
			) : null}
			{description ? (
				<p
					id={`${link.id}-tile-description`}
					className="m-0 mt-2.5 text-caption leading-snug text-ink-soft max-sm:sr-only"
				>
					{description}
				</p>
			) : null}
		</div>
	);
}

export function FeaturedTiles({ links, kind }: { links: ProfileLinkContent[]; kind: LinkKind }) {
	if (!links.length) return null;
	return (
		<section aria-labelledby="featured-links-title" data-slot="links-featured">
			<h2 id="featured-links-title" className="mono-label m-0 mb-4 text-muted-foreground">
				Good places to start
			</h2>
			<ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-4">
				{links.map((link) => (
					<li key={link.id} className="grid min-w-0">
						<Tile link={link} kind={kind} />
					</li>
				))}
			</ul>
		</section>
	);
}
