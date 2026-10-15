"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { profileApi } from "@/lib/api/endpoints";
import { setLocale } from "@/i18n";
import { formatDate, initials } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const errMsg = (e: unknown) => (e instanceof ApiError ? `${e.message} (${e.code})` : String(e));

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: profileApi.me });

  const [fullName, setFullName] = useState("");
  const [lang, setLang] = useState<"km" | "en">("km");
  const [loaded, setLoaded] = useState<typeof me.data>(undefined);
  if (me.data && me.data !== loaded) {
    setLoaded(me.data);
    setFullName(me.data.fullName ?? "");
    setLang(me.data.preferredLanguage ?? "km");
  }

  const save = useMutation({
    mutationFn: () => profileApi.update({ fullName: fullName.trim(), preferredLanguage: lang }),
    onSuccess: (p) => {
      qc.setQueryData(["me"], p);
      setLocale(lang);
      toast.success(t("profile.saved"));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const pw = useMutation({
    mutationFn: () => profileApi.changePassword(cur, next),
    onSuccess: () => {
      setCur("");
      setNext("");
      toast.success(t("profile.passwordChanged"));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const p = me.data;

  return (
    <>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      {me.isError ? (
        <Card>
          <ErrorState error={me.error} onRetry={() => me.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 text-center">
              {p ? (
                <>
                  <Avatar className="size-20">
                    <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                      {initials(p.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-heading text-lg font-semibold">{p.fullName}</p>
                    <p className="text-sm text-muted-foreground">{p.phone}</p>
                    {p.email && <p className="text-sm text-muted-foreground">{p.email}</p>}
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {p.roles.map((r) => (
                      <Badge key={r} variant="secondary">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <div className="w-full space-y-2 border-t pt-3 text-left text-sm">
                    <Row label={t("profile.telegram")} value={p.telegramLinked ? t("profile.linked") : t("profile.notLinked")} />
                    <Row label={t("shops.col.applied")} value={formatDate(p.createdAt, i18n.language)} />
                  </div>
                </>
              ) : (
                <Skeleton className="h-60 w-full" />
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.title")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">{t("profile.fullName")}</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("profile.language")}</Label>
                  <Select value={lang} onValueChange={(v) => setLang(v as "km" | "en")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">ខ្មែរ (Khmer)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => save.mutate()} disabled={!p || fullName.trim().length < 2 || save.isPending}>
                    {save.isPending && <Loader2 className="animate-spin" />} {t("common.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("profile.changePassword")}</CardTitle>
                <CardDescription>{t("profile.passwordHint")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cur">{t("profile.currentPassword")}</Label>
                  <Input id="cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="next">{t("profile.newPassword")}</Label>
                  <Input
                    id="next"
                    type="password"
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    aria-invalid={next.length > 0 && (next.length < 8 || next.length > 72)}
                  />
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => pw.mutate()}
                    disabled={!cur || next.length < 8 || next.length > 72 || pw.isPending}
                  >
                    {pw.isPending && <Loader2 className="animate-spin" />} {t("profile.changePassword")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
