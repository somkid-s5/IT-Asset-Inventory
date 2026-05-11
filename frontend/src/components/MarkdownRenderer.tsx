'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="prose dark:prose-invert prose-slate max-w-none 
      text-foreground
      prose-headings:text-foreground prose-headings:font-black prose-headings:tracking-tight 
      prose-a:text-primary 
      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
      prose-img:rounded-[32px] prose-img:shadow-2xl prose-img:border border-border/40
      prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');

            if (!inline && match) {
              return (
                <div className="relative group my-6 rounded-[20px] overflow-hidden border border-border/40 shadow-2xl bg-[#0d1117]">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {match[1]}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors"
                      onClick={() => handleCopy(codeContent)}
                    >
                      {copiedCode === codeContent ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <SyntaxHighlighter
                    style={atomDark}
                    language={match[1]}
                    PreTag="div"
                    className="!m-0 !bg-transparent !p-6 text-sm leading-relaxed custom-scrollbar"
                    {...props}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code className="text-primary font-mono text-[0.9em]" {...props}>
                {children}
              </code>
            );
          },
          img({ node, ...props }: any) {
            return (
              <div className="my-10">
                <img 
                  {...props} 
                  className="w-full rounded-[24px] border border-border/40 shadow-xl" 
                  alt={props.alt || 'Documentation Image'}
                />
                {props.alt && (
                  <p className="mt-4 text-center text-xs font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center justify-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {props.alt}
                  </p>
                )}
              </div>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
