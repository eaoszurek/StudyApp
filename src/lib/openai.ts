/**
 * Lazy-initialized OpenAI client.
 *
 * Using a getter prevents the OpenAI SDK from throwing at module-load time
 * when OPENAI_API_KEY is not set (e.g. during `next build`).
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}
