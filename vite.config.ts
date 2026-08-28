import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tanstackStart({
			router: {
				// Start resolves router paths from its `srcDirectory` (which defaults
				// to `src`). Keeping these paths relative avoids generating `src/src/*`
				// while still letting the Start plugin own route generation/code-splitting.
				routesDirectory: "routes",
				generatedRouteTree: "routeTree.gen.ts",
			},
		}),
		tailwindcss(),
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
	},
});
