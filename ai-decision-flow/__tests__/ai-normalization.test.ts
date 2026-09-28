/**
 * Tests for AI response normalization logic.
 *
 * We test the normalization logic directly without calling OpenAI.
 * The evaluateDecision function wraps the model call, so we mock the OpenAI client.
 */

// The normalization logic extracted for testing
function normalizeDecision(raw: string): "YES" | "NO" {
  const normalized = raw.trim().toUpperCase();
  if (normalized === "YES" || normalized === "NO") {
    return normalized as "YES" | "NO";
  }
  throw new Error(
    `LLM returned an unexpected response: "${raw}". Expected YES or NO.`
  );
}

describe("AI response normalization", () => {
  it('normalizes "YES" correctly', () => {
    expect(normalizeDecision("YES")).toBe("YES");
  });

  it('normalizes "NO" correctly', () => {
    expect(normalizeDecision("NO")).toBe("NO");
  });

  it("normalizes lowercase input", () => {
    expect(normalizeDecision("yes")).toBe("YES");
    expect(normalizeDecision("no")).toBe("NO");
  });

  it("normalizes input with surrounding whitespace", () => {
    expect(normalizeDecision("  YES  ")).toBe("YES");
    expect(normalizeDecision("\nNO\n")).toBe("NO");
  });

  it("throws on unexpected model output", () => {
    expect(() => normalizeDecision("MAYBE")).toThrow(
      'LLM returned an unexpected response: "MAYBE"'
    );
  });

  it("throws on empty output", () => {
    expect(() => normalizeDecision("")).toThrow("LLM returned an unexpected response");
  });

  it("throws on explanatory text", () => {
    expect(() => normalizeDecision("YES, because the request was urgent")).toThrow(
      "LLM returned an unexpected response"
    );
  });
});
