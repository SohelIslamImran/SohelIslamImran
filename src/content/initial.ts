import type { PortfolioContent } from "../types/content";

/**
 * Public adoption numbers carry the date they were measured. Refresh them from
 * the GitHub and npm APIs before publishing, and keep the period in the label.
 * Last measured: 2026-10-27.
 */
export const INITIAL_PORTFOLIO_CONTENT: PortfolioContent = {
	schemaVersion: 3,
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
			{ value: "79,185", label: "npm downloads of expo-in-app-updates · Oct 19–25, 2026" },
			{ value: "302", label: "GitHub stars on expo-in-app-updates · Oct 27, 2026" },
			{ value: "280k", label: "people reached by my Stack Overflow answers · Sep 3, 2026" },
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
			location: "Remote",
			summary:
				"Lead full-stack work across Kuno's B2B learning platform, connecting product behavior with services, data, and delivery.",
			highlights: [
				"Work across React and TanStack interfaces, Elysia services on Bun, and PostgreSQL data.",
				"Contribute to authorization, external-service trust, and privacy boundaries across API and persistence.",
				"Contribute to Terraform deployment identity, CI checks, rollback safeguards, and release tooling.",
				"Improve automated coverage across Bun unit suites, API contract checks, route probes, and Playwright flows.",
			],
			technologies: [
				"TypeScript",
				"React",
				"TanStack",
				"Elysia",
				"Bun",
				"PostgreSQL",
				"AWS",
				"Terraform",
			],
			current: true,
		},
		{
			id: "kuno-full-stack",
			company: "Kuno",
			role: "Full Stack Engineer",
			period: "Jan 2025 — Mar 2026",
			summary:
				"Worked across B2B learning workflows, services, data models, and enterprise identity.",
			highlights: [
				"Worked on onboarding, diagnostic pathways, competency frameworks, and peer matching across UI, API, and database layers.",
				"Implemented enterprise authentication, account linking, and role-aware access controls for multi-tenant organizations.",
				"Delivered English and French capabilities across client interfaces, server-generated documents, and localized errors.",
			],
			technologies: ["TypeScript", "Elysia", "Bun", "Drizzle", "PostgreSQL", "Redis"],
		},
		{
			id: "kuno-mobile",
			company: "Kuno",
			role: "Mobile Application Developer",
			period: "Dec 2023 — Jan 2025",
			summary:
				"Developed React Native and Expo workflows while coordinating mobile behavior with Kuno's services.",
			highlights: [
				"Built cross-platform mobile workflows with consistent session behavior on iOS and Android.",
				"Worked with EAS build matrices, OTA update channels, and store release lifecycles.",
			],
			technologies: ["React Native", "Expo", "TypeScript"],
		},
		{
			id: "tilleli",
			company: "Tilleli",
			role: "React Native Developer",
			period: "2021 — Jan 2024",
			summary:
				"Joined Tilleli in 2021 and grew from an educational internship into long-running React Native product work.",
			highlights: [
				"Integrated Firebase Authentication, Firestore, Cloud Functions, Storage, and analytics with the mobile product.",
				"Added Stripe and RevenueCat payments, Algolia search, Google Maps and Places, and real-time messaging.",
				"Managed EAS builds, beta channels, and releases to the Apple App Store and Google Play Store.",
			],
			technologies: ["React Native", "Expo", "Firebase", "TypeScript", "Stripe", "Algolia"],
		},
		{
			id: "bugfixers",
			company: "Bugfixers",
			role: "Frontend Developer",
			period: "Jul 2021 — Sep 2021",
			summary:
				"Delivered web applications and administrative dashboards from Figma specifications with React, REST APIs, and analytics views.",
			highlights: [
				"Built the Future Track Learning platform and administration portal with React, REST APIs, and analytics visualizations.",
			],
			technologies: ["React", "JavaScript", "Sass", "Bootstrap"],
		},
	],
	projects: [
		{
			id: "kuno",
			title: "Kuno",
			slug: "kuno",
			summary:
				"A B2B professional-development platform for guided learning, peer conversations, and progress feedback.",
			description:
				"Kuno coordinates diagnostics, guided conversations, pathways, and progress feedback for professional development. My contributions connect the product experience to the services, data, and release paths behind it.",
			year: "2023 — now",
			role: "Lead Full Stack Engineer",
			status: "Current role",
			tags: ["TypeScript", "React", "TanStack", "Bun", "Elysia", "PostgreSQL", "AWS"],
			category: "product",
			highlights: [
				"Connected onboarding, learning pathways, matching, and company workflows across UI, API, and persistence.",
				"Contributed to role-aware authorization, external-service trust, and privacy-aware data handling.",
				"Supported English and French product output alongside enterprise sign-in and account-linking flows.",
				"Contributed to Terraform deployment identity, release coordination, rollback safeguards, and Playwright coverage.",
			],
			href: "https://www.kuno-ai.com/",
			featured: true,
		},
		{
			id: "expo-in-app-updates",
			title: "expo-in-app-updates",
			slug: "expo-in-app-updates",
			summary:
				"An open-source Expo module that gives Android and iOS apps one API for their different update lifecycles.",
			description:
				"Android and iOS need different in-app update mechanics. I designed one small TypeScript API over Play Core, iTunes Search API, and App Store handoff, then maintained the native modules, events, examples, and release tooling.",
			year: "2024 — now",
			role: "Creator and maintainer",
			status: "Active · v0.12.0",
			tags: ["Expo", "React Native", "Kotlin", "Swift", "Android Play Core"],
			category: "open-source",
			metrics: [
				{ value: "302", label: "GitHub stars · Oct 27, 2026" },
				{ value: "79,185", label: "npm downloads · Oct 19–25, 2026" },
				{ value: "18", label: "forks · Oct 27, 2026" },
			],
			highlights: [
				"Implemented Android availability, staleness, priority, and download events around Google Play Core.",
				"Built the iOS module around iTunes Search API lookups and App Store redirection.",
				"Maintained Expo SDK compatibility, examples, and New Architecture support.",
			],
			href: "https://www.npmjs.com/package/expo-in-app-updates",
			repository: "https://github.com/SohelIslamImran/expo-in-app-updates",
			featured: true,
		},
		{
			id: "tilleli",
			title: "Tilleli",
			slug: "tilleli",
			summary:
				"A cross-platform events product for discovery, ticketing, payments, and social features.",
			description:
				"Tilleli brought event discovery, local search, ticketing, payments, and social features into one React Native and Expo product. I joined in 2021 and worked across Firebase integrations, third-party services, and app-store delivery.",
			year: "2021 — Jan 2024",
			role: "React Native Developer",
			status: "Shipped to production",
			tags: ["React Native", "Expo", "Firebase", "Stripe", "Algolia"],
			category: "product",
			highlights: [
				"Integrated Firebase Auth, Firestore, Cloud Functions, Storage, and analytics with the mobile product.",
				"Added Stripe and RevenueCat payment flows, Algolia search, Google Maps and Places, and real-time messaging.",
				"Managed EAS build automation, beta channels, and releases to Google Play and the Apple App Store.",
			],
			featured: true,
		},
		{
			id: "portfolio",
			title: "sohelislamimran.com",
			slug: "portfolio",
			summary:
				"A public portfolio and owner publishing system built around SSR, typed content, and a clear draft boundary.",
			description:
				"I rebuilt this site with TanStack Start, full-document SSR, typed content, D1-backed revisions, and an owner-only CMS. Public loaders read published content while drafts stay behind the publishing boundary; the site runs on Cloudflare Workers.",
			year: "2026",
			role: "Creator and maintainer",
			status: "Live",
			tags: ["TanStack Start", "Cloudflare Workers", "D1", "React 19"],
			category: "open-source",
			highlights: [
				"Kept public reads separate from draft and publish mutations with revisioned content in D1.",
				"Protected the owner workflow with Access token validation, owner allowlisting, origin checks, and CSRF tokens.",
				"Added responsive interaction, reduced-motion support, print-friendly résumé output, RSS, and sitemap routes.",
			],
			href: "https://sohelislamimran.com",
			repository: "https://github.com/SohelIslamImran/SohelIslamImran",
		},
		{
			id: "ghosttime",
			title: "ghosttime",
			slug: "ghosttime",
			summary:
				"Cross-platform terminal animation CLI recreating the Ghostty startup effect with ANSI rendering.",
			description:
				"A zero-dependency Node/Bun CLI for recreating the Ghostty startup effect with configurable colors, timing, focus-aware pause, and resize handling.",
			year: "2025 — now",
			role: "Creator and maintainer",
			status: "Maintained",
			tags: ["TypeScript", "CLI", "npm"],
			category: "experiment",
			metrics: [{ value: "87", label: "GitHub stars · Oct 27, 2026" }],
			highlights: [
				"Efficient terminal frame rendering with low CPU overhead during active sessions.",
				"Window focus tracking to pause updates when the terminal loses focus and resume seamlessly.",
			],
			href: "https://www.npmjs.com/package/ghosttime",
			repository: "https://github.com/SohelIslamImran/ghosttime",
		},
		{
			id: "tailsync",
			title: "TailSync",
			slug: "tailsync",
			summary:
				"Experimental native iOS utility for peer-to-peer file transfer over Tailscale Taildrop.",
			description:
				"A native Swift application leveraging Taildrop's local PeerAPI. It tracks delivery per device, avoids duplicate sends, checks reachability, retries with backoff, and only deletes an original once every enabled destination has confirmed it.",
			year: "2026",
			role: "Creator",
			status: "Experimental",
			tags: ["Swift", "iOS", "Tailscale", "PhotoKit"],
			category: "experiment",
			highlights: [
				"Direct peer-to-peer file delivery using Tailscale local PeerAPI without cloud intermediaries.",
				"Safety-first file dispatch with reachability probes, duplicate avoidance, and destination verification.",
			],
			repository: "https://github.com/SohelIslamImran/TailSync",
		},
		{
			id: "android-mac-display",
			title: "Android Mac Display",
			slug: "android-mac-display",
			summary:
				"Hardware-accelerated prototype streaming macOS displays to Android devices over USB.",
			description:
				"A macOS menu-bar app captures and H.264-encodes the screen, ADB port forwarding carries it across, and an Android client decodes it. No network and no account. Built with an AI agent, as an experiment in how far that gets.",
			year: "2025 — 2026",
			role: "Creator",
			status: "Prototype",
			tags: ["Swift", "Kotlin", "ScreenCaptureKit", "ADB"],
			category: "experiment",
			highlights: [
				"Local-only USB video streaming using ScreenCaptureKit and hardware H.264 encoding.",
				"Automatic ADB port forwarding orchestration with zero external network dependencies.",
			],
			repository: "https://github.com/SohelIslamImran/AndroidMacDisplay",
		},
		{
			id: "expo-import-cost",
			title: "expo-import-cost",
			slug: "expo-import-cost",
			summary:
				"Experimental VS Code extension measuring real bundle cost per import using Expo Atlas.",
			description:
				"A VS Code extension that annotates each import with what it actually adds to the bundle, using Expo Atlas output rather than an estimate from package metadata. Still unstable, and published as an experiment.",
			year: "2024",
			role: "Creator",
			status: "Experimental",
			tags: ["VS Code", "Expo Atlas", "TypeScript"],
			category: "experiment",
			highlights: ["Measures the build that exists, instead of guessing from package size."],
			repository: "https://github.com/SohelIslamImran/expo-import-cost",
		},
	],
	capabilities: [
		{
			id: "product",
			title: "Full-stack product systems",
			description:
				"I work on vertical slices from interface behavior through services, data, and typed API boundaries.",
			tools: [
				"TypeScript",
				"React",
				"TanStack Router/Query",
				"Bun",
				"Elysia",
				"Drizzle",
				"PostgreSQL",
				"Redis",
			],
		},
		{
			id: "mobile",
			title: "Cross-platform and native mobile",
			description:
				"I build React Native and Expo products, then use Kotlin or Swift when platform APIs such as Play Core, iTunes Search, or screen capture require a native bridge.",
			tools: ["React Native", "Expo", "EAS", "Kotlin", "Swift", "Android Play Core", "Firebase"],
		},
		{
			id: "access",
			title: "Application security and authorization",
			description:
				"I work on role-aware access, tenant boundaries, enterprise identity, service trust, and privacy-aware data handling.",
			tools: [
				"Better Auth",
				"Role-Aware RBAC",
				"OIDC / SSO",
				"Webhook Cryptography",
				"Data Isolation",
			],
		},
		{
			id: "delivery",
			title: "Cloud infrastructure and delivery",
			description:
				"I contribute to AWS and Terraform deployment identity, CI checks, rollback behavior, and operator tooling.",
			tools: ["Terraform", "AWS", "GitHub Actions", "Docker", "Playwright", "Bun Test", "EAS"],
		},
	],
	testimonials: [
		{
			id: "gary-zlobinskiy",
			quote: "The most creative and capable developer we had.",
			author: "Gary Zlobinskiy",
			role: "Client, Tilleli",
			date: "November 2022",
			href: "https://www.linkedin.com/in/sohelislamimran/details/recommendations/",
		},
	],
	credentials: [
		{
			id: "programming-hero",
			title: "Complete Web Development Course",
			issuer: "Programming Hero",
			issuedAt: "April 2021",
		},
		{
			id: "zero-to-mastery",
			title: "Complete React Native Developer",
			issuer: "Zero To Mastery",
			issuedAt: "June 2021",
		},
	],
	writing: [
		{
			id: "from-first-principles",
			title: "From first computer to lead engineer",
			excerpt:
				"A dated account of learning web development, finding a first product team, and taking on larger parts of the system.",
			publishedAt: "2025-06-22",
			readingTime: "6 min",
			href: "/story",
			tags: ["Career", "Engineering"],
		},
	],
	contact: {
		title: "Let's talk about the problem.",
		intro:
			"I am interested in full-stack architecture, cross-platform mobile systems, developer tools, and teams that care about the work after the first release.",
		email: "sohelislamimran@gmail.com",
		links: [
			{ label: "GitHub", href: "https://github.com/SohelIslamImran", external: true },
			{ label: "LinkedIn", href: "https://www.linkedin.com/in/sohelislamimran/", external: true },
		],
	},
	social: [
		{
			platform: "Portfolio",
			label: "sohelislamimran.com",
			href: "https://sohelislamimran.com/",
			handle: "sohelislamimran.com",
		},
		{
			platform: "LinkedIn",
			label: "Sohel Islam Imran",
			href: "https://www.linkedin.com/in/sohelislamimran/",
			handle: "sohelislamimran",
		},
		{
			platform: "GitHub",
			label: "SohelIslamImran",
			href: "https://github.com/SohelIslamImran",
			handle: "SohelIslamImran",
		},
		{
			platform: "Stack Overflow",
			label: "Sohel Islam Imran",
			href: "https://stackoverflow.com/users/17672428/sohel-islam-imran",
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
			href: "https://bsky.app/profile/did:plc:34gks7jyxdfe6x7u4dbicncg",
			handle: "sohelislamimran.bsky.social",
		},
		{
			platform: "Facebook",
			label: "Sohel Islam Imran",
			href: "https://www.facebook.com/SohelIslamImran",
			handle: "SohelIslamImran",
		},
		{
			platform: "Instagram",
			label: "_sohelislamimran",
			href: "https://www.instagram.com/_sohelislamimran/",
			handle: "_sohelislamimran",
		},
		{
			platform: "Threads",
			label: "@_sohelislamimran",
			href: "https://www.threads.com/@_sohelislamimran",
			handle: "_sohelislamimran",
		},
		{
			platform: "Medium",
			label: "sohelislamimran",
			href: "https://sohelislamimran.medium.com/",
			handle: "sohelislamimran",
		},
		{
			platform: "YouTube",
			label: "SohelIslamImran",
			href: "https://www.youtube.com/@SohelIslamImran",
			handle: "SohelIslamImran",
		},
		{
			platform: "npm",
			label: "sohelislamimran",
			href: "https://www.npmjs.com/~sohelislamimran",
			handle: "sohelislamimran",
		},
	],
	profileLinks: [
		{
			id: "github",
			platform: "GitHub",
			label: "SohelIslamImran",
			href: "https://github.com/SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Open-source packages, native modules, and active repositories.",
			kind: "work",
			featured: true,
		},
		{
			id: "linkedin",
			platform: "LinkedIn",
			label: "Sohel Islam Imran",
			href: "https://www.linkedin.com/in/sohelislamimran/",
			handle: "sohelislamimran",
			description: "Career milestones, recommendations, and professional notes.",
			kind: "social",
			featured: true,
		},
		{
			id: "portfolio",
			platform: "Portfolio",
			label: "sohelislamimran.com",
			href: "https://sohelislamimran.com/",
			handle: "sohelislamimran.com",
			description: "Current portfolio, résumé, story, and public work index.",
			kind: "work",
			featured: true,
		},
		{
			id: "email",
			platform: "Email",
			label: "sohelislamimran@gmail.com",
			href: "mailto:sohelislamimran@gmail.com",
			description: "Direct email for engineering discussions and opportunities.",
			kind: "contact",
			featured: true,
		},
		{
			id: "npm",
			platform: "npm",
			label: "sohelislamimran",
			href: "https://www.npmjs.com/~sohelislamimran",
			handle: "sohelislamimran",
			description: "Published packages including expo-in-app-updates and ghosttime.",
			kind: "work",
		},
		{
			id: "stack-overflow",
			platform: "Stack Overflow",
			label: "Sohel Islam Imran",
			href: "https://stackoverflow.com/users/17672428/sohel-islam-imran",
			description: "1,707 reputation and 280,000 people reached · Sep 3, 2026.",
			kind: "work",
		},
		{
			id: "medium",
			platform: "Medium",
			label: "sohelislamimran",
			href: "https://sohelislamimran.medium.com/",
			handle: "sohelislamimran",
			description: "Early technical writing on JavaScript, React, and interview questions.",
			kind: "work",
		},
		{
			id: "youtube",
			platform: "YouTube",
			label: "SohelIslamImran",
			href: "https://www.youtube.com/@SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Developer-focused videos and experiments.",
			kind: "work",
		},
		{
			id: "instagram",
			platform: "Instagram",
			label: "_sohelislamimran",
			href: "https://www.instagram.com/_sohelislamimran/",
			handle: "_sohelislamimran",
			description: "Public profile and personal updates.",
			kind: "social",
		},
		{
			id: "threads",
			platform: "Threads",
			label: "@_sohelislamimran",
			href: "https://www.threads.com/@_sohelislamimran",
			handle: "_sohelislamimran",
			description: "Short notes and public updates.",
			kind: "social",
		},
		{
			id: "x",
			platform: "X",
			label: "@SohelIslamImran",
			href: "https://x.com/SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Short engineering notes and technology observations.",
			kind: "social",
		},
		{
			id: "bluesky",
			platform: "Bluesky",
			label: "sohelislamimran.bsky.social",
			href: "https://bsky.app/profile/did:plc:34gks7jyxdfe6x7u4dbicncg",
			handle: "sohelislamimran.bsky.social",
			description: "Engineering notes and updates on Bluesky.",
			kind: "social",
		},
		{
			id: "facebook",
			platform: "Facebook",
			label: "Sohel Islam Imran",
			href: "https://www.facebook.com/SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Personal updates, community highlights, and milestones.",
			kind: "social",
		},
		{
			id: "career-story",
			platform: "Story",
			label: "From First Computer to Lead Engineer",
			href: "/story",
			description: "How deliberate practice and sustained work led to lead full-stack engineering.",
			kind: "story",
		},
		{
			id: "field-notes",
			platform: "Field notes",
			label: "Field notes",
			href: "/field-notes",
			description:
				"No public entries yet; notes will appear here when there is something real to share.",
			kind: "story",
		},
	],
	resume: {
		label: "Résumé",
		href: "/resume",
		updatedAt: "2026-10-27",
		summary:
			"Lead Full Stack Engineer at Kuno working across B2B web and mobile systems, TypeScript services, data and security boundaries, native modules, and release workflows.",
	},
	story: {
		eyebrow: "Career journey",
		title: "From first computer to lead engineer.",
		intro:
			"I started learning web development in late 2020, first on a phone and then on my family's first computer. A structured course and a habit of rebuilding examples led to an internship, then to product work across mobile, backend, and infrastructure.",
		quote:
			"I watched each lesson twice: once to understand it, then again with the inputs changed until I could explain why it worked.",
		chapters: [
			{
				id: "00",
				eyebrow: "2020 · Foundations",
				title: "Starting with a phone.",
				paragraphs: [
					"I passed SSC in 2020 in Dhaka. Our family did not own a computer, so I began researching web development on a phone.",
					"The first goal was practical: build small things, understand why they worked, and decide whether software was a direction worth committing to.",
				],
				artifact: "The starting point was a phone, a question, and a small amount of free time.",
			},
			{
				id: "01",
				eyebrow: "November–December 2020",
				title: "Choosing a direction.",
				paragraphs: [
					"In November 2020, my family bought our first computer. I chose web development because it offered a direct way to turn ideas into interactive products.",
					"I enrolled in Programming Hero's course that December and adopted a rhythm: watch, rebuild, change the inputs, and look for edge cases.",
				],
				artifact: "A better learning loop: understand, rebuild, test, explain.",
			},
			{
				id: "02",
				eyebrow: "The learning method",
				title: "Learning by changing the inputs.",
				paragraphs: [
					"I had no previous programming experience, so I rebuilt each lesson with different data, requirements, and edge cases until the behavior felt understandable.",
					"Answering questions in course communities taught me to read unfamiliar code, trace errors, and explain a fix in plain language. Those conversations also led to my first professional opportunity.",
				],
				artifact: "Repetition became useful when the examples changed.",
			},
			{
				id: "03",
				eyebrow: "2021–Jan 2024 · Tilleli",
				title: "A small team, a real codebase.",
				paragraphs: [
					"In 2021, a community referral led to an unpaid React Native internship at Tilleli, a US events startup. The work put me inside a real codebase and product conversation.",
					"I also took a short Bugfixers role from July to September 2021 while Tilleli continued. My scope grew from interface work to Firebase services, integrations, app-store releases, and sustained mobile responsibility through January 2024.",
				],
				artifact: "Ownership grew through repeated, careful work.",
			},
			{
				id: "04",
				eyebrow: "Late 2023–present · Kuno",
				title: "Following the change through the system.",
				paragraphs: [
					"I joined Kuno in late 2023 as a mobile application developer. In January 2025 the role moved into full-stack work across B2B learning workflows, Bun and Elysia services, PostgreSQL and Drizzle data, authorization, localization, and cloud delivery.",
					"I became Lead Full Stack Engineer in March 2026. The current scope spans product architecture, security boundaries, testing, deployment identity, and release coordination.",
				],
				artifact:
					"A user action, server rule, data change, test, and safe path to production belong together.",
			},
			{
				id: "05",
				eyebrow: "Now · Current practice",
				title: "Keeping the work useful after launch.",
				paragraphs: [
					"I care about software that remains understandable and dependable after release. Outside Kuno, I maintain expo-in-app-updates and smaller tools because they keep me close to the people who use them.",
					"I am based in Dhaka and work remotely. The common thread is responsibility: understand the system, make trade-offs visible, and leave the codebase easier to work with.",
				],
				artifact: "Useful software is maintained with care.",
			},
		],
		sourceLabel: "Read the original Bengali career feature",
		sourceHref:
			"https://www.facebook.com/programmingherowebcourse/posts/pfbid0FGsuPS945caW115AtzREJit1LsACiDs6gtYPv2XtoyysCYL5Pz3pbWRPsHeMNd8Gl",
	},
	travel: {
		eyebrow: "Field notes",
		title: "Field notes, when there is something to share.",
		intro:
			"There are no public entries yet. I would rather publish a real note than fill this page with a placeholder map.",
		origin: "Dhaka, Bangladesh",
		entries: [],
	},
	media: [],
};
