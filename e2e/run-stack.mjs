import { spawn } from "node:child_process";
import { cpSync } from "node:fs";

const worker = spawn(process.execPath, ["dist/worker.js"], { stdio: "inherit" });
cpSync("public", ".next/standalone/public", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
const web = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: process.env.E2E_PORT },
});

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  worker.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exitCode = code;
}

for (const child of [worker, web]) {
  child.on("exit", (code) => stop(code || 1));
  child.on("error", () => stop(1));
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
