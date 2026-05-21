"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { BookingCard } from "@/components/BookingCard";
import { Briefcase, Info, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export default function JobsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    bookings, 
    isLoading: bookingsLoading, 
    acceptBooking, 
    refreshBookings,
    workerStatuses 
  } = useBookings();

  // Redirect if not logged in or not a worker
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "worker") {
        router.push("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || bookingsLoading || !user || user.role !== "worker") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading Jobs board...</p>
      </div>
    );
  }

  // Pending bookings are claimable
  const pendingJobs = bookings.filter((b) => b.status === "pending");

  // Get current worker availability status
  const workerStatus = workerStatuses[user.id]?.status || "available";

  const handleClaim = async (bookingId: string) => {
    if (workerStatus === "busy") {
      const confirmBusy = window.confirm(
        "Your status is currently set to 'Busy'. Claiming this job will automatically change your status to 'Busy' and lock you into it. Do you want to proceed?"
      );
      if (!confirmBusy) return;
    }
    await acceptBooking(bookingId, user.id, user.name);
    alert("Job claimed successfully! Check your dashboard for job details.");
    router.push("/dashboard");
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Claimable Jobs</h1>
          <button onClick={refreshBookings} className={styles.refreshBtn} title="Refresh Job Postings">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
        <p className={styles.subtitle}>
          Browse and claim pending washing requests from customers. Claiming a job marks you as busy and assigns it to your ledger.
        </p>
      </div>

      {/* Worker Status Banner */}
      <div className={`${styles.statusBanner} ${styles[workerStatus]}`}>
        <Info size={20} className={styles.infoIcon} />
        <div>
          <p className={styles.bannerBold}>
            Status: {workerStatus.toUpperCase()}
          </p>
          <p className={styles.bannerDesc}>
            {workerStatus === "available"
              ? "You are marked as available and can claim new wash bookings instantly."
              : "You are currently marked as busy. Make sure to complete active washes to free up schedule."}
          </p>
        </div>
      </div>

      {/* Claimable Jobs List */}
      {pendingJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <Briefcase size={48} className={styles.emptyIcon} />
          <h3>No jobs available currently</h3>
          <p>All wash bookings have been claimed. Check back later or tap Refresh.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {pendingJobs.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              showWorkerActions={true}
              onAccept={() => handleClaim(booking.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
