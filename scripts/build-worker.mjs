import { build } from "esbuild";

await build({
  entryPoints: {
    worker: "worker/index.ts",
    migrate: "scripts/migrate.ts",
    inspectWorker: "lib/report/inspectWorker.ts",
  },
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  // Keep npm packages with native, dynamic, or worker-thread imports intact.
  packages: "external",
});
