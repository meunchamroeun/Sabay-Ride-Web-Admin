"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  PenLine,
  Quote,
  Sparkles,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { opsApi } from "@/lib/api/endpoints";
import type { BlogPost, BlogPostInput } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/status-badge";
import { RequiredMark } from "@/components/common/required-mark";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

/** Create / edit a travel article (FR-65). Markdown, as decided in SRS §17 — no rich-text editor. */
export function BlogEditorSheet({ post, onClose }: { post: BlogPost | "new" | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const isEditing = !!post && post !== "new";

  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
        <SheetHeader className="shrink-0 border-b bg-card/60 px-6 py-4 backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-primary uppercase">
                {post === "new" ? t("blog.newPost") : t("blog.edit")}
              </span>
              {isEditing && <StatusBadge status={post.status} ns="blog" />}
            </div>
            {isEditing && (
              <span className="text-xs text-muted-foreground">
                {post.status === "PUBLISHED"
                  ? t("blog.publishedOn", { date: formatDate(post.publishedAt, i18n.language) })
                  : t("blog.updatedOn", { date: formatDate(post.updatedAt, i18n.language) })}
              </span>
            )}
          </div>
          <SheetTitle className="font-heading text-lg sm:text-xl font-semibold leading-tight text-foreground">
            {post && post !== "new" ? post.title : t("blog.untitled")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {post === "new" ? t("blog.newPost") : t("blog.edit")}
          </SheetDescription>
        </SheetHeader>
        {post && <EditorBody key={post === "new" ? "new" : post.id} post={post === "new" ? null : post} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function EditorBody({ post, onClose }: { post: BlogPost | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [cover, setCover] = useState(post?.coverImageUrl ?? "");
  const [coverImgFailed, setCoverImgFailed] = useState(false);
  const [content, setContent] = useState(post?.content ?? "");
  const [viewMode, setViewMode] = useState<"write" | "preview" | "split">("write");
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null);

  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
    onClose();
  };
  const onError = (e: unknown) => {
    if (e instanceof ApiError && e.field) setFieldError({ field: e.field, message: e.message });
    else toast.error(e instanceof ApiError ? `${e.message} (${e.code})` : String(e));
  };

  const save = useMutation({
    mutationFn: () => {
      const body: BlogPostInput = { title: title.trim(), slug: slug.trim(), content, coverImageUrl: cover.trim() || undefined };
      return post ? opsApi.updatePost(post.id, body) : opsApi.createPost(body);
    },
    onSuccess: () => done(post ? t("blog.saved") : t("blog.created")),
    onError,
  });

  const err = (f: string) => (fieldError?.field === f ? fieldError.message : null);
  const valid = title.trim() && slug.trim() && content.trim();

  // Word & reading statistics
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Quick markdown insertion helper
  const insertMarkdown = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = document.getElementById("post-content") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = content.slice(start, end) || placeholder;
    const replacement = before + selected + after;
    const nextContent = content.slice(0, start) + replacement + content.slice(end);
    setContent(nextContent);
    setFieldError(null);
    setTimeout(() => {
      textarea.focus();
      const cursor = start + before.length + selected.length;
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable form content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="post-title" className={cn("text-sm font-medium", err("title") && "text-destructive")}>
              {t("blog.fields.title")} <RequiredMark />
            </Label>
            <span className="text-[11px] text-muted-foreground">{title.length}/200</span>
          </div>
          <Input
            id="post-title"
            value={title}
            maxLength={200}
            aria-invalid={!!err("title")}
            placeholder={i18n.language === "km" ? "បញ្ចូលចំណងជើងអត្ថបទ..." : "e.g., Ultimate 3-Day Motorbike Loop in Siem Reap..."}
            className="h-11 text-base font-medium font-heading transition-shadow focus-visible:ring-2"
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
              setFieldError(null);
            }}
          />
          {err("title") && <p className="text-xs text-destructive">{err("title")}</p>}
        </div>

        {/* Slug and Cover URL Row */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* URL Slug */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-slug" className={cn("text-sm font-medium", err("slug") && "text-destructive")}>
                {t("blog.fields.slug")} <RequiredMark />
              </Label>
              {title && (
                <button
                  type="button"
                  onClick={() => {
                    setSlug(slugify(title));
                    setSlugTouched(true);
                  }}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  title={t("blog.regenerateSlug")}
                >
                  <Sparkles className="size-3" />
                  <span>{t("blog.regenerateSlug")}</span>
                </button>
              )}
            </div>
            <div className="relative flex rounded-lg border bg-muted/20 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
              <span className="inline-flex items-center border-r bg-muted/40 px-3 text-xs text-muted-foreground select-none">
                /blog/
              </span>
              <Input
                id="post-slug"
                value={slug}
                className="border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
                aria-invalid={!!err("slug")}
                placeholder="article-url-slug"
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                  setFieldError(null);
                }}
              />
            </div>
            {err("slug") ? (
              <p className="text-xs text-destructive">{err("slug")}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                sabayride.com/blog/{slug || "…"}
              </p>
            )}
          </div>

          {/* Cover image URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-cover" className="text-sm font-medium">
                {t("blog.fields.cover")}
              </Label>
              {cover && (
                <button
                  type="button"
                  onClick={() => {
                    setCover("");
                    setCoverImgFailed(false);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-destructive"
                >
                  {t("blog.removeCover")}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="post-cover"
                value={cover}
                placeholder="https://images.unsplash.com/..."
                className="pr-8"
                onChange={(e) => {
                  setCover(e.target.value);
                  setCoverImgFailed(false);
                }}
              />
              {cover && (
                <button
                  type="button"
                  onClick={() => {
                    setCover("");
                    setCoverImgFailed(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {i18n.language === "km" ? "រូបភាពគុណភាពខ្ពស់ 16:9 សម្រាប់បង្ហាញលើកម្មវិធី" : "High-resolution 16:9 image displayed on app cards"}
            </p>
          </div>
        </div>

        {/* Cover image preview card */}
        {cover && (
          <div className="relative overflow-hidden rounded-xl border bg-muted/30">
            <div className="relative aspect-[21/9] max-h-44 w-full overflow-hidden bg-muted/60">
              {!coverImgFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={title || "Cover preview"}
                  onError={() => setCoverImgFailed(true)}
                  className="size-full object-cover transition duration-300"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1.5 p-4 text-center text-xs text-muted-foreground">
                  <ImageIcon className="size-6 opacity-40" />
                  <span>{i18n.language === "km" ? "មិនអាចផ្ទុករូបភាពបាន — សូមពិនិត្យ URL ម្តងទៀត" : "Failed to load image preview — check the URL"}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                  {t("blog.coverPreview")}
                </span>
                <span className="text-xs text-white/80 line-clamp-1">{title || t("blog.untitled")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Markdown Content Section */}
        <div className="space-y-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <Label className={cn("text-sm font-medium", err("content") && "text-destructive")}>
                {t("blog.fields.content")} <RequiredMark />
              </Label>

              <TabsList className="h-8">
                <TabsTrigger value="write" className="flex items-center gap-1.5 text-xs">
                  <PenLine className="size-3.5" />
                  <span>{t("blog.write")}</span>
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-1.5 text-xs">
                  <Eye className="size-3.5" />
                  <span>{t("blog.preview")}</span>
                </TabsTrigger>
                <TabsTrigger value="split" className="hidden md:flex items-center gap-1.5 text-xs">
                  <Columns2 className="size-3.5" />
                  <span>{t("blog.split")}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Markdown Toolbar (visible in write & split mode) */}
            {(viewMode === "write" || viewMode === "split") && (
              <div className="my-2 flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1 text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Bold (**text**)"
                  onClick={() => insertMarkdown("**", "**", "bold text")}
                >
                  <Bold className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Italic (*text*)"
                  onClick={() => insertMarkdown("*", "*", "italic text")}
                >
                  <Italic className="size-3.5" />
                </Button>
                <span className="h-4 w-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Heading 2 (## Title)"
                  onClick={() => insertMarkdown("## ", "\n", "Heading 2")}
                >
                  <Heading2 className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Heading 3 (### Title)"
                  onClick={() => insertMarkdown("### ", "\n", "Heading 3")}
                >
                  <Heading3 className="size-3.5" />
                </Button>
                <span className="h-4 w-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Bullet list (- Item)"
                  onClick={() => insertMarkdown("- ", "\n", "List item")}
                >
                  <List className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Numbered list (1. Item)"
                  onClick={() => insertMarkdown("1. ", "\n", "Numbered item")}
                >
                  <ListOrdered className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Blockquote (> Quote)"
                  onClick={() => insertMarkdown("> ", "\n", "Quote text")}
                >
                  <Quote className="size-3.5" />
                </Button>
                <span className="h-4 w-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Code block"
                  onClick={() => insertMarkdown("```\n", "\n```", "code")}
                >
                  <Code className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Link ([title](url))"
                  onClick={() => insertMarkdown("[", "](https://...)", "link text")}
                >
                  <LinkIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Divider (---)"
                  onClick={() => insertMarkdown("\n---\n")}
                >
                  <Minus className="size-3.5" />
                </Button>
              </div>
            )}

            {/* Mode: WRITE */}
            <TabsContent value="write" className="mt-0">
              <Textarea
                id="post-content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setFieldError(null);
                }}
                rows={18}
                className="min-h-[400px] font-mono text-[13.5px] leading-relaxed p-4 rounded-xl border bg-background/50 focus-visible:ring-2"
                placeholder={t("blog.markdownHint")}
              />
            </TabsContent>

            {/* Mode: PREVIEW */}
            <TabsContent value="preview" className="mt-0">
              <div className="min-h-[400px] rounded-xl border bg-card p-6 sm:p-8">
                {content.trim() ? (
                  <article className="prose-blog max-w-none">
                    {cover && !coverImgFailed && (
                      <div className="mb-6 overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt="" className="aspect-[21/9] max-h-60 w-full object-cover" />
                      </div>
                    )}
                    <h1 className="mb-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {title || t("blog.untitled")}
                    </h1>
                    <div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-4 text-xs text-muted-foreground">
                      <span>{post?.authorName || "SabayRide Editorial"}</span>
                      <span>•</span>
                      <span>{wordCount} {t("blog.words")}</span>
                      <span>•</span>
                      <span>~{readTime} {t("blog.readTime")}</span>
                    </div>
                    <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                  </article>
                ) : (
                  <div className="flex min-h-60 flex-col items-center justify-center text-center text-muted-foreground">
                    <PenLine className="mb-2 size-8 opacity-30" />
                    <p>{t("common.empty")}</p>
                    <p className="text-xs">{t("blog.markdownHint")}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Mode: SPLIT (Side by side on desktop) */}
            <TabsContent value="split" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  id="post-content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setFieldError(null);
                  }}
                  rows={18}
                  className="min-h-[460px] font-mono text-[13px] leading-relaxed p-4 rounded-xl border bg-background/50 focus-visible:ring-2"
                  placeholder={t("blog.markdownHint")}
                />
                <div className="max-h-[460px] overflow-y-auto rounded-xl border bg-card p-5">
                  <article className="prose-blog max-w-none">
                    <h2 className="mb-2 font-heading text-xl font-bold text-foreground">
                      {title || t("blog.untitled")}
                    </h2>
                    {content.trim() ? (
                      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                    ) : (
                      <p className="text-muted-foreground text-xs">{t("common.empty")}</p>
                    )}
                  </article>
                </div>
              </div>
            </TabsContent>

            {err("content") && <p className="text-xs text-destructive mt-1.5">{err("content")}</p>}
          </Tabs>
        </div>
      </div>

      {/* PINNED BOTTOM ACTION BAR - Do not move, keep pinned here */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur-sm p-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left side statistics */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {wordCount} <span className="font-normal text-muted-foreground">{t("blog.words")}</span>
          </span>
          <span>•</span>
          <span>
            ~{readTime} {t("blog.readTime")}
          </span>
        </div>

        {/* Right side action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {save.isPending && <Loader2 className="animate-spin" />}
            {post ? t("common.save") : t("blog.saveDraft")}
          </Button>
        </div>
      </div>
    </div>
  );
}
