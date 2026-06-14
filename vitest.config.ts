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
      include: ["src/**/*.{ts,tsx}"],
      exclude: [...configDefaults.exclude, "**/*.js"]
    },
  },
});
