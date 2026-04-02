import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { enqueueAIJob } from "@/lib/queue";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const clipSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  content: z.string().optional(),
  isSensitive: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = clipSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { url, title, content, isSensitive } = parsed.data;
  const noteTitle = title || url;
  const plainText = content || "";

  const tiptapContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: `Source: ${url}` }],
      },
      ...(plainText
        ? plainText.split("\n").filter(Boolean).map((line) => ({
            type: "paragraph",
            content: [{ type: "text", text: line }],
          }))
        : []),
    ],
  };

  const note = await db.note.create({
    data: {
      userId: user.id!,
      title: noteTitle,
      content: tiptapContent,
      contentPlain: `Source: ${url}\n${plainText}`,
      isSensitive,
    },
  });

  if (plainText.length > 0) {
    await enqueueAIJob(user.id!, "note", note.id, "embed", {
      text: `${noteTitle}\n${plainText}`,
      is_sensitive: isSensitive,
    });
  }

  return success(note, 201);
}
