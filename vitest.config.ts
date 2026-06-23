import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/*.js',    // Ignore all .js files in watch mode
      ],
    }
  },
  test: {
    exclude: [...configDefaults.exclude, "**/*.js"],
    coverage: {
      provider: "v8",
      enabled: true,
      thresholds: {
        lines: 80,         // Fails the test run if line coverage is < 80%
        functions: 80,     // Fails if function coverage is < 80%
        branches: 75,      // Fails if branch coverage is < 75%
        statements: 80,    // Fails if statement coverage is < 80%
        perFile: false,    // Optional: Enforces these thresholds on EVERY individual file
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [...configDefaults.exclude, "**/*.js"]
    },
  },
});
