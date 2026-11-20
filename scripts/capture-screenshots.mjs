import { chromium } from "playwright";
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

async function main() {
  const sql = postgres("postgres://resume:resume@127.0.0.1:55432/resume");
  
  // Find a verified user with a resume
  const [user] = await sql`
    SELECT u.id, u.email, r.id as resume_id
    FROM users u
    JOIN resumes r ON r.user_id = u.id
    WHERE u.email_verified_at IS NOT NULL AND u.password_set_at IS NOT NULL AND u.banned_at IS NULL
    LIMIT 1
  `;

  if (!user) {
    console.error("No valid user with resume found");
    await sql.end();
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const hashed = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${hashed}, ${user.id}, ${expiresAt})
  `;
  await sql.end();

  console.log(`Created session token for user ${user.email}, resume: ${user.resume_id}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });

  // 1. Landing Page
  const page1 = await context.newPage();
  await page1.goto("http://127.0.0.1:3100/");
  await page1.waitForLoadState("networkidle");
  await page1.screenshot({ path: "public/screenshots/01-landing-hero.png" });
  console.log("Captured landing page");
  await page1.close();

  // Set session cookie
  await context.addCookies([
    {
      name: "ra_session",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // 2. Resume Scanner (/scan)
  const page2 = await context.newPage();
  await page2.goto("http://127.0.0.1:3100/scan");
  await page2.waitForLoadState("networkidle");
  // Fill sample job to show the character meter
  try {
    await page2.fill("textarea", "Senior Distributed Systems Engineer\n\nWe are looking for a staff engineer with deep expertise in Go, Kubernetes, PostgreSQL, and high-throughput streaming systems (Kafka). You will design mission-critical infrastructure, optimize database latency, and drive architectural standards across engineering.");
    await page2.waitForTimeout(400);
  } catch (e) {}
  await page2.screenshot({ path: "public/screenshots/02-resume-scanner.png" });
  console.log("Captured resume scanner");
  await page2.close();

  // 3. Interview Prep (/interview)
  const page3 = await context.newPage();
  await page3.goto("http://127.0.0.1:3100/interview");
  await page3.waitForLoadState("networkidle");
  await page3.screenshot({ path: "public/screenshots/03-interview-prep.png" });
  console.log("Captured interview prep");
  await page3.close();

  // 4. Sejda PDF Canvas / Workspace
  const page4 = await context.newPage();
  await page4.goto(`http://127.0.0.1:3100/resumes/${user.resume_id}?view=edit`);
  await page4.waitForLoadState("networkidle");
  await page4.waitForTimeout(600);
  await page4.screenshot({ path: "public/screenshots/04-sejda-editor-canvas.png" });
  console.log("Captured Sejda editor canvas");

  // Focus Canvas view
  try {
    const focusBtn = page4.locator('button:has-text("Focus canvas")');
    if (await focusBtn.isVisible()) {
      await focusBtn.click();
      await page4.waitForTimeout(400);
      await page4.screenshot({ path: "public/screenshots/05-sejda-focus-mode.png" });
      console.log("Captured focus canvas mode");
    }
  } catch (e) {}
  await page4.close();

  await browser.close();
  console.log("All screenshots captured successfully in public/screenshots/");
}

main().catch(console.error);
