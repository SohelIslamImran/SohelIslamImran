import { env } from 'cloudflare:workers';
import { useState } from 'react';
import { Link } from 'react-router';

import type { Route } from './+types/links';
import type { ProfileLinkContent } from '../types/content';
import { SiteShell } from '../components/SiteShell';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { getPublicContent } from '../lib/cms.server';
import { breadcrumbJsonLd, collectionPageJsonLd, createSeoMeta } from '../lib/seo';
import '../styles/links.css';

const FALLBACK_AVATAR = '/images/sohel-linkedin.png';

export function meta({ loaderData }: Route.MetaArgs) {
	const content = loaderData?.content;
	const name = content?.identity.name || 'Sohel Islam Imran';
	const title = `Links — ${name}`;
	const description = 'The small, useful internet trail of Sohel Islam Imran: work, writing, and ways to connect.';

	return createSeoMeta({
		title,
		description,
		pathname: '/links',
		content,
		image: '/images/social-links.png',
		imageAlt: 'Find Sohel Islam Imran online',
		jsonLd: [
			collectionPageJsonLd(content, '/links', title, description),
			breadcrumbJsonLd(content, [
				{ name, pathname: '/' },
				{ name: 'Links', pathname: '/links' },
			]),
		],
	});
}

export async function loader() {
	return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

function LinkCard({ link, index }: { link: ProfileLinkContent; index: number }) {
	const [copied, setCopied] = useState(false);

	async function copyShareLink() {
		if (typeof navigator === 'undefined' || !navigator.clipboard || typeof window === 'undefined') {
			return;
		}

		const shareUrl = new URL(`/links/${link.id}`, window.location.origin).toString();
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1_600);
		} catch {
			// Clipboard permissions are optional; the primary link remains usable.
		}
	}

	return (
		<article className="links-card" style={{ '--links-card-index': index } as React.CSSProperties} data-reveal>
			<Link className="links-card__target" to={`/links/${link.id}`}>
				<span className="links-card__platform">{link.platform}</span>
				<span className="links-card__label">{link.label}</span>
				{(link.handle || link.description) && <span className="links-card__detail">{link.handle ?? link.description}</span>}
				{link.description && link.handle && <span className="links-card__description">{link.description}</span>}
				<span className="links-card__arrow" aria-hidden="true">
					↗
				</span>
			</Link>
			<button className="links-card__copy" type="button" onClick={copyShareLink} aria-label={`Copy share link for ${link.label}`}>
				<span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
			</button>
		</article>
	);
}

export default function Links({ loaderData }: Route.ComponentProps) {
	const { content } = loaderData;
	const avatar = content.identity.avatar;
	const links = [...content.profileLinks.filter((link) => link.featured), ...content.profileLinks.filter((link) => !link.featured)];

	return (
		<SiteShell contactEmail={content.contact.email || content.identity.email} profileLinks={content.profileLinks}>
			<section className="links-page" aria-labelledby="links-title">
				<div className="links-orbit" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
				<header className="links-intro">
					<div className="links-portrait-wrap">
						<ResponsiveImage
							className="links-portrait"
							src={avatar ? `/media/${avatar.id}` : FALLBACK_AVATAR}
							alt={avatar?.alt || `${content.identity.name} portrait`}
							width={112}
							height={112}
							decoding="async"
							fetchPriority="high"
							sizes="112px"
						/>
					</div>
					<p className="links-kicker">A small internet footprint</p>
					<h1 id="links-title">Find me where the work is.</h1>
					<p className="links-lede">
						{content.identity.name} — {content.identity.role}. A short list of places to read, browse, or start a conversation.
					</p>
				</header>

				<nav className="links-list" aria-label="Profile links">
					{links.length > 0 ? (
						links.map((link, index) => <LinkCard key={link.id} link={link} index={index} />)
					) : (
						<p className="links-empty">The list is being assembled. Email is the best way to reach me for now.</p>
					)}
				</nav>

				<footer className="links-footer" data-reveal>
					<Link to="/">Back to the portfolio</Link>
					<span aria-hidden="true">·</span>
					<a href={`mailto:${content.identity.email}`}>Email directly</a>
				</footer>
			</section>
		</SiteShell>
	);
}

export function headers() {
	return {
		'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'X-Content-Type-Options': 'nosniff',
	};
}
