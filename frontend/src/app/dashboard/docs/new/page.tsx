'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { kbService } from '@/services/kb';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, Eye, Layout, Save, Loader2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

const NotionEditor = dynamic(() => import('@/components/NotionEditor'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-[600px] w-full bg-muted/20 animate-pulse rounded-[24px] border-2 border-dashed border-border/40 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 opacity-20">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest">Loading Editor...</p>
      </div>
    </div>
  )
});

export default function ArticleFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');
  const { setHeader } = usePageHeader();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: kbService.getCategories,
  });

  const { data: existingArticle } = useQuery({
    queryKey: ['kb-article', editId],
    queryFn: () => kbService.getArticle(editId!),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingArticle) {
      setFormData({
        title: existingArticle.title,
        content: existingArticle.content,
        categoryId: existingArticle.categoryId,
      });
    }
  }, [existingArticle]);

  useEffect(() => {
    setHeader({
      title: editId ? 'Edit Article' : 'New Knowledge Base Article',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Documentation', href: '/dashboard/docs' },
        { label: editId ? 'Edit' : 'New' },
      ],
    });
  }, [editId, setHeader]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.categoryId) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        await kbService.updateArticle(editId, formData);
        toast.success('Article updated');
      } else {
        await kbService.createArticle(formData);
        toast.success('Article published');
      }
      router.push('/dashboard/docs');
    } catch (error) {
      toast.error('Failed to save article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-black">{editId ? 'Edit Article' : 'Write Documentation'}</h1>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="rounded-2xl px-8 h-12 shadow-xl shadow-primary/20 font-bold"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : (editId ? 'Save Changes' : 'Publish Article')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Editor Main */}
        <div className="lg:col-span-3 space-y-6">
           <Card className="p-6 rounded-[32px] border-2 shadow-lg space-y-6 bg-card">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Article Title</Label>
                <Input 
                  placeholder="e.g. How to configure the core switch..."
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="h-14 text-2xl font-black rounded-2xl border-none shadow-none focus-visible:ring-0 bg-transparent px-0"
                />
              </div>

              <Tabs defaultValue="write" className="w-full">
                <div className="flex items-center justify-between mb-4 bg-muted/50 p-1 rounded-xl w-fit">
                   <TabsList className="bg-transparent h-8">
                      <TabsTrigger value="write" className="rounded-lg text-xs gap-2"><Layout className="h-3 w-3" /> Write</TabsTrigger>
                      <TabsTrigger value="preview" className="rounded-lg text-xs gap-2"><Eye className="h-3 w-3" /> Preview</TabsTrigger>
                   </TabsList>
                </div>

                <TabsContent value="write" className="mt-0">
                   <NotionEditor 
                     onChange={(markdown) => setFormData(prev => ({ ...prev, content: markdown }))} 
                   />
                </TabsContent>

                <TabsContent value="preview" className="mt-0">
                   <Card className="min-h-[600px] rounded-[24px] border-2 p-8 md:p-12">
                      {formData.content && typeof formData.content === 'string' ? (
                        <MarkdownRenderer content={formData.content} />
                      ) : (
                        <p className="text-muted-foreground italic text-center pt-20">Nothing to preview yet.</p>
                      )}
                   </Card>
                </TabsContent>
              </Tabs>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="p-6 rounded-[32px] border-2 shadow-md space-y-6 bg-muted/20">
              <div className="space-y-3">
                 <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <FileText className="h-3 w-3" /> Category
                 </Label>
                 <Select 
                    value={formData.categoryId} 
                    onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                 >
                    <SelectTrigger className="rounded-xl h-12 bg-card border-2 border-border/60 font-bold text-sm shadow-sm">
                       <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                       {categories.map((cat) => (
                         <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Writing Help</p>
                 <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
                    <p>Type <code className="text-primary font-bold">/</code> to insert blocks (images, tables, lists).</p>
                    <p>Highlight text to show the formatting menu.</p>
                    <p>Images can be pasted directly into the editor.</p>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
