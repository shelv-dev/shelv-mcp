import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin/shelv-mcp.ts"],
  format: ["esm"],
  dts: true,
  target: "node18",
  sourcemap: true,
  clean: true,
  splitting: false,
  outDir: "dist",
});
