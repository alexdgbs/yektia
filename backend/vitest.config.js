import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
    hookTimeout: 120000,
    testTimeout: 20000,
    fileParallelism: false,
  },
});
