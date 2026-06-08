import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

// Suppress noisy Supabase AuthApiError when refresh token is invalid or expired
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_API_URL || "https://qmrwrdvjxuydvmcljckv.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtcndyZHZqeHV5ZHZtY2xqY2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTk2ODAsImV4cCI6MjA5MTM3NTY4MH0.KaPkd_tSSqINfC-NOv_F-Ecr_9_OoHCe0n4IhlRM3a4";

const storageAdapter =
  Platform.OS === "web" && typeof window !== "undefined"
    ? localStorage
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
