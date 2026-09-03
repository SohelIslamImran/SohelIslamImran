import type { PortfolioContent, ProfileLinkContent } from "../types/content";
import { getPublishedContent as getPublishedFromServer } from "./cms.functions";

/** Public content crosses the typed server-function boundary; draft content never does. */
export async function getPublishedContent(): Promise<PortfolioContent> {
	return getPublishedFromServer();
}

export async function getPublicProfileLink(id: string): Promise<ProfileLinkContent | undefined> {
	const content = await getPublishedContent();
	return content.profileLinks.find((link) => link.id === id);
}
