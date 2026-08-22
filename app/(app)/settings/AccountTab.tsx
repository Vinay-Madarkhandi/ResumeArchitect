"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/Input";

export function AccountTab({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setSaved(true);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-xl">
      <div>
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-md">
        <h3 className="font-sans text-body-lg font-medium text-on-surface">Change password</h3>
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldHint>At least 8 characters.</FieldHint>
        </div>
        <div>
          <Label htmlFor="confirm-new-password">Confirm new password</Label>
          <Input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <FieldError>{error ?? undefined}</FieldError>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !password}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
          {saved && <span className="font-sans text-xs text-secondary">Password updated.</span>}
        </div>
      </form>

      <div className="border-t border-outline-variant pt-lg">
        <Button type="button" variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
