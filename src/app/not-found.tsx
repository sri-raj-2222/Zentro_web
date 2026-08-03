"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
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
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(59, 130, 246, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: "#3b82f6",
        }}
      >
        <FileQuestion size={32} />
      </div>

      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "12px",
          letterSpacing: "-0.02em",
        }}
      >
        404 - Page Not Found
      </h1>

      <p
        style={{
          fontSize: "15px",
          color: "var(--muted-foreground, #94a3b8)",
          maxWidth: "460px",
          marginBottom: "28px",
          lineHeight: 1.6,
        }}
      >
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          borderRadius: "8px",
          background: "#3b82f6",
          color: "#ffffff",
          fontWeight: 600,
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        <ArrowLeft size={16} />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
