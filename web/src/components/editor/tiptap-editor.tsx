"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useState } from "react";
import { Bold, Italic, Heading1, Heading2, List as ListIcon, Code, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiAssistMenu } from "./ai-assist-menu";

const lowlight = createLowlight(common);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface TiptapEditorProps {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
  saveStatus?: "idle" | "saving" | "saved";
}

export function TiptapEditor({
  content,
  onUpdate,
  placeholder = "Start writing...",
  editable = true,
  saveStatus,
}: TiptapEditorProps) {
  const [wordCount, setWordCount] = useState(0);

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
      setWordCount(countWords(editor.getText()));
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
        setWordCount(countWords(editor.getText()));
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="flex gap-0.5 p-2" style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold size={15} />} label="Bold" />
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic size={15} />} label="Italic" />
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={15} />} label="Heading 1" />
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={15} />} label="Heading 2" />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<ListIcon size={15} />} label="Bullet list" />
        <ToolbarBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<Code size={15} />} label="Code block" />
      </div>
      <div style={{ backgroundColor: "var(--background)" }}>
        <EditorContent editor={editor} />
        <AiAssistMenu editor={editor} />
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-faint)" }}>
        <span>{wordCount} words</span>
        <span>
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1" style={{ color: "var(--success)" }}>
              <Check size={12} /> Saved
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function ToolbarBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
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
