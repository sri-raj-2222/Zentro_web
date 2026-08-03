import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useBookings, Booking, BookingStatus } from "@/context/BookingsContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "#d97706", // Amber / Dark Yellow
  accepted: "#3b82f6", // Blue
  in_progress: "#8b5cf6", // Purple
  completed: "#22c55e", // Green
  cancelled: "#ef4444", // Red
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending Assignment",
  accepted: "Worker Assigned",
  in_progress: "Service in Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookings, acceptBooking, updateStatus, cancelBooking } = useBookings();

  // Find booking synchronously to avoid loading state flashes
  const initialBooking = id ? bookings.find((b) => b.id === id) : null;
  const [booking, setBooking] = useState<Booking | null>(initialBooking || null);
  const [loading, setLoading] = useState(!initialBooking);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;

    const localBooking = bookings.find((b) => b.id === id);
    if (localBooking) {
      setBooking(localBooking);
      setLoading(false);
    } else {
      fetchBookingFromDB();
    }
  }, [id, bookings]);

  async function fetchBookingFromDB() {
    try {
      const { data: b, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (b) {
        const profileIds = [b.user_id, b.worker_id].filter(Boolean);
        const profileMap: Record<string, { name: string; phone: string }> = {};

        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, phone")
            .in("id", profileIds);

          if (profiles) {
            profiles.forEach((p) => {
              profileMap[p.id] = { name: p.name || "Unknown", phone: p.phone || "" };
            });
          }
        }

        const formatted: Booking = {
          id: b.id,
          userId: b.user_id,
          userName: profileMap[b.user_id]?.name || "Unknown User",
          userPhone: profileMap[b.user_id]?.phone || "",
          workerId: b.worker_id,
          workerName: b.worker_id ? (profileMap[b.worker_id]?.name || "Worker") : undefined,
          workerPhone: b.worker_id ? (profileMap[b.worker_id]?.phone || "") : undefined,
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
        };

        setBooking(formatted);
      }
    } catch (e) {
      console.error("Error fetching booking detail:", e);
    } finally {
      setLoading(false);
    }
  }

  function openLocation() {
    if (!booking) return;
    if (booking.locationLink) {
      Linking.openURL(booking.locationLink);
    } else {
      const query = encodeURIComponent(booking.location);
      Linking.openURL(`https://maps.google.com/?q=${query}`);
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
      hour12: true,
    });
  }

  const handleAction = async (actionType: "accept" | "start" | "complete" | "cancel") => {
    if (!booking || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUpdating(true);

    try {
      if (actionType === "accept") {
        await acceptBooking(booking.id, user.id, user.name || "Assigned Worker");
      } else if (actionType === "start") {
        await updateStatus(booking.id, "in_progress");
      } else if (actionType === "complete") {
        await updateStatus(booking.id, "completed");
      } else if (actionType === "cancel") {
        await cancelBooking(booking.id);
      }
      await fetchBookingFromDB();
    } catch (e) {
      console.error("Action execution failed:", e);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Booking not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[booking.status];
  const isAdmin = user?.role === "admin";
  const isWorker = user?.role === "worker";
  const isCustomer = user?.role === "user";

  const showAcceptBtn = (isAdmin || isWorker) && booking.status === "pending";
  const showStartBtn = (isAdmin || isWorker || booking.workerId === user?.id) && booking.status === "accepted";
  const showCompleteBtn = (isAdmin || isWorker || booking.workerId === user?.id) && booking.status === "in_progress";
  const showCancelBtn = isCustomer && booking.status === "pending";

  const showActionButtons = showAcceptBtn || showStartBtn || showCompleteBtn || showCancelBtn || updating;

  // Build the steps indicator array for status tracking
  const steps = [
    { label: "Booked", completed: true },
    { label: "Assigned", completed: ["accepted", "in_progress", "completed"].includes(booking.status) },
    { label: "Active", completed: ["in_progress", "completed"].includes(booking.status) },
    { label: "Done", completed: booking.status === "completed" },
  ];

  // Calculate connector line progress width percentage
  const completedCount = steps.filter(s => s.completed).length;
  const progressWidth = completedCount > 1 ? ((completedCount - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Booking Details</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Banner */}
        <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.bannerAccent, { backgroundColor: statusColor }]} />
          <View style={styles.bannerInfo}>
            <Text style={[styles.serviceTitle, { color: colors.foreground }]}>{booking.serviceLabel}</Text>
            <Text style={[styles.bookingId, { color: colors.mutedForeground }]}>ID: {booking.id}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabelText, { color: statusColor }]}>{STATUS_LABELS[booking.status]}</Text>
            </View>
          </View>
        </View>

        {/* Status Tracker Steps */}
        {booking.status !== "cancelled" && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TRACK STATUS</Text>
            <View style={styles.stepperContainer}>
              {/* Connector line behind the dots */}
              <View style={styles.stepConnectorRow}>
                <View style={[styles.stepConnectorLine, { backgroundColor: colors.border }]} />
                <View 
                  style={[
                    styles.stepConnectorLineActive, 
                    { 
                      backgroundColor: colors.primary, 
                      width: `${progressWidth}%` 
                    }
                  ]} 
                />
              </View>

              <View style={styles.stepsRow}>
                {steps.map((step, idx) => (
                  <View key={idx} style={styles.stepWrapper}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: step.completed ? colors.primary : colors.card,
                          borderColor: step.completed ? colors.primary : colors.border,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      {step.completed ? (
                        <Feather name="check" size={12} color="#fff" />
                      ) : (
                        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.mutedForeground }}>{idx + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: step.completed ? colors.foreground : colors.mutedForeground,
                          fontWeight: step.completed ? "700" : "500",
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Booking Info Card */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SERVICE DETAILS</Text>
          
          <View style={styles.infoRow}>
            <Feather name="calendar" size={18} color={colors.mutedForeground} style={styles.rowIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Scheduled Time</Text>
              <Text style={[styles.infoVal, { color: colors.foreground }]}>
                {booking.scheduledDate ? formatDate(booking.scheduledDate) : formatDate(booking.createdAt)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Feather name="map-pin" size={18} color={colors.mutedForeground} style={styles.rowIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Location</Text>
              <Text style={[styles.infoVal, { color: colors.foreground }]}>{booking.location}</Text>
            </View>
            <TouchableOpacity onPress={openLocation} style={[styles.navButton, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="navigation" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {booking.notes ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Feather name="edit-3" size={18} color={colors.mutedForeground} style={styles.rowIcon} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Instructions / Notes</Text>
                  <Text style={[styles.infoVal, { color: colors.foreground }]}>{booking.notes}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Contacts details Card */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PEOPLE DETAILS</Text>

          {/* Customer info (visible to admin/workers) */}
          {(isAdmin || isWorker) && (
            <View style={styles.infoRow}>
              <Feather name="user" size={18} color={colors.mutedForeground} style={styles.rowIcon} />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Customer</Text>
                <Text style={[styles.infoVal, { color: colors.foreground }]}>{booking.userName}</Text>
                <Text style={[styles.infoSubVal, { color: colors.mutedForeground }]}>{booking.userPhone}</Text>
              </View>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.userPhone}`)} style={[styles.callButton, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="phone" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Worker info (visible to customer/admin) */}
          {(isCustomer || isAdmin) && (
            <>
              {(isAdmin || isWorker) && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={18} color={colors.mutedForeground} style={styles.rowIcon} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Assigned Professional</Text>
                  <Text style={[styles.infoVal, { color: colors.foreground }]}>
                    {booking.workerName || "Waiting for partner assignment"}
                  </Text>
                  {booking.workerPhone && (
                    <Text style={[styles.infoSubVal, { color: colors.mutedForeground }]}>{booking.workerPhone}</Text>
                  )}
                </View>
                {booking.workerPhone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.workerPhone}`)} style={[styles.callButton, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="phone" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* Pricing Card */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BILLING INFO</Text>
          <View style={styles.pricingRow}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>Total Amount Paid</Text>
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "800" }}>₹{booking.price}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      {showActionButtons && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          {updating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              {showAcceptBtn && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleAction("accept")}
                >
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Accept Job</Text>
                </TouchableOpacity>
              )}

              {showStartBtn && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleAction("start")}
                >
                  <Feather name="play-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Start Service Job</Text>
                </TouchableOpacity>
              )}

              {showCompleteBtn && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#22c55e" }]}
                  onPress={() => handleAction("complete")}
                >
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Complete Job</Text>
                </TouchableOpacity>
              )}

              {showCancelBtn && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleAction("cancel")}
                >
                  <Feather name="x-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Cancel Booking</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    backgroundColor: "#ffffff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  banner: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    overflow: "hidden",
  },
  bannerAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  bannerInfo: {
    flex: 1,
    paddingLeft: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  bookingId: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabelText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  stepperContainer: {
    position: "relative",
    paddingVertical: 8,
  },
  stepConnectorRow: {
    position: "absolute",
    top: 16, // Center line with 32px diameter dots
    left: 32, // Connect center of first dot
    right: 32, // Connect center of last dot
    height: 2,
  },
  stepConnectorLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  stepConnectorLineActive: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  stepWrapper: {
    alignItems: "center",
    width: 64,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stepLabel: {
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  rowIcon: {
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  infoVal: {
    fontSize: 14,
    fontWeight: "700",
  },
  infoSubVal: {
    fontSize: 12,
    marginTop: 2,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0,
    backgroundColor: "transparent",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

