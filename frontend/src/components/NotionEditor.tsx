'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useMemo } from "react";
import { kbService } from "@/services/kb";
import { toast } from "sonner";

interface NotionEditorProps {
  initialContent?: string;
  onChange: (markdown: string) => void;
}

export default function NotionEditor({ initialContent, onChange }: NotionEditorProps) {
  const editor = useCreateBlockNote({
    uploadFile: async (file: File) => {
      try {
        return await kbService.uploadImage(file);
      } catch (err) {
        toast.error("Failed to upload image");
        return "";
      }
    }
  });

  // Initialize content only once
  useEffect(() => {
    async function loadInitialContent() {
      if (initialContent) {
        const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
        editor.replaceBlocks(editor.document, blocks);
      }
    }
    loadInitialContent();
  }, [editor, initialContent]); // Only run when editor instance is ready or initialContent changes

  return (
    <div data-testid="kb-editor" className="min-h-[420px] overflow-hidden rounded-xl border border-border/40 bg-card p-3 shadow-inner transition-all focus-within:border-primary/40 sm:p-4">
      <BlockNoteView
        editor={editor}
        theme="dark" // Hardcoded dark to match current theme, can be dynamic later
        onChange={async () => {
          const markdown = await editor.blocksToMarkdownLossy(editor.document);
          onChange(markdown);
        }}
        className="min-h-[370px]"
      />
    </div>
  );
}
