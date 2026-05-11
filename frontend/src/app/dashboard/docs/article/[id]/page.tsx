'use client';

import { useQuery } from '@tanstack/react-query';
import { kbService } from '@/services/kb';
import { useParams, useRouter } from 'next/navigation';
import { 
  Calendar, 
  Eye, 
  Edit, 
  ChevronLeft,
  Clock,
  Share2,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const { data: article, isLoading } = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => kbService.getArticle(id as string),
    enabled: !!id,
  });

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/public/docs/article/${id}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Public share link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="p-10 space-y-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-muted-foreground font-medium uppercase tracking-widest">Article not found</p>
        <Button onClick={() => router.push('/dashboard/docs')} variant="outline">
          Return to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Article Navigation Bar */}
      <div className="border-b border-border/40 bg-card/20 backdrop-blur-md px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="rounded-xl font-bold text-xs hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to List
        </Button>
        
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
              {article.category.name}
           </Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <article className="max-w-4xl mx-auto px-8 py-12">
            {/* Header Metadata */}
            <header className="mb-10 space-y-6">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase tracking-wider text-[10px] px-3">
                  {article.category.name}
                </Badge>
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                  <Clock className="h-3.5 w-3.5" />
                  {Math.ceil(article.content.split(' ').length / 200)} min read
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
                {article.title}
              </h1>

              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted border border-border overflow-hidden">
                     {/* Avatar Placeholder */}
                     <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold">
                       {article.author.displayName.charAt(0)}
                     </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-tight">{article.author.displayName}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Published on {new Date(article.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary"
                    onClick={handleCopyLink}
                    title="Copy Public Link"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 ml-2"
                      onClick={() => router.push(`/dashboard/docs/article/${id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </header>

            {/* Markdown Content */}
            <MarkdownRenderer content={article.content} />
          </article>
        </div>

        {/* Right Utility Sidebar (Article Context) */}
        <aside className="w-64 border-l border-border/40 p-6 hidden xl:block shrink-0 bg-muted/5">
          <div className="space-y-8 sticky top-0">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Details</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <Eye className="h-4 w-4 opacity-40" />
                  <span className="text-muted-foreground font-medium">{article.viewCount} views</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Calendar className="h-4 w-4 opacity-40" />
                  <span className="text-muted-foreground font-medium">Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Actions</h4>
              <div className="grid grid-cols-1 gap-2">
                 <Button 
                  variant="outline" 
                  className="w-full justify-start rounded-xl text-[11px] font-bold h-9 border-2"
                  onClick={handleCopyLink}
                 >
                   <Share2 className="h-3.5 w-3.5 mr-2 opacity-60" /> Copy Public Share Link
                 </Button>
                 <Button variant="outline" className="w-full justify-start rounded-xl text-[11px] font-bold h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/5 border-rose-500/10">
                   Report Outdated
                 </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
