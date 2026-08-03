"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Layout Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0f172a",
          color: "#f8fafc",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            padding: "32px",
            textAlign: "center",
            background: "#1e293b",
            borderRadius: "12px",
            border: "1px solid #334155",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h2 style={{ fontSize: "20px", margin: "0 0 10px", color: "#ffffff" }}>
            Application Error
          </h2>

          <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.5 }}>
            {error?.message || "A critical system error occurred. Please try reloading the page."}
          </p>

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
            }}
          >
            <RefreshCw size={16} />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
