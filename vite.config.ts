import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "SmartyAddress",
			formats: ["iife"],
			fileName: () => "smarty-address.iife.js",
		},
		outDir: "dist",
		emptyOutDir: false,
		sourcemap: true,
	},
});
