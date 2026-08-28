import { env } from 'cloudflare:workers';
import { Link } from 'react-router';
import type { Route } from './+types/home';
import { CareerWorldline } from '../components/CareerWorldline';
import { SiteShell } from '../components/SiteShell';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { WorldlineHero } from '../components/WorldlineHero';
import { getPublicContent } from '../lib/cms.server';
import { breadcrumbJsonLd, createSeoMeta, personJsonLd, profilePageJsonLd, websiteJsonLd } from '../lib/seo';

function isExternalHref(href: string) {
	return /^(?:https?:|mailto:|tel:)/i.test(href);
}

export function meta({ loaderData }: Route.MetaArgs) {
	const content = loaderData?.content;
	const name = content?.identity.name || 'Sohel Islam Imran';
	const role = content?.identity.role || 'Lead Full Stack Engineer';
	const title = `${name} | ${role} at Kuno`;
	const description =
		'Sohel Islam Imran is a Lead Full Stack Engineer at Kuno in Dhaka, building secure TypeScript products with React, backend services, data systems, and Cloudflare.';

	return createSeoMeta({
		title,
		description,
		pathname: '/',
		content,
		image: '/images/social-home.png',
		imageAlt: 'Sohel Islam Imran — Lead Full Stack Engineer at Kuno',
		jsonLd: [
			websiteJsonLd(content),
			personJsonLd(content),
			profilePageJsonLd(content, '/', title, description),
			breadcrumbJsonLd(content, [{ name, pathname: '/' }]),
		],
	});
}

export async function loader() {
	return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { content } = loaderData;
	const openSource = content.projects.filter((project) => project.id !== 'kuno-platform').slice(0, 2);
	const heroActions =
		content.hero.actions.length > 0
			? content.hero.actions.slice(0, 2)
			: [
					{ label: 'See my work', href: '/work' },
					{ label: 'Start a conversation', href: `mailto:${content.contact.email || content.identity.email}`, external: true },
				];

	return (
		<SiteShell contactEmail={content.contact.email || content.identity.email} profileLinks={content.profileLinks}>
			<section className="worldline-hero">
				<div className="worldline-hero__copy">
					<p className="worldline-kicker">{content.hero.eyebrow || `${content.identity.role} · ${content.identity.name}`}</p>
					<h1>{content.hero.title || `I lead full-stack engineering for ambitious products.`}</h1>
					<p>{content.hero.intro || content.site.description}</p>
					<div className="worldline-hero__actions">
						{heroActions.map((action, index) => {
							const className = index === 0 ? 'worldline-button' : 'worldline-text-link';
							const content = (
								<>
									{action.label} <span aria-hidden="true">↗</span>
								</>
							);
							return isExternalHref(action.href) ? (
								<a
									className={className}
									href={action.href}
									key={`${action.label}-${action.href}`}
									rel={action.href.startsWith('http') ? 'noreferrer' : undefined}
								>
									{content}
								</a>
							) : (
								<Link className={className} to={action.href} key={`${action.label}-${action.href}`}>
									{content}
								</Link>
							);
						})}
					</div>
					<p className="worldline-hero__status">
						<span aria-hidden="true" /> {content.identity.location}. {content.identity.availability || 'Working worldwide.'}
					</p>
				</div>
				<WorldlineHero
					src={content.identity.avatar ? `/media/${encodeURIComponent(content.identity.avatar.id)}` : undefined}
					alt={content.identity.avatar?.alt || `${content.identity.name} portrait`}
				/>
			</section>

			{content.hero.metrics.length > 0 && (
				<section className="worldline-proof-strip" aria-label="Public signals" data-reveal>
					<p className="worldline-kicker">Public signals</p>
					<div>
						{content.hero.metrics.slice(0, 4).map((metric) => (
							<div key={`${metric.value}-${metric.label}`}>
								<strong>{metric.value}</strong>
								<span>{metric.label}</span>
							</div>
						))}
					</div>
				</section>
			)}

			<div data-reveal>
				<CareerWorldline experience={content.experience} />
			</div>

			<section className="company-proof" aria-labelledby="company-proof-title" data-reveal>
				<header>
					<h2 id="company-proof-title">Company work comes first.</h2>
					<p>Roles where I owned real product constraints, release pressure, and outcomes shared with a team.</p>
				</header>
				<div className="company-proof__grid">
					<Link to="/work#kuno-work" className="company-proof__feature">
						<span>Kuno · 2023 — now</span>
						<h3>From mobile product work to leading full-stack engineering.</h3>
						<p>Secure enterprise flows, product architecture, platform delivery, and the systems that help a team ship with confidence.</p>
						<b>Read the Kuno case study ↗</b>
					</Link>
					<Link to="/work#tilleli" className="company-proof__row">
						<span>Tilleli · 2021 — 2024</span>
						<h3>React Native product and release engineering</h3>
						<b aria-hidden="true">↗</b>
					</Link>
					<Link to="/work#bugfixers" className="company-proof__row">
						<span>Bugfixers · 2021</span>
						<h3>Production frontend foundations</h3>
						<b aria-hidden="true">↗</b>
					</Link>
				</div>
			</section>

			<section className="open-source-proof" aria-labelledby="open-source-title" data-reveal>
				<header>
					<p>Side projects, after the day job</p>
					<h2 id="open-source-title">Small tools with a public life.</h2>
				</header>
				<div className="open-source-proof__list">
					{openSource.map((project) => (
						<a key={project.id} href={project.repository ?? project.href} target="_blank" rel="noreferrer">
							<span>{project.title}</span>
							<p>{project.summary}</p>
							<b aria-hidden="true">↗</b>
						</a>
					))}
				</div>
				<Link className="worldline-text-link" to="/work#open-source">
					Browse the open-source archive <span aria-hidden="true">↗</span>
				</Link>
			</section>

			<section className="worldline-paths" data-reveal>
				<Link className="worldline-path worldline-path--story" to="/story">
					<ResponsiveImage
						src="/images/sohel-linkedin.png"
						alt="Portrait of Sohel Islam Imran"
						width={800}
						height={800}
						loading="lazy"
						sizes="(max-width: 900px) 100vw, 50vw"
					/>
					<div>
						<span>{content.story.eyebrow || 'My story'}</span>
						<h2>{content.story.title || 'From a phone in Bangladesh to full-stack engineering.'}</h2>
						<b>Read the story ↗</b>
					</div>
				</Link>
				<Link className="worldline-path worldline-path--travel" to="/field-notes">
					<ResponsiveImage
						src="/images/travel-placeholder.png"
						alt="A future travel route through a mountain landscape"
						width={1122}
						height={1402}
						loading="lazy"
						sizes="(max-width: 900px) 100vw, 50vw"
					/>
					<div>
						<span>{content.travel.eyebrow || 'Field notes'}</span>
						<h2>{content.travel.title || 'A place for the journeys still ahead.'}</h2>
						<b>Open the journal ↗</b>
					</div>
				</Link>
			</section>

			<section className="worldline-contact" data-reveal>
				<p>{content.contact.title || 'Have a complicated product problem?'}</p>
				<a href={`mailto:${content.contact.email || content.identity.email}`}>
					{content.contact.intro || 'Let&apos;s make it clearer.'} <span aria-hidden="true">↗</span>
				</a>
			</section>
		</SiteShell>
	);
}
