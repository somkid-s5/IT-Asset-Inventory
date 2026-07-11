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
  ArrowRight,
  Bookmark,
  ChevronRight,
  Eye,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

// Helper to get initials from author display name
const getInitials = (name: string) => {
  if (!name) return 'IT';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function CategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Fetch current category detail
  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ['kb-category', id],
    queryFn: () => kbService.getCategory(id as string),
    enabled: !!id,
  });

  // Fetch all categories for the left sidebar
  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: kbService.getCategories,
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

  if (catLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-60 lg:col-span-1 rounded-xl" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!category) return null;

  // Filter documents in category
  const filteredDocuments = (category.documents || []).filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.content.toLowerCase().includes(search.toLowerCase())
  );

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'popular') {
      return (b.viewCount || 0) - (a.viewCount || 0);
    }
    if (sortBy === 'az') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage) || 1;
  const paginatedDocuments = sortedDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalViews = (category.documents || []).reduce((sum, doc) => sum + (doc.viewCount || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-6">
      {/* Category Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#05160e] to-[#0e3b26] text-white p-8 sm:p-10 border-b-4 border-primary shadow-xl">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/80 mb-4 font-semibold">
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/dashboard/docs')}>Knowledge Base</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary">{category.name}</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-display mb-3">{category.name}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-primary">
                <FileText className="h-3.5 w-3.5" />
                {category.documents?.length || 0} Documents
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-accent-purple">
                <Eye className="h-3.5 w-3.5 text-[#a855f7]" />
                {totalViews} Views
              </div>
            </div>
          </div>
          <Button 
            onClick={() => router.push(`/dashboard/docs/new?categoryId=${id}`)}
            className="bg-primary text-primary-foreground rounded-full hover:bg-primary/95 font-bold px-6 shadow-lg shadow-primary/20 shrink-0 self-start md:self-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Document
          </Button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar Filter */}
        <aside className="lg:col-span-1 space-y-6">
          
          {/* Subcategory List */}
          <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">All Categories</h4>
            <div className="space-y-1">
              {categories.map((cat) => {
                const isActive = cat.id === id;
                return (
                  <button 
                    key={cat.id}
                    onClick={() => router.push(`/dashboard/docs/categories/${cat.id}`)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="bg-muted text-[10px] px-2 py-0.5 rounded-full border border-border/20 text-muted-foreground">
                      {cat._count?.documents || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Articles Grid */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Search & View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 border border-border/60 rounded-xl shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={`Search in ${category.name}...`} 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs rounded-lg bg-background border-border/60"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-xs text-muted-foreground font-semibold">Sort by:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-background border border-border/60 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="latest">Latest</option>
                <option value="popular">Popular</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          </div>

          {/* Articles list */}
          {paginatedDocuments.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-2xl border-border/40 bg-muted/5">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-base font-bold opacity-60">No documents found in this category</h3>
              <p className="text-xs text-muted-foreground mt-1">Start sharing knowledge by creating a new document.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedDocuments.map((doc, idx) => {
                const initials = getInitials(doc.author.displayName);
                const isFeatured = idx === 0 && currentPage === 1 && (doc.title.toLowerCase().includes('policy') || doc.title.toLowerCase().includes('important'));
                const plainTextSnippet = doc.content
                  .replace(/[#*`>_\-]/g, '') // remove markdown syntax
                  .replace(/\[.*?\]\(.*?\)/g, '') // remove links
                  .substring(0, 140) + '...';

                return (
                  <Card 
                    key={doc.id}
                    onClick={() => router.push(`/dashboard/docs/${doc.id}`)}
                    className={`group p-6 rounded-xl transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-lg ${
                      isFeatured 
                        ? 'bg-[#f0f9f4] dark:bg-primary/[0.03] border-2 border-primary/30 relative overflow-hidden' 
                        : 'bg-card border-border/60 hover:border-primary/30'
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-[9px] uppercase tracking-widest font-black rounded-bl-xl">
                        Featured
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <Bookmark className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors ml-auto" />
                      </div>
                      <h4 className="text-base font-bold mb-2 group-hover:text-primary transition-colors duration-200 leading-snug line-clamp-2">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                        {plainTextSnippet}
                      </p>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center gap-3 pt-4 border-t border-border/40 mb-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {initials}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-foreground leading-tight">{doc.author.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors">
                        <span>Read More</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 pt-6">
              <Button 
                variant="outline" 
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(i + 1)}
                  className="h-8 w-8 text-xs font-bold rounded-lg"
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline" 
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
