"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { RequiredMark } from "@/components/common/required-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Second half of "Forgot password": the code sent to the phone's Telegram plus a new password
 * (POST /auth/password/reset). The API returns no tokens, so the admin signs in again afterwards.
 */
export function ResetPasswordDialog({
  phone,
  onClose,
  onDone,
}: {
  phone: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCode("");
    setPassword("");
    setConfirm("");
    setError(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    if (!/^\d{6}$/.test(code)) return setError(t("auth.reset.codeInvalid"));
    if (password.length < 8 || password.length > 72) return setError(t("auth.reset.passwordLength"));
    if (password !== confirm) return setError(t("auth.reset.mismatch"));
    setError(null);
    setBusy(true);
    try {
      await authApi.resetPassword(phone, code, password);
      toast.success(t("auth.reset.done"));
      reset();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? t("auth.reset.codeWrong") : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!phone}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("auth.reset.title")}</DialogTitle>
          <DialogDescription>{t("auth.reset.hint", { phone })}</DialogDescription>
        </DialogHeader>
        <form id="reset-password" onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="reset-code">
              {t("auth.reset.code")} <RequiredMark />
            </Label>
            <Input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="tracking-[0.4em] tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-password-new">
              {t("auth.reset.newPassword")} <RequiredMark />
            </Label>
            <Input
              id="reset-password-new"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-password-confirm">
              {t("auth.reset.confirmPassword")} <RequiredMark />
            </Label>
            <Input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-[12.5px] text-destructive">
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="reset-password" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("auth.reset.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
