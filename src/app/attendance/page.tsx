"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useAttendance, AttendanceStatus } from "@/context/AttendanceContext";
import { 
  Calendar, 
  DollarSign, 
  Briefcase, 
  Clock, 
  Check, 
  Percent, 
  TrendingUp, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  User, 
  Sliders, 
  Award,
  Sparkles,
  Save,
  AlertCircle,
  X
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const STATUS_OPTIONS: { id: AttendanceStatus; label: string; emoji: string; color: string; bgColor: string }[] = [
  { id: "present", label: "Present", emoji: "✅", color: "#22c55e", bgColor: "#dcfce7" },
  { id: "half_day", label: "Half Day", emoji: "🌓", color: "#f59e0b", bgColor: "#fef3c7" },
  { id: "absent", label: "Absent", emoji: "❌", color: "#ef4444", bgColor: "#fee2e2" },
  { id: "holiday", label: "Holiday", emoji: "🏖️", color: "#3b82f6", bgColor: "#dbeafe" },
];

export default function AttendancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { workerStatuses } = useBookings();
  const {
    attendance,
    markAttendance,
    updateCommission,
    getCommission,
    getMonthlyAttendance,
    calculateMonthlySalary,
  } = useAttendance();

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [commissionInput, setCommissionInput] = useState<string>("70");
  const [isUpdatingCommission, setIsUpdatingCommission] = useState(false);
  const [activeDayModal, setActiveDayModal] = useState<number | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  // Set default selected worker
  const workersList = Object.entries(workerStatuses).map(([id, info]) => ({
    id,
    ...info
  }));

  useEffect(() => {
    if (workersList.length > 0 && !selectedWorkerId) {
      setSelectedWorkerId(workersList[0].id);
    }
  }, [workerStatuses, selectedWorkerId]);

  // Sync commission input when selected worker changes
  useEffect(() => {
    if (selectedWorkerId) {
      setCommissionInput(getCommission(selectedWorkerId).toString());
    }
  }, [selectedWorkerId, salaryConfigsLength()]);

  // Utility to trigger re-renders on salaryConfigs changes
  function salaryConfigsLength() {
    return getCommission(selectedWorkerId);
  }

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading attendance portal...</p>
      </div>
    );
  }

  const selectedWorker = workersList.find((w) => w.id === selectedWorkerId);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthlyRecords = selectedWorkerId ? getMonthlyAttendance(selectedWorkerId, selectedYear, selectedMonth) : [];
  const salaryMetrics = selectedWorkerId ? calculateMonthlySalary(selectedWorkerId, selectedYear, selectedMonth) : {
    presentDays: 0,
    totalServices: 0,
    totalRevenue: 0,
    totalSalary: 0,
    commissionPercentage: 70
  };

  const handleUpdateCommission = async () => {
    const pct = parseInt(commissionInput, 10);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      alert("Please enter a valid percentage between 1 and 100.");
      return;
    }
    setIsUpdatingCommission(true);
    try {
      await updateCommission(selectedWorkerId, pct);
      alert(`Successfully set worker commission to ${pct}%!`);
    } catch (e: any) {
      alert(e.message || "Failed to update commission rate.");
    } finally {
      setIsUpdatingCommission(false);
    }
  };

  const handleMarkDayAttendance = async (day: number, status: AttendanceStatus | null) => {
    if (!selectedWorker) return;
    const dateStr = formatDate(selectedYear, selectedMonth, day);
    
    try {
      if (status) {
        await markAttendance(selectedWorkerId, selectedWorker.name, dateStr, status);
      } else {
        // Clear/delete attendance record if needed - we can treat it as absent or just not marked.
        // For simplicity, we just mark it as absent or do not marked (here we just mark as absent or clear status)
        await markAttendance(selectedWorkerId, selectedWorker.name, dateStr, "absent");
      }
      setActiveDayModal(null);
    } catch (e: any) {
      alert(e.message || "Failed to update attendance.");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <Calendar className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Workers & Commissions</h1>
            <p className={styles.subtitle}>Manage worker shifts, mark daily sheets, and adjust payroll commission rates.</p>
          </div>
        </div>
        <Link href="/admin/workers" className={styles.manageWorkersBtn}>
          <Users size={16} />
          <span>Manage Workers</span>
        </Link>
      </header>

      <div className={styles.dashboardGrid}>
        {/* SIDEBAR: SELECTION */}
        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Users size={18} />
              <span>Select Worker</span>
            </h2>
            {workersList.length === 0 ? (
              <p className={styles.emptyText}>No registered workers found.</p>
            ) : (
              <div className={styles.chipsList}>
                {workersList.map((worker) => {
                  const isSel = selectedWorkerId === worker.id;
                  return (
                    <button
                      key={worker.id}
                      onClick={() => {
                        setSelectedWorkerId(worker.id);
                        setActiveDayModal(null);
                      }}
                      className={`${styles.workerChip} ${isSel ? styles.activeWorkerChip : ""}`}
                    >
                      <div className={styles.avatar}>
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.workerInfo}>
                        <span className={styles.workerName}>{worker.name}</span>
                        <span className={styles.workerRating}>
                          ★ {worker.average_rating ? worker.average_rating.toFixed(1) : "New"}
                        </span>
                      </div>
                      {isSel && <div className={styles.activeCheck}><Check size={12} /></div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.card} style={{ marginTop: 24 }}>
            <h2 className={styles.cardTitle}>
              <Calendar size={18} />
              <span>Select Month</span>
            </h2>
            <div className={styles.monthSelectWrap}>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setActiveDayModal(null);
                }}
                className={styles.monthDropdown}
              >
                {MONTHS.map((m, index) => (
                  <option key={m} value={index + 1}>
                    {m} {selectedYear}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.monthsGrid}>
              {MONTHS.map((m, index) => {
                const isSel = selectedMonth === index + 1;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(index + 1);
                      setActiveDayModal(null);
                    }}
                    className={`${styles.monthMiniChip} ${isSel ? styles.activeMonthMiniChip : ""}`}
                  >
                    {m.substring(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN DASHBOARD PANEL */}
        <main className={styles.mainContent}>
          {selectedWorker ? (
            <>
              {/* COMMISSION & EARNINGS CARD ROW */}
              <div className={styles.row}>
                {/* 1. COMMISSION MANAGER */}
                <div id="commission" className={`${styles.card} ${styles.flexCard}`}>
                  <h2 className={styles.cardTitle}>
                    <Sliders size={18} />
                    <span>Commission Config</span>
                  </h2>
                  <p className={styles.cardDesc}>Define worker's cut percentage per completed service.</p>
                  
                  <div className={styles.commissionInputGroup}>
                    <div className={styles.inputWrap}>
                      <Percent size={16} className={styles.inputIcon} />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={commissionInput}
                        onChange={(e) => setCommissionInput(e.target.value)}
                        className={styles.numInput}
                      />
                    </div>
                    <button
                      onClick={handleUpdateCommission}
                      disabled={isUpdatingCommission}
                      className={styles.saveRateBtn}
                    >
                      <Save size={16} />
                      <span>{isUpdatingCommission ? "Saving..." : "Save Cut"}</span>
                    </button>
                  </div>

                  <div className={styles.commissionPresets}>
                    {[50, 60, 70, 80, 90].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setCommissionInput(preset.toString())}
                        className={styles.presetBtn}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. MONTH METRICS */}
                <div className={`${styles.card} ${styles.flexCard}`}>
                  <h2 className={styles.cardTitle}>
                    <TrendingUp size={18} />
                    <span>{MONTHS[selectedMonth - 1]} Stats</span>
                  </h2>
                  <div className={styles.metricsGrid}>
                    <div className={styles.metricItem}>
                      <span className={styles.metricValue}>{salaryMetrics.totalServices}</span>
                      <span className={styles.metricLabel}>Wash Jobs Completed</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricValue}>₹{salaryMetrics.totalRevenue}</span>
                      <span className={styles.metricLabel}>Gross Booking Revenue</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricValue}>{salaryMetrics.presentDays} Days</span>
                      <span className={styles.metricLabel}>Shift Attendance Marked</span>
                    </div>
                  </div>
                  
                  <div className={styles.earningsSummaryBox}>
                    <div>
                      <span className={styles.payoutLabel}>Net Worker Payout</span>
                      <span className={styles.payoutRate}>Calculated at {salaryMetrics.commissionPercentage}% Commission</span>
                    </div>
                    <span className={styles.payoutAmount}>₹{Math.round(salaryMetrics.totalSalary).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* ATTENDANCE SHEET CALENDAR */}
              <div className={styles.card} style={{ marginTop: 24 }}>
                <div className={styles.calendarHeader}>
                  <h2 className={styles.cardTitle} style={{ margin: 0 }}>
                    <Calendar size={18} />
                    <span>Shift Attendance Sheet</span>
                  </h2>
                  <span className={styles.calendarTargetName}>
                    Worker: <strong>{selectedWorker.name}</strong> ({MONTHS[selectedMonth - 1]})
                  </span>
                </div>
                <p className={styles.cardDesc} style={{ marginBottom: 20 }}>
                  Click on any day cell to mark or update attendance status.
                </p>

                <div className={styles.calendarGrid}>
                  {Array.from({ length: daysInMonth }, (_, index) => {
                    const dayNum = index + 1;
                    const dateStr = formatDate(selectedYear, selectedMonth, dayNum);
                    
                    // Check if there is an attendance record
                    const record = monthlyRecords.find((r) => r.date === dateStr);
                    const statusConfig = record ? STATUS_OPTIONS.find((s) => s.id === record.status) : null;
                    
                    // Determine if date is in the past
                    const cellDate = new Date(selectedYear, selectedMonth - 1, dayNum);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = cellDate < today;

                    return (
                      <div key={dayNum} className={styles.calCellWrapper}>
                        <button
                          onClick={() => {
                            if (!isPast) {
                              setActiveDayModal(dayNum);
                            }
                          }}
                          className={`${styles.calendarDayCell} ${statusConfig ? "" : styles.unmarkedCell} ${isPast ? styles.calendarDayCellDisabled : ""}`}
                          style={
                            statusConfig 
                              ? { border: `1.5px solid ${statusConfig.color}`, backgroundColor: `${statusConfig.bgColor}50` } 
                              : {}
                          }
                        >
                          <span className={styles.cellDayNum}>{dayNum}</span>
                          {statusConfig ? (
                            <span className={styles.cellEmoji} title={statusConfig.label}>
                              {statusConfig.emoji}
                            </span>
                          ) : (
                            <span className={styles.cellUnmarkedText}>-</span>
                          )}
                        </button>
                        
                        {activeDayModal === dayNum && (
                          <div className={styles.cellPopover}>
                            <div className={styles.popoverHeader}>
                              <span>Mark Day {dayNum}</span>
                              <button onClick={() => setActiveDayModal(null)} className={styles.popoverClose}>
                                <X size={14} />
                              </button>
                            </div>
                            <div className={styles.popoverButtons}>
                              {STATUS_OPTIONS.map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => handleMarkDayAttendance(dayNum, opt.id)}
                                  className={styles.popoverOptBtn}
                                  style={{
                                    borderColor: opt.color,
                                    backgroundColor: record?.status === opt.id ? opt.bgColor : "transparent",
                                    color: record?.status === opt.id ? opt.color : "var(--foreground)"
                                  }}
                                >
                                  <span>{opt.emoji}</span>
                                  <span>{opt.label}</span>
                                </button>
                              ))}
                              <button
                                onClick={() => handleMarkDayAttendance(dayNum, null)}
                                className={`${styles.popoverOptBtn} ${styles.popoverOptClear}`}
                              >
                                <span>❌</span>
                                <span>Reset / Absent</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.legend}>
                  <span className={styles.legendLabelText}>Key:</span>
                  {STATUS_OPTIONS.map((opt) => (
                    <div key={opt.id} className={styles.legendItem}>
                      <span className={styles.legendIcon} style={{ backgroundColor: opt.color }}></span>
                      <span className={styles.legendText}>{opt.label} ({opt.emoji})</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <AlertCircle size={48} />
              <h3>Select a worker from the sidebar</h3>
              <p>Configure shift schedules and salary settings.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
