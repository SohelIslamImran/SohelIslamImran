import { useServerFn } from "@tanstack/react-start";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getLiveVisitors } from "../../../server/analytics.functions";
import type { LiveVisitors } from "../../../server/analytics.server";
import { isValidLiveVisitors } from "./live-visitors-guard";

interface LiveState {
	data: { live: LiveVisitors; samples: number[] } | null;
	paused: boolean;
	setPaused: (paused: boolean) => void;
	failed: boolean;
}

const LiveContext = createContext<LiveState | null>(null);

export function LiveVisitorsProvider({ children }: { children: ReactNode }) {
	const query = useServerFn(getLiveVisitors);
	const [paused, setPaused] = useState(false);
	const [data, setData] = useState<LiveState["data"]>(null);
	const [failed, setFailed] = useState(false);
	const pending = useRef<Promise<unknown> | null>(null);

	useEffect(() => {
		if (paused) return;
		let stopped = false;
		let polling = false;
		let timer: number | undefined;
		async function poll() {
			if (polling || document.visibilityState !== "visible") return;
			polling = true;
			try {
				pending.current ??= query().finally(() => {
					pending.current = null;
				});
				const raw = await pending.current;
				if (!isValidLiveVisitors(raw)) {
					if (!stopped) setFailed(true);
					return;
				}
				const live = raw;
				if (!stopped) {
					setFailed(false);
					setData((previous) => ({
						live,
						samples: [...(previous?.samples ?? []).slice(-11), live.count],
					}));
				}
			} catch {
				if (!stopped) setFailed(true);
			} finally {
				polling = false;
				if (!stopped && document.visibilityState === "visible") {
					timer = window.setTimeout(poll, 15_000);
				}
			}
		}

		function onVisibility() {
			window.clearTimeout(timer);
			void poll();
		}

		document.addEventListener("visibilitychange", onVisibility);
		void poll();
		return () => {
			stopped = true;
			window.clearTimeout(timer);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [paused, query]);

	return (
		<LiveContext.Provider value={{ data, paused, setPaused, failed }}>
			{children}
		</LiveContext.Provider>
	);
}

export function useLiveVisitors() {
	const live = useContext(LiveContext);
	if (!live) throw new Error("Live visitors must be rendered within the CMS workspace");
	return live;
}
