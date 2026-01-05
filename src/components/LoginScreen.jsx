import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function sendLink() {
    const clean = email.trim();
    if (!clean || sending) return;

    setErrorMsg("");
    setSending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    });

    setSending(false);

    if (error) {
      setSent(false);
      setErrorMsg(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-muted/15 text-foreground flex items-center justify-center p-6 font-sans antialiased">
      <form
        className="w-full max-w-sm rounded-3xl bg-background/60 backdrop-blur shadow-sm p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          sendLink();
        }}
      >
        <div className="space-y-1">
          <div className="text-base font-semibold tracking-tight">Sign in</div>
          <div className="text-sm text-muted-foreground">
            {sent ? "Check your email for the login link." : "Enter your email to get a magic link."}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Email</div>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMsg) setErrorMsg("");
              if (sent) setSent(false);
            }}
            className="rounded-2xl bg-background/60 shadow-sm border-0 focus-visible:ring-2 focus-visible:ring-muted/30"
          />
        </div>

        <Button
          type="submit"
          variant="secondary"
          className="w-full rounded-2xl shadow-sm"
          disabled={!email.trim() || sending}
        >
          {sending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending
            </span>
          ) : sent ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Link sent
            </span>
          ) : (
            "Send link"
          )}
        </Button>

        {errorMsg ? (
          <div className="text-sm text-destructive">{errorMsg}</div>
        ) : null}

        {sent ? (
          <div className="text-xs text-muted-foreground">
            You can close this page after opening the link from your email.
          </div>
        ) : null}
      </form>
    </div>
  );
}