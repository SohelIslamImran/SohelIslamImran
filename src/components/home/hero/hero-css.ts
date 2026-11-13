/*
 * Scoped styles for the home hero's left column: the word-by-word headline
 * rise, the staggered fades, and the scroll parallax hand-off (--hero-p from
 * useHeroScroll). In the server HTML so the page is complete without JS.
 */
export const HERO_CSS = `
[data-slot="home-hero"] { --hero-p: 0; }
.hero-word { display: inline-block; white-space: nowrap; }
.hero-lead, .hero-accent { display: block; text-wrap: balance; }

@media (prefers-reduced-motion: no-preference) {
	.hero-word {
		animation: hero-word 1000ms var(--theme-ease) both;
		animation-delay: calc(160ms + var(--w, 0) * 60ms);
	}
	.hero-fade {
		animation: hero-fade 900ms var(--theme-ease) both;
		animation-delay: var(--d, 0ms);
	}
	.hero-copy { translate: 0 calc(var(--hero-p) * -40px); }
	.hero-side { translate: 0 calc(var(--hero-p) * 28px); }
}
@keyframes hero-word {
	from { opacity: 0; translate: 0 0.42em; filter: blur(14px); }
	55% { filter: blur(0); }
	to { opacity: 1; translate: 0 0; filter: blur(0); }
}
@keyframes hero-fade {
	from { opacity: 0; translate: 0 16px; filter: blur(6px); }
	to { opacity: 1; translate: 0 0; filter: blur(0); }
}
`;
