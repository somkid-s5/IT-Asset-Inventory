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

// Map descriptions to Thai translations based on category names
const getCategoryDescription = (name: string) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('infra') || nameLower.includes('โครงสร้างพื้นฐาน')) {
    return 'ข้อมูลเกี่ยวกับระบบเซิร์ฟเวอร์ Cloud Computing (AWS/Azure) และระบบเครือข่ายภายในองค์กร รวมถึงการตั้งค่า VPN และ Firewall';
  }
  if (nameLower.includes('secu') || nameLower.includes('ความปลอดภัย')) {
    return 'แนวทางปฏิบัติเพื่อความปลอดภัยทางไซเบอร์ การจัดการสิทธิ์การเข้าถึง (IAM) และนโยบายการเข้ารหัสข้อมูลที่สำคัญ';
  }
  if (nameLower.includes('guide') || nameLower.includes('คู่มือ')) {
    return 'คู่มือการเริ่มต้นใช้งานระบบสำหรับพนักงานใหม่ วิธีการแจ้งซ่อม และการใช้งานฟังก์ชันต่างๆ ขององค์กร';
  }
  if (nameLower.includes('trouble') || nameLower.includes('แก้ปัญหา')) {
    return 'รวบรวมวิธีแก้ไขปัญหาที่พบบ่อย (FAQ) และแนวทางการวินิจฉัยข้อผิดพลาดเบื้องต้นสำหรับเจ้าหน้าที่ไอที';
  }
  if (nameLower.includes('compli') || nameLower.includes('standard')) {
    return 'เอกสารอ้างอิงมาตรฐาน ISO/IEC 27001 และนโยบาย PDPA ขององค์กร เพื่อการปฏิบัติตามกฎระเบียบที่ถูกต้อง';
  }
  if (nameLower.includes('release') || nameLower.includes('อัปเดต')) {
    return 'ติดตามข่าวสารการอัปเดตซอฟต์แวร์ ฟีเจอร์ใหม่ที่เพิ่มเข้ามา และการแก้ไขข้อบกพร่องในระบบเวอร์ชั่นล่าสุด';
  }
  return `คู่มือและขั้นตอนการดำเนินงานที่เกี่ยวข้องกับ ${name}`;
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
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="ค้นหาข้อมูลความรู้ แมนนวล หรือหัวข้อที่ต้องการ..." 
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

      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#05160e] to-[#0e3b26] text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between border-b-4 border-primary shadow-xl">
        <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-display">
            คลังความรู้ <span className="text-primary">SysOps</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed font-medium">
            เข้าถึงข้อมูลเชิงเทคนิค คู่มือการใช้งาน และมาตรฐานความปลอดภัยสำหรับระบบโครงสร้างพื้นฐานระดับองค์กรได้ในที่เดียว
          </p>
          <div className="flex flex-wrap gap-3 pt-2 justify-center md:justify-start">
            {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
              <Button 
                onClick={() => router.push('/dashboard/docs/new')} 
                className="bg-primary text-primary-foreground rounded-full hover:bg-primary/90 font-bold px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                สร้างบทความใหม่
              </Button>
            )}
            {categories.length === 0 && user?.role === 'ADMIN' && (
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
            )}
          </div>
        </div>

        {/* Hero Stats */}
        <div className="relative z-10 grid grid-cols-2 gap-4 mt-6 md:mt-0 shrink-0 w-full md:w-auto">
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 text-center px-8">
            <div className="text-primary text-3xl font-bold font-display">{catsLoading ? '...' : totalDocs}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">บทความทั้งหมด</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 text-center px-8">
            <div className="text-primary text-3xl font-bold font-display">{catsLoading ? '...' : updatedThisWeek}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">อัปเดตสัปดาห์นี้</div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">หมวดหมู่เอกสาร</h3>
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
            <h3 className="text-base font-bold opacity-60">ไม่พบหมวดหมู่ที่ค้นหา &quot;{search}&quot;</h3>
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
                      {cat._count?.documents || 0} บทความ
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors duration-200">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {desc}
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
                  <span>ดูเอกสารทั้งหมด</span>
                  <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Recently Updated Section */}
      {!catsLoading && categories.length > 0 && (
        <section className="space-y-6 pt-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> {search ? 'ผลการค้นหาเอกสาร' : 'เอกสารอัปเดตล่าสุด'}
          </h2>
          <div className="grid grid-cols-1 gap-3">
             {recentLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <Skeleton key={i} className="h-20 w-full rounded-lg" />
               ))
             ) : filteredRecentArticles.length === 0 ? (
               <p className="text-xs text-muted-foreground italic px-2 uppercase tracking-widest opacity-40 py-10 text-center border-2 border-dashed rounded-lg border-border/40">
                 {search ? `ไม่พบข้อมูลที่ตรงกับ "${search}"` : 'ยังไม่มีบทความอัปเดตล่าสุด'}
               </p>
             ) : (
               filteredRecentArticles.map((art) => (
                 <div 
                   key={art.id}
                   onClick={() => router.push(`/dashboard/docs/${art.id}`)}
                   className="p-5 rounded-lg border bg-card/50 flex items-center justify-between group hover:bg-primary/[0.02] cursor-pointer transition-colors border-border/40"
                 >
                     <div className="flex items-center gap-4 overflow-hidden">
                       <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                         <FileText className="h-5 w-5 opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                       </div>
                       <div className="overflow-hidden">
                         <h4 className="text-sm font-bold group-hover:text-primary transition-colors truncate">{art.title}</h4>
                         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                           {art.category.name} • อัปเดตเมื่อ {formatDistanceToNow(new Date(art.updatedAt), { addSuffix: true })}
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

      {/* Support / Help Section Footer */}
      <div className="bg-[#f0f9f4] dark:bg-primary/[0.03] border border-primary/20 dark:border-primary/10 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className="w-12 h-12 bg-white dark:bg-card rounded-full flex items-center justify-center text-primary border border-primary/20 shrink-0 shadow-sm">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h5 className="text-base font-bold text-foreground">ไม่พบสิ่งที่ต้องการค้นหา?</h5>
            <p className="text-xs text-muted-foreground">ทีมซัพพอร์ตของเราพร้อมช่วยเหลือคุณตลอด 24 ชั่วโมง</p>
          </div>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto justify-center">
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard/tickets')}
            className="border-border/60 bg-white hover:bg-muted text-foreground text-xs"
          >
            ติดต่อสอบถาม
          </Button>
          <Button 
            onClick={() => router.push('/dashboard/tickets/new')}
            className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold"
          >
            เปิดตั๋วปัญหาใหม่
          </Button>
        </div>
      </div>
    </div>
  );
}
