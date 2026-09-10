import os
from fastapi import APIRouter, HTTPException
from src.llm.schema import ExtractRequest, ExtractResponse, ExpenseCategory
from src.llm.client import extract_with_repair

router = APIRouter()


@router.post("/extract", response_model=ExtractResponse)
async def extract_receipt_fields(request: ExtractRequest):
    """
    POST /extract
    Takes raw receipt text and returns cleaned, validated JSON fields.
    """
    if os.environ.get("LLM_STUB") == "1":
        print("STUB MODE ON: Returning fake data.")
        return ExtractResponse(
            vendor_name="Stubbed Coffee Shop",
            total_amount=4.50,
            date="2026-09-10",  # Using current date for context context consistency
            category=ExpenseCategory.food,
            confidence=0.95,
            needs_review=False
        )

    try:
        # Call the repair loop wrapper[cite: 2]
        validated_data = await extract_with_repair(request.text)
        return validated_data
    except ValueError as e:
        # 422: "I understood your request, but I could not produce a valid result"[cite: 2]
        raise HTTPException(
            status_code=422,
            detail="The extraction model could not produce valid data for this input. Please review manually."
        )