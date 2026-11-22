// Every AI call goes through here: an OpenAI-compatible /chat/completions with native
// fetch, the daily cap, a timeout, JSON validated with Zod, and one retry with the error fed back.
import { env } from "../config/env.js";
import { AppError } from "./errors.js";
import { logger } from "./logger.js";
import { AiUsage } from "../modules/ai/model.js";

const AI_TIMEOUT_MS = 60_000;
const MAX_ERROR_FEEDBACK_CHARS = 400;

export const aiEnabled = () => Boolean(env.AI_BASE_URL && env.AI_MODEL);

const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

export function nextResetAt(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  ).toISOString();
}

export async function usageToday(userId) {
  const usage = await AiUsage.findOne({ userId, day: utcDay() }).lean();
  return {
    aiUsedToday: usage?.count ?? 0,
    aiDailyLimit: env.AI_DAILY_LIMIT,
    resetsAt: nextResetAt(),
  };
}

// Checked and counted BEFORE the model is called; one atomic increment.
async function countUsage(userId) {
  const usage = await AiUsage.findOneAndUpdate(
    { userId, day: utcDay() },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  if (usage.count > env.AI_DAILY_LIMIT) {
    throw new AppError(
      "AI_LIMIT_REACHED",
      `You've used all ${env.AI_DAILY_LIMIT} AI actions for today. They reset at midnight UTC.`,
      {
        details: { resetsAt: nextResetAt() },
      },
    );
  }
}

async function callModel(messages) {
  const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.AI_API_KEY && { Authorization: `Bearer ${env.AI_API_KEY}` }),
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`AI provider answered ${res.status}`);
  const body = await res.json();
  return { text: body.choices?.[0]?.message?.content ?? "", usage: body.usage };
}

export function parseJson(text, schema) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return schema.parse(JSON.parse(cleaned));
}

// A filled-in example, not a JSON Schema: 8B models often echo a schema back instead of answering
// (seen with llama3.1:8b on long job descriptions). Zod still validates the reply.
export const formatInstruction = (example) =>
  `Reply with ONLY a JSON object (no prose, no code fences), shaped exactly like this example, with the same keys and your own values:\n${JSON.stringify(example)}`;

export async function chatJson({ userId, task, system, prompt, schema, example }) {
  if (!aiEnabled()) throw new AppError("AI_FAILED", "AI drafting isn't available right now.");
  await countUsage(userId);

  const messages = [
    { role: "system", content: system },
    { role: "user", content: `${prompt}\n\n${formatInstruction(example)}` },
  ];
  const started = Date.now();
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { text, usage } = await callModel(messages);
      try {
        const result = parseJson(text, schema);
        // Never log the prompt or the answer: they contain personal data.
        logger.info({ task, ms: Date.now() - started, attempt, usage, ok: true }, "AI call");
        return result;
      } catch (error) {
        lastError = error;
        messages.push(
          { role: "assistant", content: text },
          {
            role: "user",
            content: `That was invalid (${String(error.message).slice(0, MAX_ERROR_FEEDBACK_CHARS)}). Reply with ONLY the corrected JSON object, shaped like the example.`,
          },
        );
      }
    } catch (error) {
      lastError = error; // timeout, network error or a non-2xx answer: retry once
    }
  }
  logger.warn({ task, ms: Date.now() - started, err: lastError, ok: false }, "AI call failed");
  throw new AppError("AI_FAILED", "We couldn't draft that right now. Please try again.");
}
