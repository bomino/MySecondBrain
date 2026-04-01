interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
}

export function extractPlainText(doc: TiptapNode): string {
  const lines: string[] = [];
  collectText(doc, lines);
  return lines.join("\n");
}

function collectText(node: TiptapNode, lines: string[]): void {
  if (node.type === "text" && node.text) {
    const lastIdx = lines.length - 1;
    if (lastIdx >= 0) {
      lines[lastIdx] += node.text;
    } else {
      lines.push(node.text);
    }
    return;
  }

  const isBlock = [
    "paragraph",
    "heading",
    "listItem",
    "codeBlock",
    "blockquote",
  ].includes(node.type);

  if (isBlock) {
    lines.push("");
  }

  if (node.content) {
    for (const child of node.content) {
      collectText(child, lines);
    }
  }
}

export function extractWikiLinks(doc: TiptapNode): string[] {
  const text = extractPlainText(doc);
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}
