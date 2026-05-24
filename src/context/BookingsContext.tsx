"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export type ServiceType = "car_wash" | "bike_wash" | "water_tank";
export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  serviceType: ServiceType;
  serviceLabel: string;
  price: number;
  status: BookingStatus;
  location: string;
  locationLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  feedbackSubmitted?: boolean;
  feedbackId?: string;
  feedbackRating?: number;
  feedbackDescription?: string;
}

export type WorkerStatus = "available" | "busy";

export interface WorkerStatusInfo {
  status: WorkerStatus;
  name: string;
  average_rating: number;
  total_feedbacks: number;
}

interface BookingsContextType {
  bookings: Booking[];
  isLoading: boolean;
  workerStatuses: Record<string, WorkerStatusInfo>;
  createBooking: (
    data: Omit<
      Booking,
      "id" | "status" | "createdAt" | "updatedAt" | "workerId" | "workerName" | "workerPhone"
    >
  ) => Promise<Booking>;
  acceptBooking: (
    bookingId: string,
    workerId: string,
    workerName: string
  ) => Promise<void>;
  updateStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  getBookingsByUser: (userId: string) => Booking[];
  getBookingsByWorker: (workerId: string) => Booking[];
  getPendingBookings: () => Booking[];
  refreshBookings: () => Promise<void>;
  updateWorkerStatus: (workerId: string, status: WorkerStatus) => Promise<void>;
  isAnyWorkerAvailable: () => boolean;
  submitFeedback: (data: {
    bookingId: string;
    customerId: string;
    workerId: string;
    serviceId: string;
    rating: number;
    description?: string;
  }) => Promise<void>;
  skipFeedback: (bookingId: string) => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | null>(null);

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workerStatuses, setWorkerStatuses] = useState<Record<string, WorkerStatusInfo>>({});
  const { user } = useAuth();

  useEffect(() => {
    loadBookings();
    loadWorkers();

    const channel = supabase
      .channel(`public:bookings_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel(`public:profiles_global_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          loadWorkers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  async function loadWorkers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, availability_status, average_rating, total_feedbacks")
        .eq("role", "worker");

      if (error) throw error;

      if (data) {
        const statuses: Record<string, any> = {};
        data.forEach((w) => {
          statuses[w.id] = {
            status: w.availability_status || "available",
            name: w.name,
            average_rating: w.average_rating || 0,
            total_feedbacks: w.total_feedbacks || 0,
          };
        });
        setWorkerStatuses(statuses);
      }
    } catch (e) {
      console.error("Error fetching worker statuses:", e);
    }
  }

  async function loadBookings() {
    setIsLoading(true);
    try {
      // Step 1: load bookings (without feedback join to avoid PostgREST FK alias issues)
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          user:user_id(name, phone),
          worker:worker_id(name, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Step 2: collect all feedback_ids from completed bookings
        const feedbackIds = data
          .map((b: any) => b.feedback_id)
          .filter(Boolean) as string[];

        // Step 3: fetch feedbacks for those IDs in one query
        const feedbackMap: Record<string, { rating: number; description?: string }> = {};
        if (feedbackIds.length > 0) {
          const { data: feedbacks } = await supabase
            .from("feedbacks")
            .select("id, rating, description")
            .in("id", feedbackIds);

          if (feedbacks) {
            feedbacks.forEach((f: any) => {
              feedbackMap[f.id] = { rating: f.rating, description: f.description };
            });
          }
        }

        // Step 4: merge feedback into bookings
        const formatted: Booking[] = data.map((b: any) => ({
          id: b.id,
          userId: b.user_id,
          userName: b.user?.name || "Unknown User",
          userPhone: b.user?.phone || "",
          workerId: b.worker_id,
          workerName: b.worker?.name,
          workerPhone: b.worker?.phone,
          serviceType: b.service_type,
          serviceLabel: b.service_label,
          price: Number(b.price),
          status: b.status,
          location: b.location,
          locationLink: b.location_link,
          notes: b.notes,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          scheduledDate: b.scheduled_date,
          feedbackSubmitted: b.feedback_submitted,
          feedbackId: b.feedback_id,
          feedbackRating: b.feedback_id ? feedbackMap[b.feedback_id]?.rating : undefined,
          feedbackDescription: b.feedback_id ? feedbackMap[b.feedback_id]?.description : undefined,
        }));
        setBookings(formatted);
      }
    } catch (e) {
      console.error("Error fetching bookings", e);
    } finally {
      setIsLoading(false);
    }
  }


  async function createBooking(
    data: Omit<
      Booking,
      "id" | "status" | "createdAt" | "updatedAt" | "workerId" | "workerName" | "workerPhone"
    >
  ): Promise<Booking> {
    try {
      const payload = {
        user_id: data.userId,
        service_type: data.serviceType,
        service_label: data.serviceLabel,
        price: data.price,
        location: data.location,
        location_link: data.locationLink,
        notes: data.notes,
        scheduled_date: data.scheduledDate,
      };

      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      
      const newBooking: Booking = {
        ...data,
        id: inserted.id,
        status: "pending",
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };
      
      setBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    } catch (e) {
      console.error("Error creating booking", e);
      throw e;
    }
  }

  async function acceptBooking(
    bookingId: string,
    workerId: string,
    workerName: string
  ) {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          worker_id: workerId,
          status: "accepted",
        })
        .eq("id", bookingId);

      if (error) throw error;

      await updateWorkerStatus(workerId, "busy");

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                workerId,
                workerName,
                status: "accepted",
                updatedAt: new Date().toISOString(),
              }
            : b
        )
      );
    } catch (e) {
      console.error("Error accepting booking", e);
    }
  }

  async function updateStatus(bookingId: string, status: BookingStatus) {
    try {
      const updatePayload: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === "completed") {
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", bookingId);

      if (error) {
        console.warn("Primary update failed, trying minimal update...", error);
        const { error: retryError } = await supabase
          .from("bookings")
          .update({ status })
          .eq("id", bookingId);
        
        if (retryError) throw retryError;
      }

      const current = bookings.find((b) => b.id === bookingId);
      if (current?.workerId) {
        if (status === "completed" || status === "cancelled") {
          updateWorkerStatus(current.workerId, "available").catch(() => {});
        } else if (status === "in_progress" || status === "accepted") {
          updateWorkerStatus(current.workerId, "busy").catch(() => {});
        }
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status, updatedAt: new Date().toISOString() }
            : b
        )
      );
    } catch (e: any) {
      console.error("Critical error in updateStatus:", e);
    }
  }

  async function cancelBooking(bookingId: string) {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      const current = bookings.find((b) => b.id === bookingId);
      if (current?.workerId) {
        await updateWorkerStatus(current.workerId, "available");
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: "cancelled",
                updatedAt: new Date().toISOString(),
              }
            : b
        )
      );
    } catch (e) {
      console.error("Error cancelling booking", e);
    }
  }

  function getBookingsByUser(userId: string) {
    return bookings.filter((b) => b.userId === userId);
  }

  function getBookingsByWorker(workerId: string) {
    return bookings.filter(
      (b) => b.workerId === workerId && b.status !== "cancelled"
    );
  }

  function getPendingBookings() {
    return bookings.filter((b) => b.status === "pending");
  }

  async function refreshBookings() {
    await loadBookings();
  }

  async function updateWorkerStatus(workerId: string, status: WorkerStatus) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ availability_status: status })
        .eq("id", workerId);

      if (error) throw error;
      
      setWorkerStatuses((prev) => ({
        ...prev,
        [workerId]: {
          ...(prev[workerId] || { name: "", average_rating: 0, total_feedbacks: 0 }),
          status,
        },
      }));
    } catch (e) {
      console.error("Error updating worker status", e);
    }
  }

  function isAnyWorkerAvailable() {
    if (Object.keys(workerStatuses).length === 0) return true;
    return Object.values(workerStatuses).some((w) => w.status === "available");
  }

  async function submitFeedback(data: {
    bookingId: string;
    customerId: string;
    workerId: string;
    serviceId: string;
    rating: number;
    description?: string;
  }) {
    try {
      const { error } = await supabase.from("feedbacks").insert({
        booking_id: data.bookingId,
        customer_id: data.customerId,
        worker_id: data.workerId,
        service_id: data.serviceId,
        rating: data.rating,
        description: data.description,
      });

      if (error) {
        console.error("Feedback submission error:", error);
        throw error;
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === data.bookingId
            ? { ...b, feedbackSubmitted: true }
            : b
        )
      );

      await supabase
        .from("bookings")
        .update({ feedback_submitted: true })
        .eq("id", data.bookingId);

    } catch (e: any) {
      console.error("Error submitting feedback:", e);
    }
  }
  
  async function skipFeedback(bookingId: string) {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ feedback_submitted: true })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, feedbackSubmitted: true } : b
        )
      );
    } catch (e) {
      console.error("Error skipping feedback:", e);
    }
  }

  return (
    <BookingsContext.Provider
      value={{
        bookings,
        isLoading,
        workerStatuses,
        createBooking,
        acceptBooking,
        updateStatus,
        cancelBooking,
        getBookingsByUser,
        getBookingsByWorker,
        getPendingBookings,
        refreshBookings,
        updateWorkerStatus,
        isAnyWorkerAvailable,
        submitFeedback,
        skipFeedback,
      }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used within BookingsProvider");
  return ctx;
}
