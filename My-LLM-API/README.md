## LLM Extraction Endpoint Proof

**What it does:** Takes a raw text string from a receipt or invoice and extracts structured fields—vendor, total, date, and category—using an LLM, complete with a confidence score and a review flag.

### Runnable Request

```bash
curl -X POST "http://127.0.0.1:8000/extract" \
     -H "Content-Type: application/json" \
     -d '{"text": "GITHUB INC. 01/01/2026 Subscription Total: 10.00 USD"}'
```

### Provider Details

* **Provider:** OpenRouter (or Ollama)
* **Model:** `openrouter/free`
* **Environment Variables Required:** `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`

### Evaluation Score

**As of September 2026, Prompt v1:**

* **Score:** 8 out of 8 (100%)
* The evaluation tests standard extractions alongside ambiguous edge cases to ensure the **"when unsure"** rule fires successfully.

### Cost Telemetry

* **Average Call:** 120 input tokens, 45 output tokens, approximately 800 ms duration.
* **Estimate for 10,000 requests/day:** On `openrouter/free`, this is $0. On a paid model, costs will vary depending on the selected provider and model.

### A Future Improvement

I would implement a small in-memory cache that hashes the input text and prompt version, returning previously computed results instantly for repeated identical queries. This would reduce latency, API usage, and quota consumption.
