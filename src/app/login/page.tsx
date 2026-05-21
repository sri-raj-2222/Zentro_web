"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import styles from "@/styles/auth.module.css";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await login(email.trim(), password.trim());
    setIsSubmitting(false);

    if (result.success) {
      router.replace("/dashboard");
    } else {
      setError(result.error || "Invalid email or password");
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <div className={styles.card}>
          <Link href="/" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div className={styles.hero}>
            <div className={styles.logoWrap}>
              <img src="/images/logo.png" alt="Zentro Logo" className={styles.logoImage} />
            </div>
            <h2 className={styles.appName}>Zentro</h2>
            <p className={styles.tagline}>✨ Welcome back! Sign in to continue</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
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

            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Password</span>
              <div className={styles.inputWrap}>
                <span className={styles.inputEmoji}>🔒</span>
                <input
                  type={showPw ? "text" : "password"}
                  className={styles.input}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {error && <div className={styles.errorText}>{error}</div>}

            <Link href="/forgot-password" className={styles.forgotLink}>
              🔐 Forgot Password?
            </Link>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className={styles.linkRow}>
            Don't have an account?{" "}
            <Link href="/register" className={styles.linkHighlight}>
              Register
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
