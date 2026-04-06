import { describe, it, expect } from "vitest";
import { parseSSELine } from "@/lib/sse-reader";

describe("parseSSELine", () => {
  it("should parse token event", () => {
    // #given
    const lines = ['event: token', 'data: {"text": "Hello"}'];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result).toEqual({ event: "token", data: { text: "Hello" } });
  });

  it("should parse sources event", () => {
    // #given
    const lines = [
      "event: sources",
      'data: {"sources": [{"type": "note", "id": "1", "title": "Test", "similarity": 0.8}], "routed_to": "cloud", "has_sensitive_context": false}',
    ];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result?.event).toBe("sources");
    expect(result?.data.sources).toHaveLength(1);
  });

  it("should parse done event", () => {
    // #given
    const lines = ["event: done", "data: {}"];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result).toEqual({ event: "done", data: {} });
  });

  it("should parse error event", () => {
    // #given
    const lines = ["event: error", 'data: {"message": "Connection refused"}'];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result?.event).toBe("error");
    expect(result?.data.message).toBe("Connection refused");
  });

  it("should parse suggestions event", () => {
    // #given
    const lines = [
      "event: suggestions",
      'data: {"suggestions": ["Question 1?", "Question 2?", "Question 3?"]}',
    ];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result?.event).toBe("suggestions");
    expect(result?.data.suggestions).toEqual(["Question 1?", "Question 2?", "Question 3?"]);
  });

  it("should return null for empty lines", () => {
    // #when
    const result = parseSSELine([]);

    // #then
    expect(result).toBeNull();
  });
});
