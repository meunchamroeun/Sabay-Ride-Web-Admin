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
import { AlertCircle, ArrowUpRight, BookOpenText, Eye, EyeOff, Loader2, Lock, Mail, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { config, swaggerUrl } from "@/config/env";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-provider";
import { BrandMark } from "@/components/common/brand";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";

gsap.registerPlugin(useGSAP);

const schema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;
const noopSubscribe = () => () => {};

// Film-grain texture for the left panel, generated in SVG so no image asset is needed.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, session, isAdmin, ready, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const root = useRef<HTMLDivElement>(null);

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
      tl.from(".login-card", { y: 24, opacity: 0, scale: 0.985, duration: 0.8 })
        .from(".brand-in", { y: 18, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.4")
        .from(".form-in", { y: 14, opacity: 0, duration: 0.5, stagger: 0.06 }, "-=0.5");
      // Slow drift of the silver wave so the panel feels alive without distracting.
      gsap.to(".wave", { xPercent: 6, yPercent: -4, rotate: 4, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(".wave-shadow", { xPercent: -5, yPercent: 3, duration: 11, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },
    { scope: root },
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
      toast.info(t("auth.forgotNeedsPhone"));
      form.setFocus("identifier");
      return;
    }
    await authApi.forgot(id).catch(() => undefined);
    toast.success(t("auth.forgotSent"));
  }

  const busy = form.formState.isSubmitting;
  const host = config.apiBaseUrl.replace(/^https?:\/\//, "");

  return (
    <div
      ref={root}
      className="relative flex min-h-dvh items-center justify-center bg-muted/40 p-0 sm:p-6 dark:bg-[#18191b] dark:bg-[radial-gradient(90%_70%_at_5%_50%,rgba(0,0,0,0.15)_0%,transparent_60%),radial-gradient(70%_60%_at_95%_50%,rgba(0,0,0,0.15)_0%,transparent_60%)]"
    >
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border bg-background/80 p-1 backdrop-blur dark:bg-[#020817]/80">
        <LanguageSwitcher className="border-0 bg-transparent" />
        <ThemeToggle />
      </div>

      <div className="login-card grid w-full max-w-[760px] overflow-hidden bg-background shadow-2xl shadow-black/40 ring-1 ring-black/10 sm:rounded-2xl lg:h-[600px] lg:grid-cols-[340px_1fr] dark:bg-[#020817] dark:ring-white/10">
        {/* Left: brand panel */}
        <aside className="relative hidden overflow-hidden bg-[linear-gradient(165deg,#a3a3a3_0%,#7c7c7c_38%,#4b4b4b_70%,#2e2e2e_100%)] text-white lg:flex lg:flex-col lg:justify-between lg:p-7">
          <div className="wave absolute top-[30%] -left-[30%] h-[40%] w-[160%] rounded-[50%] bg-[radial-gradient(60%_55%_at_45%_50%,#e5e5e5_0%,#bdbdbd_35%,transparent_72%)] blur-xl" />
          <div className="wave-shadow absolute top-[46%] -left-[20%] h-[34%] w-[150%] rounded-[50%] bg-[radial-gradient(55%_50%_at_55%_45%,#1a1a1a_0%,#2a2a2a_40%,transparent_75%)] blur-2xl" />
          <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
          {/* Same top and bottom shading as the reference, so white text stays readable on the image. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(rgba(6,20,26,0.66)_0%,rgba(6,20,26,0.28)_46%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(0deg,rgba(4,16,21,0.72)_0%,transparent_100%)]" />

          <div className="relative">
            <BrandMark className="brand-in size-14 rounded-xl shadow-xl shadow-black/40 ring-white/30" />
            <h2 className="brand-in mt-4 font-heading text-[22px] leading-tight font-semibold tracking-[-0.4px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
              {t("app.name")} <span className="text-white/70">{t("auth.adminWord")}</span>
            </h2>
          </div>

          <div className="relative">
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noreferrer"
              className="brand-in group flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/15"
            >
              <span className="min-w-0">
                <span className="block text-[11px] leading-[1.7] text-white/60">{t("auth.connectedTo")}</span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="relative flex size-1.5 shrink-0">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  {t(`app.env.${config.apiEnv}`)}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <div className="brand-in mt-5 h-px w-10 bg-white/35" />
            <p className="brand-in mt-3 text-[10px] tracking-[0.2em] text-white/60 uppercase">{t("auth.tagline")}</p>
          </div>
        </aside>

        {/* Right: form */}
        <main className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[353px]">
            <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
              <BrandMark />
              <span className="font-heading font-semibold">{t("app.name")}</span>
            </div>

            <div className="text-center">
              <h1 className="form-in mb-[5px] font-heading text-[26px] font-bold tracking-[-0.65px]">{t("auth.signIn")}</h1>
              <p className="form-in text-[13.5px] text-muted-foreground">{t("auth.subtitle")}</p>
            </div>

            <AnimatePresence>
              {shownError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex gap-2 rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    <span>{shownError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
              <div className="form-in space-y-2">
                <label htmlFor="identifier" className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <Mail className="size-3.5" /> {t("auth.identifier")}
                </label>
                <div className={fieldWrap}>
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="identifier"
                    autoComplete="username"
                    placeholder={t("auth.identifierPlaceholder")}
                    aria-invalid={!!form.formState.errors.identifier}
                    className={inputClass}
                    {...form.register("identifier")}
                  />
                  <span className="flex h-5 items-center border-l pl-3 text-muted-foreground">
                    <Phone className="size-4" />
                  </span>
                </div>
              </div>

              <div className="form-in space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-[12.5px] font-semibold">
                    {t("auth.password")} <span className="text-destructive">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={onForgot}
                    className="rounded-sm text-[12.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {t("auth.forgot")}
                  </button>
                </div>
                <div className={fieldWrap}>
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={!!form.formState.errors.password}
                    className={inputClass}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="form-in flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-foreground text-[15px] font-semibold text-background transition-[background-color,scale] hover:bg-foreground/90 active:scale-[0.99] disabled:bg-foreground/60 dark:bg-[#f2f2f2] dark:text-black dark:hover:bg-white"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? t("auth.signingIn") : t("auth.signIn")}
              </button>
            </form>

            <div className="form-in my-5 flex items-center text-[13px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span className="mx-3 select-none">{t("auth.otherOptions")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="form-in grid grid-cols-2 gap-2 rounded-2xl p-1.5 ring-1 ring-border">
              <button type="button" onClick={onForgot} className={tileClass}>
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#229ED9] text-white">
                  <Send className="size-3 -translate-x-px translate-y-px" />
                </span>
                {t("auth.telegramReset")}
              </button>
              <a href={swaggerUrl} target="_blank" rel="noreferrer" className={tileClass}>
                <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <BookOpenText className="size-3" />
                </span>
                {t("nav.apiDocs")}
              </a>
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground lg:hidden">
              {t("auth.connectedTo")} <span className="font-mono">{host}</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

const fieldWrap =
  "flex h-11 items-center gap-2.5 rounded-[10px] border bg-background px-3.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20 has-aria-invalid:border-destructive dark:bg-[#020817] dark:border-[#333]";

const inputClass =
  "min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/80";

const tileClass =
  "flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-2 py-1.5 text-center text-[13px] leading-tight font-medium ring-1 ring-border transition-colors hover:bg-muted";
