/**
 * The six layers a single request crosses, top to bottom. UI copy from the
 * copy deck's "Stack Trace" table; every tool appears in his profile.
 */
export interface StackLayer {
	id: string;
	name: string;
	sentence: string;
	tools: readonly string[];
}

export const STACK_LAYERS: readonly StackLayer[] = [
	{
		id: "interface",
		name: "Interface",
		sentence: "I build the screens people use and connect each one to the API behind it.",
		tools: ["React", "TanStack Router", "TanStack Query", "Tailwind CSS"],
	},
	{
		id: "api",
		name: "API",
		sentence: "I build typed APIs that validate each request and check who is allowed to make it.",
		tools: ["TypeScript", "Bun", "Elysia"],
	},
	{
		id: "data",
		name: "Data",
		sentence:
			"I design the PostgreSQL schema and write the migrations and queries a feature needs.",
		tools: ["PostgreSQL", "Drizzle ORM", "SQL", "Redis"],
	},
	{
		id: "access",
		name: "Access",
		sentence:
			"I build sign-in, single sign-on, and permissions so each person sees only their own data.",
		tools: ["Better Auth", "OIDC", "SSO", "RBAC"],
	},
	{
		id: "infrastructure",
		name: "Infrastructure",
		sentence: "I help define where services run and what each deployment is allowed to touch.",
		tools: ["AWS", "Terraform", "Docker"],
	},
	{
		id: "release",
		name: "Release",
		sentence:
			"I run automated checks before each release and help make sure a bad one can be rolled back.",
		tools: ["GitHub Actions", "Playwright", "Bun Test"],
	},
];
