import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/*.js',    // Ignore all .js files in watch mode
      ],
    }
  },
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
