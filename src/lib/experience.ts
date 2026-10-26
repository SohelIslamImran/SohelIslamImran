import type { ExperienceContent } from "../types/content";

export interface CompanyGroup {
	company: string;
	period: string;
	current: boolean;
	roles: ExperienceContent[];
}

const RANGE_SEPARATOR = /\s*[—–]\s*/;

function periodBounds(period: string): [string, string] {
	const parts = period.split(RANGE_SEPARATOR);
	return parts.length < 2 ? [period, period] : [parts[0], parts[parts.length - 1]];
}

/**
 * Collapses consecutive roles at the same employer into one entry so a
 * promotion reads as progression instead of three separate jobs.
 */
export function groupExperienceByCompany(experience: ExperienceContent[]): CompanyGroup[] {
	const groups: CompanyGroup[] = [];
	for (const item of experience) {
		const previous = groups.at(-1);
		if (previous && previous.company.toLowerCase() === item.company.toLowerCase()) {
			previous.roles.push(item);
			previous.current ||= item.current === true;
			previous.period = `${periodBounds(item.period)[0]} — ${periodBounds(previous.roles[0].period)[1]}`;
			continue;
		}
		groups.push({
			company: item.company,
			period: item.period,
			current: item.current === true,
			roles: [item],
		});
	}
	return groups;
}
