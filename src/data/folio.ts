export const site = {
  title: "Sohel Islam Imran — Folio",
  description:
    "Lead Full Stack Engineer at Kuno. Dhaka-based. TypeScript, React, React Native, Elysia, Bun.",
  url: "https://sohelislamimran.com",
  email: "sohelislamimran@gmail.com",
} as const;

export const ownerEmails = ["sohelislamimran@gmail.com"] as const;

export const profile = {
  name: "Sohel Islam Imran",
  first: "Sohel",
  last: "Imran",
  title: "Lead Full Stack Engineer",
  company: "Kuno",
  companyUrl: "https://www.kuno-ai.com",
  city: "Dhaka",
  country: "Bangladesh",
  coords: "23.8°N 90.4°E",
  timezone: "Asia/Dhaka",
  email: "sohelislamimran@gmail.com",
  portrait: "/portrait.png",
  lede: "I build systems that make complexity feel clear.",
  intro:
    "Product architecture, dependable delivery, and small tools with long reach — built from Dhaka for teams working everywhere.",
  quote:
    "The useful part of this story is not that the beginning was difficult. It is that consistency kept changing what was possible.",
  availability: "Open to thoughtful collaborations",
} as const;

export const metrics = [
  { value: "86", label: "public repositories" },
  { value: "294", label: "stars on expo-in-app-updates" },
  { value: "40.7k", label: "weekly package downloads" },
  { value: "280k", label: "people reached on Stack Overflow" },
] as const;

export const nav = [
  { to: "/", label: "Home" },
  { to: "/work", label: "Work" },
  { to: "/story", label: "Story" },
  { to: "/field-notes", label: "Notes" },
  { to: "/resume", label: "Résumé" },
  { to: "/links", label: "Links" },
] as const;

export type Role = {
  id: string;
  org: string;
  orgUrl?: string;
  title: string;
  dates: string;
  current?: boolean;
  summary: string;
  points: string[];
  stack: string[];
};

export const roles: Role[] = [
  {
    id: "kuno-lead",
    org: "Kuno",
    orgUrl: "https://www.kuno-ai.com",
    title: "Lead Full Stack Engineer",
    dates: "Mar 2026 — present",
    current: true,
    summary:
      "Lead architecture and delivery across Kuno’s enterprise professional-development product, internal tooling, and platform operations.",
    points: [
      "Shape secure, role-aware product systems across onboarding, matching, localized experiences, and service boundaries.",
      "Connect application, CLI, infrastructure, CI/CD, observability, and release operations into a dependable delivery model.",
    ],
    stack: ["TypeScript", "React", "TanStack", "ElysiaJS", "Bun", "PostgreSQL", "Redis"],
  },
  {
    id: "kuno-fs",
    org: "Kuno",
    orgUrl: "https://www.kuno-ai.com",
    title: "Full Stack Engineer",
    dates: "Jan 2025 — Mar 2026",
    summary:
      "Built full-stack product capabilities across services, data systems, enterprise identity, and TanStack interfaces.",
    points: ["Delivered secure onboarding, matching, AI-assisted content, and localized product workflows."],
    stack: ["TypeScript", "ElysiaJS", "Bun", "Drizzle", "PostgreSQL"],
  },
  {
    id: "kuno-mobile",
    org: "Kuno",
    orgUrl: "https://www.kuno-ai.com",
    title: "Mobile Application Developer",
    dates: "Dec 2023 — Jan 2025",
    summary: "Developed mobile learning experiences and carried shared product behavior across native and web surfaces.",
    points: ["Built React Native and Expo product capabilities with attention to platform behavior and release quality."],
    stack: ["React Native", "Expo", "TypeScript"],
  },
  {
    id: "tilleli",
    org: "Tilleli",
    orgUrl: "https://www.tilleli.com",
    title: "React Native Developer",
    dates: "Jun 2021 — Jan 2024",
    summary:
      "First professional doorway: a US startup, a real codebase, and the years that taught mobile product and release engineering.",
    points: ["Shipped React Native experiences, UI implementation, and Firebase-backed product flows."],
    stack: ["React Native", "Expo", "TypeScript", "Firebase"],
  },
  {
    id: "bugfixers",
    org: "Bugfixers",
    title: "Frontend Developer",
    dates: "Jul 2021 — Sep 2021",
    summary: "Converted design into a production educational product — Future Track Learning.",
    points: ["Student dashboards, quizzes, courses; teacher and admin CRUD on the same surface."],
    stack: ["JavaScript", "React", "CSS"],
  },
];

