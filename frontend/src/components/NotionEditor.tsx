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
        const url = await kbService.uploadImage(file);
        const filename = url.split('/').pop();
        return `/uploads/kb/${filename}`;
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
    <div data-testid="kb-editor" className="min-h-[600px] bg-card rounded-[24px] border-2 border-border/40 p-4 focus-within:border-primary/40 transition-all shadow-inner overflow-hidden">
      <BlockNoteView
        editor={editor}
        theme="dark" // Hardcoded dark to match current theme, can be dynamic later
        onChange={async () => {
          const markdown = await editor.blocksToMarkdownLossy(editor.document);
          onChange(markdown);
        }}
        className="min-h-[550px]"
      />
    </div>
  );
}
