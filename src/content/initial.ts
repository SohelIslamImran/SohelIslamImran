import type { PortfolioContent } from "../types/content";

export const INITIAL_PORTFOLIO_CONTENT: PortfolioContent = {
	schemaVersion: 2,
	site: {
		title: "Sohel Islam Imran — Lead Full Stack Engineer",
		description:
			"Sohel Islam Imran is a full-stack engineer in Dhaka who builds TypeScript products end to end: React and React Native interfaces, backend services, data, access control, and cloud delivery.",
		url: "https://sohelislamimran.com",
		locale: "en",
		theme: "systems-atlas",
	},
	identity: {
		name: "Sohel Islam Imran",
		handle: "sohelislamimran",
		role: "Lead Full Stack Engineer",
		location: "Dhaka, Bangladesh",
		timezone: "Asia/Dhaka",
		availability: "Open to thoughtful collaborations",
		email: "sohelislamimran@gmail.com",
		avatar: null,
	},
	hero: {
		eyebrow: "Lead Full Stack Engineer · Dhaka",
		title: "I follow product problems all the way through the stack.",
		intro:
			"I started on React Native apps and kept going: into the APIs, data, access rules, infrastructure, and release paths that decide whether a feature actually holds up.",
		actions: [
			{ label: "See selected work", href: "/work" },
			{ label: "Email me", href: "mailto:sohelislamimran@gmail.com", external: true },
		],
		metrics: [
			{ value: "5 years", label: "shipping production web and mobile software" },
			{ value: "72k", label: "npm downloads of expo-in-app-updates · week of Oct 5, 2026" },
			{ value: "301", label: "GitHub stars on expo-in-app-updates · Oct 2026" },
			{ value: "280k", label: "people reached by my Stack Overflow answers" },
		],
	},
	about: {
		title: "Self-taught, and still widening the frame.",
		paragraphs: [
			"I wrote my first code in late 2020, on the first computer my family could afford. Six months later I was working in a production React Native codebase. Since then my scope has kept growing, from screens to the services behind them, and then to the infrastructure and releases that get them to people.",
			"The part I care about most is the space between layers. A rule shown in the interface should also be enforced on the server. A release should be easy to roll back. The next engineer should be able to see why something works. That is the kind of engineering I try to do, and the kind I try to help teammates do.",
		],
		facts: [
			{ value: "Dhaka", label: "home base" },
			{ value: "UTC+6", label: "timezone" },
		],
	},
	experience: [
		{
			id: "kuno-lead",
			company: "Kuno",
			role: "Lead Full Stack Engineer",
			period: "Mar 2026 — present",
			summary:
				"Technical lead on a B2B professional-development platform built around guided peer conversations. I work across product architecture, application security, and the delivery system behind them.",
			highlights: [
				"Lead full-stack work across learner, company, and admin experiences, keeping role-aware rules consistent from the interface down to the API and database.",
				"Harden authorization, external-service trust, and private-data boundaries across whole workflows rather than single screens.",
				"Contribute to release coordination, rollback, AWS and Terraform deployment identity, and the operator tooling around them.",
			],
			technologies: ["TypeScript", "React", "TanStack", "Elysia", "Bun", "PostgreSQL", "AWS"],
			current: true,
		},
		{
			id: "kuno-full-stack",
			company: "Kuno",
			role: "Full Stack Engineer",
			period: "Jan 2025 — Mar 2026",
			summary:
				"Moved from mobile into the whole product: TypeScript services, data, enterprise sign-in, and web interfaces.",
			highlights: [
				"Built onboarding, learning-path, peer-matching, and session features end to end with React, Elysia on Bun, Drizzle, PostgreSQL, and Redis.",
				"Added enterprise sign-in, account linking, and English–French localization, and grew unit, API-contract, and end-to-end test coverage.",
			],
			technologies: ["TypeScript", "Elysia", "Bun", "Drizzle", "PostgreSQL", "Redis", "Playwright"],
		},
		{
			id: "kuno-mobile",
			company: "Kuno",
			role: "Mobile Application Developer",
			period: "Dec 2023 — Jan 2025",
			summary: "Built mobile features for Kuno’s language-learning app.",
			highlights: [
				"Shipped React Native and Expo features and store releases, with attention to how each platform actually behaves.",
			],
			technologies: ["React Native", "Expo", "EAS", "TypeScript"],
		},
		{
			id: "tilleli",
			company: "Tilleli",
			role: "React Native Developer",
			period: "Jun 2021 — Jan 2024",
			summary:
				"Joined as an intern and stayed nearly three years, building a social events app for creating, discovering, and selling tickets to local events.",
			highlights: [
				"Built features on Firebase (Auth, Firestore, Storage, Functions) and integrated Stripe, RevenueCat, Algolia search, and Google Maps and Places.",
				"Ran EAS builds, over-the-air updates, and App Store and Google Play releases.",
				"Worked directly with the client on mobile priorities; their 2022 recommendation called me “the most creative and capable developer we had.”",
			],
			technologies: ["React Native", "Expo", "Firebase", "Stripe", "Algolia", "TypeScript"],
		},
		{
			id: "bugfixers",
			company: "Bugfixers",
			role: "Frontend Developer",
			period: "Jul 2021 — Sep 2021",
			summary:
				"Short agency contract building the Future Track Learning web app and its admin dashboard from Figma designs.",
			highlights: [
				"Implemented React views against REST APIs, including charts and a rich-text editor for administrators.",
			],
			technologies: ["React", "JavaScript", "REST APIs", "Sass", "Bootstrap"],
		},
	],
	projects: [
		{
			id: "kuno-platform",
			title: "B2B learning platform",
			slug: "kuno-platform",
			summary:
				"Kuno helps companies turn training into practice through diagnostics, personal pathways, peer matching, and guided conversations.",
			description:
				"The hard part is that one product serves learners, company admins, and operators, each with different rules. I work on carrying those rules through the whole system and on the release path that ships it safely. The codebase is private, so this stays general.",
			year: "2023 — now",
			role: "Lead full-stack engineer at Kuno",
			status: "Private codebase",
			tags: ["TypeScript", "React", "Elysia", "PostgreSQL", "AWS"],
			highlights: [
				"Authorization applied across the workflow, not at one UI gate",
				"Enterprise sign-in, bilingual UI, and AI-assisted workflows",
				"Safer releases: deployment identity, rollback, and tests",
			],
			featured: true,
		},
		{
			id: "expo-in-app-updates",
			title: "expo-in-app-updates",
			slug: "expo-in-app-updates",
			summary:
				"One small API for in-app updates on Android and iOS, even though the two platforms handle updates very differently.",
			description:
				"Android gets Play Core’s flexible and immediate update flows with progress events. iOS has no equivalent, so the module checks the store version and hands off to the App Store. I wrote both native sides and still maintain it.",
			year: "2024 — now",
			role: "Creator and maintainer",
			status: "Open source",
			tags: ["Expo Modules", "Kotlin", "Swift", "TypeScript"],
			highlights: [
				"72,220 npm downloads in the week of Oct 5–11, 2026",
				"301 GitHub stars and 18 forks (Oct 2026)",
				"Listed as New Architecture compatible in React Native Directory",
			],
			href: "https://www.npmjs.com/package/expo-in-app-updates",
			repository: "https://github.com/SohelIslamImran/expo-in-app-updates",
			featured: true,
		},
		{
			id: "tilleli-events",
			title: "Tilleli events app",
			slug: "tilleli-events",
			summary:
				"A social events app where people create events, find ones nearby, and buy or sell tickets.",
			description:
				"My first professional codebase. I started as an intern and grew with the product for nearly three years, from UI work to payments, search, maps, subscriptions, and store releases.",
			year: "2021 — 2024",
			role: "React Native developer",
			status: "Past role",
			tags: ["React Native", "Expo", "Firebase", "Stripe", "RevenueCat"],
			highlights: [
				"Firebase-backed features from auth to cloud functions",
				"Payments, subscriptions, Algolia search, and Google Maps",
				"EAS builds and App Store and Google Play releases",
			],
			featured: true,
		},
		{
			id: "portfolio",
			title: "This portfolio",
			slug: "portfolio",
			summary:
				"Server-rendered on Cloudflare Workers, with an owner-only CMS that publishes revisioned content from D1.",
			description:
				"Built with TanStack Start and React 19. Public pages only ever read published content; drafts stay behind Cloudflare Access, with token, origin, and CSRF checks on every change.",
			year: "2026",
			role: "Designer and engineer",
			status: "Live",
			tags: ["TanStack Start", "Cloudflare Workers", "D1", "Tailwind CSS"],
			highlights: [
				"Full-document SSR with typed routes",
				"Draft and publish revisions",
				"Print-ready résumé",
			],
			href: "https://sohelislamimran.com",
			repository: "https://github.com/SohelIslamImran/SohelIslamImran",
			featured: true,
		},
		{
			id: "ghosttime",
			title: "ghosttime",
			slug: "ghosttime",
			summary:
				"Ghostty’s terminal animation for any terminal, with color options, a timer, and pause on focus loss.",
			description: "A small TypeScript CLI published on npm.",
			year: "2025",
			role: "Creator and maintainer",
			status: "npm CLI",
			tags: ["TypeScript", "CLI", "npm"],
			highlights: ["87 GitHub stars (Oct 2026)"],
			href: "https://www.npmjs.com/package/ghosttime",
			repository: "https://github.com/SohelIslamImran/ghosttime",
		},
		{
			id: "tailsync",
			title: "TailSync",
			slug: "tailsync",
			summary:
				"An iOS utility that sends photos and files to my own devices over Tailscale’s Taildrop, with per-device delivery tracking and retries.",
			description:
				"Originals are only deleted, if you opt in, after every enabled device confirms delivery.",
			year: "2026",
			role: "Creator",
			status: "Experiment",
			tags: ["Swift", "iOS", "PhotoKit", "Tailscale"],
			highlights: [],
			repository: "https://github.com/SohelIslamImran/TailSync",
		},
		{
			id: "android-mac-display",
			title: "Android Mac Display",
			slug: "android-mac-display",
			summary:
				"Uses an Android phone as a second Mac display over USB, streaming H.264 from macOS through ADB port forwarding.",
			description: "A Swift and Kotlin prototype, built with AI assistance.",
			year: "2025",
			role: "Creator",
			status: "Prototype",
			tags: ["Swift", "Kotlin", "macOS", "Android"],
			highlights: [],
			repository: "https://github.com/SohelIslamImran/AndroidMacDisplay",
		},
	],
	capabilities: [
		{
			id: "product",
			title: "Product engineering",
			description:
				"Features that hold up end to end: interface state, API contracts, validation, persistence, caching, and the tests that protect them.",
			tools: ["TypeScript", "React", "TanStack", "Elysia", "Bun", "Drizzle", "PostgreSQL", "Redis"],
		},
		{
			id: "security",
			title: "Access and security",
			description:
				"Role-aware authorization, enterprise sign-in, service authentication, and keeping private data where it belongs.",
			tools: ["Better Auth", "Authorization", "Service auth", "Secret scanning"],
		},
		{
			id: "delivery",
			title: "Delivery and infrastructure",
			description:
				"CI/CD, release coordination, rollback, and deployment identity, so shipping stays routine.",
			tools: ["AWS", "Terraform", "Docker", "GitHub Actions", "Playwright", "Cloudflare"],
		},
		{
			id: "mobile",
			title: "Mobile and native",
			description:
				"React Native and Expo apps through to store release, plus native modules in Kotlin and Swift.",
			tools: ["React Native", "Expo", "EAS", "Firebase", "Kotlin", "Swift"],
		},
	],
	writing: [
		{
			id: "from-first-principles",
			title: "From first principles",
			excerpt: "How I went from learning on a phone in Bangladesh to leading full-stack work.",
			publishedAt: "2025-06-18",
			readingTime: "3 min",
			href: "/story",
			tags: ["Career", "Self-taught", "Bangladesh"],
		},
	],
	contact: {
		title: "Building something that has to hold up end to end?",
		intro: "I’m glad to talk about product engineering, React Native, or open source.",
		email: "sohelislamimran@gmail.com",
		responseTime: "I usually reply within two working days.",
		links: [
			{ label: "GitHub", href: "https://github.com/SohelIslamImran", external: true },
			{ label: "LinkedIn", href: "https://www.linkedin.com/in/sohelislamimran/", external: true },
		],
	},
	social: [
		{
			platform: "GitHub",
			label: "SohelIslamImran",
			href: "https://github.com/SohelIslamImran",
			handle: "SohelIslamImran",
		},
		{
			platform: "LinkedIn",
			label: "Sohel Islam Imran",
			href: "https://www.linkedin.com/in/sohelislamimran/",
			handle: "sohelislamimran",
		},
		{
			platform: "X",
			label: "SohelIslamImran",
			href: "https://x.com/SohelIslamImran",
			handle: "SohelIslamImran",
		},
		{
			platform: "Bluesky",
			label: "sohelislamimran.bsky.social",
			href: "https://bsky.app/profile/sohelislamimran.bsky.social",
			handle: "sohelislamimran.bsky.social",
		},
		{
			platform: "Facebook",
			label: "Sohel Islam Imran",
			href: "https://www.facebook.com/SohelIslamImran",
			handle: "SohelIslamImran",
		},
		{
			platform: "Stack Overflow",
			label: "Sohel Islam Imran",
			href: "https://stackoverflow.com/users/17672428/sohel-islam-imran",
		},
	],
	profileLinks: [
		{
			id: "linkedin",
			platform: "LinkedIn",
			label: "Sohel Islam Imran",
			href: "https://www.linkedin.com/in/sohelislamimran/",
			handle: "sohelislamimran",
			description: "Career history and longer posts.",
			kind: "social",
			featured: true,
		},
		{
			id: "github",
			platform: "GitHub",
			label: "SohelIslamImran",
			href: "https://github.com/SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Open-source modules, tools, and experiments.",
			kind: "social",
			featured: true,
		},
		{
			id: "facebook",
			platform: "Facebook",
			label: "Sohel Islam Imran",
			href: "https://www.facebook.com/SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Personal updates, milestones, and public posts.",
			kind: "social",
		},
		{
			id: "x",
			platform: "X",
			label: "@SohelIslamImran",
			href: "https://x.com/SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Short engineering notes and public updates.",
			kind: "social",
		},
		{
			id: "bluesky",
			platform: "Bluesky",
			label: "sohelislamimran.bsky.social",
			href: "https://bsky.app/profile/sohelislamimran.bsky.social",
			handle: "sohelislamimran.bsky.social",
			description: "Another place I share public notes.",
			kind: "social",
		},
		{
			id: "stack-overflow",
			platform: "Stack Overflow",
			label: "Sohel Islam Imran",
			href: "https://stackoverflow.com/users/17672428/sohel-islam-imran",
			description: "Answers on React Native, Expo, Firebase, and React.",
			kind: "work",
		},
		{
			id: "npm",
			platform: "npm",
			label: "sohelislamimran",
			href: "https://www.npmjs.com/~sohelislamimran",
			handle: "sohelislamimran",
			description: "Packages I publish and maintain.",
			kind: "work",
		},
		{
			id: "career-story",
			platform: "Story",
			label: "From a phone to full-stack engineering",
			href: "/story",
			description: "The longer story behind the work.",
			kind: "story",
		},
		{
			id: "email",
			platform: "Email",
			label: "sohelislamimran@gmail.com",
			href: "mailto:sohelislamimran@gmail.com",
			description: "The best way to reach me about work.",
			kind: "contact",
			featured: true,
		},
	],
	resume: {
		label: "Résumé",
		href: "/resume",
		updatedAt: "2026-10-15",
		summary:
			"Full-stack engineer with five years of production experience, from React Native apps to B2B platform architecture, application security, and cloud delivery. Creator of expo-in-app-updates.",
	},
	story: {
		eyebrow: "The longer story",
		title: "From a phone in Bangladesh to full-stack engineering.",
		intro:
			"How I started without a computer, what actually helped, and why I keep taking on more of the system.",
		quote:
			"The useful part of this story is not that the beginning was hard. It is that steady practice kept changing what was possible.",
		chapters: [
			{
				id: "00",
				eyebrow: "2020 · Before the first line",
				title: "I did not grow up around computers.",
				paragraphs: [
					"My family did not have much money. When I passed SSC in 2020, college was out of reach for the moment, and software was not an obvious path. I had no computer and no coding background.",
					"What I had was a phone. I started reading about freelancing and slowly realized the internet could be a place to build a living, not just a place to scroll.",
				],
				artifact: "A phone, a question, and no map yet.",
			},
			{
				id: "01",
				eyebrow: "Late 2020 · The first machine",
				title: "My family made a bet before there was any proof.",
				paragraphs: [
					"In November 2020 my family used their savings to buy me a computer. A month later I joined Programming Hero’s six-month web development course.",
					"I watched every lesson twice, once to understand it and once to build along. I changed the examples, made small projects of my own, tried each problem before looking at the answer, and spent a lot of time answering other learners’ questions. Helping them turned out to be one of the best ways to learn.",
				],
				artifact: "Watch it twice. Build it once. Then change it.",
			},
			{
				id: "02",
				eyebrow: "2021 · The first job",
				title: "An unpaid internship was still a door.",
				paragraphs: [
					"In mid-2021 I joined Tilleli, a US-based events startup, as an unpaid React Native intern. It was my first real codebase, with real expectations and people depending on my work. Because it was unpaid, I took a short paid frontend contract at the same time.",
					"I stayed at Tilleli for nearly three years. The work grew from screens into Firebase, payments, search, maps, and app-store releases. Most of what I learned there came from documentation, mistakes, and not letting go of a problem until it was fixed.",
				],
				artifact: "The first professional commit mattered more than the title.",
			},
			{
				id: "03",
				eyebrow: "2023 onward · The scope widens",
				title: "From interfaces to whole systems.",
				paragraphs: [
					"React Native taught me how decisions cross the line between JavaScript and native code. Open source taught me to design for people I would never meet. Full-stack work taught me to follow an outcome through data, services, infrastructure, and release.",
					"I joined Kuno in late 2023 to work on mobile. Over the next two years the work moved into backend services, security, and delivery, and in March 2026 I became Lead Full Stack Engineer.",
				],
				artifact: "The stack changed. The habit of following the whole problem did not.",
			},
			{
				id: "04",
				eyebrow: "Still in motion",
				title: "What I want next is a wider view.",
				paragraphs: [
					"I want to keep building products with real operational depth, keep maintaining tools other developers rely on, and help newer engineers the way other people once helped me.",
					"I also want to work remotely and see more of the world. Dhaka is where this started, not where it has to stay.",
				],
				artifact: "Dhaka is the origin point, not the edge of the map.",
			},
		],
		sourceLabel: "Read the original post on LinkedIn",
		sourceHref:
			"https://www.linkedin.com/posts/sohelislamimran_fromzerotoengineer-careerjourney-selftaught-share-7341153852773027841-A9AX",
	},
	travel: {
		eyebrow: "Field notes / Atlas in progress",
		title: "The world is the next system I want to understand.",
		intro:
			"A living record of places, conversations, small observations, and the work that travels with me. No bucket list. No invented pins.",
		origin: "Dhaka, Bangladesh",
		entries: [],
	},
	media: [],
};
