import os
from fastapi import APIRouter, HTTPException
from src.llm.schema import ExtractRequest, ExtractResponse, ExpenseCategory

router = APIRouter()

@router.post("/extract", response_model=ExtractResponse)
async def extract_receipt_fields(request: ExtractRequest):
    """
    POST /extract
    Takes raw receipt text and returns cleaned, validated JSON fields.
    """
    # STUB MODE: Save quota during development
    if os.environ.get("LLM_STUB") == "1":
        print("STUB MODE ON: Returning fake data.")
        return ExtractResponse(
            vendor_name="Stubbed Coffee Shop",
            total_amount=4.50,
            date="2026-09-10",
            category=ExpenseCategory.food,
            confidence=0.95,
            needs_review=False
        )

    raise HTTPException(status_code=501, detail="Model call not yet implemented")