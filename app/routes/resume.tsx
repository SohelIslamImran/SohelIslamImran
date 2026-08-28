import { env } from 'cloudflare:workers';
import type { Route } from './+types/resume';
import { SiteShell } from '../components/SiteShell';
import { getPublicContent } from '../lib/cms.server';
import '../styles/resume-worldline.css';
import { breadcrumbJsonLd, createSeoMeta, personJsonLd, profilePageJsonLd } from '../lib/seo';

export function meta({ loaderData }: Route.MetaArgs) {
	const content = loaderData?.content;
	const name = content?.identity.name || 'Sohel Islam Imran';
	const role = content?.identity.role || 'Lead Full Stack Engineer';
	const title = `${name} Resume | ${role}`;
	const description = `Resume of ${name}, ${role} at Kuno in Dhaka: TypeScript, React, React Native, backend services, PostgreSQL, CI/CD, and product engineering experience.`;

	return createSeoMeta({
		title,
		description,
		pathname: '/resume',
		content,
		jsonLd: [
			personJsonLd(content),
			profilePageJsonLd(content, '/resume', title, description),
			breadcrumbJsonLd(content, [
				{ name, pathname: '/' },
				{ name: 'Résumé', pathname: '/resume' },
			]),
		],
	});
}

export async function loader() {
	return { content: await getPublicContent(env as unknown as { DB?: D1Database }) };
}

function isKuno(company: string) {
	return company.trim().toLowerCase() === 'kuno';
}

function isOpenSourceProject(status: string, repository?: string) {
	return Boolean(repository) || /open source|maintained|experimental|prototype/i.test(status);
}

