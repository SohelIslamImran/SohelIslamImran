import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ExperienceContent } from '../types/content';
import { ResponsiveImage } from './ResponsiveImage';

interface CompanyChapter {
	company: string;
	period: string;
	role: string;
	summary: string;
	roles: ExperienceContent[];
}

export function CareerWorldline({ experience }: { experience: ExperienceContent[] }) {
	const chapters = useMemo<CompanyChapter[]>(() => {
		const companies = ['Kuno', 'Tilleli', 'Bugfixers'];
		return companies.flatMap((company) => {
			const roles = experience.filter((item) => item.company === company);
			if (roles.length === 0) return [];
			return [
				{
					company,
					period: roles.length > 1 ? '2023 — now' : roles[0].period,
					role: roles[0].role,
					summary: roles[0].summary,
					roles,
				},
			];
		});
	}, [experience]);
	const [searchParams, setSearchParams] = useSearchParams();
	const initialCompany = chapters.findIndex((chapter) => chapter.company.toLowerCase() === searchParams.get('company'));
	const [selected, setSelected] = useState(initialCompany >= 0 ? initialCompany : 0);
	const chapter = chapters[selected] ?? chapters[0];

	useEffect(() => {
		const next = chapters.findIndex((item) => item.company.toLowerCase() === searchParams.get('company'));
		if (next >= 0 && next !== selected) setSelected(next);
	}, [chapters, searchParams, selected]);

	const selectChapter = (index: number) => {
		const nextIndex = Math.max(0, Math.min(chapters.length - 1, index));
		setSelected(nextIndex);
		const nextParams = new URLSearchParams(searchParams);
		nextParams.set('company', chapters[nextIndex].company.toLowerCase());
		setSearchParams(nextParams, { replace: true });
	};

	if (!chapter) return null;

	return (
		<section className="career-worldline" aria-labelledby="career-title">
			<div className="career-worldline__copy">
				<h2 id="career-title">Experience, in motion</h2>
				<div className="career-worldline__tabs" role="tablist" aria-label="Choose a company">
					{chapters.map((item, index) => (
						<button
							key={item.company}
							id={`career-tab-${item.company.toLowerCase()}`}
							type="button"
							role="tab"
							aria-selected={selected === index}
							aria-controls="career-panel"
							tabIndex={selected === index ? 0 : -1}
							onClick={() => selectChapter(index)}
							onKeyDown={(event) => {
								const next =
									event.key === 'Home'
										? 0
										: event.key === 'End'
											? chapters.length - 1
											: event.key === 'ArrowRight' || event.key === 'ArrowDown'
												? (selected + 1) % chapters.length
												: event.key === 'ArrowLeft' || event.key === 'ArrowUp'
													? (selected - 1 + chapters.length) % chapters.length
													: null;
								if (next === null) return;
								event.preventDefault();
								selectChapter(next);
								(event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
							}}
						>
							{item.company}
						</button>
					))}
				</div>
				<div
					key={chapter.company}
					id="career-panel"
					className="career-worldline__panel"
					role="tabpanel"
					aria-labelledby={`career-tab-${chapter.company.toLowerCase()}`}
					tabIndex={0}
				>
					<p className="career-worldline__period">{chapter.period}</p>
					<h3>{chapter.role}</h3>
					<p>{chapter.summary}</p>
					{chapter.company === 'Kuno' && (
						<ul>
							<li>Product architecture</li>
							<li>Full-stack delivery</li>
							<li>Team and release systems</li>
						</ul>
					)}
					<Link className="worldline-button" to={chapter.company === 'Kuno' ? '/work#kuno-work' : `/work#${chapter.company.toLowerCase()}`}>
						Explore {chapter.company} work <span aria-hidden="true">↗</span>
					</Link>
				</div>
			</div>
			<div className="career-worldline__stage" data-company={chapter.company.toLowerCase()} aria-hidden="true">
				{chapters.map((item, index) => (
					<div
						key={item.company}
						className="career-card"
						data-active={index === selected || undefined}
						data-before={index < selected || undefined}
					>
						<div>
							<span>{item.period}</span>
							<strong>{item.company}</strong>
							<small>{item.role}</small>
						</div>
						{item.company === 'Kuno' ? (
							<ResponsiveImage
								src="/images/kuno-systems-placeholder.png"
								alt=""
								width={1448}
								height={1086}
								loading="lazy"
								decoding="async"
								sizes="(max-width: 600px) 50vw, 34vw"
							/>
						) : (
							<div className="career-card__object">
								<i />
								<b />
								<em />
							</div>
						)}
					</div>
				))}
				<div className="career-worldline__wire" />
			</div>
		</section>
	);
}
