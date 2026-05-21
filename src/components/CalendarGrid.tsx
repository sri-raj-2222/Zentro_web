"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./CalendarGrid.module.css";

interface CalendarGridProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarGrid({ selectedDate, onChange, minDate }: CalendarGridProps) {
  const today = minDate || new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonthYear, setCurrentMonthYear] = useState({
    month: (selectedDate || new Date()).getMonth(),
    year: (selectedDate || new Date()).getFullYear(),
  });

  // Sync component state with external date updates if they happen
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonthYear({
        month: selectedDate.getMonth(),
        year: selectedDate.getFullYear(),
      });
    }
  }, [selectedDate]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (delta: number) => {
    let nextMonth = currentMonthYear.month + delta;
    let nextYear = currentMonthYear.year;

    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }

    setCurrentMonthYear({ month: nextMonth, year: nextYear });
  };

  const handleDaySelect = (day: number) => {
    const d = new Date(currentMonthYear.year, currentMonthYear.month, day);
    onChange(d);
  };

  const daysInMonth = getDaysInMonth(currentMonthYear.month, currentMonthYear.year);
  const firstDay = getFirstDayOfMonth(currentMonthYear.month, currentMonthYear.year);

  // Build grid of empty slots + month days
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className={styles.calendarBox}>
      {/* Calendar Month Header Controller */}
      <div className={styles.controlRow}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => changeMonth(-1)}
          aria-label="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className={styles.monthLabel}>
          {MONTH_NAMES[currentMonthYear.month]} {currentMonthYear.year}
        </span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => changeMonth(1)}
          aria-label="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className={styles.daysHeader}>
        {WEEK_DAYS.map((day, idx) => (
          <div key={idx} className={styles.dayName}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar slots grid */}
      <div className={styles.daysGrid}>
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className={styles.slotEmpty} />;
          }

          const cellDate = new Date(currentMonthYear.year, currentMonthYear.month, day);
          const isPast = cellDate < today;

          const isSelected =
            selectedDate !== null &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentMonthYear.month &&
            selectedDate.getFullYear() === currentMonthYear.year;

          return (
            <button
              key={idx}
              type="button"
              disabled={isPast}
              onClick={() => handleDaySelect(day)}
              className={`${styles.slot} ${styles.slotFilled} ${
                isSelected ? styles.slotSelected : ""
              } ${isPast ? styles.slotDisabled : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
