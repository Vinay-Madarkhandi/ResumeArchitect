import { api, resolveServer, serverRequest } from "./connection.js";
import { extractJob } from "./extractor.js";

const form = document.querySelector("form");
const status = document.getElementById("status");
const open = document.getElementById("open");
const submit = form.querySelector('button[type="submit"]');

function setStatus(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}

document.getElementById("settings").addEventListener("click", () => api.runtime.openOptionsPage());
const { server, token } = await api.storage.local.get(["server", "token"]);
if (!server || !token) {
  setStatus("Open Settings to connect to your ResumeArchitect server.");
} else {
  form.hidden = false;
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null || !/^https?:\/\//.test(tab.url ?? "")) throw new Error();
    const [{ result }] = await api.scripting.executeScript({ target: { tabId: tab.id }, func: extractJob });
    if (!result) throw new Error();
    for (const [key, value] of Object.entries(result)) {
      const input = form.elements.namedItem(key);
      if (input) input.value = value;
    }
    setStatus(result.title ? "" : "Check the posting details before saving.");
  } catch {
    setStatus("This tab cannot be read. You can still enter the job details.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  setStatus("Saving…");
  try {
    const job = Object.fromEntries(new FormData(form));
    const saved = await serverRequest(server, token, "/api/v1/jobs", job);
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(saved.id)) throw new Error("The server returned an unexpected job ID.");
    open.href = new URL(`/tracker?job=${saved.id}`, resolveServer(server)).href;
    open.hidden = false;
    form.hidden = true;
    setStatus("Saved to your tracker.");
    open.focus();
  } catch (error) {
    setStatus(error.message, true);
    submit.disabled = false;
  }
});
