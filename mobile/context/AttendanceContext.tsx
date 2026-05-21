import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBookings } from "@/context/BookingsContext";

export type AttendanceStatus = "present" | "absent" | "half_day" | "holiday";

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface WorkerSalaryConfig {
  workerId: string;
  commissionPercentage: number; // worker's cut in %
}

interface AttendanceContextType {
  attendance: AttendanceRecord[];
  salaryConfigs: WorkerSalaryConfig[];
  markAttendance: (
    workerId: string,
    workerName: string,
    date: string,
    status: AttendanceStatus
  ) => Promise<void>;
  updateCommission: (workerId: string, percentage: number) => Promise<void>;
  getCommission: (workerId: string) => number;
  getMonthlyAttendance: (
    workerId: string,
    year: number,
    month: number
  ) => AttendanceRecord[];
  calculateMonthlySalary: (
    workerId: string,
    year: number,
    month: number
  ) => {
    presentDays: number;
    totalServices: number;
    totalRevenue: number;
    totalSalary: number;
    commissionPercentage: number;
  };
}

const AttendanceContext = createContext<AttendanceContextType | null>(null);

import { useAuth } from "@/context/AuthContext";

const DEFAULT_COMMISSION = 70; // 70% to worker by default

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<WorkerSalaryConfig[]>([]);
  const { user } = useAuth();
  const { bookings } = useBookings();

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    try {
      // Load attendance
      const { data: attData, error: attError } = await supabase
        .from("attendance_records")
        .select("*, worker:profiles!attendance_records_worker_id_fkey(name)");
        
      if (!attError && attData) {
        setAttendance(
          attData.map((a: any) => ({
            id: a.id,
            workerId: a.worker_id,
            workerName: a.worker?.name || "Unknown Worker",
            date: a.date,
            status: a.status,
          }))
        );
      }

      // Load specific salary configurations (using daily_rate as percentage for storage)
      const { data: salData, error: salError } = await supabase
        .from("worker_salary_configs")
        .select("*");
      
      if (!salError && salData) {
        setSalaryConfigs(
          salData.map((s: any) => ({
            workerId: s.worker_id,
            commissionPercentage: Number(s.daily_rate),
          }))
        );
      }
    } catch (e) {
      console.error("Error loading attendance data", e);
    }
  }

  async function markAttendance(
    workerId: string,
    workerName: string,
    date: string,
    status: AttendanceStatus
  ) {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(
          { worker_id: workerId, date, status },
          { onConflict: "worker_id,date" }
        )
        .select()
        .single();
        
      if (error) throw error;

      setAttendance((prev) => {
        const existing = prev.filter(
          (a) => !(a.workerId === workerId && a.date === date)
        );
        return [
          ...existing,
          {
            id: data.id,
            workerId,
            workerName,
            date,
            status,
          },
        ];
      });
    } catch (e) {
      console.error("Error marking attendance", e);
    }
  }

  async function updateCommission(workerId: string, percentage: number) {
    try {
      const { error } = await supabase
        .from("worker_salary_configs")
        .upsert(
          { worker_id: workerId, daily_rate: percentage }, // storing pct in daily_rate for now
          { onConflict: "worker_id" }
        );
        
      if (error) throw error;

      setSalaryConfigs((prev) => {
        const existing = prev.filter((s) => s.workerId !== workerId);
        return [...existing, { workerId, commissionPercentage: percentage }];
      });
    } catch (e) {
      console.error("Error updating commission percentage", e);
    }
  }

  function getCommission(workerId: string): number {
    return (
      salaryConfigs.find((s) => s.workerId === workerId)?.commissionPercentage ??
      DEFAULT_COMMISSION
    );
  }

  function getMonthlyAttendance(
    workerId: string,
    year: number,
    month: number
  ): AttendanceRecord[] {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return attendance.filter(
      (a) => a.workerId === workerId && a.date.startsWith(prefix)
    );
  }

  function calculateMonthlySalary(
    workerId: string,
    year: number,
    month: number
  ) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    
    // Filter completed bookings for this worker in this month
    const completedBookings = bookings.filter((b) => {
      if (!b.scheduledDate) return false;
      return (
        b.workerId === workerId &&
        b.status === "completed" &&
        b.scheduledDate.startsWith(prefix)
      );
    });

    const totalServices = completedBookings.length;
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.price, 0);
    const commissionPercentage = getCommission(workerId);
    
    const totalSalary = totalRevenue * (commissionPercentage / 100);

    // Attendance stats
    const records = getMonthlyAttendance(workerId, year, month);
    const presentDays = records.filter((r) => r.status === "present").length;

    return { 
      presentDays, 
      totalServices, 
      totalRevenue, 
      totalSalary, 
      commissionPercentage 
    };
  }

  return (
    <AttendanceContext.Provider
      value={{
        attendance,
        salaryConfigs,
        markAttendance,
        updateCommission,
        getCommission,
        getMonthlyAttendance,
        calculateMonthlySalary,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error("useAttendance must be used within AttendanceProvider");
  return ctx;
}