export type Project = {
  id: string;
  title: string;
  summary: string;
  year: string;
  status: string;
  tags: string[];
  href?: string;
  repository?: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    id: "kuno-platform",
    title: "Enterprise learning platform",
    summary: "Turning layered learning operations into one coherent, secure product.",
    year: "2023—now",
    status: "Current · details generalized",
    tags: ["Product systems", "Identity", "TypeScript"],
    featured: true,
  },
  {
    id: "expo-in-app-updates",
    title: "expo-in-app-updates",
    summary: "Native app-update behavior behind one compact Expo-shaped API.",
    year: "2024—now",
    status: "Maintained",
    tags: ["Expo", "React Native", "Kotlin", "Swift"],
    href: "https://www.npmjs.com/package/expo-in-app-updates",
    repository: "https://github.com/SohelIslamImran/expo-in-app-updates",
    featured: true,
  },
  {
    id: "ghosttime",
    title: "ghosttime",
    summary: "A customizable Ghostty-style animation for any terminal.",
    year: "2025—now",
    status: "Maintained",
    tags: ["TypeScript", "CLI", "npm"],
    href: "https://www.npmjs.com/package/ghosttime",
    repository: "https://github.com/SohelIslamImran/ghosttime",
    featured: true,
  },
  {
    id: "tailsync",
    title: "TailSync",
    summary: "Native iOS app for syncing photos, videos, and files to personal Tailscale Taildrop devices.",
    year: "2026",
    status: "Experimental",
    tags: ["Swift", "iOS", "PhotoKit", "Tailscale"],
    repository: "https://github.com/SohelIslamImran/TailSync",
  },
  {
    id: "android-mac-display",
    title: "Android Mac Display",
    summary: "A wired USB path for using an Android phone as a secondary Mac display.",
    year: "2025",
    status: "Prototype",
    tags: ["Swift", "macOS", "Android", "ADB"],
    repository: "https://github.com/SohelIslamImran/AndroidMacDisplay",
  },
];

export const capabilities = [
  {
    id: "product",
    title: "Product systems",
    description: "Domain modeling, secure flows, APIs, data behavior, and clear user outcomes.",
    tools: ["TypeScript", "React", "TanStack", "ElysiaJS", "Bun"],
  },
  {
    id: "mobile",
    title: "Mobile infrastructure",
    description: "Cross-platform product work and native integrations that respect platform behavior.",
    tools: ["React Native", "Expo", "Kotlin", "Swift"],
  },
  {
    id: "delivery",
    title: "Delivery systems",
    description: "Release paths that remain visible, guarded, observable, and recoverable.",
    tools: ["CI/CD", "Containers", "Cloud", "OIDC", "Observability"],
  },
] as const;

export const systemDomains = [
  {
    id: "identity",
    index: "01",
    label: "Identity",
    title: "Make the right context visible.",
    description:
      "Kuno is a role-aware professional-development product. I work on the rules that decide which context a person can see and what they can do next.",
    signal: "Onboarding · roles · authorization",
  },
  {
    id: "matching",
    index: "02",
    label: "Matching",
    title: "Turn overlapping needs into a clear next step.",
    description:
      "Programs, pathways, and people intersect. I turn those overlaps into flows that teams can test and people can follow.",
    signal: "Cohorts · pathways · next steps",
  },
  {
    id: "delivery",
    index: "03",
    label: "Delivery",
    title: "Carry the idea all the way to a running system.",
    description:
      "Product work counts when it reaches a reliable release. I connect application code to checks, observability, and guarded environments.",
    signal: "CI/CD · CLI · environments",
  },
] as const;

