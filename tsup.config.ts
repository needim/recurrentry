import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["lib/index.ts"],
	splitting: false,
	format: ["esm", "cjs"],
	sourcemap: true,
	clean: true,
	dts: true,
	minify: "terser",
});
