import { readFile } from "node:fs/promises";
import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { expect, test } from "@playwright/test";
import { signUp } from "./auth-helpers";
import { onboard } from "./onboard";

const chromeOrigin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

test("move jobs by dragging and keyboard, manage details, and exchange CSV", async ({ page }) => {
  await signUp(page);
  await onboard(page);
  await page.getByRole("link", { name: "Job tracker" }).click();
  await page.getByRole("button", { name: "Add job", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Job title").fill("Product Engineer");
  await editor.getByLabel("Company").fill("Northwind");
  await editor.getByLabel("Location").fill("Berlin");
  await editor.getByLabel("Salary range").fill("€80k–€100k");
  await editor.getByLabel("Job description").fill("Build tools for a payments platform.\nWork directly with our users.");
  await editor.getByLabel("Follow-up date").fill("2027-02-01");
  await editor.getByRole("button", { name: "Add contact" }).click();
  await editor.getByLabel("Contact 1 name").fill("Avery");
  await editor.getByLabel("Contact 1 role").fill("Recruiter");
  await editor.getByRole("button", { name: "Add interview date" }).click();
  await editor.getByLabel("Interview date 1").fill("2027-02-02");
  await editor.getByRole("button", { name: "Add job", exact: true }).click();

  const saved = page.getByRole("region", { name: "Saved", exact: true });
  const applied = page.getByRole("region", { name: "Applied", exact: true });
  const interviewing = page.getByRole("region", { name: "Interviewing", exact: true });
  const card = saved.getByRole("listitem", { name: "Product Engineer" });
  await expect(card).toBeVisible();
  await card.dragTo(applied, { targetPosition: { x: 30, y: 120 } });
  await expect(applied.getByRole("button", { name: "Product Engineer" })).toBeVisible();

  const move = applied.getByRole("combobox", { name: "Move Product Engineer to stage" });
  await move.focus();
  await page.keyboard.press("ArrowDown");
  await expect(interviewing.getByRole("button", { name: "Product Engineer" })).toBeVisible();
  await expect(interviewing.getByRole("combobox", { name: "Move Product Engineer to stage" })).toBeFocused();

  await interviewing.getByRole("button", { name: "Product Engineer" }).click();
  await expect(editor.getByText("Stage history")).toBeVisible();
  await expect(editor.getByRole("listitem")).toHaveText([/Interviewing .+ UTC/, /Applied .+ UTC/, /Saved .+ UTC/]);
  await expect(editor.getByLabel("Contact 1 name")).toHaveValue("Avery");
  await expect(editor.getByLabel("Interview date 1")).toHaveValue("2027-02-02");
  await editor.getByRole("button", { name: "Archive job" }).click();
  await expect(page.getByRole("button", { name: "Product Engineer" })).toHaveCount(0);

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "Product Engineer" });
  await expect(row).toContainText("Northwind");
  await page.getByLabel("Search jobs").fill("unrelated");
  await expect(row).toHaveCount(0);
  await page.getByLabel("Search jobs").fill("");
  await expect(row).toBeVisible();

  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("resume-architect-jobs.csv");
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain('"Product Engineer","Northwind","Berlin","€80k–€100k"');
  expect(csv).toContain('"interviewing"');
  expect(csv).toContain('"true"');

  await page.getByLabel("CSV file to import").setInputFiles({
    name: "jobs.csv", mimeType: "text/csv", buffer: Buffer.from("title,company,stage\nData Engineer,Contoso,offer\n"),
  });
  await expect(page.getByRole("status").filter({ hasText: "Imported 1 job." })).toBeVisible();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByLabel("Filter by stage").selectOption("offer");
  await expect(page.getByRole("row").filter({ hasText: "Data Engineer" })).toContainText("Contoso");
});

