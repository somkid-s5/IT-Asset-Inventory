'use client';

import { useQuery } from '@tanstack/react-query';
import { kbService } from '@/services/kb';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  ChevronLeft, 
  Plus, 
  Search,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function CategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [search, setSearch] = useState('');

  const { data: category, isLoading } = useQuery({
    queryKey: ['kb-category', id],
    queryFn: () => kbService.getCategory(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (category) {
      setHeader({
        title: category.name,
        breadcrumbs: [
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Knowledge Base', href: '/dashboard/docs' },
          { label: category.name },
        ],
      });
    }
  }, [category, setHeader]);

  const filteredArticles = category?.articles?.filter(art => 
    art.title.toLowerCase().includes(search.toLowerCase()) ||
    art.content.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard/docs')}
            className="rounded-full hover:bg-primary/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input 
              placeholder={`Search in ${category.name}...`} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-card border-border/60"
            />
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/docs/new?categoryId=${id}`)} className="rounded-xl h-10 px-5 font-bold shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Add Article
        </Button>
      </div>

      {/* Articles List - Compact Style */}
      <div className="border border-border/40 rounded-[24px] overflow-hidden bg-card/30 backdrop-blur-sm divide-y divide-border/40">
        {filteredArticles.length === 0 ? (
          <div className="py-20 text-center bg-muted/5">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold opacity-60">No articles here yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to share knowledge in this category.</p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <div 
              key={article.id}
              className="group p-3 px-6 hover:bg-primary/[0.03] transition-all cursor-pointer flex items-center justify-between gap-4"
              onClick={() => router.push(`/dashboard/docs/article/${article.id}`)}
            >
              <div className="flex items-center gap-4 overflow-hidden flex-1">
                <div className="h-8 w-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 overflow-hidden">
                  <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors min-w-[200px]">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter shrink-0">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {article.author.displayName}
                    </div>
                    <div className="h-3 w-[1px] bg-border/50 hidden md:block" />
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(article.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                 <Badge variant="outline" className="hidden sm:inline-flex text-[9px] font-black py-0 h-5 px-2 bg-muted/20 border-border/40">
                    {Math.ceil(article.content.length / 500)} MIN READ
                 </Badge>
                 <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