export type Chapter = {
  id: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  artifact: string;
};

export const chapters: Chapter[] = [
  {
    id: "00",
    kicker: "Before the first line",
    title: "I did not grow up around computers.",
    paragraphs: [
      "I grew up in a financially constrained family in Bangladesh. When I finished SSC in 2020, software engineering was not an obvious destination. I had no computer, no coding background, and no conventional route into the field.",
      "The first door opened through a phone. I learned what freelancing was and began to see that the internet could be a place where I built a future.",
    ],
    artifact: "A phone, a question, and no map yet.",
  },
  {
    id: "01",
    kicker: "The first machine",
    title: "My family made a bet before there was evidence.",
    paragraphs: [
      "Buying a computer was not a casual purchase for us. My family used precious savings to make it possible.",
      "I joined Programming Hero’s six-month web-development course, practiced relentlessly, built projects, and helped other learners.",
    ],
    artifact: "Six months of practice — then the real learning began.",
  },
  {
    id: "02",
    kicker: "The first proof",
    title: "An unpaid internship was still a doorway.",
    paragraphs: [
      "Roughly six months after the course, I earned an internship with Tilleli, a US-based company. It gave me a real codebase, real expectations, and responsibility to make my work useful to others.",
      "The years that followed were not a clean staircase. Progress looked less like a breakthrough and more like returning to the work every day.",
    ],
    artifact: "The first professional commit mattered more than the title.",
  },
  {
    id: "03",
    kicker: "The work expands",
    title: "From interfaces to whole systems.",
    paragraphs: [
      "React Native taught me how decisions cross JavaScript and native boundaries. Open source taught me to design for people I would never meet. Full-stack work taught me to follow an outcome through data, services, infrastructure, and release operations.",
      "At Kuno, that scope kept expanding. I now lead full-stack work across product architecture, secure enterprise flows, and delivery systems.",
    ],
    artifact: "The stack changed. The habit of following the whole problem did not.",
  },
  {
    id: "04",
    kicker: "Still in motion",
    title: "The destination is a larger field of view.",
    paragraphs: [
      "I want to keep building products with operational depth, maintain useful tools, mentor engineers, and work remotely while seeing more of the world.",
      "I started with no map. Now I build them — for products, teams, and the journeys I want to remember.",
    ],
    artifact: "Dhaka is the origin point, not the edge of the world.",
  },
];

export type ProfileLink = {
  id: string;
  platform: string;
  label: string;
  href: string;
  handle?: string;
  description: string;
  kind: "social" | "work" | "story" | "contact";
  featured?: boolean;
};

