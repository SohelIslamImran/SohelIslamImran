export interface RequestRun {
	status: "idle" | "running" | "paused" | "done";
	layer: number;
	/** A replay is available once a run has finished. */
	ran: boolean;
	key: number;
}

type RunEvent = { type: "send" | "toggle" | "finish" | "cancel" } | { type: "step"; last: number };

export const initialRun: RequestRun = { status: "idle", layer: 0, ran: false, key: 0 };

export function runReducer(state: RequestRun, event: RunEvent): RequestRun {
	switch (event.type) {
		case "send":
			return { ...state, status: "running", layer: 0, key: state.key + 1 };
		case "toggle":
			if (state.status === "running") return { ...state, status: "paused" };
			if (state.status === "paused") return { ...state, status: "running" };
			return state;
		case "step":
			if (state.status !== "running" || state.layer >= event.last) return state;
			return { ...state, layer: state.layer + 1 };
		case "finish":
			if (state.status !== "running") return state;
			return { ...state, status: "done", ran: true };
		case "cancel":
			if (state.status !== "running" && state.status !== "paused") return state;
			return { ...state, status: state.ran ? "done" : "idle" };
	}
}
