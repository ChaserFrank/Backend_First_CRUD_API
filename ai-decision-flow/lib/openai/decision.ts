import OpenAI from "openai";
import type { Decision } from "@/types/workflow";

// Fail clearly at startup if the key is missing
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY environment variable is not set. Add it to .env.local."
  );
}

const client = new OpenAI({ apiKey });

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/**
 * Asks the LLM the given prompt and returns exactly "YES" or "NO".
 * Throws an ExecutionError if the model returns anything else.
 */
export async function evaluateDecision(prompt: string): Promise<Decision> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a decision engine. The user will give you a question. " +
          "You must respond with exactly one word: YES or NO. " +
          "Do not add punctuation, explanation, or any other text.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 5,
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";

  if (raw === "YES" || raw === "NO") {
    return raw as Decision;
  }

  throw new Error(
    `LLM returned an unexpected response: "${raw}". Expected YES or NO.`
  );
}
