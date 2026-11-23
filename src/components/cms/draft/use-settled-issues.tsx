import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ValidationIssue } from "../../../lib/validation";
import { useDraftStore } from "./context";
import { indexIssues, type IssueIndex } from "./paths";

export const ISSUE_IDLE_MS = 700;

const SettledIssuesContext = createContext<IssueIndex>(indexIssues([]));

function issueKey({ path, message }: ValidationIssue) {
	return `${path}\0${message}`;
}

/** One display index for the section, pipeline and rail. The store keeps validating live. */
export function SettledIssuesProvider({ children }: { children: ReactNode }) {
	const store = useDraftStore();
	const [issues, setIssues] = useState(() => store.getState().issues);

	useEffect(() => {
		let visible = store.getState().issues.all.map(issueKey);
		let editing: Element | null = null;
		let timer: ReturnType<typeof setTimeout>;

		function update() {
			const live = store.getState().issues;
			const known = new Set(visible);
			const next = editing ? live.all.filter((issue) => known.has(issueKey(issue))) : live.all;
			const keys = next.map(issueKey);
			if (keys.length === visible.length && keys.every((key, index) => key === visible[index])) {
				return;
			}
			visible = keys;
			setIssues(next === live.all ? live : indexIssues(next));
		}

		function settle() {
			clearTimeout(timer);
			editing = null;
			update();
		}

		function onInput(event: Event) {
			const input = event.target;
			if (!(input instanceof Element) || !input.matches("[data-settle-issues]")) return;
			if (editing && editing !== input) settle();
			editing = input;
			clearTimeout(timer);
			timer = setTimeout(settle, ISSUE_IDLE_MS);
		}

		function onFocusOut(event: FocusEvent) {
			if (event.target === editing) settle();
		}

		const unsubscribe = store.subscribe(update);
		// Capture before React's change handler updates the draft.
		document.addEventListener("input", onInput, true);
		document.addEventListener("focusout", onFocusOut, true);
		return () => {
			unsubscribe();
			clearTimeout(timer);
			document.removeEventListener("input", onInput, true);
			document.removeEventListener("focusout", onFocusOut, true);
		};
	}, [store]);

	return <SettledIssuesContext.Provider value={issues}>{children}</SettledIssuesContext.Provider>;
}

export function useSettledIssues() {
	return useContext(SettledIssuesContext);
}
