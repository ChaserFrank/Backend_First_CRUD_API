import os
import json
import re
import time
import asyncio
import random
from datetime import datetime
from openai import AsyncOpenAI, APIStatusError, APITimeoutError, APIConnectionError
from pydantic import ValidationError
from src.llm.schema import ExtractResponse

# 1. Explicit Timeout & Override SDK Retries
client = AsyncOpenAI(
    base_url=os.environ.get("LLM_BASE_URL"),
    api_key=os.environ.get("LLM_API_KEY"),
    timeout=30.0,
    max_retries=0  # We handle retries manually to control status codes
)

PROMPT_VERSION = "extract-v1"


def load_prompt() -> str:
    with open(f"prompts/{PROMPT_VERSION}.md", "r", encoding="utf-8") as f:
        return f.read()


def clean_json_response(raw_text: str) -> str:
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
    if match: return match.group(1)
    return raw_text.strip()


def log_telemetry(model: str, in_tokens: int, out_tokens: int, duration_ms: int, repaired: bool):
    """3. Cost Observability: One structured log line per call"""
    os.makedirs("logs", exist_ok=True)
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "prompt_version": PROMPT_VERSION,
        "model": model,
        "input_tokens": in_tokens,
        "output_tokens": out_tokens,
        "duration_ms": duration_ms,
        "repaired": repaired
    }
    with open("logs/cost.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")


async def call_model_with_retries(messages: list) -> tuple:
    """2. Smart Retries with Exponential Backoff and Jitter"""
    max_attempts = 3
    base_wait = 1.0
    model_name = os.environ.get("LLM_MODEL")

    for attempt in range(max_attempts):
        try:
            start_time = time.time()
            response = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.0
            )
            duration_ms = int((time.time() - start_time) * 1000)

            # Extract token counts
            usage = response.usage
            in_tokens = usage.prompt_tokens if usage else 0
            out_tokens = usage.completion_tokens if usage else 0

            return response.choices[0].message.content, in_tokens, out_tokens, duration_ms

        except APIStatusError as e:
            # Never retry on auth or bad request errors
            if e.status_code in (400, 401, 403):
                print(f"Hard failure {e.status_code}. Not retrying.")
                raise e
            if attempt < max_attempts - 1:
                # Retry on 429 and 5xx[cite: 2]
                wait = (base_wait * (2 ** attempt)) + random.uniform(0, 0.5)
                print(f"Server error {e.status_code}. Retrying in {wait:.2f}s...")
                await asyncio.sleep(wait)
                continue
            raise e

        except (APITimeoutError, APIConnectionError) as e:
            if attempt < max_attempts - 1:
                wait = (base_wait * (2 ** attempt)) + random.uniform(0, 0.5)
                print(f"Network timeout/error. Retrying in {wait:.2f}s...")
                await asyncio.sleep(wait)
                continue
            raise e


async def extract_with_repair(user_text: str) -> ExtractResponse:
    system_prompt = load_prompt()
    model_name = os.environ.get("LLM_MODEL")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text}
    ]

    # Attempt 1
    raw_out, in_t, out_t, duration = await call_model_with_retries(messages)
    cleaned = clean_json_response(raw_out)

    try:
        result = ExtractResponse.model_validate_json(cleaned)
        log_telemetry(model_name, in_t, out_t, duration, repaired=False)
        return result
    except (ValidationError, json.JSONDecodeError) as e:
        error_details = str(e)

    # Attempt 2: Repair Loop[cite: 2]
    messages.extend([
        {"role": "assistant", "content": raw_out},
        {"role": "user",
         "content": f"Your previous answer was rejected:\n{error_details}\nReturn only corrected JSON matching the schema."}
    ])

    raw_repair, in_t_rep, out_t_rep, duration_rep = await call_model_with_retries(messages)
    cleaned_repair = clean_json_response(raw_repair)

    try:
        result = ExtractResponse.model_validate_json(cleaned_repair)
        # Combine token usage for the repaired log[cite: 2]
        log_telemetry(model_name, in_t + in_t_rep, out_t + out_t_rep, duration + duration_rep, repaired=True)
        return result
    except (ValidationError, json.JSONDecodeError) as final_error:
        # Quarantine on double failure[cite: 2]
        os.makedirs("logs", exist_ok=True)
        with open("logs/quarantine.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({"input": user_text, "error": str(final_error)}) + "\n")
        raise ValueError("Failed to produce valid schema after repair.")