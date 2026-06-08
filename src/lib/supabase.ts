import { createClient } from "@supabase/supabase-js";

// Suppress noisy Supabase AuthApiError when refresh token is invalid or expired
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMsg = args
      .map((arg) => {
        if (!arg) return "";
        if (typeof arg === "object") {
          return arg.message || arg.error_description || JSON.stringify(arg);
        }
        return String(arg);
      })
      .join(" ");

    if (
      errorMsg.includes("Refresh Token Not Found") ||
      errorMsg.includes("refresh_token_not_found") ||
      errorMsg.includes("invalid refresh token") ||
      errorMsg.includes("Invalid Refresh Token")
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qmrwrdvjxuydvmcljckv.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtcndyZHZqeHV5ZHZtY2xqY2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTk2ODAsImV4cCI6MjA5MTM3NTY4MH0.KaPkd_tSSqINfC-NOv_F-Ecr_9_OoHCe0n4IhlRM3a4";

// Adapt storage adapter for SSR safety in Next.js
const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
