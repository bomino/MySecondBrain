"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect } from "react";
import { Bold, Italic, Heading1, Heading2, List as ListIcon, Code } from "lucide-react";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onUpdate,
  placeholder = "Start writing...",
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose-editor ProseMirror",
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="flex gap-0.5 p-2" style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold size={15} />} />
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic size={15} />} />
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={15} />} />
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={15} />} />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<ListIcon size={15} />} />
        <ToolbarBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<Code size={15} />} />
      </div>
      <div style={{ backgroundColor: "var(--background)" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 transition-colors duration-150",
      )}
      style={{
        color: active ? "var(--accent-light)" : "var(--text-secondary)",
        backgroundColor: active ? "var(--accent-muted)" : "transparent",
      }}
    >
      {icon}
    </button>
  );
}
