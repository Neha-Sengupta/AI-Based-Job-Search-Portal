// End-to-end smoke test in a real (headless) browser against a running app:
//   1. npm run db:seed (server)   2. npm run dev (or a production build) with API on :4000 and site on :3000
//   3. cd server && node scripts/e2e-smoke.js          (BASE_URL=… to point elsewhere)
// It creates throwaway users, walks every main flow and deletes the accounts at the end.
/* eslint-disable no-console -- a CLI script: progress goes to the terminal */
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "e2e-password-123";
const HERE = dirname(fileURLToPath(import.meta.url));
const CV_FIXTURE = join(HERE, "../src/modules/profile/cv-parser/__fixtures__/fresher-btech.pdf");
const AI_WAIT_MS = 180_000;
const MOBILE_WIDTH = 360;
const FIT_PANEL = 'aside[aria-label="Your fit"]';
const DEMO = { email: "demo@jobportal.local", password: "demo-password-123" }; // npm run db:demo
// A valid 1×1 PNG, for the photo upload.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const results = [];
const problems = [];
let lastPage = null; // for a screenshot when a step fails
const email = (tag) => `e2e-${tag}-${Date.now()}@example.com`;

async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push(`✓ ${name} (${Date.now() - started} ms)`);
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push(`✗ ${name}: ${error.message}`);
    console.log(`✗ ${name}: ${error.message}`);
    if (lastPage) {
      const shot = join(tmpdir(), `e2e-failure-${Date.now()}.png`);
      await lastPage.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
      const text = await lastPage
        .evaluate(() => document.body.innerText.slice(0, 1500))
        .catch(() => "");
      console.log(
        `  screenshot: ${shot}\n  url: ${lastPage.url()}\n  page text: ${text.replace(/\n+/g, " | ")}`,
      );
    }
    throw error;
  }
}

const sel = {
  text: (text) => `::-p-text(${text})`,
  button: (text) => `button::-p-text(${text})`,
  link: (text) => `a::-p-text(${text})`,
};

async function fill(page, selector, value) {
  await page.locator(selector).fill(value);
}

// Clicks the button whose whole text is exactly `text` (e.g. "Save", not "Save & download").
async function clickExactButton(page, text) {
  const handle = await page.waitForFunction(
    (label) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === label),
    {},
    text,
  );
  await handle.asElement().click();
}

async function typeChips(page, selector, values) {
  for (const value of values) {
    await page.type(selector, value);
    await page.keyboard.press("Enter");
  }
}

async function chooseOption(page, triggerSelector, optionText) {
  await page.locator(triggerSelector).click();
  await page.locator(`[role="option"]::-p-text(${optionText})`).click();
}

const waitForUrl = (page, pattern) =>
  page.waitForFunction(
    (source) => new RegExp(source).test(location.pathname + location.search),
    { timeout: 20_000 },
    pattern.source,
  );

async function newPage(browser, { width = 1280, downloads } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height: 900 });
  page.setDefaultTimeout(20_000);
  lastPage = page;
  page.on("pageerror", (error) => problems.push(`page error on ${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/Failed to load resource|status of 40[14]/.test(message.text())
    ) {
      problems.push(`console error on ${page.url()}: ${message.text()}`);
    }
  });
  if (downloads) {
    const session = await page.createCDPSession();
    await session.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloads,
      browserContextId: context.id,
    });
  }
  return page;
}

async function signUp(page, tag) {
  const address = email(tag);
  await page.goto(`${BASE_URL}/signup`);
  await fill(page, "#name", `E2E ${tag}`);
  await fill(page, "#email", address);
  await fill(page, "#password", PASSWORD);
  await page.locator(sel.button("Create account")).click();
  await waitForUrl(page, /^\/onboarding/);
  return address;
}

async function deleteAccount(page) {
  await page.goto(`${BASE_URL}/settings`);
  await page.locator(sel.button("Delete my account")).click();
  await fill(page, "#confirm-delete", "DELETE");
  await page.locator(sel.button("Delete everything")).click();
  await waitForUrl(page, /^\/$/);
}

async function waitForDownload(dir, extension) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const files = (await readdir(dir)).filter((file) => file.endsWith(extension));
    if (files.length) return join(dir, files[0]);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no ${extension} download appeared`);
}

async function noHorizontalScroll(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle0" });
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  if (width > MOBILE_WIDTH) throw new Error(`${path} is ${width}px wide at ${MOBILE_WIDTH}px`);
}

