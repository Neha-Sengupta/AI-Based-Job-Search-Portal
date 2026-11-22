// One-command local setup:   npm run setup
// Installs packages (and headless Chrome for PDFs), writes the .env files with generated secrets, connects to
// MongoDB, then creates the indexes, the 200 saved jobs and the demo user. Safe to run again: existing values
// in server/.env are kept and the seed steps skip what already exists.
// Uses only Node built-ins, because it runs before `npm install`.
// Non-interactive: MONGODB_URI="mongodb+srv://…" npm run setup
/* eslint-disable no-console -- a CLI script: progress goes to the terminal */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = join(ROOT, "server");
const SERVER_ENV = join(SERVER, ".env");
const CLIENT_ENV = join(ROOT, "client", ".env.local");
const LOCAL_MONGO = "mongodb://127.0.0.1:27017/jobportal";
const DEMO_LOGIN = "demo@jobportal.local / demo-password-123";

const say = (text) => console.log(`\n▸ ${text}`);
const fail = (text) => {
  console.error(`\n✗ ${text}`);
  process.exit(1);
};

function run(command, args, cwd = ROOT) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) fail(`"${command} ${args.join(" ")}" failed (see the output above).`);
}

function checkNode() {
  const wanted = Number(readFileSync(join(ROOT, ".nvmrc"), "utf8").trim());
  const current = Number(process.versions.node.split(".")[0]);
  if (current < wanted) {
    fail(
      `Node ${wanted} or newer is needed (you have ${process.versions.node}). Install it from https://nodejs.org or run: nvm install`,
    );
  }
}

// Reads KEY=value lines; keeps comments and order so the file stays readable.
const readEnv = (file) => readFileSync(file, "utf8");
const getVar = (text, key) => text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim() ?? "";
const setVar = (text, key, value) =>
  new RegExp(`^${key}=`, "m").test(text)
    ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
    : `${text.trimEnd()}\n${key}=${value}\n`;
const secret = () => randomBytes(32).toString("base64url");

function writeEnvFiles() {
  if (!existsSync(SERVER_ENV)) copyFileSync(join(SERVER, ".env.example"), SERVER_ENV);
  let env = readEnv(SERVER_ENV);
  for (const key of ["BETTER_AUTH_SECRET", "INTERNAL_API_KEY"]) {
    if (getVar(env, key).length < 32) env = setVar(env, key, secret());
  }
  writeFileSync(SERVER_ENV, env);
  if (!existsSync(CLIENT_ENV)) copyFileSync(join(ROOT, "client", ".env.example"), CLIENT_ENV);
}

// Runs inside server/ (after npm install) so it can use the installed mongoose.
function canConnect(uri) {
  const check = `import mongoose from "mongoose";
    try { await mongoose.connect(process.env.URI, { serverSelectionTimeoutMS: 5000 }); await mongoose.disconnect(); }
    catch { process.exit(1); }`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", check], {
    cwd: SERVER,
    env: { ...process.env, URI: uri },
    stdio: "ignore",
  });
  return result.status === 0;
}

async function askForUri() {
  console.log(`
  No MongoDB found at ${LOCAL_MONGO}. Pick one:
    • Free cloud database (no install): create a free M0 cluster at https://www.mongodb.com/cloud/atlas,
      add a database user, allow your IP, then copy the connection string (mongodb+srv://…).
    • Or install MongoDB Community locally (macOS: brew install mongodb-community && brew services start mongodb-community)
      and run npm run setup again.`);
  if (!process.stdin.isTTY) fail("Set MONGODB_URI and run npm run setup again.");
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (
    await prompt.question("\n  Paste a MongoDB connection string (or press Enter to stop): ")
  ).trim();
  prompt.close();
  if (!answer) fail("Stopped: no database.");
  return answer;
}

async function connectDatabase() {
  let env = readEnv(SERVER_ENV);
  const candidates = [process.env.MONGODB_URI, getVar(env, "MONGODB_URI"), LOCAL_MONGO].filter(
    Boolean,
  );
  let uri = candidates.find((candidate) => canConnect(candidate));
  while (!uri) {
    const answer = await askForUri();
    if (canConnect(answer)) uri = answer;
    else
      console.log(
        "  Couldn't connect with that string. Check the password, and that your IP is allowed in Atlas.",
      );
  }
  env = setVar(env, "MONGODB_URI", uri);
  // Atlas is a replica set (transactions work); a local single server is not.
  env = setVar(env, "MONGODB_TRANSACTIONS", uri.startsWith("mongodb+srv://") ? "true" : "false");
  writeFileSync(SERVER_ENV, env);
  console.log(`  Connected to ${uri.startsWith("mongodb+srv://") ? "MongoDB Atlas" : "MongoDB"}.`);
}

async function main() {
  checkNode();
  say(
    "Installing packages (and headless Chrome for CV PDFs)… this takes a few minutes the first time",
  );
  run("npm", ["install", "--no-audit", "--no-fund"]);
  say("Writing server/.env and client/.env.local (secrets are generated for you)");
  writeEnvFiles();
  say("Connecting to MongoDB");
  await connectDatabase();
  say("Preparing the database: indexes, 200 saved India jobs, demo user");
  run("npm", ["run", "db:indexes"], SERVER);
  run("npm", ["run", "db:seed"], SERVER);
  run("npm", ["run", "db:demo"], SERVER);
  console.log(`
✓ Setup complete.

  Start the app:   npm run dev
  Then open:       http://localhost:3000
  Demo login:      ${DEMO_LOGIN}   (or sign up as a new user)

  Optional: AI-drafted application answers need AI_BASE_URL / AI_API_KEY / AI_MODEL in server/.env
  (a free Groq key, or Ollama on your computer). Everything else works without it.`);
}

await main();
