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
		sentence: "I build the web interfaces people use, then connect them to real product behavior.",
		tools: ["React", "TanStack Router", "TanStack Query", "Tailwind CSS"],
	},
	{
		id: "api",
		name: "API",
		sentence: "I build services that turn a user action into a clear, checked response.",
		tools: ["TypeScript", "Bun", "Elysia"],
	},
	{
		id: "data",
		name: "Data",
		sentence: "I shape the data behind a feature and keep its rules close to the code.",
		tools: ["PostgreSQL", "Drizzle", "Redis"],
	},
	{
		id: "access",
		name: "Access",
		sentence: "I work on sign-in and permissions so people can reach the right data.",
		tools: ["Better Auth", "OIDC", "SSO"],
	},
	{
		id: "infrastructure",
		name: "Infrastructure",
		sentence: "I help define where services run and how deployments get access.",
		tools: ["AWS", "Terraform", "Docker"],
	},
	{
		id: "release",
		name: "Release",
		sentence: "I check changes before release and help keep a path back when something goes wrong.",
		tools: ["GitHub Actions", "Playwright", "Bun Test"],
	},
];
