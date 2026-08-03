"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error caught by boundary:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        background: "var(--background, #0f172a)",
        color: "var(--foreground, #f8fafc)",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: "#ef4444",
        }}
      >
        <AlertTriangle size={32} />
      </div>

      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          marginBottom: "12px",
          letterSpacing: "-0.02em",
        }}
      >
        Something went wrong
      </h1>

      <p
        style={{
          fontSize: "15px",
          color: "var(--muted-foreground, #94a3b8)",
          maxWidth: "480px",
          marginBottom: "28px",
          lineHeight: 1.6,
        }}
      >
        {error?.message || "An unexpected error occurred. We've logged the issue and are looking into it."}
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => reset()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "#3b82f6",
            color: "#ffffff",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            transition: "all 0.2s ease",
          }}
        >
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.08)",
            color: "var(--foreground, #f8fafc)",
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid var(--border, #334155)",
            fontSize: "14px",
          }}
        >
          <Home size={16} />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
