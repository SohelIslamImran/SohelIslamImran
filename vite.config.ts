import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart({
			router: {
				// Start resolves router paths from its `srcDirectory` (which defaults
				// to `src`). Keeping these paths relative avoids generating `src/src/*`
				// while still letting the Start plugin own route generation/code-splitting.
				routesDirectory: "routes",
				generatedRouteTree: "routeTree.gen.ts",
			},
		}),
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
	},
});
