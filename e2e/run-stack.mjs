import { spawn } from "node:child_process";

const worker = spawn(process.execPath, ["dist/worker.js"], { stdio: "inherit" });
const web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", process.env.E2E_PORT], { stdio: "inherit" });

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
