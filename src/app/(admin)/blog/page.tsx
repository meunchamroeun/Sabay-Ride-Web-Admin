"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BookOpenText, Eye, EyeOff, Loader2, Pencil, Plus } from "lucide-react";
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

  const posts = query.data?.content ?? [];
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;

  return (
    <>
      <PageHeader
        title={t("nav.blog")}
        subtitle={t("blog.subtitle")}
        actions={
          <Button size="sm" onClick={() => setEditing("new")} disabled={query.isError}>
            <Plus className="size-3.5" /> {t("blog.newPost")}
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="ALL">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="PUBLISHED">{t("blog.status.PUBLISHED")}</TabsTrigger>
          <TabsTrigger value="DRAFT">{t("blog.status.DRAFT")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {filter === "ALL" && query.data && publishedCount < 3 && (
        <p className="rounded-xl border border-dashed border-warning/50 bg-warning/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {t("blog.minimumNote", { count: publishedCount })}
        </p>
      )}

      {query.isError ? (
        <Card>
          <ApiPendingOrError error={query.error} endpoint="GET /api/v1/admin/blog/posts" requirement="FR-65" onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          {posts.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full gap-0 overflow-hidden py-0">
                <div className="relative grid h-28 place-items-center bg-gradient-to-br from-primary/20 via-accent to-chart-2/20">
                  {p.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <BookOpenText className="size-8 text-primary/60" />
                  )}
                  <span className="absolute top-3 left-3">
                    <StatusBadge status={p.status} ns="blog" />
                  </span>
                </div>
                <CardContent className="flex flex-1 flex-col gap-2 py-4">
                  <h3 className="line-clamp-2 font-heading font-semibold">{p.title}</h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{p.content.replace(/^\s*(#+|[-*>]|\d+\.)\s+/gm, "").replace(/[*_`]/g, "").slice(0, 160)}</p>
                  <p className="mt-auto pt-2 text-[11px] text-muted-foreground">
                    {p.authorName} ·{" "}
                    {p.status === "PUBLISHED"
                      ? t("blog.publishedOn", { date: formatDate(p.publishedAt, i18n.language) })
                      : t("blog.updatedOn", { date: formatDate(p.updatedAt, i18n.language) })}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}>
                      <Pencil /> {t("blog.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant={p.status === "PUBLISHED" ? "outline" : "default"}
                      className="flex-1"
                      disabled={toggle.isPending && toggle.variables?.id === p.id}
                      onClick={() => toggle.mutate(p)}
                    >
                      {toggle.isPending && toggle.variables?.id === p.id ? (
                        <Loader2 className="animate-spin" />
                      ) : p.status === "PUBLISHED" ? (
                        <EyeOff />
                      ) : (
                        <Eye />
                      )}
                      {p.status === "PUBLISHED" ? t("blog.unpublish") : t("blog.publish")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      {query.data && posts.length === 0 && (
        <Card>
          <EmptyState />
        </Card>
      )}

      <BlogEditorSheet post={editing} onClose={() => setEditing(null)} />
    </>
  );
}
