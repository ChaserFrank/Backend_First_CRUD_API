# Job card

**What it does:** Extracts structured fields (vendor, total, date, and category) from a pasted receipt or invoice text.

**Input:** 
`{ "text": "string, 1-2000 characters" }`

**Output:** 
```json
{
  "vendor_name": "string",
  "total_amount": "float",
  "date": "string (YYYY-MM-DD) or null",
  "category": "one of [food|transport|software|office_supplies|other]",
  "confidence": "float 0.0-1.0",
  "needs_review": "boolean"
}