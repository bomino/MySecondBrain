interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
}

export function tiptapToMarkdown(doc: TiptapNode): string {
  const lines: string[] = [];
  if (doc.content) {
    for (const node of doc.content) {
      lines.push(nodeToMarkdown(node));
    }
  }
  return lines.join("\n\n");
}

function nodeToMarkdown(node: TiptapNode): string {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${inlineToMarkdown(node)}`;
    }
    case "paragraph":
      return inlineToMarkdown(node);
    case "bulletList":
      return (node.content ?? [])
        .map((item) => `- ${inlineToMarkdown(item.content?.[0] ?? item)}`)
        .join("\n");
    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => `${i + 1}. ${inlineToMarkdown(item.content?.[0] ?? item)}`)
        .join("\n");
    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = inlineToMarkdown(node);
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case "blockquote":
      return (node.content ?? [])
        .map((child) => `> ${nodeToMarkdown(child)}`)
        .join("\n");
    case "horizontalRule":
      return "---";
    default:
      return inlineToMarkdown(node);
  }
}

function inlineToMarkdown(node: TiptapNode): string {
  if (node.type === "text") {
    let text = node.text ?? "";
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") text = `**${text}**`;
        if (mark.type === "italic") text = `*${text}*`;
        if (mark.type === "code") text = `\`${text}\``;
      }
    }
    return text;
  }
  if (!node.content) return "";
  return node.content.map(inlineToMarkdown).join("");
}
