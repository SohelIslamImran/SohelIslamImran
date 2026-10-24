import { z } from "zod";

export const linksSearchSchema = z.object({
	kind: z.enum(["all", "social", "contact", "work", "story", "other"]).catch("all"),
});

export type LinksSearch = z.infer<typeof linksSearchSchema>;
