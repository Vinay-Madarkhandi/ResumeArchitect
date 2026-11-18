import { mkdir, readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";

const root = new URL("../extension/", import.meta.url);
const out = new URL("../dist/", import.meta.url);
const zip = new JSZip();
const sources = ["manifest.json", "popup.html", "popup.js", "options.html", "options.js", "connection.js", "extractor.js", "style.css"];
for (const name of sources) zip.file(name, await readFile(new URL(name, root)));

await mkdir(out, { recursive: true });
await writeFile(new URL("resumearchitect-job-clipper.zip", out), await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("dist/resumearchitect-job-clipper.zip");
