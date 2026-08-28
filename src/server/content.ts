import type { PortfolioContent, ProfileLinkContent } from "../../app/types/content";
import { getPublishedContent as getPublishedFromServer } from "./cms.functions";

/** Temporary public adapter. The Cloudflare/D1 server-function layer can replace this without changing routes. */
export async function getPublishedContent(): Promise<PortfolioContent> {
	return getPublishedFromServer();
}

export async function getPublicProfileLink(id: string): Promise<ProfileLinkContent | undefined> {
	const content = await getPublishedContent();
	return content.profileLinks.find((link) => link.id === id);
}
