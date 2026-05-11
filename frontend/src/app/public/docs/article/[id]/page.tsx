'use client';

import { useQuery } from '@tanstack/react-query';
import { kbService } from '@/services/kb';
import { useParams, useRouter } from 'next/navigation';
import { 
  Clock,
  Share2,
  Bookmark,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { BrandMark } from '@/components/BrandMark';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export default function PublicArticlePage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: article, isLoading } = useQuery({
    queryKey: ['kb-article-public', id],
    queryFn: () => kbService.getArticle(id as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-12 w-48 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-[600px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <BrandMark className="mb-8 scale-125" />
        <h1 className="text-2xl font-black mb-2">404 - Document Not Found</h1>
        <p className="text-muted-foreground mb-8">The requested guide may have been moved or deleted.</p>
        <Button onClick={() => router.push('/')} variant="outline" className="rounded-xl px-8">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Public Header */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <BrandMark className="h-8" />
             <div className="h-4 w-[1px] bg-border/60" />
             <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Verified System Document</span>
             </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Secure Operations Center</p>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/30 border border-border/40 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

          {/* Metadata */}
          <header className="mb-12 space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 font-bold uppercase tracking-wider text-[10px] px-3 py-1 rounded-full">
                {article.category.name}
              </Badge>
              <div className="h-1 w-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                <Clock className="h-3.5 w-3.5" />
                {Math.ceil(article.content.split(' ').length / 200)} min read
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] text-foreground">
              {article.title}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t border-border/40">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-lg shadow-inner border border-primary/10">
                   {article.author.displayName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">{article.author.displayName}</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    IT Infrastructure Team • {new Date(article.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl h-10 border-2 font-bold text-xs">
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl h-10 border-2 font-bold text-xs">
                  <Bookmark className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <MarkdownRenderer content={article.content} />

          <footer className="mt-20 pt-10 border-t border-border/40 flex flex-col items-center gap-4 text-center">
             <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-2">
                <BrandMark className="h-6 opacity-40 grayscale" />
             </div>
             <p className="text-xs text-muted-foreground font-medium">
               This is an official technical document from the InfraPilot Knowledge Base.<br />
               Internal use only. Unauthorized distribution is prohibited.
             </p>
          </footer>
        </motion.article>
      </main>
    </div>
  );
}
