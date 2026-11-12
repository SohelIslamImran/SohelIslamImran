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
			"I am Sohel, a full-stack engineer in Dhaka. I build products through every layer, from the interface people use to the services, data, and releases behind it.",
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
		title: "I build every layer of a product, from interface to release.",
		intro:
			"I'm Sohel, a lead full-stack engineer at Kuno. I take a feature the whole way: the interface people use, the API, the data, the access rules, the cloud, and the release.",
		actions: [
			{ label: "See selected work", href: "/work" },
			{ label: "Email me", href: "mailto:sohelislamimran@gmail.com", external: true },
		],
		metrics: [
			{ value: "5 years", label: "shipping production software" },
			{ value: "79,185", label: "npm downloads of expo-in-app-updates · Oct 19–25, 2026" },
			{ value: "302", label: "GitHub stars on expo-in-app-updates · Oct 27, 2026" },
			{ value: "280k", label: "people reached by my Stack Overflow answers · Sep 3, 2026" },
		],
	},
	about: {
		title: "Self-taught, and still curious about the layer below.",
		paragraphs: [
			"I wrote my first code in late 2020, on my family's first computer. Six months later I was working in a production React Native app. Since then I have kept going one layer deeper: from interfaces, to the services behind them, to the infrastructure and releases that get them to people.",
			"What I care about most is where the layers meet. If the interface shows a rule, the server should enforce it. A release should be easy to roll back. The next engineer should be able to see why something works. That is the engineering I try to do, and what I try to help my teammates do.",
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
				"I lead full-stack work on Kuno's B2B learning platform, connecting what people see to the services, data, and releases behind it.",
			highlights: [
				"Build across React and TanStack interfaces, Elysia services on Bun, and PostgreSQL data.",
				"Work on permissions, trust between services, and privacy rules in the API and the database.",
				"Help shape how we ship: Terraform deployment identity, CI checks, rollback safeguards, and release tools.",
				"Grow our automated tests: Bun unit suites, API contract checks, route probes, and Playwright flows.",
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
				"I moved from mobile into the whole product: learning workflows, services, data models, and company sign-in.",
			highlights: [
				"Worked on onboarding, diagnostic pathways, competency frameworks, and peer matching across the UI, API, and database.",
				"Implemented company sign-in, account linking, and role-based access for organizations that share one platform.",
				"Delivered English and French across the apps, server-generated documents, and error messages.",
			],
			technologies: ["TypeScript", "Elysia", "Bun", "Drizzle", "PostgreSQL", "Redis"],
		},
		{
			id: "kuno-mobile",
			company: "Kuno",
			role: "Mobile Application Developer",
			period: "Dec 2023 — Jan 2025",
			summary:
				"I built React Native and Expo features and kept the mobile app in step with Kuno's services.",
			highlights: [
				"Built mobile workflows that keep sessions consistent on iOS and Android.",
				"Worked with EAS builds, over-the-air update channels, and app store releases.",
			],
			technologies: ["React Native", "Expo", "TypeScript"],
		},
		{
			id: "tilleli",
			company: "Tilleli",
			role: "React Native Developer",
			period: "2021 — Jan 2024",
			summary:
				"I joined as an intern in 2021 and stayed for nearly three years of React Native product work.",
			highlights: [
				"Connected the app to Firebase: sign-in, Firestore, Cloud Functions, Storage, and analytics.",
				"Added Stripe and RevenueCat payments, Algolia search, Google Maps and Places, and real-time messaging.",
				"Ran EAS builds, beta channels, and releases to the App Store and Google Play.",
			],
			technologies: ["React Native", "Expo", "Firebase", "TypeScript", "Stripe", "Algolia"],
		},
		{
			id: "bugfixers",
			company: "Bugfixers",
			role: "Frontend Developer",
			period: "Jul 2021 — Sep 2021",
			summary:
				"A short role building web apps and admin dashboards from Figma designs with React and REST APIs.",
			highlights: [
				"Built the Future Track Learning platform and its admin portal, including analytics charts.",
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
				"A learning platform that helps people grow at work through guided learning and peer conversations.",
			description:
				"Kuno helps people grow at work with diagnostics, guided conversations, learning pathways, and progress feedback. I work on the product experience and on the services, data, and release paths behind it.",
			year: "2023 — now",
			role: "Lead Full Stack Engineer",
			status: "Current role",
			tags: ["TypeScript", "React", "TanStack", "Bun", "Elysia", "PostgreSQL", "AWS"],
			category: "product",
			highlights: [
				"Connected onboarding, learning pathways, matching, and company workflows across the UI, API, and database.",
				"Worked on role-based access, trust between services, and privacy-aware data handling.",
				"Supported English and French output, company sign-in, and account linking.",
				"Contributed to Terraform deployment identity, release coordination, rollback safeguards, and Playwright tests.",
			],
			href: "https://www.kuno-ai.com/",
			featured: true,
		},
		{
			id: "expo-in-app-updates",
			title: "expo-in-app-updates",
			slug: "expo-in-app-updates",
			summary:
				"An open-source module that lets Expo apps prompt for updates on Android and iOS through one API.",
			description:
				"Android and iOS handle in-app updates in completely different ways. I designed one small TypeScript API over Google Play Core, the iTunes Search API, and the App Store. I maintain the native modules, events, examples, and release tooling.",
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
				"Built the Android side on Google Play Core: availability, staleness, priority, and download events.",
				"Built the iOS side on iTunes Search API lookups and an App Store redirect.",
				"Keep it working with new Expo SDKs and the New Architecture, with examples to copy.",
			],
			href: "https://www.npmjs.com/package/expo-in-app-updates",
			repository: "https://github.com/SohelIslamImran/expo-in-app-updates",
			featured: true,
		},
		{
			id: "tilleli",
			title: "Tilleli",
			slug: "tilleli",
			summary: "An events app that helps people find events, buy tickets, and connect with others.",
			description:
				"Tilleli put event discovery, local search, tickets, payments, and social features into one React Native and Expo app. I joined in 2021 and worked on Firebase integrations, third-party services, and app store releases.",
			year: "2021 — Jan 2024",
			role: "React Native Developer",
			status: "Shipped to production",
			tags: ["React Native", "Expo", "Firebase", "Stripe", "Algolia"],
			category: "product",
			highlights: [
				"Connected the app to Firebase Auth, Firestore, Cloud Functions, Storage, and analytics.",
				"Added Stripe and RevenueCat payment flows, Algolia search, Google Maps and Places, and real-time messaging.",
				"Ran EAS build automation, beta channels, and releases to Google Play and the App Store.",
			],
			featured: true,
		},
		{
			id: "portfolio",
			title: "sohelislamimran.com",
			slug: "portfolio",
			summary:
				"This site: a fast portfolio with a private editor where I draft and publish updates.",
			description:
				"I rebuilt this site with TanStack Start and server rendering on Cloudflare Workers. Content is typed and saved as revisions in D1. Visitors only ever read the published version, and drafts stay behind an owner-only editor.",
			year: "2026",
			role: "Creator and maintainer",
			status: "Live",
			tags: ["TanStack Start", "Cloudflare Workers", "D1", "React 19"],
			category: "open-source",
			highlights: [
				"Kept public reads separate from draft and publish actions, with revisioned content in D1.",
				"Protected the editor with Cloudflare Access token checks, an owner allowlist, origin checks, and CSRF tokens.",
				"Added reduced-motion support, a print-ready résumé, RSS, and a sitemap.",
			],
			href: "https://sohelislamimran.com",
			repository: "https://github.com/SohelIslamImran/SohelIslamImran",
		},
		{
			id: "ghosttime",
			title: "ghosttime",
			slug: "ghosttime",
			summary:
				"A command-line tool for people who want the Ghostty startup animation in their terminal.",
			description:
				"I recreated the Ghostty startup animation as a Node and Bun command-line tool. It needs no extra packages. Users can change the colors and timing, and it pauses when the terminal loses focus.",
			year: "2025 — now",
			role: "Creator and maintainer",
			status: "Maintained",
			tags: ["TypeScript", "CLI", "npm"],
			category: "experiment",
			metrics: [{ value: "87", label: "GitHub stars · Oct 27, 2026" }],
			highlights: [
				"Render terminal animation frames with low CPU use.",
				"Pause the animation when the terminal loses focus and resume when it returns.",
			],
			href: "https://www.npmjs.com/package/ghosttime",
			repository: "https://github.com/SohelIslamImran/ghosttime",
		},
		{
			id: "tailsync",
			title: "TailSync",
			slug: "tailsync",
			summary:
				"An experimental iPhone app for people who want to send files to their devices through Tailscale.",
			description:
				"Sending files to several devices needs careful tracking. I built a Swift app around Taildrop that checks each destination and retries failed sends. It only deletes an original after every enabled destination confirms delivery.",
			year: "2026",
			role: "Creator",
			status: "Experimental",
			tags: ["Swift", "iOS", "Tailscale", "PhotoKit"],
			category: "experiment",
			highlights: [
				"Send files directly between devices through Tailscale’s local PeerAPI.",
				"Check destinations and avoid sending the same file twice.",
			],
			repository: "https://github.com/SohelIslamImran/TailSync",
		},
		{
			id: "android-mac-display",
			title: "Android Mac Display",
			slug: "android-mac-display",
			summary:
				"A prototype for people who want to view a Mac screen on an Android device over USB.",
			description:
				"I explored sending a Mac screen to Android over USB, without a network or account. The Mac app captures video and the Android app plays it back. I built this prototype with an AI agent to explore what that approach could do.",
			year: "2025 — 2026",
			role: "Creator",
			status: "Prototype",
			tags: ["Swift", "Kotlin", "ScreenCaptureKit", "ADB"],
			category: "experiment",
			highlights: [
				"Capture the Mac screen with ScreenCaptureKit and stream H.264 video over USB.",
				"Set up ADB port forwarding automatically without an external network.",
			],
			repository: "https://github.com/SohelIslamImran/AndroidMacDisplay",
		},
		{
			id: "expo-import-cost",
			title: "expo-import-cost",
			slug: "expo-import-cost",
			summary:
				"An experimental VS Code tool that helps Expo developers see how much each import adds to their app.",
			description:
				"Package size does not tell you how much an import adds to an app. I built a VS Code extension that reads Expo Atlas build output and shows the cost beside each import. It is still unstable and remains an experiment.",
			year: "2024",
			role: "Creator",
			status: "Experimental",
			tags: ["VS Code", "Expo Atlas", "TypeScript"],
			category: "experiment",
			highlights: ["Measure each import from Expo Atlas build output."],
			repository: "https://github.com/SohelIslamImran/expo-import-cost",
		},
	],
	capabilities: [
		{
			id: "product",
			title: "Features from interface to server",
			description:
				"I build the interface, the service behind it, and the data it needs. I keep those parts working together.",
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
			title: "Mobile apps and native tools",
			description:
				"I build apps with React Native and Expo. When a feature needs direct access to Android or iOS, I use Kotlin or Swift.",
			tools: ["React Native", "Expo", "EAS", "Kotlin", "Swift", "Android Play Core", "Firebase"],
		},
		{
			id: "access",
			title: "Access rules that hold up",
			description:
				"I work on sign-in, permissions, and rules that keep each organization’s data separate.",
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
			title: "Getting changes into production",
			description:
				"I help teams release changes with AWS, Terraform, automated checks, and a clear way to roll back.",
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
				"How I learned to code, joined my first product team, and grew from mobile apps into full-stack work.",
			publishedAt: "2025-06-22",
			readingTime: "6 min",
			href: "/story",
			tags: ["Career", "Engineering"],
		},
	],
	contact: {
		title: "Let's talk about the problem.",
		intro:
			"Tell me what you are building and where you are stuck. I enjoy full-stack product work, developer tools, and work that continues after launch.",
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
			description: "My open-source packages, native modules, and current code.",
			kind: "work",
			featured: true,
		},
		{
			id: "linkedin",
			platform: "LinkedIn",
			label: "Sohel Islam Imran",
			href: "https://www.linkedin.com/in/sohelislamimran/",
			handle: "sohelislamimran",
			description: "My career history and recommendations.",
			kind: "social",
			featured: true,
		},
		{
			id: "portfolio",
			platform: "Portfolio",
			label: "sohelislamimran.com",
			href: "https://sohelislamimran.com/",
			handle: "sohelislamimran.com",
			description: "My work, résumé, and story in one place.",
			kind: "work",
			featured: true,
		},
		{
			id: "email",
			platform: "Email",
			label: "sohelislamimran@gmail.com",
			href: "mailto:sohelislamimran@gmail.com",
			description: "The fastest way to reach me about work or an idea.",
			kind: "contact",
			featured: true,
		},
		{
			id: "npm",
			platform: "npm",
			label: "sohelislamimran",
			href: "https://www.npmjs.com/~sohelislamimran",
			handle: "sohelislamimran",
			description: "Packages I publish, including expo-in-app-updates and ghosttime.",
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
			description: "My early writing on JavaScript, React, and interview questions.",
			kind: "work",
		},
		{
			id: "youtube",
			platform: "YouTube",
			label: "SohelIslamImran",
			href: "https://www.youtube.com/@SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Developer videos and experiments.",
			kind: "work",
		},
		{
			id: "instagram",
			platform: "Instagram",
			label: "_sohelislamimran",
			href: "https://www.instagram.com/_sohelislamimran/",
			handle: "_sohelislamimran",
			description: "Photos and personal updates.",
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
			description: "Short notes on engineering and technology.",
			kind: "social",
		},
		{
			id: "bluesky",
			platform: "Bluesky",
			label: "sohelislamimran.bsky.social",
			href: "https://bsky.app/profile/did:plc:34gks7jyxdfe6x7u4dbicncg",
			handle: "sohelislamimran.bsky.social",
			description: "The same short notes, on Bluesky.",
			kind: "social",
		},
		{
			id: "facebook",
			platform: "Facebook",
			label: "Sohel Islam Imran",
			href: "https://www.facebook.com/SohelIslamImran",
			handle: "SohelIslamImran",
			description: "Personal updates and milestones.",
			kind: "social",
		},
		{
			id: "career-story",
			platform: "Story",
			label: "From First Computer to Lead Engineer",
			href: "/story",
			description: "How I went from learning on a phone to leading full-stack work.",
			kind: "story",
		},
		{
			id: "field-notes",
			platform: "Field notes",
			label: "Field notes",
			href: "/field-notes",
			description:
				"Nothing published yet. Notes will appear here when I have something real to share.",
			kind: "story",
		},
	],
	resume: {
		label: "Résumé",
		href: "/resume",
		updatedAt: "2026-10-27",
		summary:
			"I am a Lead Full Stack Engineer at Kuno. I build product features through every layer: interfaces, services, data, permissions, and releases.",
	},
	story: {
		eyebrow: "My story",
		title: "From first computer to lead engineer.",
		intro:
			"I started learning web development in late 2020, first on a phone, then on my family's first computer. One course and a habit of rebuilding every example led to an internship. The internship led to product work across mobile, backend, and infrastructure.",
		quote:
			"I watched each lesson twice: once to understand it, then again with the inputs changed until I could explain why it worked.",
		chapters: [
			{
				id: "00",
				eyebrow: "2020 · Foundations",
				title: "Starting with a phone.",
				paragraphs: [
					"I finished my SSC exams in Dhaka in 2020. We did not own a computer, so I started reading about web development on a phone.",
					"My first goal was practical. Build small things, understand why they work, and find out whether software was worth committing to.",
				],
				artifact: "It started with a phone, a question, and a little free time.",
			},
			{
				id: "01",
				eyebrow: "November–December 2020",
				title: "Choosing a direction.",
				paragraphs: [
					"In November 2020 my family bought our first computer. I chose web development because it was the most direct way to turn an idea into something people could use.",
					"That December I enrolled in Programming Hero's course and settled into a rhythm: watch, rebuild, change the inputs, look for what breaks.",
				],
				artifact: "My learning loop: understand, rebuild, test, explain.",
			},
			{
				id: "02",
				eyebrow: "The learning method",
				title: "Learning by changing the inputs.",
				paragraphs: [
					"I had never programmed before. So I rebuilt each lesson with different data, different requirements, and odd edge cases until I understood why it behaved the way it did.",
					"Answering questions in the course communities taught me to read unfamiliar code, trace an error, and explain a fix in plain language. Those conversations also led to my first professional opportunity.",
				],
				artifact: "Repetition only helped once I changed the examples.",
			},
			{
				id: "03",
				eyebrow: "2021–Jan 2024 · Tilleli",
				title: "A small team, a real codebase.",
				paragraphs: [
					"In 2021 a referral from that community led to an unpaid React Native internship at Tilleli, a US events startup. For the first time I was inside a real codebase and a real product conversation.",
					"I also took a short role at Bugfixers from July to September 2021 while Tilleli continued. At Tilleli my work grew from screens to Firebase services, integrations, and app store releases, and I stayed responsible for the mobile app through January 2024.",
				],
				artifact: "Ownership came from careful work, repeated.",
			},
			{
				id: "04",
				eyebrow: "Late 2023–present · Kuno",
				title: "Following the change through the system.",
				paragraphs: [
					"I joined Kuno in late 2023 as a mobile application developer. In January 2025 my role became full-stack: B2B learning workflows, Bun and Elysia services, PostgreSQL and Drizzle data, authorization, localization, and cloud delivery.",
					"I became Lead Full Stack Engineer in March 2026. Today my work covers product architecture, security boundaries, testing, deployment identity, and release coordination.",
				],
				artifact:
					"A user action, a server rule, a data change, a test, and a safe path to production all belong together.",
			},
			{
				id: "05",
				eyebrow: "Now · Current practice",
				title: "Keeping the work useful after launch.",
				paragraphs: [
					"I care about software that stays understandable and dependable after it ships. Outside Kuno I maintain expo-in-app-updates and a few smaller tools, because they keep me close to the people who use them.",
					"I live in Dhaka and work remotely. The thread through all of it is responsibility: understand the system, make the trade-offs visible, and leave the code easier to work with.",
				],
				artifact: "Useful software is software someone keeps caring for.",
			},
		],
		sourceLabel: "Read the original Bengali career feature",
		sourceHref:
			"https://www.facebook.com/programmingherowebcourse/posts/pfbid0FGsuPS945caW115AtzREJit1LsACiDs6gtYPv2XtoyysCYL5Pz3pbWRPsHeMNd8Gl",
	},
	travel: {
		eyebrow: "Field notes",
		title: "A place for notes along the way.",
		intro:
			"I have not published any field notes yet. You can explore my work or read my story while this page waits for its first entry.",
		origin: "Dhaka, Bangladesh",
		entries: [],
	},
	media: [],
};
