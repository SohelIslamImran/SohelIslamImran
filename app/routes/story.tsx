import { env } from 'cloudflare:workers';
import { Link } from 'react-router';
import type { Route } from './+types/story';
import { SiteShell } from '../components/SiteShell';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { getPublicContent } from '../lib/cms.server';
import { articleJsonLd, breadcrumbJsonLd, createSeoMeta, personJsonLd } from '../lib/seo';

export function meta({ loaderData }: Route.MetaArgs) {
	const content = loaderData?.content;
	const story = content?.story;
	const name = content?.identity.name || 'Sohel Islam Imran';
	const title = `${story?.title || 'From a phone in Bangladesh to full-stack engineering.'} — ${name}`;
	const description =
		story?.intro || 'Sohel Islam Imran’s first-person story about learning, work, and growing into full-stack engineering.';
	// The original first-person post was published on 2025-06-18. Keep a
	// stable date in structured data even if an older CMS document has no
	// matching writing index entry yet.
	const publishedAt = content?.writing.find((entry) => entry.href === '/story')?.publishedAt || '2025-06-18';

	return createSeoMeta({
		title,
		description,
		pathname: '/story',
		content,
		image: '/images/social-story.png',
		imageAlt: 'From a phone in Bangladesh to full-stack engineering',
		type: 'article',
		article: {
			publishedAt,
			section: 'Career',
			tags: ['Career', 'Self-taught', 'Bangladesh'],
		},
		jsonLd: [
			personJsonLd(content),
			articleJsonLd({
				content,
				pathname: '/story',
				headline: title,
				description,
				publishedAt,
				section: 'Career',
				tags: ['Career', 'Self-taught', 'Bangladesh'],
			}),
			breadcrumbJsonLd(content, [
				{ name, pathname: '/' },
				{ name: 'Story', pathname: '/story' },
			]),
		],
	});
}

export async function loader() {
	return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

export default function Story({ loaderData }: Route.ComponentProps) {
	const { content } = loaderData;
	const { story } = content;
	const storyWords = [story.intro, ...story.chapters.flatMap((chapter) => [chapter.title, ...chapter.paragraphs])]
		.join(' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	const readingTime =
		content.writing.find((entry) => entry.href === '/story')?.readingTime || `${Math.max(1, Math.ceil(storyWords / 220))} min`;
	const readingLabel = /\bread\b/i.test(readingTime) ? readingTime : `${readingTime} read`;
	const avatarSrc = content.identity.avatar ? `/media/${encodeURIComponent(content.identity.avatar.id)}` : '/images/sohel-linkedin.png';

	return (
		<SiteShell contactEmail={content.contact.email || content.identity.email} profileLinks={content.profileLinks}>
			<article className="worldline-story">
				<header className="worldline-story__hero">
					<div>
						<p>
							{story.eyebrow || 'My story'} · {readingLabel}
						</p>
						<h1>{story.title || 'From a phone in Bangladesh to full-stack engineering.'}</h1>
						<p className="worldline-story__intro">{story.intro}</p>
						<a href="#story-start">
							Start reading <span aria-hidden="true">↓</span>
						</a>
					</div>
					<figure>
						<ResponsiveImage
							src={avatarSrc}
							alt={content.identity.avatar?.alt || `${content.identity.name} portrait`}
							width={800}
							height={800}
							sizes="(max-width: 900px) 80vw, 34vw"
						/>
						<figcaption>{content.identity.location} · Still learning</figcaption>
					</figure>
				</header>

				<blockquote className="worldline-story__quote" data-reveal>
					“{story.quote}”
				</blockquote>

				<div className="worldline-story__body" id="story-start">
					<aside aria-label="Chapter index">
						<p>On this page</p>
						{story.chapters.map((chapter) => (
							<a href={`#chapter-${chapter.id}`} key={chapter.id}>
								{chapter.title}
							</a>
						))}
					</aside>
					<div className="worldline-story__chapters">
						{story.chapters.map((chapter, index) => (
							<section id={`chapter-${chapter.id}`} key={chapter.id} data-reveal>
								<span>{String(index + 1).padStart(2, '0')}</span>
								<p className="worldline-story__label">{chapter.eyebrow}</p>
								<h2>{chapter.title}</h2>
								{chapter.paragraphs.map((paragraph) => (
									<p key={paragraph}>{paragraph}</p>
								))}
								{chapter.artifact && <blockquote>{chapter.artifact}</blockquote>}
							</section>
						))}
					</div>
				</div>

				<footer className="worldline-story__end" data-reveal>
					<div>
						<p>The original version was published on LinkedIn in June 2025.</p>
						<a href={story.sourceHref} target="_blank" rel="noreferrer">
							{story.sourceLabel} <span aria-hidden="true">↗</span>
						</a>
					</div>
					<Link to="/field-notes">
						Follow the journey <span aria-hidden="true">↗</span>
					</Link>
				</footer>
			</article>
		</SiteShell>
	);
}
