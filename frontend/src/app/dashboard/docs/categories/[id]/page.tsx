"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import { kbService } from "@/services/kb";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const getInitials = (name: string) => {
  if (!name) return "IT";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function CategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const categoryId = id as string;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["kb-category", categoryId],
    queryFn: () => kbService.getCategory(categoryId),
    enabled: !!categoryId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["kb-categories"],
    queryFn: kbService.getCategories,
  });

  useEffect(() => {
    if (category) {
      setHeader({
        title: category.name,
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Knowledge Base", href: "/dashboard/docs" },
          { label: category.name },
        ],
      });
    }
  }, [category, setHeader]);

  useEffect(() => {
    if (categoryId) {
      void router.prefetch(`/dashboard/docs/new?categoryId=${categoryId}`);
    }
  }, [categoryId, router]);

  useEffect(() => {
    if (category?.documents) {
      category.documents.forEach((document) => {
        void router.prefetch(`/dashboard/docs/${document.id}`);
        void router.prefetch(`/dashboard/docs/${document.id}/edit`);
      });
    }
  }, [category, router]);

  if (categoryLoading) {
    return (
      <div className="w-full space-y-5 pb-12">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Skeleton className="h-52 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!category) return null;

  const documents = category.documents || [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredDocuments = documents.filter(
    (document) =>
      document.title.toLowerCase().includes(normalizedSearch) ||
      document.content.toLowerCase().includes(normalizedSearch),
  );
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortBy === "popular") return (b.viewCount || 0) - (a.viewCount || 0);
    if (sortBy === "az") return a.title.localeCompare(b.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage) || 1;
  const paginatedDocuments = sortedDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalViews = documents.reduce(
    (sum, document) => sum + (document.viewCount || 0),
    0,
  );

  return (
    <div className="w-full space-y-5 pb-12">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-sidebar-background to-sidebar-accent p-5 text-sidebar-foreground shadow-sm sm:p-6">
        <nav
          className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-sidebar-foreground/60"
          aria-label="Breadcrumb"
        >
          <button
            type="button"
            className="transition-colors hover:text-primary"
            onClick={() => router.push("/dashboard/docs")}
          >
            Knowledge Base
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary">{category.name}</span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="mb-2 truncate text-2xl font-black tracking-tight sm:text-3xl">
              {category.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 rounded-full border-0 bg-sidebar-foreground/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-sidebar-foreground/10">
                <FileText className="h-3.5 w-3.5" />
                {documents.length} Documents
              </Badge>
              <Badge className="gap-1.5 rounded-full border-0 bg-sidebar-foreground/10 px-2.5 py-1 text-[11px] font-bold text-sidebar-foreground/80 hover:bg-sidebar-foreground/10">
                <Eye className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                {totalViews} Views
              </Badge>
            </div>
          </div>
          {(user?.role === "ADMIN" || user?.role === "EDITOR") && (
            <Link
              href={`/dashboard/docs/new?categoryId=${categoryId}`}
              aria-label="Create a new document"
              className="shrink-0 self-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:self-auto"
            >
              <Button className="h-9 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/95">
                <Plus className="mr-2 h-4 w-4" />
                Create New Document
              </Button>
            </Link>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              All Categories
            </h3>
            <div className="space-y-1">
              {categories.map((item) => {
                const isActive = item.id === categoryId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/docs/categories/${item.id}`)
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="rounded-full border border-border/20 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {item._count?.documents || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="relative w-full sm:max-w-sm sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search in ${category.name}...`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-xl border-border/60 bg-background pl-9 text-xs"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <label
                htmlFor="category-sort"
                className="text-[11px] font-semibold text-muted-foreground"
              >
                Sort by
              </label>
              <select
                id="category-sort"
                aria-label="Sort documents"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-border/60 bg-background px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="latest">Latest</option>
                <option value="popular">Popular</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {filteredDocuments.length}{" "}
              {filteredDocuments.length === 1 ? "document" : "documents"}
            </p>
            {normalizedSearch && (
              <p className="text-[11px] text-muted-foreground">
                Filtered by “{search.trim()}”
              </p>
            )}
          </div>

          {paginatedDocuments.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/40 bg-muted/5 py-14 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
              <h3 className="text-sm font-bold opacity-60">
                No documents found in this category
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Start sharing knowledge by creating a new document.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {paginatedDocuments.map((document, index) => {
                const initials = getInitials(document.author.displayName);
                const isFeatured =
                  index === 0 &&
                  currentPage === 1 &&
                  (document.title.toLowerCase().includes("policy") ||
                    document.title.toLowerCase().includes("important"));
                const plainTextSnippet = `${document.content
                  .replace(/[#*`>_\-]/g, "")
                  .replace(/\[.*?\]\(.*?\)/g, "")
                  .substring(0, 140)}...`;

                return (
                  <Link
                    key={document.id}
                    href={`/dashboard/docs/${document.id}`}
                    aria-label={`Open ${document.title}`}
                    className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Card
                      className={`relative flex h-full flex-col justify-between rounded-2xl p-4 transition-all duration-300 hover:shadow-md ${
                        isFeatured
                          ? "border-2 border-primary/30 bg-primary/5"
                          : "border-border/60 bg-card hover:border-primary/30"
                      }`}
                    >
                      {isFeatured && (
                        <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary-foreground">
                          Featured
                        </div>
                      )}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {document.viewCount || 0} views
                          </span>
                        </div>
                        <h4
                          className="mb-1.5 line-clamp-2 text-sm font-bold leading-snug transition-colors duration-200 group-hover:text-primary sm:text-base"
                          onClick={() =>
                            router.push(`/dashboard/docs/${document.id}`)
                          }
                        >
                          {document.title}
                        </h4>
                        <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                          {plainTextSnippet}
                        </p>
                      </div>

                      <div className="mt-auto">
                        <div className="mb-3 flex items-center gap-2.5 border-t border-border/40 pt-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-bold leading-tight text-foreground">
                              {document.author.displayName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Updated{" "}
                              {formatDistanceToNow(
                                new Date(document.updatedAt),
                                { addSuffix: true },
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-primary transition-colors group-hover:text-primary/80">
                          <span>Read More</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((previous) => Math.max(previous - 1, 1))
                }
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, index) => (
                <Button
                  key={index}
                  variant={currentPage === index + 1 ? "default" : "outline"}
                  aria-label={`Page ${index + 1}`}
                  onClick={() => setCurrentPage(index + 1)}
                  className="h-8 w-8 rounded-lg text-xs font-bold"
                >
                  {index + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((previous) =>
                    Math.min(previous + 1, totalPages),
                  )
                }
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
