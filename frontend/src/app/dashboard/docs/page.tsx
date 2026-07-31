'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { kbService } from '@/services/kb';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Cloud,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Folder,
  Layers3,
  Newspaper,
  Plus,
  Search,
  ShieldCheck,
  User,
  Wrench,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryManager } from '@/components/CategoryManager';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const getCategoryIcon = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'cloud': return Cloud;
    case 'shield':
    case 'admin_panel_settings': return ShieldCheck;
    case 'book':
    case 'library_books': return BookOpen;
    case 'build':
    case 'wrench': return Wrench;
    case 'verified':
    case 'verified_user': return FileCheck;
    case 'newspaper':
    case 'new_releases': return Newspaper;
    default: return Folder;
  }
};

const getCategoryDescription = (name: string) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('infra') || nameLower.includes('infrastructure')) {
    return 'Cloud systems, internal networks, VPN, and firewall configurations.';
  }
  if (nameLower.includes('secu') || nameLower.includes('security')) {
    return 'Security guidelines, IAM, and critical data protection procedures.';
  }
  if (nameLower.includes('guide') || nameLower.includes('user guides')) {
    return 'Onboarding guides, maintenance requests, and system tutorials.';
  }
  if (nameLower.includes('trouble') || nameLower.includes('troubleshooting')) {
    return 'FAQs and diagnostic guides for IT support operations.';
  }
  if (nameLower.includes('compli') || nameLower.includes('standard')) {
    return 'ISO/IEC 27001 and corporate data protection references.';
  }
  if (nameLower.includes('release') || nameLower.includes('updates')) {
    return 'Software updates, new features, and bug fix notes.';
  }
  return `Guides and operational procedures related to ${name}.`;
};

export default function DocsPage() {
  const { setHeader } = usePageHeader();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: kbService.getCategories,
  });

  const { data: recentArticles = [], isLoading: recentLoading } = useQuery({
    queryKey: ['kb-recent-documents'],
    queryFn: () => kbService.getRecentDocuments(10),
  });

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(normalizedSearch),
  );
  const filteredRecentArticles = recentArticles.filter((article) =>
    article.title.toLowerCase().includes(normalizedSearch) ||
    article.category.name.toLowerCase().includes(normalizedSearch),
  );

  useEffect(() => {
    setHeader({
      title: 'Knowledge Base',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Documentation' },
      ],
    });
    return () => setHeader(null);
  }, [setHeader]);

  useEffect(() => {
    void router.prefetch('/dashboard/docs/new');
    for (const category of categories) {
      void router.prefetch(`/dashboard/docs/categories/${category.id}`);
    }
    for (const article of recentArticles) {
      void router.prefetch(`/dashboard/docs/${article.id}`);
    }
  }, [categories, recentArticles, router]);

  const totalDocs = categories.reduce((sum, category) => sum + (category._count?.documents || 0), 0);
  const updatedThisWeek = recentArticles.filter((article) => {
    const diffDays = Math.ceil(Math.abs(Date.now() - new Date(article.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;
  const recentViews = recentArticles.reduce((sum, article) => sum + (article.viewCount || 0), 0);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await kbService.initializeCategories();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kb-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['kb-recent-documents'] }),
      ]);
      toast.success('Standard library initialized');
    } catch {
      toast.error('Failed to initialize library');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="workspace-page app-shell pb-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            SysOps Knowledge Base
          </h2>
          <p className="text-xs text-muted-foreground">Technical documentation, procedures, and operational references</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
            <>
              <CategoryManager />
              <Link
                href="/dashboard/docs/new"
                aria-label="Create a new document"
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Button size="sm" className="h-9 shadow-md shadow-primary/10">
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryTile label="Total Documents" value={catsLoading ? '--' : totalDocs} hint="Across all categories" icon={FileText} />
        <SummaryTile label="Updated This Week" value={catsLoading ? '--' : updatedThisWeek} hint="From recent activity" icon={Clock} iconClassName="text-success" />
        <SummaryTile label="Categories" value={catsLoading ? '--' : categories.length} hint="Documentation areas" icon={Layers3} iconClassName="text-info" />
        <SummaryTile label="Recent Views" value={recentLoading ? '--' : recentViews} hint="Latest 10 documents" icon={Eye} iconClassName="text-warning" />
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-md">
        <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/30 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              Document Categories
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Browse documentation by operational area</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base, manuals, or topics..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full border-border/60 bg-card pl-9"
            />
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {catsLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border/40 bg-muted/5 px-4 py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <h3 className="text-base font-bold text-foreground">No Documentation Yet</h3>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">Start by initializing the library or creating a category.</p>
              {user?.role === 'ADMIN' && (
                <Button variant="outline" onClick={handleInitialize} disabled={isInitializing} className="h-9">
                  {isInitializing ? 'Initializing...' : 'Initialize Standard Library'}
                </Button>
              )}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <h3 className="text-base font-bold text-foreground">No categories found for &quot;{search}&quot;</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((category) => {
                const IconComponent = getCategoryIcon(category.icon);
                return (
                  <Link
                    key={category.id}
                    href={`/dashboard/docs/categories/${category.id}`}
                    aria-label={`Open ${category.name}`}
                    className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Card className="flex h-full flex-col justify-between rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                      <div>
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight">
                            {category._count?.documents || 0} docs
                          </Badge>
                        </div>
                        <h3
                          className="mb-1 text-base font-bold group-hover:text-primary"
                          onClick={() => router.push(`/dashboard/docs/categories/${category.id}`)}
                        >
                          {category.name}
                        </h3>
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{getCategoryDescription(category.name)}</p>
                      </div>
                      <div className="mt-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-primary">
                        <span>View documents</span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-md">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 p-3 sm:p-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Recent Documents
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Latest updates across your knowledge base</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{filteredRecentArticles.length} shown</span>
        </div>

        {recentLoading ? (
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3 sm:p-4">
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
          </div>
        ) : filteredRecentArticles.length === 0 ? (
          <div className="m-3 rounded-xl border border-dashed border-border/60 bg-muted/5 px-6 py-10 text-center sm:m-4">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">
              {search ? `No recent documents found for "${search}"` : 'No documents have been published yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3 sm:p-4">
            {filteredRecentArticles.slice(0, 6).map((article) => (
              <Link
                key={article.id}
                href={`/dashboard/docs/${article.id}`}
                aria-label={`Open ${article.title}`}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Card className="h-full rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="secondary" className="max-w-[75%] truncate text-[10px] uppercase tracking-tight">{article.category.name}</Badge>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                  <h4
                    className="mt-3 line-clamp-2 text-sm font-bold leading-snug group-hover:text-primary"
                    onClick={() => router.push(`/dashboard/docs/${article.id}`)}
                  >
                    {article.title}
                  </h4>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{article.author.displayName}</span>
                  <span className="text-border">•</span>
                  <span>{formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}</span>
                  <span className="text-border">•</span>
                  <span>{article.viewCount || 0} views</span>
                </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof FileText;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <Icon className={iconClassName || 'h-4 w-4 text-muted-foreground'} />
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
