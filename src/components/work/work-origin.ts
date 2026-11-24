import { workGroups, type WorkGroup } from "./project-utils";

declare module "@tanstack/react-router" {
	interface HistoryState {
		workGroup?: WorkGroup;
	}
}

export function readWorkOrigin(state: unknown): WorkGroup {
	if (!state || typeof state !== "object" || !("workGroup" in state)) return "all";
	return workGroups.find((group) => group === state.workGroup) ?? "all";
}
