import { z } from "zod";

export const workSearchSchema = z.object({
	focus: z.enum(["identity", "matching", "delivery"]).catch("identity"),
});

export const linksSearchSchema = z.object({
	kind: z.enum(["all", "social", "contact", "work", "story", "other"]).catch("all"),
});

export type WorkSearch = z.infer<typeof workSearchSchema>;
export type LinksSearch = z.infer<typeof linksSearchSchema>;
