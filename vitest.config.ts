import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["tests/**"],
		coverage: {
			reporter: ["text", "html", "json"],
			include: ["lib"],
			exclude: [
				"**/*.js",
				"**/{builder-types,types,enums}.ts",
				"**/playground.ts",
			],
			all: true,
		},
	},
});
