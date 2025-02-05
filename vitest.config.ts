import { defineConfig } from "vitest/config";

export default defineConfig({
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
