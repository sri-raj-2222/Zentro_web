"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import styles from "@/styles/auth.module.css";

type Step = "email" | "otp" | "reset" | "done";

export default function ForgotPasswordPage() {
  const { user, sendResetOtp, verifyResetOtp, updatePassword } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Handle URL callback sessions if they clicked recovery link directly
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || window.location.search;
      if (hash && (hash.includes("access_token") || hash.includes("type=recovery"))) {
        setIsSubmitting(true);
        // Supabase client automatically parses tokens from URL hash
        supabase.auth.getSession().then(({ data: { session } }) => {
          setIsSubmitting(false);
          if (session) {
            setStep("reset");
          }
        });
      }
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    const result = await sendResetOtp(email.trim());
    setIsSubmitting(false);

    if (result.success) {
      setStep("otp");
    } else {
      let errMsg = result.error || "Failed to send verification link.";
      if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("too many requests")) {
        errMsg = "⏳ Email Rate Limit Exceeded. Please wait a few minutes before trying again.";
      }
      setError(errMsg);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit OTP code");
      return;
    }

    setIsSubmitting(true);
    const result = await verifyResetOtp(email.trim(), otp.trim());
    setIsSubmitting(false);

    if (result.success) {
      setStep("reset");
    } else {
      setError(result.error || "Invalid OTP code. Please try again.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (result.success) {
      setStep("done");
    } else {
      setError(result.error || "Failed to reset password. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <div className={styles.card}>
          {step !== "done" && (
            <button
              onClick={() => {
                if (step === "email") router.push("/login");
                else if (step === "otp") setStep("email");
                else if (step === "reset") setStep("otp");
              }}
              className={styles.backBtn}
              style={{ border: "none", background: "none", cursor: "pointer" }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}

          <div className={styles.hero}>
            <div className={styles.logoWrap}>
              <img src="/images/logo.png" alt="Zentro Logo" className={styles.logoImage} />
            </div>
            <h2 className={styles.appName}>Zentro</h2>
            {step === "email" && <p className={styles.tagline}>🔐 Forgot Password?</p>}
            {step === "otp" && <p className={styles.tagline}>🔢 Enter Verification Code</p>}
            {step === "reset" && <p className={styles.tagline}>🔑 Set New Password</p>}
            {step === "done" && <p className={styles.tagline}>🎉 Password Reset Successful</p>}
          </div>

          {step === "email" && (
            <form className={styles.form} onSubmit={handleSendOtp}>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "12px", textAlign: "center" }}>
                Enter your registered email below to receive a verification OTP code or login link.
              </p>

              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>Email Address</span>
                <div className={styles.inputWrap}>
                  <span className={styles.inputEmoji}>📧</span>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoCapitalize="none"
                  />
                </div>
              </div>

              {error && <div className={styles.errorText}>{error}</div>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Send Code"
                )}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form className={styles.form} onSubmit={handleVerifyOtp}>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "12px", textAlign: "center" }}>
                We've sent a 6-digit OTP code to <strong style={{ color: "var(--foreground)" }}>{email}</strong>. Enter it below to verify.
              </p>

              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>Verification OTP</span>
                <div className={styles.inputWrap}>
                  <span className={styles.inputEmoji}>🔑</span>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    style={{ letterSpacing: "4px", fontWeight: "700", textAlign: "center" }}
                  />
                </div>
              </div>

              {error && <div className={styles.errorText}>{error}</div>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Verify OTP"
                )}
              </button>
            </form>
          )}

          {step === "reset" && (
            <form className={styles.form} onSubmit={handleResetPassword}>
              <div className={styles.successText} style={{ marginBottom: "12px" }}>
                ✅ Verification successful! Enter your new password below.
              </div>

              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>New Password</span>
                <div className={styles.inputWrap}>
                  <span className={styles.inputEmoji}>🔒</span>
                  <input
                    type={showPw ? "text" : "password"}
                    className={styles.input}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.togglePwBtn}
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>Confirm Password</span>
                <div className={styles.inputWrap}>
                  <span className={styles.inputEmoji}>🔒</span>
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    className={styles.input}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.togglePwBtn}
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                  >
                    {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <div className={styles.errorText}>{error}</div>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center" }}>
              <div style={{ color: "var(--success)" }}>
                <CheckCircle size={60} strokeWidth={2.5} />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--foreground)" }}>Password Updated</h3>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: "1.5" }}>
                Your password has been successfully reset. You can now log in using your new credentials.
              </p>
              <Link href="/login" className={styles.submitBtn} style={{ width: "100%", textDecoration: "none" }}>
                🚀 Go to Login
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
