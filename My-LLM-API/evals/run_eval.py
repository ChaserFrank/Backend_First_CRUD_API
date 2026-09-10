import json
import requests

API_URL = "http://127.0.0.1:8000/extract"


def run_evals():
    with open("evals/cases.json", "r") as f:
        cases = json.load(f)

    correct = 0
    total = len(cases)

    print(f"Running {total} evaluations...\n")

    for i, case in enumerate(cases, 1):
        payload = {"text": case["input"]}
        # Ensure LLM_STUB is off in your server environment to run the real model
        response = requests.post(API_URL, json=payload)

        if response.status_code != 200:
            print(f"Case {i} FAILED: HTTP {response.status_code}")
            continue

        data = response.json()
        expected = case["expected"]

        # We grade based on category classification and review flag
        cat_match = data["category"] == expected["category"]
        review_match = data["needs_review"] == expected["needs_review"]

        if cat_match and review_match:
            correct += 1
            print(f"Case {i} PASSED")
        else:
            print(f"Case {i} FAILED. Expected {expected}, got {data['category']} (Review: {data['needs_review']})")

    print(f"\nFinal Score: {correct}/{total} ({(correct / total) * 100:.1f}%)")


if __name__ == "__main__":
    run_evals()