import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { enqueueAIJob } from "@/lib/queue";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return badRequest("No files provided");
  }

  const results = [];

  for (const file of files) {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown") && !file.name.endsWith(".txt")) {
      results.push({ file: file.name, status: "skipped", reason: "not a markdown file" });
      continue;
    }

    const text = await file.text();
    const title = file.name.replace(/\.(md|markdown|txt)$/, "");

    const tiptapContent = markdownToTiptap(text);

    const note = await db.note.create({
      data: {
        userId: user.id!,
        title,
        content: tiptapContent,
        contentPlain: extractPlainText(tiptapContent as any),
        isSensitive: false,
      },
    });

    const plainText = extractPlainText(tiptapContent as any);
    await enqueueAIJob(user.id!, "note", note.id, "embed", {
      text: `${title}\n${plainText}`,
      is_sensitive: false,
    });

    results.push({ file: file.name, status: "imported", noteId: note.id });
  }

  return success({ imported: results.filter((r) => r.status === "imported").length, results });
}

function markdownToTiptap(markdown: string): object {
  const lines = markdown.split("\n");
  const content: object[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: [{ type: "text", text: headingMatch[2] }],
      });
      continue;
    }

    if (line.trim() === "") {
      continue;
    }

    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const textContent: object[] = [];
    let lastIndex = 0;
    let match;

    while ((match = wikiLinkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        textContent.push({ type: "text", text: line.slice(lastIndex, match.index) });
      }
      textContent.push({ type: "text", text: `[[${match[1]}]]` });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      textContent.push({ type: "text", text: line.slice(lastIndex) });
    }

    if (textContent.length > 0) {
      content.push({ type: "paragraph", content: textContent });
    }
  }

  return { type: "doc", content };
}
