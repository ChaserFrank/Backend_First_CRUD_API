import os
from fastapi import APIRouter, HTTPException
from src.llm.schema import ExtractRequest, ExtractResponse, ExpenseCategory
from src.llm.client import extract_with_repair
from openai import APITimeoutError, APIStatusError

router = APIRouter()


@router.post("/extract", response_model=ExtractResponse)
async def extract_receipt_fields(request: ExtractRequest):
    """
    POST /extract
    Takes raw receipt text and returns cleaned, validated JSON fields.
    """
    # 4. The Kill Switch[cite: 2]
    if os.environ.get("LLM_ENABLED", "true").lower() == "false":
        # Returns a safe, deterministic fallback without calling the model[cite: 2]
        return ExtractResponse(
            vendor_name="LLM_DISABLED_FALLBACK",
            total_amount=0.0,
            date=None,
            category=ExpenseCategory.other,
            confidence=0.0,
            needs_review=True
        )

    # Stub mode for local dev without quota[cite: 2]
    if os.environ.get("LLM_STUB") == "1":
        return ExtractResponse(
            vendor_name="Stubbed Vendor",
            total_amount=10.00,
            date="2026-09-10",
            category=ExpenseCategory.office_supplies,
            confidence=0.99,
            needs_review=False
        )

    try:
        return await extract_with_repair(request.text)
    except ValueError:
        raise HTTPException(status_code=422, detail="Data extraction failed. Please review manually.")
    except APITimeoutError:
        # Give a clean 504 on timeouts[cite: 2]
        raise HTTPException(status_code=504, detail="AI provider took too long to respond.")
    except APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Upstream provider error: {e.status_code}")