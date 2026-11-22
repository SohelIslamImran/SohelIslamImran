import type { DraftState, DraftStore } from "../draft/store";

export function draftActionAvailability(state: DraftState) {
	const busy = state.status === "saving" || state.status === "publishing";
	const ready = !state.conflict && !busy && !state.authExpired && state.issues.all.length === 0;
	return {
		canSave: ready && state.dirty,
		canPublish: ready && (state.dirty || state.ahead),
	};
}

export function saveDraftIfAvailable(store: DraftStore) {
	if (draftActionAvailability(store.getState()).canSave) void store.save();
}
