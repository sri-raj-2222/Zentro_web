"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBookings, Booking, BookingStatus } from "@/context/BookingsContext";
import { BookingCard } from "@/components/BookingCard";
import { FeedbackCard } from "@/components/FeedbackCard";
import { 
  Calendar, 
  Filter, 
  Search, 
  Inbox, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

type TabFilter = "all" | "pending" | "active" | "completed" | "cancelled";

export default function BookingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    bookings, 
    isLoading: bookingsLoading, 
    updateStatus, 
    cancelBooking, 
    submitFeedback, 
    skipFeedback 
  } = useBookings();

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackBooking, setFeedbackBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || bookingsLoading || !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Retrieving your bookings logs...</p>
      </div>
    );
  }

  // Get user-specific list
  let filteredBookings: Booking[] = [];
  if (user.role === "admin") {
    filteredBookings = [...bookings];
  } else if (user.role === "worker") {
    filteredBookings = bookings.filter((b) => b.workerId === user.id);
  } else {
    // Customer
    filteredBookings = bookings.filter((b) => b.userId === user.id);
  }

  // Filter by Tab
  if (activeTab === "pending") {
    filteredBookings = filteredBookings.filter((b) => b.status === "pending");
  } else if (activeTab === "active") {
    filteredBookings = filteredBookings.filter(
      (b) => b.status === "accepted" || b.status === "in_progress"
    );
  } else if (activeTab === "completed") {
    filteredBookings = filteredBookings.filter((b) => b.status === "completed");
  } else if (activeTab === "cancelled") {
    filteredBookings = filteredBookings.filter((b) => b.status === "cancelled");
  }

  // Filter by Search Query
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filteredBookings = filteredBookings.filter(
      (b) =>
        b.serviceLabel.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.userName.toLowerCase().includes(q) ||
        (b.workerName && b.workerName.toLowerCase().includes(q))
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>
        <h1 className={styles.title}>Bookings History</h1>
        <p className={styles.subtitle}>
          {user.role === "admin"
            ? "Central repository of all service requests across Zentro"
            : user.role === "worker"
            ? "Your complete shift claim ledger and task checklist history"
            : "Track your active car and bike washes or view invoices of past orders"}
        </p>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className={styles.filterBar}>
        <div className={styles.tabsScroll}>
          <div className={styles.tabs}>
            {(["all", "pending", "active", "completed", "cancelled"] as TabFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ""}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search service, cleaner, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Bookings Grid / Empty State */}
      {filteredBookings.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={48} className={styles.emptyIcon} />
          <h3>No bookings match criteria</h3>
          <p>Try changing your status tab filter or refining search queries.</p>
          {user.role === "user" && (
            <Link href="/book" className={styles.bookCta}>
              Book a Service
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredBookings.map((booking) => {
            const isCompleted = booking.status === "completed";

            // Customer who hasn't rated yet → show Rate button
            const showRateButton =
              user.role === "user" && isCompleted && !booking.feedbackSubmitted;

            // All roles: show review panel once feedback is submitted
            const showReviewPanel = isCompleted && booking.feedbackSubmitted;

            return (
              <div key={booking.id} className={styles.cardWrap}>
                <BookingCard
                  booking={booking}
                  showWorkerActions={user.role === "worker"}
                  showUserActions={user.role === "user"}
                  onUpdateStatus={(status) => updateStatus(booking.id, status)}
                  onCancel={() => cancelBooking(booking.id)}
                />

                {/* Customer: rate button on unreviewed completed jobs */}
                {showRateButton && (
                  <div className={styles.cardFeedbackOverlay}>
                    <button
                      onClick={() => setFeedbackBooking(booking)}
                      className={styles.rateBtn}
                    >
                      Rate Wash &amp; Cleaner
                    </button>
                  </div>
                )}

                {/* Worker / Admin / Customer: submitted rating & review */}
                {showReviewPanel && (
                  <div className={styles.workerFeedbackPanel}>
                    <div className={styles.workerFeedbackHeader}>
                      <span className={styles.workerFeedbackTitle}>Customer Review</span>
                      {booking.feedbackRating ? (
                        <div className={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={styles.star}
                              style={{ color: star <= booking.feedbackRating! ? "#f59e0b" : "var(--border)" }}
                            >
                              ★
                            </span>
                          ))}
                          <span className={styles.ratingNum}>{booking.feedbackRating}/5</span>
                        </div>
                      ) : (
                        <span className={styles.noReviewBadge}>No rating given</span>
                      )}
                    </div>
                    {booking.feedbackDescription ? (
                      <p className={styles.reviewText}>&ldquo;{booking.feedbackDescription}&rdquo;</p>
                    ) : (
                      <p className={styles.reviewText} style={{ fontStyle: "normal", color: "var(--muted-foreground)" }}>
                        No written review was left.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback Modal Popup */}
      {feedbackBooking && (
        <FeedbackCard
          booking={feedbackBooking}
          onSubmit={async (rating, comment) => {
            if (feedbackBooking.workerId) {
              await submitFeedback({
                bookingId: feedbackBooking.id,
                customerId: user.id,
                workerId: feedbackBooking.workerId,
                serviceId: feedbackBooking.serviceType,
                rating,
                description: comment,
              });
            } else {
              await skipFeedback(feedbackBooking.id);
            }
            setFeedbackBooking(null);
          }}
          onSkip={async () => {
            await skipFeedback(feedbackBooking.id);
            setFeedbackBooking(null);
          }}
        />
      )}
    </div>
  );
}

