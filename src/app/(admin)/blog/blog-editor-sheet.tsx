"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { opsApi } from "@/lib/api/endpoints";
import type { BlogPost, BlogPostInput } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  const { t } = useTranslation();
  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b p-5">
          <SheetDescription>{post === "new" ? t("blog.newPost") : t("blog.edit")}</SheetDescription>
          <SheetTitle className="font-heading text-lg">{post && post !== "new" ? post.title : t("blog.untitled")}</SheetTitle>
        </SheetHeader>
        {post && <EditorBody key={post === "new" ? "new" : post.id} post={post === "new" ? null : post} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function EditorBody({ post, onClose }: { post: BlogPost | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [cover, setCover] = useState(post?.coverImageUrl ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  const remove = useMutation({ mutationFn: () => opsApi.deletePost(post!.id), onSuccess: () => done(t("blog.deleted")), onError });

  const err = (f: string) => (fieldError?.field === f ? fieldError.message : null);
  const valid = title.trim() && slug.trim() && content.trim();

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="space-y-1.5">
          <Label htmlFor="post-title" className={cn(err("title") && "text-destructive")}>
            {t("blog.fields.title")} <RequiredMark />
          </Label>
          <Input
            id="post-title"
            value={title}
            maxLength={200}
            aria-invalid={!!err("title")}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
              setFieldError(null);
            }}
          />
          {err("title") && <p className="text-xs text-destructive">{err("title")}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="post-slug" className={cn(err("slug") && "text-destructive")}>
              {t("blog.fields.slug")} <RequiredMark />
            </Label>
            <Input
              id="post-slug"
              value={slug}
              className="font-mono text-sm"
              aria-invalid={!!err("slug")}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
                setFieldError(null);
              }}
            />
            {err("slug") ? <p className="text-xs text-destructive">{err("slug")}</p> : <p className="text-[11px] text-muted-foreground">/blog/{slug || "…"}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="post-cover">{t("blog.fields.cover")}</Label>
            <Input id="post-cover" value={cover} placeholder="https://…" onChange={(e) => setCover(e.target.value)} />
          </div>
        </div>

        <Tabs defaultValue="write" className="gap-2">
          <div className="flex items-center justify-between">
            <Label className={cn(err("content") && "text-destructive")}>
              {t("blog.fields.content")} <RequiredMark />
            </Label>
            <TabsList>
              <TabsTrigger value="write">{t("blog.write")}</TabsTrigger>
              <TabsTrigger value="preview">{t("blog.preview")}</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="write">
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setFieldError(null);
              }}
              rows={16}
              className="min-h-80 font-mono text-[13px] leading-relaxed"
              placeholder={t("blog.markdownHint")}
            />
          </TabsContent>
          <TabsContent value="preview">
            <article className="prose-blog min-h-80 rounded-md border p-4">
              {content.trim() ? <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown> : <p className="text-muted-foreground">{t("common.empty")}</p>}
            </article>
          </TabsContent>
          {err("content") && <p className="text-xs text-destructive">{err("content")}</p>}
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-background p-4">
        {post && (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> {t("blog.delete")}
          </Button>
        )}
        <span className="ml-auto" />
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="animate-spin" />} {post ? t("common.save") : t("blog.saveDraft")}
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("blog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("blog.deleteHint", { title: post?.title })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => remove.mutate()}>
              {t("blog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