async function main() {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox"] });
  const downloads = await mkdtemp(join(tmpdir(), "e2e-downloads-"));
  let formEmail;
  try {
    const page = await newPage(browser, { downloads });

    await step("protected page redirects to sign-in with callbackUrl (F1.3)", async () => {
      await page.goto(`${BASE_URL}/tracker`);
      await waitForUrl(page, /^\/signin\?callbackUrl=%2Ftracker/);
    });

    await step("sign-up form shows field errors before sending (F1.10)", async () => {
      await page.goto(`${BASE_URL}/signup`);
      await fill(page, "#password", "short");
      await page.locator(sel.button("Create account")).click();
      await page.locator(sel.text("At least 8 characters")).wait();
      await page.locator(sel.text("Required")).wait();
    });

    await step("sign up → signed in → onboarding (F1.1, F1.8)", async () => {
      formEmail = await signUp(page, "form");
    });

    await step(
      "onboarding form path: basics → experience → education → skills → preferences → done (F2.1)",
      async () => {
        await page.locator(sel.button("Fill in a form")).click();
        await page.locator(sel.button("Save and continue")).click(); // empty full name → error, nothing sent (F2.7)
        await page.locator(sel.text("Required")).wait();
        await fill(page, "#fullName", "Priya E2E Sharma");
        await fill(page, "#headline", "Frontend Developer");
        await fill(page, "#contactEmail", "priya.e2e@example.com");
        await fill(page, "#phone", "+91 98765 43210");
        await fill(page, "#city", "Pune");
        await fill(page, "#github", "https://github.com/priya-e2e");
        await fill(
          page,
          "#summary",
          "Final-year B.Tech student who builds React and Node.js apps. Looking for a frontend developer role in Pune or remote, with a product-focused team.",
        );
        await page.locator(sel.button("Save and continue")).click();
        await page.locator(sel.text("Work experience")).wait();
        await page.locator(sel.button("Save and continue")).click(); // fresher: no jobs
        await page.locator(sel.button("Add education")).click();
        await fill(page, "#education-0-institution", "College of Engineering Pune");
        await fill(page, "#education-0-degree", "B.Tech");
        await page.locator(sel.button("Save and continue")).click();
        await page.locator("#skills").wait();
        await typeChips(page, "#skills", ["React", "JavaScript", "CSS", "Node.js", "Git", "react"]);
        const chips = await page.$$eval('[aria-label="Added skills"] li', (items) => items.length);
        if (chips !== 5) throw new Error(`expected 5 unique skills, got ${chips} (F2.11)`);
        await page.locator(sel.button("Save and continue")).click();
        await page.locator("#roles").wait();
        await typeChips(page, "#roles", ["Frontend Developer"]);
        await page.locator("#preferences-workModels-remote").click();
        await page.locator("#preferences-workModels-hybrid").click();
        await page.locator(sel.button("Finish")).click();
        await page.locator(sel.text("Your profile is ready")).wait();
        await page.locator('[role="img"][aria-label^="Profile score"]').wait();
      },
    );

    await step("dashboard shows recommendations, score and tracker (F3, F6.11)", async () => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.locator(sel.text("Recommended for you")).wait();
      await page.locator(sel.text("Profile score")).wait();
      await page.locator(sel.text("Application pipeline")).wait();
    });

    await step(
      "profile: edit a section and save; photo upload and remove (F2.8, F2.9)",
      async () => {
        await page.goto(`${BASE_URL}/profile`);
        await page.locator('button[aria-label="Edit Basics"]').click();
        await fill(page, "#headline", "Frontend Developer (React)");
        await page.locator(sel.button("Save")).click();
        await page.locator(sel.text("Frontend Developer (React)")).wait();
        const photoFile = join(downloads, "photo.png");
        await writeFile(photoFile, PNG_1PX);
        const input = await page.waitForSelector("#photo-input");
        await input.uploadFile(photoFile);
        await page.locator('img[alt="Your profile photo"]').wait();
        await page.locator(sel.button("Remove")).click();
        await page.waitForFunction(() => !document.querySelector('img[alt="Your profile photo"]'));
      },
    );

    let jobPath;
    await step("job search with filters in the URL and fit badges (F4.1–F4.4, F6)", async () => {
      await page.goto(`${BASE_URL}/jobs?q=react`);
      await page.waitForSelector('ul li h3 a[href^="/jobs/"]');
      await page.reload();
      await page.waitForSelector('ul li h3 a[href^="/jobs/"]');
      const query = await page.$eval("#job-q", (input) => input.value);
      if (query !== "react") throw new Error("search query didn't survive a refresh");
      const badges = await page.$$eval(
        "ul li",
        (items) =>
          items.filter((item) => /% · |Analysing|Complete profile/.test(item.textContent)).length,
      );
      if (!badges) throw new Error("no fit badges on job cards");
      jobPath = await page.$eval('ul li h3 a[href^="/jobs/"]', (link) => link.getAttribute("href"));
    });

    await step("filters and pagination stay in the URL (F4.2, F4.4)", async () => {
      await page.goto(`${BASE_URL}/jobs`);
      await page.waitForSelector('ul li h3 a[href^="/jobs/"]');
      const first = await page.$eval('ul li h3 a[href^="/jobs/"]', (link) => link.href);
      await page.locator('nav[aria-label="Pagination"] ::-p-text(Next)').click();
      await waitForUrl(page, /page=2/);
      await page.waitForFunction(
        (old) => document.querySelector('ul li h3 a[href^="/jobs/"]')?.href !== old,
        {},
        first,
      );
      await page.goto(`${BASE_URL}/jobs?workModel=remote`);
      await page.waitForSelector(
        'ul li h3 a[href^="/jobs/"], ::-p-text(No jobs match these filters)',
      );
    });

    await step("unknown page and unknown job show not-found states", async () => {
      await page.goto(`${BASE_URL}/no-such-page`);
      await page.locator(sel.text("We couldn't find that page")).wait();
      await page.goto(`${BASE_URL}/jobs/000000000000000000000000`);
      await page.locator(sel.text("This job is no longer available")).wait();
    });

    await step("empty search shows the empty state (F4.5)", async () => {
      await page.goto(`${BASE_URL}/jobs?q=zzzznotajobxyz`);
      await page.locator(sel.text("No jobs match these filters")).wait();
    });

    await step(
      "job detail: fit panel, description, 'I have this' updates the score (F5.1, F6.8)",
      async () => {
        await page.goto(`${BASE_URL}${jobPath}`);
        await page.locator(sel.text("About the job")).wait();
        await page.locator(sel.text("Your fit")).wait();
        const addButton = await page.$("button::-p-text(I have this)");
        if (addButton) {
          const before = await page.$eval(FIT_PANEL, (aside) => aside.textContent);
          await addButton.click();
          await page.waitForFunction(
            (selector, old) => document.querySelector(selector).textContent !== old,
            { timeout: 15_000 },
            FIT_PANEL,
            before,
          );
        }
      },
    );

    await step("save job → appears in tracker under Saved (F8.1)", async () => {
      await page.goto(`${BASE_URL}${jobPath}`);
      await page.locator(sel.button("Save")).click();
      // After saving, the job refetches and the Save button becomes the tracker status picker.
      await page.waitForSelector('[id^="status-"], a::-p-text(Saved)');
      await page.goto(`${BASE_URL}/tracker`);
      await page.locator(sel.text("Application tracker")).wait();
      await page.waitForFunction(() => /Saved \(1\)/.test(document.body.textContent));
    });

    await step("create a tailored CV → Save & download PDF (F7, F7.14)", async () => {
      await page.goto(`${BASE_URL}/cvs/new?jobId=${jobPath.split("/").pop()}`);
      await page.locator(sel.button("Continue")).click();
      // Answer "No" to every missing-skill question until the review step appears (F7.5).
      for (let answered = 0; answered < 20; answered += 1) {
        const next = await page.waitForSelector(
          "#cv-title, button::-p-text(Yes, add it to my profile)",
        );
        if (await next.evaluate((element) => element.id === "cv-title")) break;
        const question = await page.$eval("::-p-text(This job asks for)", (el) => el.textContent);
        await clickExactButton(page, "No");
        await page.waitForFunction(
          (old) => ![...document.querySelectorAll("p")].some((p) => p.textContent === old),
          {},
          question,
        );
      }
      await page.waitForSelector('iframe[title="CV preview"]', { timeout: 20_000 });
      await page.locator(sel.button("Save & download PDF")).click();
      const pdf = await waitForDownload(downloads, ".pdf");
      const bytes = await readFile(pdf);
      if (bytes.subarray(0, 4).toString() !== "%PDF") throw new Error("download isn't a PDF");
      if (!pdf.includes("Priya E2E Sharma - ")) throw new Error(`unexpected file name ${pdf}`);
      await page.goto(`${BASE_URL}/cvs`);
      await page.locator(sel.text("My CVs")).wait();
      await page.locator(sel.button("Download")).wait();
    });

    await step("tracker status change Saved → Applied (F8.3)", async () => {
      await page.goto(`${BASE_URL}/tracker`);
      await page.waitForSelector('[id^="status-"]');
      const id = await page.$eval('[id^="status-"]', (element) => element.id);
      await chooseOption(page, `#${id}`, "Applied");
      await page.waitForFunction(() => /Applied \(1\)/.test(document.body.textContent), {
        timeout: 15_000,
      });
    });

    await step(
      "application kit: copy fields and AI-drafted answers or a clear AI message (F10)",
      async () => {
        await page.goto(`${BASE_URL}${jobPath}?kit=1`);
        await page.locator(sel.text("Prepare your application")).wait();
        await page.locator('button[aria-label="Copy Full name"]').wait();
        await page.waitForFunction(
          () =>
            /Regenerate default answers|isn't available|couldn't draft|used all/.test(
              document.body.textContent,
            ),
          { timeout: AI_WAIT_MS },
        );
        const drafted = await page.evaluate(() =>
          /Regenerate default answers/.test(document.body.textContent),
        );
        results.push(
          `  · AI answers: ${drafted ? "drafted by the model" : "the AI could not draft; a clear error message was shown"}`,
        );
      },
    );

    await step("application kit: custom question box is there (F10.4)", async () => {
      await page.locator("#kit-question").fill("Why do you want to work here?");
      await page.locator(sel.button("Draft answer")).wait();
    });

    await step("tracker: add notes, they persist (F8.5)", async () => {
      await page.goto(`${BASE_URL}/tracker`);
      await page.locator('button[aria-label^="Actions for "]').click();
      await page.locator('[role="menuitem"]::-p-text(Notes)').click();
      await page.locator('textarea[id^="notes-"]').fill("Referred by a senior; follow up Friday.");
      await page.locator(sel.button("Save")).click();
      await page.locator(sel.text("Notes saved")).wait();
      await page.reload();
      await page.locator(sel.text("Referred by a senior; follow up Friday.")).wait();
    });

    await step("CV editor: rename and save, then delete the CV (F7.10, F7.15)", async () => {
      await page.goto(`${BASE_URL}/cvs`);
      await page.locator("a::-p-text(Edit)").click();
      await waitForUrl(page, /^\/cvs\/[a-f0-9]{24}/);
      await fill(page, "#cv-title", "E2E renamed CV");
      await clickExactButton(page, "Save");
      await page.locator(sel.text("Saved")).wait();
      await page.locator(sel.button("Delete")).click();
      await page.locator('[role="dialog"] button::-p-text(Delete)').click();
      await waitForUrl(page, /^\/cvs$/);
      await page.locator(sel.text("My CVs")).wait();
      if (await page.$("::-p-text(E2E renamed CV)")) throw new Error("deleted CV is still listed");
    });

    await step("tracker: remove an application (F8.6)", async () => {
      await page.goto(`${BASE_URL}/tracker`);
      // Only applications that recorded which CV was sent show "CV deleted" (F7.15).
      await page.waitForSelector('button[aria-label^="Actions for "]');
      await page.locator('button[aria-label^="Actions for "]').click();
      await page.locator('[role="menuitem"]::-p-text(Delete)').click();
      await page.locator('[role="dialog"] button::-p-text(Remove)').click();
      await page.waitForFunction(
        () => !document.querySelector('button[aria-label^="Actions for "]'),
      );
    });

    await step("settings shows AI usage", async () => {
      await page.goto(`${BASE_URL}/settings`);
      await page.locator(sel.text("AI actions used")).wait();
    });

    await step("mobile menu opens and navigates", async () => {
      await page.setViewport({ width: MOBILE_WIDTH, height: 800 });
      await page.locator('button[aria-label="Open menu"]').click();
      await page.locator('nav[aria-label="Mobile"] a::-p-text(Tracker)').click();
      await waitForUrl(page, /^\/tracker/);
      await page.setViewport({ width: 1280, height: 900 });
    });

    await step("sign out ends the session (F1.7)", async () => {
      await page.goto(`${BASE_URL}/settings`);
      await page.locator('aside button[aria-label="Sign out"]').click();
      await waitForUrl(page, /^\/$/);
      await page.goto(`${BASE_URL}/dashboard`);
      await waitForUrl(page, /^\/signin/);
    });

    await step(
      "wrong password → generic message; right password → callback page (F1.2, F1.6)",
      async () => {
        await page.goto(`${BASE_URL}/signin?callbackUrl=%2Ftracker`);
        await fill(page, "#email", formEmail);
        await fill(page, "#password", "wrong-password-1");
        await page.locator(sel.button("Sign in")).click();
        await page.locator(sel.text("Email or password is incorrect.")).wait();
        await fill(page, "#password", PASSWORD);
        await page.locator(sel.button("Sign in")).click();
        await waitForUrl(page, /^\/tracker/);
      },
    );

    await step(`no horizontal scroll at ${MOBILE_WIDTH}px (F8.8, T10.5)`, async () => {
      await page.setViewport({ width: MOBILE_WIDTH, height: 800 });
      for (const path of [
        "/",
        "/jobs",
        jobPath,
        "/dashboard",
        "/tracker",
        "/profile",
        "/cvs",
        "/settings",
        "/about",
        "/privacy",
      ]) {
        await noHorizontalScroll(page, path);
      }
      await page.setViewport({ width: 1280, height: 900 });
    });

    await step(
      "CV upload path: parsed draft pre-fills the form, nothing saved yet (F2.2, F2.3)",
      async () => {
        const uploader = await newPage(browser);
        await signUp(uploader, "upload");
        await uploader.locator(sel.button("Upload my CV")).click();
        const input = await uploader.waitForSelector("#cv-file");
        await input.uploadFile(CV_FIXTURE);
        await uploader.waitForFunction(
          () =>
            document.querySelector("#fullName") ||
            /Review the details/.test(document.body.textContent),
          { timeout: 30_000 },
        );
        if (await uploader.$("button::-p-text(Review the details)"))
          await uploader.locator(sel.button("Review the details")).click();
        const name = await uploader.$eval("#fullName", (input) => input.value);
        if (!name) throw new Error("the parser didn't fill the name");
        await uploader.locator(sel.text("We filled these fields from your CV")).wait();
        results.push(`  · parsed name: "${name}"`);
        const profileStatus = await uploader.evaluate(() =>
          fetch("/api/v1/profile").then((res) => res.status),
        );
        if (profileStatus !== 404)
          throw new Error(`profile saved before review (status ${profileStatus})`);
        await deleteAccount(uploader);
      },
    );

    await step(
      "demo account dashboard: charts, recommendations and tables (if seeded)",
      async () => {
        const demo = await newPage(browser);
        await demo.goto(`${BASE_URL}/signin`);
        await fill(demo, "#email", DEMO.email);
        await fill(demo, "#password", DEMO.password);
        await demo.locator(sel.button("Sign in")).click();
        const signedIn = await waitForUrl(demo, /^\/dashboard/).then(
          () => true,
          () => false,
        );
        if (!signedIn) {
          results.push("  · demo user not found (run npm run db:demo); skipped");
          return;
        }
        for (const text of [
          "Application pipeline",
          "Tracker updates per day",
          "Recommended for you",
          "Recent activity",
          "Recent CVs",
        ]) {
          await demo.locator(sel.text(text)).wait();
        }
        const bars = await demo.$$eval(
          'figure [role="img"], figure svg, figure li',
          (els) => els.length,
        );
        if (!bars) throw new Error("no chart marks on the dashboard");
        await demo.locator('aside button[aria-label="Sign out"]').click();
        await waitForUrl(demo, /^\/$/);
      },
    );

    await step("delete account removes everything and signs out (F9.4)", async () => {
      await deleteAccount(page);
      await page.goto(`${BASE_URL}/signin`);
      await fill(page, "#email", formEmail);
      await fill(page, "#password", PASSWORD);
      await page.locator(sel.button("Sign in")).click();
      await page.locator(sel.text("Email or password is incorrect.")).wait();
    });
  } finally {
    await browser.close();
    console.log("\n" + results.join("\n"));
    if (problems.length) console.log("\nBrowser problems:\n" + [...new Set(problems)].join("\n"));
  }
}

main().catch(() => {
  process.exitCode = 1;
});
