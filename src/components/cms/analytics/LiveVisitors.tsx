/**
 * Live visitor count shared by the CMS. The provider polls every 15 seconds
 * only while at least one consumer (the rail's Live now, for example) is
 * mounted and the tab is visible, so pages that don't show live data cost
 * nothing.
 */
import { useServerFn } from "@tanstack/react-start";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { getLiveVisitors } from "../../../server/analytics.functions";
import type { LiveVisitors } from "../../../server/analytics.server";
import { isValidLiveVisitors } from "./live-visitors-guard";

const POLL_MS = 15_000;

interface LiveState {
	data: { live: LiveVisitors } | null;
	paused: boolean;
	setPaused: (paused: boolean) => void;
	failed: boolean;
}

interface LiveContextValue extends LiveState {
	/** Registers a consumer; returns its unsubscribe. */
	subscribe: () => () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveVisitorsProvider({ children }: { children: ReactNode }) {
	const query = useServerFn(getLiveVisitors);
	const [paused, setPaused] = useState(false);
	const [data, setData] = useState<LiveState["data"]>(null);
	const [failed, setFailed] = useState(false);
	const [subscribers, setSubscribers] = useState(0);
	const pending = useRef<Promise<unknown> | null>(null);

	const subscribe = useCallback(() => {
		setSubscribers((count) => count + 1);
		return () => setSubscribers((count) => count - 1);
	}, []);

	const active = subscribers > 0 && !paused;

	useEffect(() => {
		if (!active) return;
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
				if (!stopped) {
					setFailed(false);
					setData({ live: raw });
				}
			} catch {
				if (!stopped) setFailed(true);
			} finally {
				polling = false;
				if (!stopped && document.visibilityState === "visible") {
					timer = window.setTimeout(poll, POLL_MS);
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
	}, [active, query]);

	return (
		<LiveContext.Provider value={{ data, paused, setPaused, failed, subscribe }}>
			{children}
		</LiveContext.Provider>
	);
}

/** Live visitor state; mounting a consumer starts polling, unmounting the last one stops it. */
export function useLiveVisitors(): LiveState {
	const live = useContext(LiveContext);
	if (!live) throw new Error("Live visitors must be rendered within the CMS workspace");
	const { subscribe } = live;
	useEffect(() => subscribe(), [subscribe]);
	return live;
}
