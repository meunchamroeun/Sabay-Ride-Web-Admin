"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, Store, Wallet } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/env";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-provider";
import { BrandMark } from "@/components/common/brand";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

gsap.registerPlugin(useGSAP);

const schema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;
const noopSubscribe = () => () => {};

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, session, isAdmin, ready, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const hero = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  // Already signed in as admin → straight to the dashboard.
  useEffect(() => {
    if (ready && session && isAdmin) router.replace("/");
  }, [ready, session, isAdmin, router]);

  const search = useSyncExternalStore(
    noopSubscribe,
    () => window.location.search,
    () => "",
  );
  const urlNotice = search.includes("forbidden")
    ? t("auth.notAdmin")
    : search.includes("expired")
      ? t("auth.sessionExpired")
      : null;
  const shownError = error ?? urlNotice;

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-line", { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.12 })
        .from(".hero-body", { y: 16, opacity: 0, duration: 0.6 }, "-=0.4")
        .from(".hero-card", { y: 30, opacity: 0, scale: 0.96, duration: 0.7, stagger: 0.12 }, "-=0.3");
      gsap.to(".road-dash", { xPercent: -50, duration: 6, ease: "none", repeat: -1 });
      gsap.to(".hero-card", { y: "-=8", duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.4 });
      gsap.to(".sun", { scale: 1.08, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },
    { scope: hero },
  );

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const s = await login(values.identifier, values.password);
      if (!s.user.roles.includes("ADMIN")) {
        await logout();
        setError(t("auth.notAdmin"));
        return;
      }
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? t("auth.invalid") : (e as Error).message);
    }
  }

  async function onForgot() {
    const id = form.getValues("identifier").trim();
    if (!id.startsWith("+")) {
      form.setFocus("identifier");
      return;
    }
    await authApi.forgot(id).catch(() => undefined);
    toast.success(t("auth.forgotSent"));
  }

  const busy = form.formState.isSubmitting;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Hero */}
      <div
        ref={hero}
        className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="sun absolute -top-24 -right-24 size-[28rem] rounded-full bg-[radial-gradient(circle,oklch(0.8_0.14_75/.55),transparent_65%)]" />
        <div className="absolute -bottom-40 -left-20 size-[30rem] rounded-full bg-[radial-gradient(circle,oklch(0.6_0.13_162/.45),transparent_65%)]" />

        <div className="relative flex items-center gap-3">
          <BrandMark className="size-10" />
          <span className="font-heading text-lg font-semibold">{t("app.name")}</span>
        </div>

        <div className="relative max-w-xl">
          <h2 className="font-heading text-4xl leading-tight font-semibold xl:text-5xl">
            {t("auth.heroTitle")
              .split(/(?<=[,，។.])\s*/)
              .map((line, i) => (
                <span key={i} className="block overflow-hidden pb-1">
                  <span className="hero-line block">{line}</span>
                </span>
              ))}
          </h2>
          <p className="hero-body mt-5 max-w-md text-base text-sidebar-foreground/70">{t("auth.heroBody")}</p>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              { icon: Store, label: t("nav.shops") },
              { icon: Wallet, label: t("nav.payouts") },
              { icon: ShieldCheck, label: t("shops.verify") },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="hero-card rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4 backdrop-blur"
              >
                <Icon className="size-5 text-sidebar-primary" />
                <p className="mt-3 text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Road */}
        <div className="relative h-10 overflow-hidden rounded-full bg-sidebar-accent/70">
          <div className="road-dash absolute top-1/2 flex w-[200%] -translate-y-1/2 gap-6 px-3">
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="h-1 w-10 shrink-0 rounded-full bg-sidebar-primary/70" />
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:invisible">
            <BrandMark />
            <span className="font-heading font-semibold">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto my-auto w-full max-w-sm py-10"
        >
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("auth.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>

          <AnimatePresence>
            {shownError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-6 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{shownError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="identifier">{t("auth.identifier")}</Label>
              <Input
                id="identifier"
                autoComplete="username"
                inputMode="tel"
                placeholder={t("auth.identifierPlaceholder")}
                className="h-11"
                aria-invalid={!!form.formState.errors.identifier}
                {...form.register("identifier")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <button
                  type="button"
                  onClick={onForgot}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {t("auth.forgot")}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="group h-11 w-full text-sm" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? t("auth.signingIn") : t("auth.signIn")}
              {!busy && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {t("auth.connectedTo")}{" "}
            <span className="font-mono">{config.apiBaseUrl.replace(/^https?:\/\//, "")}</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
