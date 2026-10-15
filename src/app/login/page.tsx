"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeftRight, Info, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { API_ENV_NAMES, hostOf, type ApiEnv } from "@/config/env";
import { setApiEnv, useApiEnv } from "@/lib/api/api-env";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/common/brand";
import { LanguageSelect } from "@/components/common/language-select";
import { ContourBackground } from "@/components/common/contour-background";
import { GoogleIcon, TelegramIcon } from "@/components/common/provider-icons";
import { ThemeToggle } from "@/components/common/theme-toggle";

gsap.registerPlugin(useGSAP);

// Messages are i18n keys, translated where they are shown, so they follow the language switch.
const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "auth.identifierRequired")
    .refine((v) => v.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^\+?[\d\s-]{8,16}$/.test(v), "auth.identifierInvalid"),
  password: z.string().min(1, "auth.passwordRequired"),
});
type FormValues = z.infer<typeof schema>;
const noopSubscribe = () => () => {};

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, session, isAdmin, ready, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
    // Show errors after the first submit, then clear them as the admin types.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { errors } = form.formState;

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
      const mm = gsap.matchMedia();
      // Entrance and drift only for people who have not asked for reduced motion.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".login-card", { y: 20, opacity: 0, scale: 0.99, duration: 0.6 })
          .from(".brand-in", { y: 14, opacity: 0, duration: 0.5, stagger: 0.07 }, 0.2)
          .from(".form-in", { y: 12, opacity: 0, duration: 0.45, stagger: 0.04 }, 0.2);
        gsap.to(".hero-photo", { xPercent: -1.5, yPercent: -1.5, duration: 12, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
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

  // The API only supports phone/email + password today; social sign-in is announced, not faked.
  const soon = (name: string) => toast.info(t("auth.methodSoon", { name }));
  const apiEnv = useApiEnv();

  const busy = form.formState.isSubmitting;

  return (
    <div
      ref={root}
      className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[#ece4d4] p-0 sm:p-6 dark:bg-[#1a1530]"
    >
      {/* Animated contour background behind (not inside) the card */}
      <ContourBackground className="absolute inset-0 -z-10" />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-lg border bg-background/80 p-0.5 backdrop-blur dark:bg-[#020817]/80">
        <LanguageSelect />
        <span className="h-4 w-px bg-border" />
        <ThemeToggle />
      </div>

      <div className="login-card grid w-full max-w-[760px] overflow-hidden bg-background shadow-2xl shadow-black/40 ring-1 ring-black/10 sm:rounded-2xl lg:min-h-[600px] lg:grid-cols-[340px_1fr] dark:bg-[#020817] dark:ring-[rgba(51,51,51,0.5)]">
        {/* Left: brand panel */}
        <aside className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-[#0a0a0a] text-white lg:flex">
          {/* Hero photo, slightly oversized like the reference so the slow drift never shows an edge. */}
          <Image
            src="/login-hero.jpg"
            alt=""
            fill
            priority
            sizes="340px"
            className="hero-photo scale-105 object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(rgba(6,20,26,0.66)_0%,rgba(6,20,26,0.28)_46%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(0deg,rgba(4,16,21,0.72)_0%,transparent_100%)]" />

          <div className="relative px-7 pt-[34px]">
            <div className="brand-in size-[52px] overflow-hidden rounded-[14px] bg-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_10px_28px_-12px_rgba(0,0,0,0.5)]">
              <BrandMark className="size-full rounded-none ring-0" />
            </div>
            <h2 className="brand-in mt-2.5 font-heading text-[22px] leading-tight font-bold tracking-[-0.77px] text-white/[0.97] [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
              {t("app.name")} {t("auth.adminWord")}
            </h2>
          </div>

          <div className="relative px-7 pb-4">
            <EnvSwitchCard current={apiEnv} />
            <div className="brand-in h-px w-10 bg-white/35" />
            <p className="brand-in mt-2.5 text-[10px] tracking-[1.4px] text-white/[0.62] uppercase [text-shadow:0_1px_8px_rgba(0,0,0,0.3)] [html:lang(km)_&]:text-[11px] [html:lang(km)_&]:tracking-normal">
              {t("auth.tagline")}
            </p>
          </div>
        </aside>

        {/* Right: form */}
        <main className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:justify-start lg:pt-[31px] lg:pb-6">
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
                <label
                  htmlFor="identifier"
                  className={cn("flex items-center gap-1.5 text-[12.5px] font-semibold", errors.identifier && "text-destructive")}
                >
                  <Mail className="size-3.5" /> {t("auth.identifier")} <span className="text-destructive">*</span>
                </label>
                <div className={cn(fieldWrap, errors.identifier && fieldError)}>
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="identifier"
                    autoComplete="username"
                    placeholder={t("auth.identifierPlaceholder")}
                    aria-invalid={!!errors.identifier}
                    aria-describedby={errors.identifier ? "identifier-error" : undefined}
                    className={inputClass}
                    {...form.register("identifier")}
                  />
                  <span className="flex h-5 items-center border-l pl-3 text-muted-foreground">
                    <Phone className="size-4" />
                  </span>
                </div>
                <FieldError id="identifier-error" message={errors.identifier?.message} />
              </div>

              <div className="form-in space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className={cn("text-[12.5px] font-semibold", errors.password && "text-destructive")}
                  >
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
                <div className={cn(fieldWrap, errors.password && fieldError)}>
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
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
                <FieldError id="password-error" message={errors.password?.message} />
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
              <span className="mx-3 select-none">{t("auth.otherService")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="form-in grid grid-cols-2 gap-2 rounded-2xl bg-black/[0.055] p-2 dark:bg-white/[0.04]">
              {[
                { name: "Google", icon: <GoogleIcon /> },
                { name: "Telegram", icon: <TelegramIcon /> },
              ].map((p) => (
                <button key={p.name} type="button" onClick={() => soon(p.name)} className={providerBtn}>
                  {p.icon}
                  <span className="truncate leading-none">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 lg:hidden">
              <span className="text-[11px] text-muted-foreground">{t("auth.connectedTo")}</span>
              <EnvPills current={apiEnv} tone="page" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const fieldWrap =
  "flex h-11 items-center gap-2.5 rounded-[10px] border bg-background px-3.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20 has-aria-invalid:border-destructive dark:bg-[#020817] dark:border-[#333]";

const fieldError = "border-destructive/70 focus-within:border-destructive focus-within:ring-destructive/20 dark:border-destructive/70";

const inputClass =
  "min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/80";

const providerBtn =
  "flex h-11 min-w-0 items-center justify-center gap-2.5 rounded-[10px] border bg-background px-3 text-[13px] font-medium transition-colors hover:bg-muted dark:border-[#333] dark:bg-[#020817] dark:hover:bg-white/5";

/**
 * "Connected to" card. At rest it shows the active backend; on hover (or keyboard focus / tap)
 * it turns into a Production · Staging switch. Switching signs out, since tokens are per backend.
 */
function EnvSwitchCard({ current }: { current: ApiEnv }) {
  const { t } = useTranslation();
  return (
    <div
      tabIndex={0}
      aria-label={t("auth.switchServer")}
      className="brand-in group/door relative mb-4 cursor-pointer rounded-[15px] border border-white/25 bg-black/40 px-4 py-3 backdrop-blur-md transition-[background-color,border-color] duration-200 outline-none hover:border-white/40 hover:bg-black/55 focus-within:border-white/40 focus-within:bg-black/55"
    >
      {/* At rest */}
      <div className="transition-[opacity,translate] duration-200 group-focus-within/door:-translate-y-1 group-focus-within/door:opacity-0 group-hover/door:-translate-y-1 group-hover/door:opacity-0">
        <span className="block text-[11px] leading-[1.7] text-white/60">{t("auth.connectedTo")}</span>
        <span className="flex items-center justify-between gap-2.5 text-[14.5px] leading-[1.7] font-semibold text-white">
          <span className="flex items-center gap-2">
            <EnvDot env={current} />
            {t(`app.env.${current}`)}
          </span>
          <ArrowRight className="size-[17px] shrink-0" />
        </span>
      </div>

      {/* On hover / focus */}
      <div className="pointer-events-none absolute inset-0 flex translate-y-1 flex-col justify-center gap-1.5 px-3 opacity-0 transition-[opacity,translate] duration-200 group-focus-within/door:pointer-events-auto group-focus-within/door:translate-y-0 group-focus-within/door:opacity-100 group-hover/door:pointer-events-auto group-hover/door:translate-y-0 group-hover/door:opacity-100">
        <span className="flex items-center gap-1.5 px-1 text-[11px] leading-none text-white/60">
          <ArrowLeftRight className="size-3" /> {t("auth.switchServer")}
        </span>
        <EnvPills current={current} tone="glass" />
      </div>
    </div>
  );
}

function EnvPills({ current, tone }: { current: ApiEnv; tone: "glass" | "page" }) {
  const { t } = useTranslation();
  const pick = (env: ApiEnv) => {
    if (env === current) return;
    setApiEnv(env);
    // Let the card fall back to its resting "Connected to" state once the mouse leaves.
    (document.activeElement as HTMLElement | null)?.blur();
    toast.success(t("auth.envSwitched", { env: t(`app.env.${env}`), host: hostOf(env) }));
  };
  // Production first, as requested; each pill shows its own status dot.
  const order: ApiEnv[] = ["production", ...API_ENV_NAMES.filter((e) => e !== "production")];
  return (
    <div
      role="radiogroup"
      aria-label={t("auth.switchServer")}
      className={cn(
        "grid w-full grid-cols-2 gap-1 rounded-[11px] p-1",
        tone === "glass" ? "bg-white/10" : "max-w-[260px] bg-muted dark:bg-white/[0.06]",
      )}
    >
      {order.map((env) => {
        const active = env === current;
        return (
          <button
            key={env}
            type="button"
            role="radio"
            aria-checked={active}
            title={hostOf(env)}
            onClick={() => pick(env)}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold transition-colors",
              active
                ? "bg-white text-black shadow-sm"
                : tone === "glass"
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            <EnvDot env={env} still={!active} />
            {t(`app.env.${env}`)}
          </button>
        );
      })}
    </div>
  );
}

function EnvDot({ env, still }: { env: ApiEnv; still?: boolean }) {
  const color = env === "production" ? "bg-rose-500" : "bg-emerald-400";
  return (
    <span className="relative flex size-1.5 shrink-0">
      {!still && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", color)} />}
      <span className={cn("relative inline-flex size-1.5 rounded-full", color)} />
    </span>
  );
}

/** Inline message under a field, like the reference: info icon + red text, announced to screen readers. */
function FieldError({ id, message }: { id: string; message?: string }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-1.5 overflow-hidden text-[12.5px] text-destructive"
        >
          <Info className="size-3.5 shrink-0" />
          {t(message)}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
