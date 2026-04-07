import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // NEW: Timer state
  const [timer, setTimer] = useState(0);

  const inputRefs = useRef([]);

  // NEW: Countdown effect
  useEffect(() => {
    let interval;
    if (timer > 0 && sent) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer, sent]);

  // Auto-submit effect
  useEffect(() => {
    if (otp.length === 6) {
      verifyOtp();
    }
  }, [otp]);

  // Auto-focus the first OTP input when the screen switches
  useEffect(() => {
    if (sent) {
      // A tiny timeout ensures the boxes have finished rendering in the DOM before focusing
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  }, [sent]);

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
    setTimer(60); // NEW: Start the 60-second timer on success
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

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pastedCode = value.replace(/\D/g, "").slice(0, 6);
      setOtp(pastedCode);
      if (pastedCode.length > 0) {
        inputRefs.current[Math.min(pastedCode.length - 1, 5)]?.focus();
      }
      return;
    }

    if (value && !/^\d$/.test(value)) return;

    let newOtpArray = otp.split("");
    while (newOtpArray.length < 6) newOtpArray.push("");
    newOtpArray[index] = value;
    
    const newOtp = newOtpArray.join("");
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 font-sans antialiased selection:bg-primary/20 relative z-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!sent) sendOtp();
        }}
        className="glass-card w-full max-w-sm rounded-[32px] p-8 sm:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-2xl border-white/20 relative overflow-hidden"
      >

        {/* HEADER SECTION */}
        <div className="flex flex-col items-center text-center space-y-2 relative z-10 pb-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Habit Tracker
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-[260px] leading-relaxed mx-auto">
            {sent ? "Enter the 6-digit code sent to your email." : "Enter your email to sign in or create an account."}
          </p>
        </div>

        {/* INPUT SECTION */}
        <div className="space-y-3 relative z-10">

          {!sent ? (
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              className="h-14 text-[15px] px-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/40 transition-all font-medium placeholder:text-muted-foreground/50"
            />
          ) : (
            <div className="h-14 flex items-center justify-between px-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner transition-all animate-in fade-in duration-300">
              <span className="text-[15px] font-medium text-foreground/70 truncate mr-3">
                {email}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setOtp("");
                  setErrorMsg("");
                  setTimer(0); // NEW: Reset timer if they change email
                }}
                className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors whitespace-nowrap active:scale-95"
              >
                Change
              </button>
            </div>
          )}

          {/* 6-BOX OTP CODE */}
          {sent && (
            <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between gap-2">
                {[...Array(6)].map((_, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
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

        {/* SUBMIT BUTTON & LOADING STATES */}
        <div className="space-y-4 relative z-10">
          
          {!sent && (
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-[15px]"
              disabled={!email.trim() || sending}
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </span>
              ) : (
                "Continue with Email"
              )}
            </Button>
          )}

          {sent && verifying && (
            <div className="flex justify-center items-center py-3 text-muted-foreground animate-in fade-in duration-300">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              <span className="text-[14px] font-medium">Verifying code...</span>
            </div>
          )}

          {errorMsg && (
            <div className="text-[13px] font-medium text-destructive text-center bg-destructive/10 py-2 px-3 rounded-xl border border-destructive/10 animate-in fade-in duration-300">
              {errorMsg}
            </div>
          )}

          {/* NEW: RESEND TIMER UI */}
          {sent && !verifying && (
            <div className="pt-2 text-center animate-in fade-in duration-300">
              <p className="text-[13px] text-muted-foreground mb-1">
                Didn't receive a code?
              </p>
              <button
                type="button"
                disabled={timer > 0 || sending}
                onClick={sendOtp}
                className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {sending ? "Sending..." : timer > 0 ? `Resend Code in ${timer}s` : "Resend Code"}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}