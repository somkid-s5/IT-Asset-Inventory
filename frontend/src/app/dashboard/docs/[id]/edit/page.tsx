"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useAuth } from "@/contexts/AuthContext";
import { kbService } from "@/services/kb";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Eye,
  Layout,
  FileText,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  KnowledgeDocumentLinks,
  type KnowledgeDocumentLinkValues,
} from "@/components/KnowledgeDocumentLinks";

const NotionEditor = dynamic(() => import("@/components/NotionEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[420px] w-full items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/20 animate-pulse">
      <div className="flex flex-col items-center gap-2 opacity-20">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest">
          Loading Editor...
        </p>
      </div>
    </div>
  ),
});

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = useParams();
  const { setHeader } = usePageHeader();
  const { user, loading: authLoading } = useAuth();
  const canAuthor = user?.role === "ADMIN" || user?.role === "EDITOR";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    categoryId: "",
  });
  const [links, setLinks] = useState<KnowledgeDocumentLinkValues>({
    applications: [],
    assets: [],
    vms: [],
    databases: [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["kb-categories"],
    queryFn: kbService.getCategories,
  });

  const { data: document, isLoading } = useQuery({
    queryKey: ["kb-document", id],
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
      setLinks({
        applications:
          document.applicationLinks?.map((link) => link.application.id) ?? [],
        assets: document.assetLinks?.map((link) => link.asset.id) ?? [],
        vms: document.vmLinks?.map((link) => link.vm.id) ?? [],
        databases:
          document.databaseLinks?.map((link) => link.database.id) ?? [],
      });
    }
  }, [document]);

  useEffect(() => {
    setHeader({
      title: "Edit Document",
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Knowledge Base", href: "/dashboard/docs" },
        { label: "Edit Document" },
      ],
    });
  }, [setHeader]);

  useEffect(() => {
    if (!authLoading && !canAuthor) {
      router.replace(`/dashboard/docs/${id}`);
    }
  }, [authLoading, canAuthor, id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.categoryId) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await kbService.updateDocument(id as string, {
        ...formData,
        applicationIds: links.applications,
        assetIds: links.assets,
        vmIds: links.vms,
        databaseIds: links.databases,
      });
      queryClient.invalidateQueries({ queryKey: ["kb-document", id] });
      queryClient.invalidateQueries({ queryKey: ["kb-recent-documents"] });
      queryClient.invalidateQueries({ queryKey: ["kb-category"] });
      toast.success("Document updated successfully");
      window.dispatchEvent(new Event("kb-document-saved"));
      router.push(`/dashboard/docs/${id}`);
    } catch (error) {
      toast.error("Failed to update document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !canAuthor) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 shrink-0 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
            Edit Document
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-10 rounded-xl px-4 font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10 rounded-xl px-5 shadow-md shadow-primary/15 font-bold"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-5">
          <Card className="space-y-5 rounded-2xl border shadow-sm p-4 sm:p-5 bg-card">
            <div className="space-y-2 px-1">
              <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Document Title
              </Label>
              <Input
                placeholder="Enter title..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="h-11 rounded-xl border-none bg-transparent px-0 text-xl font-black shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/20 sm:text-2xl"
              />
            </div>

            <Tabs defaultValue="write" className="w-full">
              <div className="mb-3 flex w-fit items-center justify-between rounded-lg border border-border/40 bg-muted/50 p-1">
                <TabsList className="bg-transparent h-8">
                  <TabsTrigger
                    value="write"
                    className="rounded-lg text-xs gap-2 font-bold uppercase tracking-tight data-[state=active]:bg-card data-[state=active]:text-primary"
                  >
                    <Layout className="h-3 w-3" /> Write
                  </TabsTrigger>
                  <TabsTrigger
                    value="preview"
                    className="rounded-lg text-xs gap-2 font-bold uppercase tracking-tight data-[state=active]:bg-card data-[state=active]:text-primary"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="write" className="mt-0">
                {document && (
                  <NotionEditor
                    initialContent={document.content}
                    onChange={(markdown) =>
                      setFormData((prev) => ({ ...prev, content: markdown }))
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="preview" className="mt-0">
                <div className="min-h-[420px] max-w-none overflow-y-auto rounded-xl border bg-card p-5 shadow-inner prose prose-invert prose-slate prose-headings:font-black prose-headings:tracking-tight prose-img:rounded-2xl sm:p-8">
                  {formData.content && typeof formData.content === "string" ? (
                    <MarkdownRenderer content={formData.content} />
                  ) : (
                    <p className="text-muted-foreground italic text-center pt-20">
                      Nothing to preview yet.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
          <KnowledgeDocumentLinks value={links} onChange={setLinks} />
        </div>

        <div className="space-y-6">
          <Card className="space-y-5 rounded-2xl border border-border/40 bg-muted/20 p-4 shadow-sm sm:p-5">
            <div className="space-y-3">
              <Label
                htmlFor="select-category"
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground"
              >
                <FileText className="h-3 w-3" /> Category
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) =>
                  setFormData({ ...formData, categoryId: val })
                }
              >
                <SelectTrigger
                  id="select-category"
                  className="h-10 rounded-xl border bg-card text-sm font-bold"
                >
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2">
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="text-sm font-medium"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border/40 pt-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Markdown Tips
              </p>
              <div className="space-y-2">
                {[
                  { label: "Header", code: "# Title" },
                  { label: "Bold", code: "**Text**" },
                  { label: "Code", code: "`code`" },
                  { label: "Table", code: "| A | B |" },
                ].map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-card/40 p-2 px-3 rounded-lg border border-border/40"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {tip.label}
                    </span>
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
