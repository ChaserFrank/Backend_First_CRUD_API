import os
import json
import re
from datetime import datetime
from openai import AsyncOpenAI
from pydantic import ValidationError
from src.llm.schema import ExtractResponse

# Initialize the client using environment variables
client = AsyncOpenAI(
    base_url=os.environ.get("LLM_BASE_URL"),
    api_key=os.environ.get("LLM_API_KEY")
)

# Hardcoded for now, but good practice to track version
PROMPT_VERSION = "extract-v1"


def load_prompt() -> str:
    """Reads the versioned prompt file."""
    with open(f"prompts/{PROMPT_VERSION}.md", "r", encoding="utf-8") as f:
        return f.read()


def clean_json_response(raw_text: str) -> str:
    """Strips markdown code fences and conversational filler."""
    # Find anything between ```json and ``` or just ``` and ```
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
    if match:
        return match.group(1)
    return raw_text.strip()


def quarantine_failure(input_text: str, raw_output: str, error_msg: str):
    """Logs unfixable model outputs so we can improve our prompt later."""
    os.makedirs("logs", exist_ok=True)
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "prompt_version": PROMPT_VERSION,
        "input": input_text,
        "raw_model_output": raw_output,
        "error": error_msg
    }
    with open("logs/quarantine.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")


async def extract_with_repair(user_text: str) -> ExtractResponse:
    """
    Stage 3: Calls the model, validates the output, and repairs it exactly once if it fails.
    """
    system_prompt = load_prompt()
    model_name = os.environ.get("LLM_MODEL")

    # Attempt 1
    response = await client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}  # Untrusted content isolated in user message
        ],
        temperature=0.0  # We want predictable formatting, not creativity
    )

    raw_output = response.choices[0].message.content
    cleaned_output = clean_json_response(raw_output)

    try:
        # Validate against our Pydantic schema[cite: 2]
        return ExtractResponse.model_validate_json(cleaned_output)
    except (ValidationError, json.JSONDecodeError) as e:
        error_details = str(e)

    # Attempt 2: The Repair Retry[cite: 2]
    print(f"Validation failed. Attempting repair loop. Error: {error_details}")

    repair_instruction = (
        f"Your previous answer was rejected for this reason:\n{error_details}\n"
        "Return only corrected JSON matching the schema."
    )

    repair_response = await client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
            {"role": "assistant", "content": raw_output},
            {"role": "user", "content": repair_instruction}  # Send the exact error back[cite: 2]
        ],
        temperature=0.0
    )

    raw_repair_output = repair_response.choices[0].message.content
    cleaned_repair_output = clean_json_response(raw_repair_output)

    try:
        return ExtractResponse.model_validate_json(cleaned_repair_output)
    except (ValidationError, json.JSONDecodeError) as final_error:
        # Give up cleanly[cite: 2]
        quarantine_failure(user_text, raw_repair_output, str(final_error))
        raise ValueError("Model failed to produce valid schema after repair.")