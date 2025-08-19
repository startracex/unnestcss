import { globSync } from "node:fs";
import type { RollupOptions } from "rollup";
import oxc from "rollup-plugin-oxc";

export default {
  input: Object.fromEntries(
    globSync("src/**/*.ts", {
      exclude: ["**/*.test.*"],
    }).map((path) => [path.slice(4, -3), path]),
  ),
  plugins: [oxc()],
  output: [
    {
      format: "esm",
    },
    {
      format: "cjs",
      entryFileNames: "[name].cjs",
      exports: "named",
    },
  ].map((o) => ({
    dir: "out",
    sourcemap: true,
    ...o,
  })),
} as RollupOptions;
