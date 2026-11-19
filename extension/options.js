import { api, resolveServer, serverRequest } from "./connection.js";

const form = document.querySelector("form");
const serverInput = document.getElementById("server");
const tokenInput = document.getElementById("token");
const status = document.getElementById("status");
const submit = form.querySelector('button[type="submit"]');
const forget = document.getElementById("forget");

function setStatus(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}

document.getElementById("origin").value = location.protocol + "//" + location.host;
const saved = await api.storage.local.get(["server", "token"]);
serverInput.value = saved.server ?? "";
forget.disabled = !saved.server;
if (saved.token) {
  tokenInput.required = false;
  tokenInput.placeholder = "Leave blank to keep your saved token";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  forget.disabled = true;
  setStatus("");
  try {
    const url = resolveServer(serverInput.value);
    const token = tokenInput.value.trim() || (saved.server === url.origin ? saved.token : "");
    if (!/^ra_pat_[\w-]{43}$/.test(token ?? "")) throw new Error("Enter a valid token for this server.");
    const origins = [`${url.protocol}//${url.hostname}/*`];
    if (!await api.permissions.request({ origins })) throw new Error("Allow access to your ResumeArchitect server to continue.");
    const user = await serverRequest(url.origin, token, "/api/v1/me");
    await api.storage.local.set({ server: url.origin, token });
    saved.server = url.origin;
    saved.token = token;
    serverInput.value = url.origin;
    tokenInput.value = "";
    tokenInput.required = false;
    tokenInput.placeholder = "Leave blank to keep your saved token";
    setStatus(`Connected as ${user.email}.`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submit.disabled = false;
    forget.disabled = !saved.server;
  }
});

forget.addEventListener("click", async () => {
  try {
    const url = resolveServer(saved.server);
    await api.storage.local.remove(["server", "token"]);
    saved.server = "";
    saved.token = "";
    serverInput.value = "";
    tokenInput.value = "";
    tokenInput.required = true;
    tokenInput.placeholder = "ra_pat_…";
    forget.disabled = true;
    await api.permissions.remove({ origins: [`${url.protocol}//${url.hostname}/*`] });
    setStatus("Disconnected.");
  } catch (error) {
    setStatus(error.message, true);
  }
});
