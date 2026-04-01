import { describe, it, expect } from "vitest";
import { extractPlainText } from "@/lib/tiptap-utils";

describe("extractPlainText", () => {
  it("extracts text from a simple paragraph", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("Hello world");
  });

  it("joins multiple paragraphs with newlines", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second" }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("First\nSecond");
  });

  it("handles empty doc", () => {
    const doc = { type: "doc", content: [] };
    expect(extractPlainText(doc)).toBe("");
  });

  it("handles nested content (headings, lists)", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item one" }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("Title\nItem one");
  });
});
