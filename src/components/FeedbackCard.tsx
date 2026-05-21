"use client";

import React, { useState } from "react";
import { Star, Check, Loader2 } from "lucide-react";
import styles from "./FeedbackCard.module.css";

interface FeedbackCardProps {
  booking: {
    id: string;
    workerName?: string;
  };
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip: () => void;
}

export function FeedbackCard({ booking, onSubmit, onSkip }: FeedbackCardProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setIsSuccess(true);
      setTimeout(() => {
        onSkip(); // Auto close after success view
      }, 2500);
    } catch (err) {
      console.error("Feedback submit error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.modalOverlay}>
        <div className={`${styles.modalContent} ${styles.successContent}`}>
          <div className={styles.successIconWrap}>
            <Check size={40} strokeWidth={3} />
          </div>
          <h3 className={styles.successTitle}>Thank You!</h3>
          <p className={styles.successSubtitle}>
            Your feedback helps us provide the best wash experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <form className={styles.modalContent} onSubmit={handleSubmit}>
        <div className={styles.headerRow}>
          <div className={styles.iconWrap}>
            <Star size={24} fill="currentColor" />
          </div>
          <div>
            <h3 className={styles.heading}>Rate Your Service</h3>
            <p className={styles.subheading}>
              How was your service with{" "}
              <span className={styles.highlight}>
                {booking.workerName || "our worker"}
              </span>
              ?
            </p>
          </div>
        </div>

        {/* Rating Stars Grid */}
        <div className={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((index) => {
            const isFilled = index <= (hoverRating || rating);
            return (
              <button
                key={index}
                type="button"
                className={styles.starBtn}
                onClick={() => setRating(index)}
                onMouseEnter={() => setHoverRating(index)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${index} Stars`}
              >
                <Star
                  className={styles.starIcon}
                  color={isFilled ? "#f59e0b" : "var(--border)"}
                  fill={isFilled ? "#f59e0b" : "none"}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>

        {/* Optional Comment Input */}
        <textarea
          className={styles.commentInput}
          placeholder="Share your experience (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
        />

        {/* Actions Button Row */}
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Maybe Later
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Submit Rating"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