export const profileLinks: ProfileLink[] = [
  {
    id: "email",
    platform: "Email",
    label: "sohelislamimran@gmail.com",
    href: "mailto:sohelislamimran@gmail.com",
    description: "For thoughtful collaborations and good problems.",
    kind: "contact",
    featured: true,
  },
  {
    id: "github",
    platform: "GitHub",
    label: "SohelIslamImran",
    href: "https://github.com/SohelIslamImran",
    handle: "SohelIslamImran",
    description: "Open-source packages, experiments, and current builds.",
    kind: "social",
    featured: true,
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    label: "Sohel Islam Imran",
    href: "https://www.linkedin.com/in/sohelislamimran/",
    handle: "sohelislamimran",
    description: "Experience, notes, and the work behind the work.",
    kind: "social",
    featured: true,
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
    id: "instagram",
    platform: "Instagram",
    label: "@_sohelislamimran",
    href: "https://www.instagram.com/_sohelislamimran/",
    handle: "_sohelislamimran",
    description: "Travel, frames, and the parts of the work that look like a life.",
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
    id: "facebook",
    platform: "Facebook",
    label: "Sohel Islam Imran",
    href: "https://www.facebook.com/SohelIslamImran",
    handle: "SohelIslamImran",
    description: "Personal updates, milestones, and public posts.",
    kind: "social",
  },
  {
    id: "stack-overflow",
    platform: "Stack Overflow",
    label: "Sohel Islam Imran",
    href: "https://stackoverflow.com/users/17672428/sohel-islam-imran",
    description: "Questions, answers, and practical debugging history.",
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
];

export type FieldNote = {
  id: string;
  status: "origin" | "observed" | "queued";
  place: string;
  region: string;
  season: string;
  coords: string;
  title: string;
  summary: string;
  reflection: string;
  temp: number;
};

export const fieldNotes: FieldNote[] = [
  {
    id: "dhaka-origin",
    status: "origin",
    place: "Dhaka",
    region: "Bangladesh",
    season: "Every season",
    coords: "23.8103°N 90.4125°E",
    title: "The light I know by heart.",
    summary: "Origin. The desk, the river haze, the hour that always arrives first.",
    reflection:
      "I do not need a passport stamp to know this latitude. Work leaves from here. The world comes back as packets, calls, and morning light on a white wall.",
    temp: 0.82,
  },
  {
    id: "first-machine",
    status: "observed",
    place: "The first room",
    region: "Home",
    season: "2020",
    coords: "23.8°N",
    title: "A machine the family could not easily afford.",
    summary: "The computer arrived before the evidence. Practice filled the hours after.",
    reflection:
      "This is a place as much as a device. Six months of a course, then the real learning: returning to the same chair until the work started answering back.",
    temp: 0.7,
  },
  {
    id: "utc6-desk",
    status: "observed",
    place: "UTC+6",
    region: "Remote",
    season: "Ongoing",
    coords: "90.4°E",
    title: "The desk that faces other timezones.",
    summary: "France in the product, America in the first job, Dhaka in the clock.",
    reflection:
      "I travel through systems more than airports. A release in one country is still a morning here. That is not a substitute for going. It is the current shape of going.",
    temp: 0.55,
  },
  {
    id: "buriganga",
    status: "observed",
    place: "Buriganga",
    region: "Dhaka",
    season: "Monsoon",
    coords: "23.71°N 90.40°E",
    title: "A river that keeps rewriting the bank.",
    summary: "Local field note. Water, heat, a city that does not pose.",
    reflection:
      "If I am going to keep a journal of places, it has to start with the one that is not a destination. The river is not scenery. It is the city’s working edge.",
    temp: 0.6,
  },
  {
    id: "monsoon-roof",
    status: "observed",
    place: "The roof",
    region: "Dhaka",
    season: "Ashar",
    coords: "23.81°N",
    title: "Sky as a changing instrument.",
    summary: "Clouds stack. The city goes silver. Then the rain arrives all at once.",
    reflection:
      "I watch weather the way I watch deploys: something is gathering, then it is irreversible, then the air is clean. Not a metaphor I force. Just the same attention.",
    temp: 0.48,
  },
  {
    id: "first-journey",
    status: "queued",
    place: "Unnamed",
    region: "Ahead",
    season: "Queued",
    coords: "—",
    title: "The first journey I have not taken yet.",
    summary: "No invented pin. A plate held empty on purpose.",
    reflection:
      "I will not fill this with a country I have not stood in. When the first trip happens, this plate gets a name, a season, and one detail worth keeping.",
    temp: 0.22,
  },
  {
    id: "queued-horizon",
    status: "queued",
    place: "A larger field of view",
    region: "Ahead",
    season: "Queued",
    coords: "—",
    title: "Work remotely. See more of the world.",
    summary: "The destination named in the story: not a list, a direction.",
    reflection:
      "The useful version of travel, for me, is the same as the useful version of engineering: stay long enough to understand the edges. I want cities the way I want systems — with time, not trophies.",
    temp: 0.3,
  },
];

export const stack = [
  "TypeScript",
  "React",
  "React Native",
  "Expo",
  "TanStack",
  "ElysiaJS",
  "Bun",
  "PostgreSQL",
  "Redis",
  "Swift",
  "Kotlin",
];
