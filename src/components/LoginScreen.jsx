import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function sendLink() {
    const clean = email.trim();
    if (!clean) return;

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) return alert(error.message);
    setSent(true);
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-4 space-y-3">
        <div className="text-lg font-semibold">Sign in</div>
        <div className="text-sm text-muted-foreground">
          {sent ? "Check your email for the login link." : "Enter your email to get a magic link."}
        </div>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button className="w-full" onClick={sendLink} disabled={!email.trim()}>
          Send link
        </Button>
      </div>
    </div>
  );
}