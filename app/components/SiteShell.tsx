import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import type { ProfileLinkContent } from '../types/content';

const navigation = [
	['/work', 'Work'],
	['/story', 'Story'],
	['/field-notes', 'Travel'],
	['/links', 'Links'],
] as const;

export function SiteShell({
	children,
	contactEmail,
	profileLinks,
}: {
	children: ReactNode;
	contactEmail?: string;
	profileLinks?: ReadonlyArray<Pick<ProfileLinkContent, 'id' | 'label'>>;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const location = useLocation();
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const shellRef = useRef<HTMLDivElement>(null);
	const footerEmail = contactEmail || 'sohelislamimran@gmail.com';
	const footerProfiles = profileLinks?.filter((link) => link.id === 'linkedin' || link.id === 'github') ?? [];

	useEffect(() => setMenuOpen(false), [location.pathname]);

	useEffect(() => {
		if (!menuOpen) return;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setMenuOpen(false);
			menuButtonRef.current?.focus();
		};
		window.addEventListener('keydown', closeOnEscape);
		return () => window.removeEventListener('keydown', closeOnEscape);
	}, [menuOpen]);

	useEffect(() => {
		const root = shellRef.current;
		if (!root) return;

		const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
		if (elements.length === 0) return;

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion || !('IntersectionObserver' in window)) {
			elements.forEach((element) => {
				element.dataset.revealVisible = '';
			});
			root.dataset.revealReady = '';
			return;
		}

		elements.forEach((element) => {
			if (element.getBoundingClientRect().top <= window.innerHeight * 0.94) {
				element.dataset.revealVisible = '';
			}
		});
		root.dataset.revealReady = '';

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					(entry.target as HTMLElement).dataset.revealVisible = '';
					observer.unobserve(entry.target);
				});
			},
			{ rootMargin: '0px 0px -8%', threshold: 0.08 },
		);

		elements.forEach((element) => {
			if (!element.hasAttribute('data-reveal-visible')) observer.observe(element);
		});

		return () => observer.disconnect();
	}, [location.pathname]);

	return (
		<div className="site-shell" ref={shellRef}>
			<a className="skip-link" href="#main-content">
				Skip to content
			</a>
			<header className="site-header">
				<Link to="/" className="brand-link" aria-label="Sohel Islam Imran, home">
					<span>Sohel Islam Imran</span>
				</Link>
				<button
					ref={menuButtonRef}
					className="menu-toggle"
					type="button"
					aria-controls="primary-navigation"
					aria-expanded={menuOpen}
					onClick={() => setMenuOpen((value) => !value)}
				>
					<span>{menuOpen ? 'Close' : 'Menu'}</span>
					<span className="menu-toggle__glyph" aria-hidden="true">
						{menuOpen ? '×' : '+'}
					</span>
				</button>
				<nav id="primary-navigation" className="primary-navigation" data-open={menuOpen || undefined} aria-label="Primary navigation">
					{navigation.map(([to, label]) => (
						<NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
							{label}
						</NavLink>
					))}
				</nav>
				<NavLink className="availability" to="/resume">
					Résumé <span aria-hidden="true">↗</span>
				</NavLink>
			</header>
			<main id="main-content">{children}</main>
			<footer className="site-footer">
				<div className="site-footer__lead">
					<p>Based in Dhaka. Working worldwide.</p>
					<a href={`mailto:${footerEmail}`}>
						Build something useful <span aria-hidden="true">↗</span>
					</a>
				</div>
				<nav className="footer-links" aria-label="Social links">
					{(footerProfiles.length > 0
						? footerProfiles
						: [
								{ id: 'linkedin', label: 'LinkedIn' },
								{ id: 'github', label: 'GitHub' },
							]
					).map((link) => (
						<Link key={link.id} to={`/links/${link.id}`}>
							{link.label}
						</Link>
					))}
					<Link to="/links">Everywhere else</Link>
				</nav>
				<p className="footer-fineprint">
					Designed and engineered by Sohel. Running on Cloudflare.
					<span>© Sohel Islam Imran</span>
				</p>
			</footer>
		</div>
	);
}
