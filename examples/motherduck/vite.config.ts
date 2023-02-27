import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svelte()],
	optimizeDeps: {
		include: [
			"fast-deep-equal",
			"clone",
			"semver",
			"json-stringify-pretty-compact",
			"fast-json-stable-stringify",
		],
	},
});
