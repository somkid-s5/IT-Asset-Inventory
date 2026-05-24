'use client';

import { useEffect, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { kbService } from '@/services/kb';
import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Folder, 
  FileText,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryManager } from '@/components/CategoryManager';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function DocsPage() {
  const { setHeader } = usePageHeader();
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: kbService.getCategories,
  });

  const { data: recentArticles = [], isLoading: recentLoading } = useQuery({
    queryKey: ['kb-recent-articles'],
    queryFn: () => kbService.getRecentArticles(5),
  });

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRecentArticles = recentArticles.filter(art => 
    art.title.toLowerCase().includes(search.toLowerCase()) ||
    art.category.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setHeader({
      title: 'Knowledge Base',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Documentation' },
      ],
    });
  }, [setHeader]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header with Search and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documentation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border/60"
          />
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
            <>
              <CategoryManager />
              <Button onClick={() => router.push('/dashboard/docs/new')} size="sm" className="rounded-lg h-9 px-4 font-bold shadow-md shadow-primary/10">
                <Plus className="h-3.5 w-3.5 mr-2" />
                New Article
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-[24px]" />
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[32px] border-muted-foreground/10 bg-muted/5">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold opacity-60">No Documentation Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Start by initializing the library or creating a category.</p>
            {user?.role === 'ADMIN' && (
              <Button variant="outline" onClick={() => kbService.initializeCategories()} className="rounded-xl">
                Initialize Standard Library
              </Button>
            )}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold opacity-60">No categories match &quot;{search}&quot;</h3>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <Card 
              key={cat.id} 
              className="group p-6 rounded-[24px] border-border/60 bg-card hover:border-primary/40 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between h-full"
              onClick={() => router.push(`/dashboard/docs/categories/${cat.id}`)}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Folder className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px] font-bold uppercase tracking-tight px-3 py-0.5">
                    {cat._count?.articles || 0} Articles
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{cat.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  Guides and procedures related to {cat.name.toLowerCase()}.
                </p>
              </div>
              <div className="mt-8 flex items-center text-xs font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Browse Items <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Recently Updated Section */}
      {!catsLoading && categories.length > 0 && (
        <section className="space-y-6 pt-10">
          <h2 className="text-xl font-bold flex items-center gap-2 px-2">
            <FileText className="h-5 w-5 text-primary" /> {search ? 'Search Results' : 'Recently Updated'}
          </h2>
          <div className="grid grid-cols-1 gap-3">
             {recentLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <Skeleton key={i} className="h-20 w-full rounded-2xl" />
               ))
             ) : filteredRecentArticles.length === 0 ? (
               <p className="text-xs text-muted-foreground italic px-2 uppercase tracking-widest opacity-40 py-10 text-center border-2 border-dashed rounded-2xl border-border/40">
                 {search ? `No articles match "${search}"` : 'No updates found yet.'}
               </p>
             ) : (
               filteredRecentArticles.map((art) => (
                <div 
                  key={art.id}
                  onClick={() => router.push(`/dashboard/docs/${art.id}`)}
                  className="p-5 rounded-2xl border bg-card/50 flex items-center justify-between group hover:bg-primary/[0.02] cursor-pointer transition-colors border-border/40"
                >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors truncate">{art.title}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                          {art.category.name} • Updated {formatDistanceToNow(new Date(art.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
               ))
             )}
          </div>
        </section>
      )}
    </div>
  );
}
