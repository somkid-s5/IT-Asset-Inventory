'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { kbService } from '@/services/kb';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Calendar, User, Eye, 
  Tag, Edit, Trash2, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function ArticleDetailPage() {
  const { id } = useParams() as { id: string };
  const { setHeader } = usePageHeader();
  const router = useRouter();
  const { user } = useAuth();

  const { data: document, isLoading } = useQuery({
    queryKey: ['kb-document', id],
    queryFn: () => kbService.getDocument(id),
  });

  useEffect(() => {
    if (document) {
      setHeader({
        title: document.title,
        breadcrumbs: [
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Documentation', href: '/dashboard/docs' },
          { label: document.category.name, href: `/dashboard/docs/category/${document.categoryId}` },
          { label: 'Document' },
        ],
      });
    }
  }, [document, setHeader]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await kbService.deleteDocument(id);
        toast.success('Document deleted');
        router.push('/dashboard/docs');
      } catch (error) {
        toast.error('Failed to delete document');
      }
    }
  };

  if (isLoading) return <div className="p-10 text-center">Loading document...</div>;
  if (!document) return <div className="p-10 text-center">Document not found</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Back and Actions */}
        <div className="flex items-center justify-between">
           <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl gap-2">
              <ChevronLeft className="h-4 w-4" /> Back
           </Button>
           
           {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push(`/dashboard/docs/new?edit=${id}`)}>
                   <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="rounded-xl text-destructive hover:bg-destructive/5" onClick={handleDelete}>
                   <Trash2 className="h-4 w-4" />
                </Button>
             </div>
           )}
        </div>

        {/* Header Section */}
        <div className="space-y-4">
           <Badge variant="secondary" className="rounded-full px-3 py-1 bg-primary/5 text-primary border-primary/10 flex items-center gap-2 w-fit">
              <Tag className="h-3 w-3" /> {document.category.name}
           </Badge>
           <h1 className="text-4xl font-black tracking-tight leading-tight">{document.title}</h1>
           
           <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                 <User className="h-4 w-4" />
                 <span>{document.author.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                 <Calendar className="h-4 w-4" />
                 <span>{new Date(document.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                 <Eye className="h-4 w-4" />
                 <span>{document.viewCount} views</span>
              </div>
           </div>
        </div>

        <hr className="border-border/50" />

        {/* Content Section */}
        <Card className="p-8 md:p-12 rounded-[40px] border-2 shadow-sm bg-card min-h-[500px]">
           <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-a:text-primary prose-img:rounded-3xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {document.content}
              </ReactMarkdown>
           </div>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-center pt-10">
           <Button variant="outline" className="rounded-full px-8 gap-2 shadow-md">
              <Share2 className="h-4 w-4" /> Share with Team
           </Button>
        </div>
      </motion.div>
    </div>
  );
}
