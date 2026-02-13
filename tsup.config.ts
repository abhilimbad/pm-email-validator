import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    outDir: "dist"
  },
  {
    entry: ["bin/pm-email-validator.ts"],
    format: ["esm", "cjs"],
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    outDir: "dist",
    banner: {
      js: "#!/usr/bin/env node"
    }
  }
]);
