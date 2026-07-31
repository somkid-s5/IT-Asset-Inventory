'use client';

import { useQuery } from '@tanstack/react-query';
import { kbService } from '@/services/kb';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EditArticlePage from './edit/page';
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
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';

export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      void router.prefetch(`/dashboard/docs/${id}/edit`);
    }
  }, [id, router]);

  useEffect(() => {
    const handleDocumentSaved = () => setIsEditing(false);
    window.addEventListener('kb-document-saved', handleDocumentSaved);
    return () => window.removeEventListener('kb-document-saved', handleDocumentSaved);
  }, []);

  const { data: document, isLoading } = useQuery({
    queryKey: ['kb-document', id],
    queryFn: () => kbService.getDocument(id as string),
    enabled: !!id,
  });

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/docs/${id}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Public share link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
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

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-muted-foreground font-medium uppercase tracking-widest">Document not found</p>
        <Button onClick={() => router.push('/dashboard/docs')} variant="outline">
          Return to Library
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return <EditArticlePage />;
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="flex min-h-full flex-col"
    >
      {/* Document Navigation Bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-card/80 px-4 py-3 backdrop-blur-md sm:px-6">
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
              {document.category.name}
           </Badge>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Main Content Scroll Area */}
        <div className="min-w-0 flex-1">
          <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            {/* Header Metadata */}
            <header className="mb-8 space-y-5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase tracking-wider text-[10px] px-3">
                  {document.category.name}
                </Badge>
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                  <Clock className="h-3.5 w-3.5" />
                  {Math.ceil(document.content.split(' ').length / 200)} min read
                </div>
              </div>

              <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                {document.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted border border-border overflow-hidden">
                     {/* Avatar Placeholder */}
                     <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold">
                       {document.author.displayName.charAt(0)}
                     </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-tight">{document.author.displayName}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Published on {new Date(document.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
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
                      className="ml-2 h-9 w-9 rounded-xl bg-primary/5 text-primary hover:bg-primary/10"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit Document"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </header>

            {/* Markdown Content */}
            <MarkdownRenderer content={document.content} />
          </article>
        </div>

        {/* Right Utility Sidebar (Document Context) */}
        <aside className="hidden w-64 shrink-0 border-l border-border/40 bg-muted/5 p-5 xl:block">
          <div className="sticky top-20 space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Details</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <Eye className="h-4 w-4 opacity-40" />
                  <span className="text-muted-foreground font-medium">{document.viewCount} views</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Calendar className="h-4 w-4 opacity-40" />
                  <span className="text-muted-foreground font-medium">Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Actions</h4>
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
                 {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                   <Button
                     variant="outline"
                     className="w-full justify-start rounded-xl text-[11px] font-bold h-9 text-rose-500 hover:text-white hover:bg-rose-600 border-rose-500/20"
                     onClick={async () => {
                       if (window.confirm('Are you sure you want to delete this document?')) {
                         try {
                           await kbService.deleteDocument(id as string);
                           toast.success('Document deleted successfully');
                           router.push('/dashboard/docs');
                         } catch {
                           toast.error('Failed to delete document');
                         }
                       }
                     }}
                   >
                     Delete Document
                   </Button>
                 )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
