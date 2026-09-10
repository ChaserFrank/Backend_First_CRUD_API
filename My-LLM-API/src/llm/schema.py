from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)

class ExpenseCategory(str, Enum):
    food = "food"
    transport = "transport"
    software = "software"
    office_supplies = "office_supplies"
    other = "other"

class ExtractResponse(BaseModel):
    vendor_name: str
    total_amount: float
    date: Optional[str] = Field(None, description="ISO format YYYY-MM-DD")
    category: ExpenseCategory
    confidence: float = Field(..., ge=0.0, le=1.0)
    needs_review: bool