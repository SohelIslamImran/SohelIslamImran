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
			"I'm Sohel, a lead full-stack engineer. I build B2B products in TypeScript, from React and React Native interfaces to PostgreSQL schemas, single sign-on, role-based access, and CI/CD on AWS.",
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
		eyebrow: "Lead Full Stack Engineer",
		title: "I build every layer of a product, from interface to release.",
		intro:
			"I'm Sohel. Hand me a product feature and I'll take it from the first sketch to production: React and React Native interfaces, TypeScript APIs, PostgreSQL schemas and migrations, Redis caching, single sign-on, role-based access, and CI/CD on AWS.",
		actions: [
			{ label: "See my work", href: "/work" },
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
			"I wrote my first code in late 2020, on my family's first computer. Six months later I was working in a production React Native app. Since then I've kept going one layer deeper, from mobile screens at Tilleli to the APIs, databases, permissions, and releases behind Kuno.",
			"Most of my attention goes to where the layers meet. If the interface hides an action, the API should refuse it too. A schema change should ship as a migration that's safe to run. A release should be easy to roll back. The next engineer should be able to see why something works. I hold my own work to that, and I help my teammates do the same.",
		],
		facts: [{ value: "2020", label: "first line of code" }],
	},
	experience: [
		{
			id: "kuno-lead",
			company: "Kuno",
			role: "Lead Full Stack Engineer",
			period: "Mar 2026 — present",
			location: "Remote",
			summary:
				"I build features across the product and help shape its architecture, application security, testing, and release process.",
			highlights: [
				"Build learner, company, and admin workflows across React and TanStack interfaces, Elysia services on Bun, and PostgreSQL.",
				"Strengthen permission checks, service-to-service authentication, and personal-data protection in the API and the database.",
				"Contribute to how we ship: Terraform deployment identity, CI checks, rollback safeguards, and release tools.",
				"Expand automated test coverage with Bun unit suites, API contract checks, route probes, and Playwright flows.",
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
				"Worked on onboarding, learning pathways, competency data, and peer matching across the UI, API, and database.",
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
				"I started as an intern and became responsible for Tilleli's React Native events app.",
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
				"I spent three months turning Figma designs into a React web app backed by REST APIs.",
			highlights: [
				"Built the frontend and admin dashboard for Future Track Learning, including analytics charts.",
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
				"A B2B learning platform where people build workplace skills through guided peer conversations.",
			description:
				"Kuno helps companies, education providers, and communities run professional development through diagnostics, learning pathways, peer matching, and guided conversations. I joined on the mobile app in late 2023 and now lead full-stack work on the product, its sign-in and permissions, and its releases.",
			year: "2023 — present",
			role: "Mobile, then full-stack, now lead engineer",
			status: "Current role",
			tags: ["TypeScript", "React", "TanStack", "Bun", "Elysia", "PostgreSQL", "AWS"],
			category: "product",
			highlights: [
				"Connected onboarding, learning pathways, matching, and company workflows across the UI, API, and database.",
				"Strengthened role-based access, trust between services, and privacy-aware data handling.",
				"Implemented company sign-in and account linking, and added English and French support across the apps.",
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
				"Android has a built-in update flow through Google Play Core. iOS has none, so an app has to check its App Store version and send people to the store. I designed one small TypeScript API over both, and I maintain the Kotlin and Swift modules, events, examples, and release tooling.",
			year: "2024 — present",
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
			summary:
				"A social app for finding nearby events, buying tickets, and connecting with other attendees.",
			description:
				"Discovery, tickets, payments, maps, and chat all had to work in one React Native and Expo app, on both iOS and Android. I joined as an intern in 2021 and stayed nearly three years, by the end responsible for the mobile app and its store releases.",
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
				"I rebuilt this site with TanStack Start and server rendering on Cloudflare Workers. Visitors only ever read the published version, and drafts stay behind an owner-only editor.",
			year: "2026",
			role: "Creator and maintainer",
			status: "Live",
			tags: ["TanStack Start", "Cloudflare Workers", "D1", "React 19"],
			category: "open-source",
			highlights: [
				"Implemented typed content, D1 migrations, and draft and publish revisions.",
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
			summary: "Ghostty's startup animation, recreated as a command you run in your own terminal.",
			description:
				"It runs on Node and Bun with no dependencies. You can pick the colors and timing, and it pauses when the terminal loses focus, then resumes when you come back.",
			year: "2025 — present",
			role: "Creator and maintainer",
			status: "Maintained",
			tags: ["TypeScript", "CLI", "npm"],
			category: "experiment",
			metrics: [{ value: "87", label: "GitHub stars · Oct 27, 2026" }],
			highlights: [
				"Built an efficient frame renderer for the terminal animation.",
				"Paused the animation when the terminal loses focus, and resumed it when focus returns.",
			],
			href: "https://www.npmjs.com/package/ghosttime",
			repository: "https://github.com/SohelIslamImran/ghosttime",
		},
		{
			id: "tailsync",
			title: "TailSync",
			slug: "tailsync",
			summary:
				"A personal experiment that sends photos and files from an iPhone to my other devices over Tailscale.",
			description:
				"I built it for my own use, not as a product. It sends files through Taildrop, checks each destination, and retries failed sends. Automatic deletion is off by default. When it is on, an original is deleted only after every enabled destination confirms delivery.",
			year: "2026",
			role: "Creator",
			status: "Experimental",
			tags: ["Swift", "iOS", "Tailscale", "PhotoKit"],
			category: "experiment",
			highlights: [
				"Sent files directly between devices through Tailscale's local PeerAPI.",
				"Recorded delivery per device, so the same file is never sent twice.",
			],
			repository: "https://github.com/SohelIslamImran/TailSync",
		},
		{
			id: "android-mac-display",
			title: "Android Mac Display",
			slug: "android-mac-display",
			summary: "A prototype that mirrors a Mac screen to an Android phone over a USB cable.",
			description:
				"The Mac app captures the screen and encodes it as H.264, and the Android app decodes and plays it. The video travels over the USB cable, with no network in between. I built it with Antigravity, an AI coding agent, to see how far that approach could go.",
			year: "2025 — 2026",
			role: "Creator",
			status: "Prototype",
			tags: ["Swift", "Kotlin", "ScreenCaptureKit", "ADB"],
			category: "experiment",
			highlights: [
				"Captured the Mac screen with ScreenCaptureKit and streamed it as H.264 video over USB.",
				"Automated ADB port forwarding, so the stream needs no external network.",
			],
			repository: "https://github.com/SohelIslamImran/AndroidMacDisplay",
		},
		{
			id: "expo-import-cost",
			title: "expo-import-cost",
			slug: "expo-import-cost",
			summary:
				"A VS Code experiment that shows the size of each imported package and file, inline.",
			description:
				"A side experiment, not a finished tool. It reads the sizes from Expo Atlas output. It is unstable, and I never took it past this stage.",
			year: "2024",
			role: "Creator",
			status: "Experimental",
			tags: ["VS Code", "Expo Atlas", "TypeScript"],
			category: "experiment",
			highlights: ["Showed imported package and file sizes inline, from Expo Atlas output."],
			repository: "https://github.com/SohelIslamImran/expo-import-cost",
		},
	],
	capabilities: [
		{
			id: "product",
			title: "Full-stack product features",
			description:
				"I build the interfaces people use, on the web and on mobile, and the typed API behind them, and ship them as one change.",
			tools: ["TypeScript", "React", "TanStack Router/Query", "Tailwind CSS", "Bun", "Elysia"],
		},
		{
			id: "data",
			title: "Databases and migrations",
			description:
				"I design PostgreSQL schemas, write migrations and queries with Drizzle ORM and SQL, and work with Redis caching and background jobs.",
			tools: ["PostgreSQL", "SQL", "Drizzle", "Schema migrations", "Redis", "Background jobs"],
		},
		{
			id: "access",
			title: "Sign-in, permissions, and security",
			description:
				"I build sign-in and single sign-on, enforce who can do what, and keep each organization's data separate.",
			tools: [
				"Better Auth",
				"OIDC / SSO",
				"Role-based access (RBAC)",
				"Account linking",
				"Data isolation",
				"Webhook verification",
				"Service authentication",
				"Secret scanning",
			],
		},
		{
			id: "mobile",
			title: "Mobile apps, down to native code",
			description: "When a product needs an app, I build it with React Native and Expo.",
			tools: ["React Native", "Expo", "EAS", "Kotlin", "Swift", "Android Play Core", "Firebase"],
		},
		{
			id: "delivery",
			title: "Releases with a way back",
			description: "I help get each change from code review to production on AWS.",
			tools: ["Terraform", "AWS", "GitHub Actions", "Docker", "Playwright", "Bun Test", "EAS"],
		},
	],
	testimonials: [
		{
			id: "gary-zlobinskiy",
			quote: "The most creative and capable developer we had.",
			author: "Gary Zlobinskiy",
			role: "Client, Tilleli",
			date: "Nov 2022",
			href: "https://www.linkedin.com/in/sohelislamimran/details/recommendations/",
		},
	],
	credentials: [
		{
			id: "programming-hero",
			title: "Complete Web Development Course",
			issuer: "Programming Hero",
			issuedAt: "Apr 2021",
		},
		{
			id: "zero-to-mastery",
			title: "Complete React Native",
			issuer: "Zero To Mastery",
			issuedAt: "Jun 2021",
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
		title: "What are you building?",
		intro:
			"Tell me about it and where it's stuck. I enjoy full-stack product work, developer tools, and software that needs care long after launch.",
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
			description: "Source for expo-in-app-updates, ghosttime, and this site.",
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
			description: "Answers on React Native, Firebase, and Expo. 280k people reached · Sep 3, 2026",
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
			label: "From first computer to lead engineer",
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
			"At Kuno, a B2B learning platform, I went from mobile developer to lead full-stack engineer in just over two years. Before that I spent nearly three years as a React Native developer at Tilleli, a US events startup. I also created and maintain expo-in-app-updates, an open-source Expo module.",
	},
	story: {
		eyebrow: "My story",
		title: "From first computer to lead engineer.",
		intro:
			"I started learning web development on a phone in late 2020. Today I lead full-stack work at Kuno. This is what happened in between.",
		quote:
			"I watched each lesson twice: once to understand it, then again with the inputs changed until I could explain why it worked.",
		chapters: [
			{
				id: "00",
				eyebrow: "2020 · Foundations",
				title: "Starting with a phone.",
				paragraphs: [
					"I finished secondary school in Dhaka in 2020, after my SSC exams. We did not own a computer, so I started reading about web development on a phone.",
					"My first goal was practical. Build small things, understand why they work, and find out whether software was worth committing to.",
				],
				artifact: "I didn't wait for a computer to start.",
			},
			{
				id: "01",
				eyebrow: "Nov — Dec 2020",
				title: "Choosing a direction.",
				paragraphs: [
					"In November 2020 my family used its savings to buy our first computer. I chose web development because it was the most direct way to turn an idea into something people could use.",
					"That December I enrolled in Programming Hero's six-month web development course and settled into a routine.",
				],
				artifact: "That was when I decided software was worth committing to.",
			},
			{
				id: "02",
				eyebrow: "The learning method",
				title: "Learning by changing the inputs.",
				paragraphs: [
					"I had never programmed before. So I rebuilt each lesson with different data, different requirements, and odd edge cases until I understood why it behaved the way it did.",
					"Answering questions in the course communities taught me to read unfamiliar code, trace an error, and explain a fix in plain language.",
				],
				artifact: "Repetition only helped once I changed the examples.",
			},
			{
				id: "03",
				eyebrow: "2021 — Jan 2024 · Tilleli",
				title: "A small team, a real codebase.",
				paragraphs: [
					"In 2021 a referral from that community led to an unpaid React Native internship at Tilleli, a US events startup. For the first time I was working in a production app and taking part in product conversations.",
					"Because the internship was unpaid, I also took a short paid frontend role at Bugfixers from July to September 2021. At Tilleli my work grew from app screens to Firebase services, payment and search integrations, and app store releases. I stayed responsible for the mobile app until January 2024.",
				],
				artifact: "Ownership came from careful work, repeated.",
			},
			{
				id: "04",
				eyebrow: "Dec 2023 — present · Kuno",
				title: "Behind the screen.",
				paragraphs: [
					"I joined Kuno in late 2023 as a mobile application developer. In January 2025 my role became full-stack: B2B learning workflows, Bun and Elysia services, PostgreSQL and Drizzle data, authorization, localization, and cloud delivery.",
					"I became Lead Full Stack Engineer in March 2026. Today my work covers product architecture, application security, testing, deployment identity, and release coordination.",
				],
				artifact:
					"A user action, a permission check, a data change, a test, and a safe path to production all belong together.",
			},
			{
				id: "05",
				eyebrow: "Now · Current practice",
				title: "Keeping the work useful after launch.",
				paragraphs: [
					"I care about software that stays understandable and dependable after it ships. Outside Kuno I maintain expo-in-app-updates and ghosttime, because they keep me close to the people who use them.",
					"I live in Dhaka and work remotely. The thread through all of it is the habit I started with: change the inputs, watch what breaks, and find out why.",
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
			"No field notes yet. The first one goes up when I have something worth saying. Until then, start with my work or my story.",
		origin: "Dhaka, Bangladesh",
		entries: [],
	},
	media: [],
};
