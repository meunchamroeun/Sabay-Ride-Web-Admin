"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen,
  BookOpenText,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileEdit,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { opsApi } from "@/lib/api/endpoints";
import type { BlogPost, BlogStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { ApiPendingOrError } from "@/components/common/api-pending";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { BlogEditorSheet } from "./blog-editor-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhenApiReady } from "@/components/common/coming-soon";

type Filter = BlogStatus | "ALL";

export default function BlogPage() {
  return (
    <WhenApiReady feature="blog">
      <BlogScreen />
    </WhenApiReady>
  );
}

function BlogScreen() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);

  const query = useQuery({
    queryKey: ["admin-blog", filter],
    queryFn: () => opsApi.blogPosts({ status: filter === "ALL" ? undefined : filter, size: 50 }),
  });

  const toggle = useMutation({
    mutationFn: (p: BlogPost) => (p.status === "PUBLISHED" ? opsApi.unpublishPost(p.id) : opsApi.publishPost(p.id)),
    onSuccess: (p) => {
      toast.success(p.status === "PUBLISHED" ? t("blog.published") : t("blog.unpublished"));
      qc.invalidateQueries({ queryKey: ["admin-blog"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? `${e.message} (${e.code})` : String(e)),
  });

  const allPosts = useMemo(() => query.data?.content ?? [], [query.data?.content]);
  const publishedCount = allPosts.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = allPosts.filter((p) => p.status === "DRAFT").length;

  // Filter by search term
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return allPosts;
    const q = searchQuery.toLowerCase().trim();
    return allPosts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
    );
  }, [allPosts, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.blog")}
        subtitle={t("blog.subtitle")}
        actions={
          <Button size="sm" onClick={() => setEditing("new")} disabled={query.isError}>
            <Plus className="size-3.5" /> {t("blog.newPost")}
          </Button>
        }
      />

      {/* Top Stat Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("blog.total")}</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <BookOpen className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-heading">{allPosts.length}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {allPosts.length > 0 ? `${publishedCount} live, ${draftCount} drafts` : "No articles created yet"}
          </p>
        </Card>

        <Card className="p-4 transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("blog.status.PUBLISHED")}</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
            {publishedCount}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Visible to all mobile app customers</p>
        </Card>

        <Card className="p-4 transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("blog.status.DRAFT")}</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <FileEdit className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
            {draftCount}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Work-in-progress articles</p>
        </Card>

        <Card className="p-4 transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">App Launch Readiness</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-heading">
            {publishedCount >= 3 ? "Ready" : `${publishedCount}/3`}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {publishedCount >= 3 ? "Target met: 3+ articles live" : "Requires at least 3 articles before launch"}
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="ALL">
              {t("common.all")} ({allPosts.length})
            </TabsTrigger>
            <TabsTrigger value="PUBLISHED">
              {t("blog.status.PUBLISHED")} ({publishedCount})
            </TabsTrigger>
            <TabsTrigger value="DRAFT">
              {t("blog.status.DRAFT")} ({draftCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("blog.search")}
            className="h-9 pl-9 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Minimum requirement notice banner */}
      {filter === "ALL" && query.data && publishedCount < 3 && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
          <Sparkles className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{t("blog.minimumNote", { count: publishedCount })}</span>
        </div>
      )}

      {/* Article Cards Grid */}
      {query.isError ? (
        <Card>
          <ApiPendingOrError
            error={query.error}
            endpoint="GET /api/v1/admin/blog/posts"
            requirement="FR-65"
            onRetry={() => query.refetch()}
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {query.isLoading &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}

          {filteredPosts.map((p, i) => {
            const words = p.content.trim() ? p.content.trim().split(/\s+/).length : 0;
            const readTime = Math.max(1, Math.ceil(words / 200));

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  {/* Card Cover Image with Hover Zoom */}
                  <div
                    onClick={() => setEditing(p)}
                    className="relative h-48 w-full cursor-pointer overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-chart-2/15"
                  >
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImageUrl}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <BookOpenText className="size-10 text-primary/40 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    )}
                    {/* Status Badge floating */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={p.status} ns="blog" />
                    </div>

                    {/* Reading time pill floating */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                      <Clock className="size-3" />
                      <span>{readTime} min read</span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>

                  {/* Card Body */}
                  <CardContent className="flex flex-1 flex-col p-5">
                    <h3
                      onClick={() => setEditing(p)}
                      className="cursor-pointer font-heading text-base font-semibold text-foreground transition-colors hover:text-primary line-clamp-2"
                    >
                      {p.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {p.content
                        .replace(/^\s*(#+|[-*>]|\d+\.)\s+/gm, "")
                        .replace(/[*_`]/g, "")
                        .slice(0, 180)}
                    </p>

                    <div className="mt-auto pt-4">
                      <div className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">{p.authorName}</span>
                        <span>
                          {p.status === "PUBLISHED"
                            ? t("blog.publishedOn", { date: formatDate(p.publishedAt, i18n.language) })
                            : t("blog.updatedOn", { date: formatDate(p.updatedAt, i18n.language) })}
                        </span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="size-3.5" />
                          <span>{t("blog.edit")}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={p.status === "PUBLISHED" ? "outline" : "default"}
                          className="flex-1 text-xs"
                          disabled={toggle.isPending && toggle.variables?.id === p.id}
                          onClick={() => toggle.mutate(p)}
                        >
                          {toggle.isPending && toggle.variables?.id === p.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : p.status === "PUBLISHED" ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                          <span>{p.status === "PUBLISHED" ? t("blog.unpublish") : t("blog.publish")}</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {query.data && filteredPosts.length === 0 && (
        <Card className="p-8">
          <EmptyState />
          {searchQuery && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            </div>
          )}
        </Card>
      )}

      <BlogEditorSheet post={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
