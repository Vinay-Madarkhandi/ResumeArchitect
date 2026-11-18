import { require as loadTypeScript } from "tsx/cjs/api";

// Use the same typed parsers even on Node builds without native TypeScript support.
loadTypeScript("./inspectWorker.ts", import.meta.url);