test("issue a personal token, authenticate clipper requests, and revoke it", async ({ page, request }) => {
  const email = await signUp(page);
  await onboard(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Token name").fill("Playwright clipper");
  await page.getByRole("button", { name: "Create token" }).click();
  const tokenField = page.getByLabel("New personal API token");
  await expect(tokenField).toHaveValue(/^ra_pat_[\w-]{43}$/);
  const token = await tokenField.inputValue();
  const headers = { Authorization: `Bearer ${token}`, Origin: chromeOrigin };

  const preflight = await request.fetch("/api/v1/jobs", {
    method: "OPTIONS",
    headers: { Origin: chromeOrigin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization, content-type" },
  });
  expect(preflight.status()).toBe(204);
  expect(preflight.headers()["access-control-allow-origin"]).toBe(chromeOrigin);

  const blocked = await request.get("/api/v1/me", { headers: { ...headers, Origin: "https://example.org" } });
  expect(blocked.status()).toBe(403);
  expect(blocked.headers()["access-control-allow-origin"]).toBeUndefined();
  expect((await request.get("/api/v1/me")).status()).toBe(401);

  const me = await request.get("/api/v1/me", { headers });
  expect(me.ok()).toBe(true);
  expect(await me.json()).toMatchObject({ email });

  const clip = await request.post("/api/v1/jobs", {
    headers, data: {
      title: "Clipped Backend Engineer", company: "Fabrikam", url: "https://jobs.example.org/backend",
      location: "Berlin", salary: "€80k–100k", description: "Maintain an API and write its tests.",
    },
  });
  expect(clip.status()).toBe(201);
  expect(clip.headers()["access-control-allow-origin"]).toBe(chromeOrigin);
  const { path } = await clip.json();

  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(tokenField).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/Last used .* UTC/)).toBeVisible();
  await expect(tokenField).toHaveCount(0);

  await page.getByRole("link", { name: "Job tracker" }).click();
  await expect(page.getByRole("region", { name: "Saved", exact: true }).getByRole("button", { name: "Clipped Backend Engineer" })).toBeVisible();
  await page.goto(path);
  await expect(page.getByRole("dialog", { name: "Clipped Backend Engineer" }).getByLabel("Salary range")).toHaveValue("€80k–100k");

  await page.goto("/settings");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Revoke Playwright clipper" }).click();
  await expect(page.getByText("Playwright clipper", { exact: true })).toHaveCount(0);
  expect((await request.get("/api/v1/me", { headers })).status()).toBe(401);
});


test("email one daily digest for opted-in jobs due today", async ({ page }) => {
  const email = await signUp(page);
  await onboard(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Email me a daily digest").check();
  await page.getByRole("button", { name: "Save reminders" }).click();
  await expect(page.getByText("Reminder preference saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email me a daily digest")).toBeChecked();
  await page.getByRole("link", { name: "Job tracker" }).click();
  await page.getByRole("button", { name: "Add job", exact: true }).click();

  const today = new Date().toISOString().slice(0, 10);
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Job title").fill("Digest role");
  await editor.getByLabel("Follow-up date").fill(today);
  await editor.getByRole("button", { name: "Add interview date" }).click();
  await editor.getByLabel("Interview date 1").fill(today);
  await editor.getByRole("button", { name: "Add job", exact: true }).click();
  await expect(page.getByRole("button", { name: "Digest role" })).toBeVisible();

  const url = process.env.REDIS_URL ?? "redis://localhost:16379";
  const cache = new Redis(url);
  const maintenance = new Queue("maintenance", { connection: { url } });
  const events = new QueueEvents("maintenance", { connection: { url } });
  try {
    await events.waitUntilReady();
    for (const invocation of [1, 2]) {
      const scheduled = await maintenance.add("tracker-reminders", {}, { jobId: `test-digest-${email}-${invocation}` });
      await scheduled.waitUntilFinished(events, 15_000);
    }
    let matching: { html: string }[] = [];
    await expect.poll(async () => {
      matching = (await cache.lrange("dev:mailbox", 0, 999)).map((item) => JSON.parse(item))
        .filter((message) => message.to === email && message.template === "trackerDigest");
      return matching.length;
    }).toBe(1);
    expect(matching[0].html).toContain("Digest role</a> — Follow-up and Interview");
  } finally {
    await Promise.all([cache.quit(), maintenance.close(), events.close()]);
  }

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Email me a daily digest").uncheck();
  await page.getByRole("button", { name: "Save reminders" }).click();
  await expect(page.getByText("Reminder preference saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email me a daily digest")).not.toBeChecked();
});
