import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		dts({
			tsconfigPath: "./tsconfig.json",
			exclude: "**/*.test.ts",
			rollupTypes: true,
		}),
	],

	build: {
		outDir: "dist",
		minify: "terser",
		lib: {
			entry: resolve(__dirname, "lib/index.ts"),
			name: "recurrentry",
			fileName: (format, entryName) =>
				format === "cjs" ? `${entryName}.cjs` : `${entryName}.js`,
			formats: ["es", "cjs"],
		},
		sourcemap: true,
		emptyOutDir: true,
	},

	test: {
		globals: true,
		include: ["tests/**"],
		coverage: {
			reporter: ["text", "html"],
			include: ["lib"],
			exclude: ["**/*.js", "**/{builder-types,types,enums}.ts"],
			all: true,
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100,
			},
		},
	},
});
