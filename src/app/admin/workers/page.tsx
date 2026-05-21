"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  UserPlus,
  Trash2,
  Star,
  Phone,
  Mail,
  Search,
  X,
  ArrowLeft,
  Shield,
  Calendar,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Users,
} from "lucide-react";
import styles from "./page.module.css";

interface WorkerProfile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  availability_status: string;
  average_rating: number;
  total_feedbacks: number;
  created_at: string;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

// Supabase config for the temp client
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qmrwrdvjxuydvmcljckv.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtcndyZHZqeHV5ZHZtY2xqY2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTk2ODAsImV4cCI6MjA5MTM3NTY4MH0.KaPkd_tSSqINfC-NOv_F-Ecr_9_OoHCe0n4IhlRM3a4";

export default function AdminWorkersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [allProfilesDebug, setAllProfilesDebug] = useState<any[] | null>(null);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  // Add worker modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<WorkerProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Redirect check
  useEffect(() => {
    console.log("AdminWorkersPage Auth Check:", { authLoading, userId: user?.id, userRole: user?.role });
    if (!authLoading && !user) {
      console.log("No user session found, redirecting to /login");
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch workers
  const fetchWorkers = useCallback(async () => {
    setIsLoadingWorkers(true);
    setQueryError(null);
    console.log("fetchWorkers: Start fetching workers from profiles table...");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "worker")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchWorkers: Supabase query returned error:", error);
        setQueryError(error.message || JSON.stringify(error));
        throw error;
      }
      
      console.log("fetchWorkers: Successfully fetched workers. Count:", data?.length || 0, "Data:", data);
      setWorkers(data || []);
    } catch (e: any) {
      console.error("fetchWorkers: Caught error fetching workers:", e);
      setQueryError(e.message || String(e));
      showToast("Failed to load workers", "error");
    } finally {
      setIsLoadingWorkers(false);
    }
  }, [showToast]);

  const fetchAllProfilesDebug = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role, phone, created_at");
      if (error) throw error;
      setAllProfilesDebug(data || []);
    } catch (e: any) {
      console.error("Debug: Error fetching all profiles:", e);
      alert("Failed to fetch all profiles: " + e.message);
    }
  };

  useEffect(() => {
    console.log("AdminWorkersPage user change hook:", { userRole: user?.role });
    if (user?.role === "admin") {
      fetchWorkers();
    } else if (user) {
      console.log("User role is not admin, it is:", user.role);
    }
  }, [user, fetchWorkers]);

  // Add Worker
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.password) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    if (addForm.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setIsAdding(true);
    try {
      // Create a temporary supabase client so we don't disrupt the admin's session
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);

      // Sign up the new worker
      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: addForm.email.toLowerCase().trim(),
        password: addForm.password,
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Failed to create user account");

      // Insert profile using the temp client (authenticated as the new user)
      const profilePayload: any = {
        id: signUpData.user.id,
        name: addForm.name.trim(),
        email: addForm.email.toLowerCase().trim(),
        phone: addForm.phone.trim(),
        role: "worker",
      };

      let { error: profileError } = await tempClient.from("profiles").upsert(profilePayload);

      // If the email column doesn't exist in profiles table, retry without it
      if (profileError && (profileError.code === "42703" || profileError.message?.includes("column"))) {
        delete profilePayload.email;
        const { error: retryError } = await tempClient.from("profiles").upsert(profilePayload);
        profileError = retryError;
      }

      if (profileError) throw profileError;

      // Sign out from temp client to clean up
      await tempClient.auth.signOut();

      showToast(`Worker "${addForm.name}" added successfully!`, "success");
      setShowAddModal(false);
      setAddForm({ name: "", email: "", phone: "", password: "" });
      fetchWorkers();
    } catch (e: any) {
      console.error("Error adding worker:", e);
      showToast(e.message || "Failed to add worker", "error");
    } finally {
      setIsAdding(false);
    }
  };

  // Delete Worker
  const handleDeleteWorker = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      showToast(`Worker "${deleteTarget.name}" removed successfully`, "success");
      setDeleteTarget(null);
      fetchWorkers();
    } catch (e: any) {
      console.error("Error deleting worker:", e);
      showToast(e.message || "Failed to remove worker", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter workers by search
  const filteredWorkers = workers.filter((w) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = w.name ? w.name.toLowerCase().includes(query) : false;
    const emailMatch = w.email ? w.email.toLowerCase().includes(query) : false;
    const phoneMatch = w.phone ? w.phone.includes(query) : false;
    return nameMatch || emailMatch || phoneMatch;
  });

  // Get initials from name
  const getInitials = (name: string = "Unknown") => {
    return (name || "Unknown")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Access denied
  if (user.role !== "admin") {
    return (
      <div className={styles.accessDenied}>
        <Shield size={48} />
        <h2>Access Denied</h2>
        <p>Only administrators can access this page.</p>
        <Link href="/dashboard" className={styles.backLink} style={{ color: "var(--primary)" }}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Banner */}
      <div className={styles.banner}>
        <div>
          <h1>Worker Management</h1>
          <p>Add, view, and manage your cleaning workforce. Monitor availability and performance.</p>
        </div>
        <div className={styles.bannerActions}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>
          <button onClick={() => setShowAddModal(true)} className={styles.addWorkerBtn}>
            <UserPlus size={18} />
            <span>Add Worker</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search workers by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            id="worker-search"
          />
          <span className={styles.workerCount}>{filteredWorkers.length} workers</span>
        </div>
      </div>

      {/* Workers List */}
      {isLoadingWorkers ? (
        <div className={styles.loadingContainer} style={{ minHeight: "300px" }}>
          <div className={styles.spinner}></div>
          <p>Loading workers...</p>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={48} />
          <h3>{searchQuery ? "No workers match your search" : "No Workers Yet"}</h3>
          <p>
            {searchQuery
              ? "Try adjusting your search query."
              : "Get started by adding your first worker to the team."}
          </p>
          {!searchQuery && (
            <button onClick={() => setShowAddModal(true)} className={styles.emptyAddBtn}>
              <UserPlus size={18} />
              Add First Worker
            </button>
          )}
        </div>
      ) : (
        <div className={styles.workersGrid}>
          {filteredWorkers.map((worker) => (
            <div key={worker.id} className={styles.workerCard}>
              <div className={styles.workerHeader}>
                <div className={styles.avatar}>{getInitials(worker.name)}</div>
                <div className={styles.workerNameSection}>
                  <p className={styles.workerName}>{worker.name}</p>
                  <p className={styles.workerRole}>Cleaner</p>
                </div>
                <span
                  className={`${styles.statusBadge} ${
                    worker.availability_status === "available"
                      ? styles.available
                      : styles.busy
                  }`}
                >
                  {worker.availability_status || "available"}
                </span>
              </div>

              <div className={styles.workerDetails}>
                <div className={styles.detailRow}>
                  <Mail size={14} />
                  <span className={styles.detailValue}>{worker.email || "No email"}</span>
                </div>
                <div className={styles.detailRow}>
                  <Phone size={14} />
                  <span className={styles.detailValue}>{worker.phone || "No phone"}</span>
                </div>
              </div>

              <div className={styles.workerStats}>
                <div className={styles.statPill}>
                  <Star size={14} fill="#eab308" />
                  <span>
                    {worker.average_rating
                      ? Number(worker.average_rating).toFixed(1)
                      : "N/A"}
                  </span>
                </div>
                <div className={styles.statPill}>
                  <MessageSquare size={14} />
                  <span>{worker.total_feedbacks || 0} reviews</span>
                </div>
              </div>

              <div className={styles.workerFooter}>
                <span className={styles.joinDate}>
                  <Calendar size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Joined {worker.created_at ? (() => {
                    const d = new Date(worker.created_at);
                    return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                  })() : "No Date"}
                </span>
                <button
                  onClick={() => setDeleteTarget(worker)}
                  className={styles.deleteBtn}
                  title={`Remove ${worker.name}`}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => !isAdding && setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Worker</h2>
              <button
                onClick={() => !isAdding && setShowAddModal(false)}
                className={styles.modalCloseBtn}
                disabled={isAdding}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddWorker}>
              <div className={styles.formGroup}>
                <label htmlFor="worker-name" className={styles.formLabel}>
                  Full Name *
                </label>
                <input
                  id="worker-name"
                  type="text"
                  placeholder="Enter worker's full name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className={styles.formInput}
                  required
                  disabled={isAdding}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="worker-email" className={styles.formLabel}>
                  Email Address *
                </label>
                <input
                  id="worker-email"
                  type="email"
                  placeholder="worker@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className={styles.formInput}
                  required
                  disabled={isAdding}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="worker-phone" className={styles.formLabel}>
                  Phone Number
                </label>
                <input
                  id="worker-phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className={styles.formInput}
                  disabled={isAdding}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="worker-password" className={styles.formLabel}>
                  Password *
                </label>
                <input
                  id="worker-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className={styles.formInput}
                  required
                  minLength={6}
                  disabled={isAdding}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={styles.cancelModalBtn}
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <div className={styles.btnSpinner}></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Add Worker
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <AlertTriangle size={28} />
            </div>
            <h3 className={styles.confirmTitle}>Remove Worker?</h3>
            <p className={styles.confirmText}>
              This action cannot be undone. All associated data including attendance records and salary configs will be permanently deleted.
            </p>
            <p className={styles.confirmName}>{deleteTarget.name}</p>
            <div className={styles.confirmActions}>
              <button
                onClick={() => setDeleteTarget(null)}
                className={styles.confirmCancelBtn}
                disabled={isDeleting}
              >
                Keep Worker
              </button>
              <button
                onClick={handleDeleteWorker}
                className={styles.confirmDeleteBtn}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className={styles.btnSpinner}></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic & Troubleshooting Panel */}
      <div style={{
        marginTop: "40px",
        padding: "20px",
        border: "1px solid rgba(220, 38, 38, 0.2)",
        borderRadius: "16px",
        background: "rgba(0, 0, 0, 0.02)",
        color: "var(--foreground)",
        fontSize: "13px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setIsDebugExpanded(!isDebugExpanded)}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800" }}>🛠️ Connection & Profiles Diagnostics</h3>
          <button type="button" style={{
            background: "var(--accent)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: "750",
            cursor: "pointer",
            color: "var(--foreground)"
          }}>
            {isDebugExpanded ? "Hide" : "Show Diagnostics"}
          </button>
        </div>

        {isDebugExpanded && (
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => fetchWorkers()} style={{
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: "700",
                cursor: "pointer"
              }}>
                Retry Fetch Workers
              </button>
              <button type="button" onClick={fetchAllProfilesDebug} style={{
                background: "var(--accent)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: "700",
                cursor: "pointer"
              }}>
                Scan All Database Profiles
              </button>
            </div>

            <div style={{ background: "var(--card)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)", fontFamily: "monospace" }}>
              <p style={{ margin: "4px 0" }}><strong>Current Logged User:</strong> ID: {user?.id || "None"} | Name: {user?.name || "None"} | Role: {user?.role || "None"}</p>
              <p style={{ margin: "4px 0" }}><strong>Workers Count In State:</strong> {workers.length}</p>
              <p style={{ margin: "4px 0" }}><strong>Last Fetch Error:</strong> {queryError || "None (Success)"}</p>
              <p style={{ margin: "4px 0" }}><strong>Next.js Environment:</strong> NEXT_PUBLIC_SUPABASE_URL is {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Defined" : "NOT Defined (Fallback Active)"}</p>
            </div>

            <div>
              <strong>Raw State Workers ({workers.length}):</strong>
              <pre style={{
                maxHeight: "150px",
                overflow: "auto",
                background: "var(--accent)",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "11px",
                marginTop: "6px"
              }}>
                {JSON.stringify(workers, null, 2)}
              </pre>
            </div>

            {allProfilesDebug && (
              <div>
                <strong>All Database Profiles Found ({allProfilesDebug.length}):</strong>
                <pre style={{
                  maxHeight: "200px",
                  overflow: "auto",
                  background: "var(--accent)",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "11px",
                  marginTop: "6px"
                }}>
                  {JSON.stringify(allProfilesDebug, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
