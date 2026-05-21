"use client";

import React from "react";
import { 
  MapPin, 
  User, 
  Tag, 
  Navigation, 
  CheckCircle2, 
  PlayCircle, 
  Check, 
  XCircle,
  Calendar
} from "lucide-react";
import { Booking, BookingStatus } from "@/context/BookingsContext";
import styles from "./BookingCard.module.css";

interface BookingCardProps {
  booking: Booking;
  showWorkerActions?: boolean;
  showUserActions?: boolean;
  onAccept?: () => void;
  onUpdateStatus?: (status: BookingStatus) => void;
  onCancel?: () => void;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  in_progress: "#8b5cf6",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function BookingCard({
  booking,
  showWorkerActions,
  showUserActions,
  onAccept,
  onUpdateStatus,
  onCancel,
}: BookingCardProps) {
  const statusColor = STATUS_COLORS[booking.status];

  function openLocation(e: React.MouseEvent) {
    e.stopPropagation();
    if (booking.locationLink) {
      window.open(booking.locationLink, "_blank");
    } else {
      const query = encodeURIComponent(booking.location);
      window.open(`https://maps.google.com/?q=${query}`, "_blank");
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.serviceInfo}>
          <h3 className={styles.serviceLabel}>{booking.serviceLabel}</h3>
          <span className={styles.date}>{formatDate(booking.createdAt)}</span>
        </div>
        <div 
          className={styles.statusBadge} 
          style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
        >
          <div className={styles.dot} style={{ backgroundColor: statusColor }} />
          <span>{STATUS_LABELS[booking.status]}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <MapPin size={16} style={{ minWidth: "16px", color: "var(--muted-foreground)" }} />
          <span className={styles.detailText} title={booking.location}>
            {booking.location}
          </span>
          <button onClick={openLocation} className={styles.mapBtn} title="Open Maps">
            <Navigation size={15} />
          </button>
        </div>

        <div className={styles.detailRow}>
          <User size={16} style={{ minWidth: "16px", color: "var(--muted-foreground)" }} />
          <span className={styles.detailText}>
            {showWorkerActions
              ? `${booking.userName} (${booking.userPhone})`
              : booking.workerName
              ? `${booking.workerName} ${booking.workerPhone ? `(${booking.workerPhone})` : ""}`
              : "Not assigned"}
          </span>
        </div>

        {booking.scheduledDate && (
          <div className={styles.detailRow}>
            <Calendar size={16} style={{ minWidth: "16px", color: "var(--muted-foreground)" }} />
            <span className={styles.detailText}>
              Scheduled: {new Date(booking.scheduledDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </span>
          </div>
        )}

        <div className={styles.detailRow}>
          <Tag size={16} style={{ minWidth: "16px", color: "var(--muted-foreground)" }} />
          <span className={styles.priceText}>₹{booking.price}</span>
        </div>
      </div>

      {showWorkerActions && booking.status === "pending" && (
        <button
          className={styles.actionBtn}
          style={{ backgroundColor: "var(--primary)" }}
          onClick={onAccept}
        >
          <CheckCircle2 size={16} />
          <span>Accept Job</span>
        </button>
      )}

      {showWorkerActions && booking.status === "accepted" && (
        <button
          className={styles.actionBtn}
          style={{ backgroundColor: "#8b5cf6" }}
          onClick={() => onUpdateStatus?.("in_progress")}
        >
          <PlayCircle size={16} />
          <span>Start Job</span>
        </button>
      )}

      {showWorkerActions && booking.status === "in_progress" && (
        <button
          className={styles.actionBtn}
          style={{ backgroundColor: "#22c55e" }}
          onClick={() => onUpdateStatus?.("completed")}
        >
          <Check size={16} />
          <span>Mark Complete</span>
        </button>
      )}

      {showUserActions && booking.status === "pending" && (
        <button
          className={styles.actionBtn}
          style={{ backgroundColor: "#ef4444" }}
          onClick={onCancel}
        >
          <XCircle size={16} />
          <span>Cancel Booking</span>
        </button>
      )}
    </div>
  );
}
