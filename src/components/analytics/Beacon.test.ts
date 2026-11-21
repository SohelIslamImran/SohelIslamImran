import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Beacon } from "./Beacon";

type Location = { href: string; pathname: string };
const router = vi.hoisted(() => ({
	state: {
		location: { href: "/", pathname: "/" },
		matches: [
			{
				routeId: "/",
				loaderData: { profileLinks: [{ id: "email", href: "mailto:example@example.com" }] },
			},
		],
	},
	subscribe: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({ useRouter: () => router }));
vi.mock("react", () => ({
	useEffect: (effect: () => () => void) => {
		cleanup = effect();
	},
	useRef: (current: unknown) => ({ current }),
}));

const site = "https://public.example";
let page: EventTarget & { visibilityState: string; referrer: string };
const location = { origin: site, hostname: "public.example", href: site, search: "" };
const browser = Object.assign(new EventTarget(), {
	location,
	setInterval: (callback: () => void, delay: number) => setInterval(callback, delay),
	clearInterval: (timer: ReturnType<typeof setInterval>) => clearInterval(timer),
});
class Anchor {
	constructor(readonly href: string) {}
	getAttribute() {
		return this.href;
	}
	closest() {
		return this;
	}
}
const sent = vi.fn<(url: string, body: Blob) => boolean>();
let cleanup: (() => void) | undefined;
let onResolved: (event: { toLocation: Location }) => void;
function navigate(path: string) {
	const url = new URL(path, site);
	location.href = url.href;
	location.search = url.search;
	onResolved({ toLocation: { href: path, pathname: url.pathname } });
}
function visibility(state: string) {
	page.visibilityState = state;
	page.dispatchEvent(new Event("visibilitychange"));
}
async function sentEvents() {
	return Promise.all(sent.mock.calls.map(async ([, blob]) => JSON.parse(await blob.text())));
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
	sent.mockClear();
	page = Object.assign(new EventTarget(), { visibilityState: "visible", referrer: "" });
	Object.assign(location, { href: site, search: "" });
	const storage = new Map();
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => storage.get(key),
		setItem: (key: string, value: string) => storage.set(key, value),
		removeItem: (key: string) => storage.delete(key),
	});
	vi.stubGlobal("window", browser);
	vi.stubGlobal("document", page);
	vi.stubGlobal("navigator", { sendBeacon: sent });
	vi.stubGlobal("Element", Anchor);
	vi.stubGlobal("HTMLAnchorElement", Anchor);
	router.subscribe.mockImplementation((_event, fn) => {
		onResolved = fn;
		return () => {};
	});
	Beacon();
});
afterEach(() => {
	cleanup?.();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

it("dedupes the canonical path while honoring query-only opt-out and opt-in", async () => {
	navigate("/?query=private#hash");
	navigate("/#other");
	navigate("/?analytics=off");
	navigate("/story");
	navigate("/story?analytics=on");
	navigate("/story/?query=private");
	const events = await sentEvents();
	expect(events.map(({ kind, path }) => [kind, path])).toEqual([
		["pageview", "/"],
		["pageview", "/story"],
	]);
});

it("accumulates visible intervals under one ID and refreshes presence on a 60s cadence", async () => {
	vi.advanceTimersByTime(2000);
	visibility("hidden");
	browser.dispatchEvent(new Event("pagehide"));
	vi.advanceTimersByTime(60_000);
	visibility("visible");
	vi.advanceTimersByTime(3000);
	navigate("/story");
	vi.advanceTimersByTime(54_999);
	expect((await sentEvents()).map((event) => event.kind)).toEqual([
		"pageview",
		"engagement",
		"heartbeat",
		"engagement",
		"pageview",
	]);
	vi.advanceTimersByTime(1);
	const events = await sentEvents();
	expect(events.at(-1)).toMatchObject({ kind: "heartbeat", path: "/story" });
	const reports = events.filter((event) => event.kind === "engagement");
	expect(reports.map((event) => event.visible_ms)).toEqual([2000, 5000]);
	expect(reports[0].event_id).toBe(reports[1].event_id);
});

it("tracks a known mailto link by ID and sends only the hostname for other external links", async () => {
	for (const href of [
		"mailto:example@example.com",
		"mailto:other@example.com",
		"https://site.example/path?query=private",
	]) {
		const click = new Event("click");
		Object.defineProperty(click, "target", { value: new Anchor(href) });
		page.dispatchEvent(click);
	}
	const events = await sentEvents();
	expect(events).toHaveLength(3);
	expect(events[1]).toMatchObject({ kind: "outbound", link_id: "email" });
	expect(events[2]).toMatchObject({ kind: "outbound", destination_host: "site.example" });
	expect(JSON.stringify(events)).not.toMatch(/mailto|private|example@example/u);
});
