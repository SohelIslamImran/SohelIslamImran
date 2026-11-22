export type RailMode = "auto" | "expanded" | "collapsed";
export const RAIL_STORAGE_KEY = "cms:rail-mode";

export const railBootScript = `try {
	const mode = localStorage.getItem(${JSON.stringify(RAIL_STORAGE_KEY)});
	if (mode === "expanded" || mode === "collapsed") document.documentElement.dataset.cmsRail = mode;
} catch {}`;
