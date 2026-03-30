import React, { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const inputRefs = useRef([]);

  const handleOtpChange = (index, value) => {
    // 1. Handle iOS AutoFill or Paste (which dumps all 6 digits into one box)
    if (value.length > 1) {
      const pastedCode = value.replace(/\D/g, "").slice(0, 6);
      setOtp(pastedCode);
      // Focus the last filled box
      if (pastedCode.length > 0) {
        inputRefs.current[Math.min(pastedCode.length - 1, 5)]?.focus();
      }
      return;
    }

    // 2. Handle single digit typing (only allow numbers)
    if (value && !/^\d$/.test(value)) return;

    // 3. Update the OTP string
    let newOtpArray = otp.split("");
    while (newOtpArray.length < 6) newOtpArray.push(""); // Pad with empty strings
    newOtpArray[index] = value;
    
    const newOtp = newOtpArray.join("");
    setOtp(newOtp);

    // 4. Move focus to the next box automatically
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Move focus to the previous box on Backspace if current box is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  async function sendOtp() {
    const clean = email.trim();
    if (!clean || sending) return;

    setErrorMsg("");
    setSending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    });

    setSending(false);

    if (error) {
      setSent(false);
      setErrorMsg(error.message);
      return;
    }

    setSent(true);
  }

  async function verifyOtp() {
    if (!otp.trim() || verifying) return;

    setVerifying(true);
    setErrorMsg("");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    setVerifying(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
  }

  return (
    // Removed the solid background gradient so the index.html animated radial background shines through
    <div className="min-h-screen w-full flex items-center justify-center p-6 font-sans antialiased selection:bg-primary/20 relative z-10">
      
      <form
        className="glass-card w-full max-w-sm rounded-[32px] p-8 sm:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-2xl border-white/20 relative overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sent) {
            sendOtp();
          } else {
            verifyOtp();
          }
        }}
      >
        {/* Decorative subtle glow inside the card */}
        <div className="absolute top-0 left-0 w-full h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />

        {/* HEADER SECTION */}
        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
          <div className="h-16 w-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center shadow-inner border border-primary/20 rotate-3 transition-transform hover:rotate-0 duration-300">
             <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-[24px] font-bold tracking-tight text-foreground">Habit Tracker</h1>
            <p className="text-[14px] text-muted-foreground max-w-[240px] leading-relaxed mx-auto">
              {sent ? "Enter the 6-digit code sent to your email." : "Enter your email to sign in or create an account."}
            </p>
          </div>
        </div>

        {/* INPUT SECTION */}
        <div className="space-y-3 relative z-10">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2">
            Email Address
          </div>
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
            // iOS style indented input
            className="h-14 text-[15px] px-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/40 transition-all font-medium placeholder:text-muted-foreground/50"
          />
          {sent && (
            <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2 text-center">
                Security Code
              </div>
              <div className="flex justify-between gap-2">
                {[...Array(6)].map((_, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6} // High max length to catch iOS autofill dumps
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    value={otp[index] || ""}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-14 w-full text-center text-lg font-bold rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/40 transition-all p-0"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <div className="space-y-4 relative z-10">
          <Button
            type="submit"
            className="w-full h-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[15px]"
            disabled={!email.trim() || sending || verifying}
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending...
              </span>
            ) : verifying ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying...
              </span>
            ) : sent ? (
              "Verify Code"
            ) : (
              "Continue with Email"
            )}
          </Button>

          {/* MESSAGES */}
          {errorMsg && (
            <div className="text-[13px] font-medium text-destructive text-center bg-destructive/10 py-2 px-3 rounded-xl border border-destructive/10 animate-in fade-in duration-300">
              {errorMsg}
            </div>
          )}

          {sent && (
            <div className="text-[13px] font-medium text-muted-foreground text-center animate-in fade-in duration-300">
              Enter the code above to finish signing in.
            </div>
          )}
        </div>
      </form>
    </div>
  );
}