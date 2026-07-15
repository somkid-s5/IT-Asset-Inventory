'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { kbService } from '@/services/kb';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Eye, Layout, FileText, Save, Loader2
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

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = useParams();
  const { setHeader } = usePageHeader();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: kbService.getCategories,
  });

  const { data: document, isLoading } = useQuery({
    queryKey: ['kb-document', id],
    queryFn: () => kbService.getDocument(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        content: document.content,
        categoryId: document.categoryId,
      });
    }
  }, [document]);

  useEffect(() => {
    setHeader({
      title: 'Edit Document',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Knowledge Base', href: '/dashboard/docs' },
        { label: 'Edit Document' },
      ],
    });
  }, [setHeader]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.categoryId) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await kbService.updateDocument(id as string, formData);
      queryClient.invalidateQueries({ queryKey: ['kb-document', id] });
      queryClient.invalidateQueries({ queryKey: ['kb-recent-documents'] });
      queryClient.invalidateQueries({ queryKey: ['kb-category'] });
      toast.success('Document updated successfully');
      router.push(`/dashboard/docs/${id}`);
    } catch (error) {
      toast.error('Failed to update document');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-primary/10 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-black tracking-tight">Edit Document</h1>
        </div>
        <div className="flex items-center gap-3">
            <Button
                variant="outline"
                onClick={() => router.back()}
                className="rounded-2xl px-6 h-12 border-2 font-bold"
            >
                Cancel
            </Button>
            <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-2xl px-8 h-12 shadow-xl shadow-primary/20 font-bold"
            >
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
           <Card className="p-6 rounded-[32px] border-2 shadow-lg space-y-6 bg-card">
              <div className="space-y-2 px-1">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Document Title</Label>
                <Input
                  placeholder="Enter title..."
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="h-14 text-2xl font-black rounded-2xl border-none shadow-none focus-visible:ring-0 bg-transparent px-0 placeholder:text-muted-foreground/20"
                />
              </div>

              <Tabs defaultValue="write" className="w-full">
                <div className="flex items-center justify-between mb-4 bg-muted/50 p-1 rounded-xl w-fit border border-border/40">
                   <TabsList className="bg-transparent h-8">
                      <TabsTrigger value="write" className="rounded-lg text-xs gap-2 font-bold uppercase tracking-tight data-[state=active]:bg-card data-[state=active]:text-primary">
                        <Layout className="h-3 w-3" /> Write
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="rounded-lg text-xs gap-2 font-bold uppercase tracking-tight data-[state=active]:bg-card data-[state=active]:text-primary">
                        <Eye className="h-3 w-3" /> Preview
                      </TabsTrigger>
                   </TabsList>
                </div>

                <TabsContent value="write" className="mt-0">
                   {document && (
                    <NotionEditor
                      initialContent={document.content}
                      onChange={(markdown) => setFormData(prev => ({ ...prev, content: markdown }))}
                    />
                   )}
                </TabsContent>

                <TabsContent value="preview" className="mt-0">
                   <div className="min-h-[600px] rounded-[24px] border-2 p-10 md:p-14 bg-card shadow-inner overflow-y-auto prose prose-invert prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-img:rounded-[32px]">
                      {formData.content && typeof formData.content === 'string' ? (
                        <MarkdownRenderer content={formData.content} />
                      ) : (
                        <p className="text-muted-foreground italic text-center pt-20">Nothing to preview yet.</p>
                      )}
                   </div>
                </TabsContent>
              </Tabs>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="p-6 rounded-[32px] border-2 shadow-md space-y-6 bg-muted/20 border-border/40">
              <div className="space-y-3">
                 <Label htmlFor="select-category" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <FileText className="h-3 w-3" /> Category
                 </Label>
                 <Select
                    value={formData.categoryId}
                    onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                 >
                    <SelectTrigger id="select-category" className="rounded-xl h-12 bg-card border-2 border-border/60 font-bold text-sm">
                       <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                       {categories.map((cat) => (
                         <SelectItem key={cat.id} value={cat.id} className="text-sm font-medium">{cat.name}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>

              <div className="pt-6 border-t border-border/40">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Markdown Tips</p>
                 <div className="space-y-3">
                    {[
                        { label: 'Header', code: '# Title' },
                        { label: 'Bold', code: '**Text**' },
                        { label: 'Code', code: '`code`' },
                        { label: 'Table', code: '| A | B |' },
                    ].map((tip, i) => (
                        <div key={i} className="flex items-center justify-between bg-card/40 p-2 px-3 rounded-lg border border-border/40">
                            <span className="text-[10px] font-bold text-muted-foreground">{tip.label}</span>
                            <code className="text-[10px] text-primary">{tip.code}</code>
                        </div>
                    ))}
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