export default function Resume({ loaderData }: Route.ComponentProps) {
	const { content } = loaderData;
	const experience = [...content.experience].sort((a, b) => Number(isKuno(b.company)) - Number(isKuno(a.company)));
	const proof = content.projects.filter((project) => isOpenSourceProject(project.status, project.repository));
	const visibleSocialLinks = content.social.filter((link) => link.href);
	const summary = content.resume.summary?.trim();
	const siteUrl = content.site.url?.trim();
	const hasTravel = Boolean(content.travel.title || content.travel.intro);

	return (
		<SiteShell>
			<article className="resume-worldline">
				<header className="resume-worldline__masthead">
					<div className="resume-worldline__identity">
						<figure className="resume-worldline__portrait">
							<img
								src="/images/sohel-linkedin.png"
								width="800"
								height="800"
								alt={`${content.identity.name} — profile portrait`}
								loading="eager"
								decoding="async"
							/>
							<figcaption aria-hidden="true">SI</figcaption>
						</figure>

						<div className="resume-worldline__name-block">
							<p className="resume-worldline__kicker">
								Résumé <span aria-hidden="true">/</span> {content.resume.updatedAt ?? 'Current'}
							</p>
							<h1>{content.identity.name}</h1>
							<p className="resume-worldline__role">{content.identity.role}</p>
							<p className="resume-worldline__location">
								{content.identity.location}
								{content.identity.timezone ? ` · ${content.identity.timezone}` : ''}
							</p>
						</div>
					</div>

					<div className="resume-worldline__contact" aria-label="Contact information">
						<a href={`mailto:${content.identity.email}`}>{content.identity.email}</a>
						{siteUrl ? (
							<a href={siteUrl} rel="noreferrer">
								{siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
							</a>
						) : null}
						<span>{content.identity.availability}</span>
						<button className="resume-worldline__print" type="button" onClick={() => window.print()}>
							<span>Print / save PDF</span>
							<span aria-hidden="true">↗</span>
						</button>
					</div>
				</header>

				<div className="resume-worldline__rule" aria-hidden="true">
					<span />
				</div>

				<section className="resume-worldline__intro" aria-labelledby="resume-summary-title" data-reveal>
					<div className="resume-worldline__section-label">
						<span>00</span>
						<span>Through line</span>
					</div>
					<div>
						<h2 id="resume-summary-title">{content.about.title || content.identity.role}</h2>
						{summary ? <p>{summary}</p> : null}
					</div>
				</section>

				<div className="resume-worldline__body">
					<div className="resume-worldline__main">
						<section aria-labelledby="resume-experience-title" data-reveal>
							<header className="resume-worldline__section-heading">
								<div className="resume-worldline__section-label">
									<span>01</span>
									<span>Experience</span>
								</div>
								<div>
									<h2 id="resume-experience-title">Following the whole problem.</h2>
									<p>Product behavior, services, data, and delivery are part of the same line of work.</p>
								</div>
							</header>

							{experience.length > 0 ? (
								<div className="resume-worldline__timeline">
									{experience.map((item, index) => (
										<article className={`resume-worldline__entry${item.current ? ' is-current' : ''}`} key={item.id} data-reveal>
											<div className="resume-worldline__entry-marker" aria-hidden="true">
												<span>{String(index + 1).padStart(2, '0')}</span>
											</div>
											<div className="resume-worldline__entry-content">
												<div className="resume-worldline__entry-meta">
													<time>{item.period}</time>
													{item.location ? <span>{item.location}</span> : null}
													{item.current ? <span className="resume-worldline__current">Now</span> : null}
												</div>
												<h3>{item.role}</h3>
												<p className="resume-worldline__company">
													{item.href ? (
														<a href={item.href} rel="noreferrer">
															{item.company}
														</a>
													) : (
														item.company
													)}
												</p>
												<p className="resume-worldline__entry-summary">{item.summary}</p>
												{item.highlights.length > 0 ? (
													<ul>
														{item.highlights.map((highlight) => (
															<li key={highlight}>{highlight}</li>
														))}
													</ul>
												) : null}
												{item.technologies.length > 0 ? (
													<ul className="resume-worldline__tags" aria-label="Technologies">
														{item.technologies.map((technology) => (
															<li key={technology}>{technology}</li>
														))}
													</ul>
												) : null}
											</div>
										</article>
									))}
								</div>
							) : (
								<p className="resume-worldline__empty">Experience will appear here as it is published.</p>
							)}
						</section>
					</div>

					<aside className="resume-worldline__side">
						<section aria-labelledby="resume-proof-title" data-reveal>
							<header className="resume-worldline__side-heading">
								<div className="resume-worldline__section-label">
									<span>02</span>
									<span>Public proof</span>
								</div>
								<h2 id="resume-proof-title">Small tools. Long reach.</h2>
							</header>
							{proof.length > 0 ? (
								<div className="resume-worldline__proof-list">
									{proof.map((project) => {
										const link = project.repository ?? project.href;
										return (
											<article className="resume-worldline__proof" key={project.id}>
												<div>
													<p className="resume-worldline__proof-year">{project.year}</p>
													<h3>{project.title}</h3>
												</div>
												<p>{project.summary}</p>
												{project.highlights.length > 0 ? <p className="resume-worldline__proof-signal">{project.highlights[0]}</p> : null}
												{link ? (
													<a href={link} rel="noreferrer" className="resume-worldline__text-link">
														View project <span aria-hidden="true">↗</span>
													</a>
												) : null}
											</article>
										);
									})}
								</div>
							) : (
								<p className="resume-worldline__empty">Public projects will appear here as they are published.</p>
							)}
						</section>

						{content.capabilities.length > 0 ? (
							<section aria-labelledby="resume-capabilities-title" data-reveal>
								<header className="resume-worldline__side-heading">
									<div className="resume-worldline__section-label">
										<span>03</span>
										<span>Capabilities</span>
									</div>
									<h2 id="resume-capabilities-title">Useful at the edges.</h2>
								</header>
								<div className="resume-worldline__capabilities">
									{content.capabilities.map((capability) => (
										<div className="resume-worldline__capability" key={capability.id}>
											<h3>{capability.title}</h3>
											<p>{capability.description}</p>
											{capability.tools.length > 0 ? <p className="resume-worldline__tool-line">{capability.tools.join(' · ')}</p> : null}
										</div>
									))}
								</div>
							</section>
						) : null}

						{hasTravel ? (
							<section className="resume-worldline__horizon" aria-labelledby="resume-horizon-title" data-reveal>
								<header className="resume-worldline__side-heading">
									<div className="resume-worldline__section-label">
										<span>04</span>
										<span>Next horizon</span>
									</div>
									<h2 id="resume-horizon-title">The work travels.</h2>
								</header>
								<div className="resume-worldline__horizon-card">
									<span className="resume-worldline__horizon-orbit" aria-hidden="true" />
									<p className="resume-worldline__proof-year">Origin / {content.travel.origin}</p>
									<p>{content.travel.title}</p>
									<p className="resume-worldline__horizon-note">
										{content.travel.entries.length > 0
											? `${content.travel.entries.length} field note${content.travel.entries.length === 1 ? '' : 's'} published`
											: 'Field notes are still to come.'}
									</p>
								</div>
							</section>
						) : null}
					</aside>
				</div>

				<footer className="resume-worldline__footer">
					<div>
						<p className="resume-worldline__section-label">
							<span>Contact</span>
						</p>
						<a className="resume-worldline__footer-email" href={`mailto:${content.contact.email}`}>
							{content.contact.email}
						</a>
					</div>
					{visibleSocialLinks.length > 0 ? (
						<nav aria-label="Public profiles" className="resume-worldline__social">
							{visibleSocialLinks.map((link) => (
								<a key={`${link.platform}-${link.href}`} href={link.href} rel="noreferrer">
									{link.platform}
								</a>
							))}
						</nav>
					) : null}
				</footer>
			</article>
		</SiteShell>
	);
}
