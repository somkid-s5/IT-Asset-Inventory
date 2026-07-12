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
  ChevronRight,
  Cloud, 
  ShieldCheck, 
  Wrench, 
  FileCheck, 
  Newspaper,
  HelpCircle,
  Clock,
  User,
  ArrowRight
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

// Map icons dynamically to Lucide components
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

// Map descriptions based on category names
const getCategoryDescription = (name: string) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('infra') || nameLower.includes('infrastructure')) {
    return 'Information about cloud computing systems (AWS/Azure), internal networks, VPN, and firewall configurations.';
  }
  if (nameLower.includes('secu') || nameLower.includes('security')) {
    return 'Cybersecurity guidelines, Identity & Access Management (IAM), and critical data encryption policies.';
  }
  if (nameLower.includes('guide') || nameLower.includes('user guides')) {
    return 'Onboarding guides for new employees, maintenance requests, and general system tutorials.';
  }
  if (nameLower.includes('trouble') || nameLower.includes('troubleshooting')) {
    return 'A collection of frequently asked questions (FAQs) and diagnostic guides for IT support.';
  }
  if (nameLower.includes('compli') || nameLower.includes('standard')) {
    return 'Reference documentation for ISO/IEC 27001 standard and corporate data protection compliance (PDPA).';
  }
  if (nameLower.includes('release') || nameLower.includes('updates')) {
    return 'Track software updates, new features, and bug fixes for the latest version.';
  }
  return `Guides and operational procedures related to ${name}.`;
};

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
    queryKey: ['kb-recent-documents'],
    queryFn: () => kbService.getRecentDocuments(10),
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

  // Calculate dynamic stats
  const totalDocs = categories.reduce((sum, cat) => sum + (cat._count?.documents || 0), 0);
  const updatedThisWeek = recentArticles.filter(art => {
    const diffTime = Math.abs(new Date().getTime() - new Date(art.updatedAt).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-6"
    >
      {/* Hero Banner Section (Moved to Top) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#05160e] to-[#0e3b26] text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between border-b-4 border-primary shadow-xl">
        <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-display">
            SysOps <span className="text-primary">Knowledge Base</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed font-medium">
            Access technical documentation, user manuals, and security standards for enterprise infrastructure in one place.
          </p>
          {categories.length === 0 && user?.role === 'ADMIN' && (
            <div className="flex flex-wrap gap-3 pt-2 justify-center md:justify-start">
              <Button 
                variant="outline" 
                onClick={async () => {
                  await kbService.initializeCategories();
                  window.location.reload();
                }} 
                className="border-white/20 text-white hover:bg-white/10 rounded-full"
              >
                Initialize Standard Library
              </Button>
            </div>
          )}
        </div>

        {/* Hero Stats */}
        <div className="relative z-10 grid grid-cols-2 gap-4 mt-6 md:mt-0 shrink-0 w-full md:w-auto">
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 text-center px-8">
            <div className="text-primary text-3xl font-bold font-display">{catsLoading ? '...' : totalDocs}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Total Documents</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 text-center px-8">
            <div className="text-primary text-3xl font-bold font-display">{catsLoading ? '...' : updatedThisWeek}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Updated This Week</div>
          </div>
        </div>
      </div>

      {/* Header with Search and Actions (Moved under Hero) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base, manuals, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border/60"
          />
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
            <>
              <CategoryManager />
              <Button onClick={() => router.push('/dashboard/docs/new')} size="sm" className="rounded-xl h-9 px-4 font-bold shadow-md shadow-primary/10">
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Document Categories</h3>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[32px] border-border/40 bg-muted/5">
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
            <h3 className="text-base font-bold opacity-60">No categories found for &quot;{search}&quot;</h3>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const IconComponent = getCategoryIcon(cat.icon);
            const desc = getCategoryDescription(cat.name);
            return (
              <Card 
                key={cat.id} 
                className="group p-6 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full"
                onClick={() => router.push(`/dashboard/docs/categories/${cat.id}`)}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-14 w-14 bg-primary/5 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <IconComponent className="h-7 w-7 text-primary group-hover:text-white transition-colors duration-300" />
                    </div>
                    <Badge variant="secondary" className="rounded-full text-[10px] font-bold uppercase tracking-tight px-3 py-0.5">
                      {cat._count?.documents || 0} Documents
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors duration-200">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {desc}
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
                  <span>View All Documents</span>
                  <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
