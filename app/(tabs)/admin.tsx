import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

import { StatCard } from "@/components/StatCard";
import { AttendanceStatus, useAttendance } from "@/context/AttendanceContext";
import { AuthUser, useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useServicePrices } from "@/context/ServicePricesContext";
import { useColors } from "@/hooks/useColors";

type AdminTab = "overview" | "attendance" | "charges" | "feedback";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const STATUS_OPTIONS: { id: AttendanceStatus; label: string; emoji: string; color: string }[] = [
  { id: "present", label: "Present", emoji: "✅", color: "#22c55e" },
  { id: "half_day", label: "Half Day", emoji: "🌓", color: "#f59e0b" },
  { id: "absent", label: "Absent", emoji: "❌", color: "#ef4444" },
  { id: "holiday", label: "Holiday", emoji: "🏖️", color: "#3b82f6" },
];

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings, workerStatuses } = useBookings();
  const { prices, updatePrice } = useServicePrices();
  const {
    markAttendance,
    updateCommission,
    getCommission,
    getMonthlyAttendance,
    calculateMonthlySalary,
    attendance,
  } = useAttendance();

  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Add worker form states
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [nwName, setNwName] = useState("");
  const [nwEmail, setNwEmail] = useState("");
  const [nwPhone, setNwPhone] = useState("");
  const [nwPassword, setNwPassword] = useState("");
  const [workerLoading, setWorkerLoading] = useState(false);

  // Feedback states
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [selectedWorkerFeedback, setSelectedWorkerFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "feedback") {
      loadFeedbacks();
    }

    // REAL-TIME: Listen for new feedbacks
    const feedbackChannel = supabase
      .channel("public:feedbacks_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedbacks" },
        () => {
          loadFeedbacks();
          loadUsers();
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [activeTab]);

  async function loadFeedbacks() {
    setFeedbackLoading(true);
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select(`
          *,
          customer:profiles!feedbacks_customer_id_fkey(name),
          worker:profiles!feedbacks_worker_id_fkey(name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setFeedbackLoading(false);
    }
  }

  useEffect(() => {
    const initial: Record<string, string> = {};
    prices.forEach((p) => { initial[p.id] = p.price.toString(); });
    setEditingPrices(initial);
  }, [prices]);

  async function loadUsers() {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    const all: any[] = (profiles || []).map((p) => ({
      id: p.id,
      name: p.name || "Unknown",
      email: p.email || "Registered User", 
      phone: p.phone || "N/A",
      role: p.role as any,
      average_rating: p.average_rating || 0,
      total_feedbacks: p.total_feedbacks || 0,
    }));

    setUsers(all);

    const workers = all.filter((u) => u.role === "worker");
    const rates: Record<string, string> = {};
    workers.forEach((w) => { rates[w.id] = getCommission(w.id).toString(); });
    setEditingRates(rates);

    if (workers.length > 0 && !selectedWorkerId) {
      setSelectedWorkerId(workers[0].id);
    }
  }

  async function handleCreateWorker() {
    if (!nwName || !nwEmail || !nwPhone || !nwPassword) {
      Alert.alert("Error", "Please fill in all details");
      return;
    }
    setWorkerLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: nwEmail.trim(),
        password: nwPassword,
      });

      if (error) {
        Alert.alert("Error", error.message);
        setWorkerLoading(false);
        return;
      }

      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          name: nwName,
          phone: nwPhone,
          role: "worker"
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Worker Registered", 
          "The worker has been securely created. Because the session swapped, you will now be logged out. Please sign back in.",
          [{ text: "OK", onPress: () => logout() }]
        );
      }
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message);
      setWorkerLoading(false);
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.from("profiles").delete().eq("id", userId);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              setUsers(prev => prev.filter(u => u.id !== userId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }
      ]
    );
  }

  async function handleSavePrices() {
    for (const [id, val] of Object.entries(editingPrices)) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        await updatePrice(id, num);
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✅ Saved", "Service charges updated successfully!");
  }

  async function handleSaveRate(workerId: string) {
    const val = editingRates[workerId];
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 100) {
      await updateCommission(workerId, num);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✅ Saved", `Commission set to ${num}%!`);
    } else {
      Alert.alert("Error", "Percentage must be between 1 and 100");
    }
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
  }

  function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getAttendanceForDay(workerId: string, date: string): AttendanceStatus | null {
    const rec = attendance.find((a) => a.workerId === workerId && a.date === date);
    return rec?.status ?? null;
  }

  const workerList = users.filter((u) => u.role === "worker");
  const customerList = users.filter((u) => u.role === "user");
  const selectedWorker = workerList.find((w) => w.id === selectedWorkerId);
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Overview stats
  const totalEarnings = bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.price, 0);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const activeCount = bookings.filter((b) => b.status === "accepted" || b.status === "in_progress").length;
  const carWashEarnings = bookings.filter((b) => b.status === "completed" && b.serviceType === "car_wash").reduce((sum, b) => sum + b.price, 0);
  const bikeWashEarnings = bookings.filter((b) => b.status === "completed" && b.serviceType === "bike_wash").reduce((sum, b) => sum + b.price, 0);
  const tankEarnings = bookings.filter((b) => b.status === "completed" && b.serviceType === "water_tank").reduce((sum, b) => sum + b.price, 0);

  const TABS: { id: AdminTab; label: string; emoji: string }[] = [
    { id: "overview", label: "Overview", emoji: "📊" },
    { id: "attendance", label: "Attendance", emoji: "📅" },
    { id: "charges", label: "Charges", emoji: "💰" },
    { id: "feedback", label: "Ratings", emoji: "⭐" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          🛡️ Admin Panel
        </Text>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                activeTab === tab.id && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setActiveTab(tab.id);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.id ? "#fff" : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.earningsCard, { backgroundColor: "#22c55e10", borderColor: "#22c55e30" }]}>
            <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>💵 Total Revenue</Text>
            <Text style={[styles.earningsAmount, { color: "#22c55e" }]}>
              ₹{totalEarnings.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard icon="clock" label="⏳ Pending" value={pendingCount.toString()} color="#f59e0b" />
            <StatCard icon="activity" label="⚡ Active" value={activeCount.toString()} color="#3b82f6" />
          </View>
          <View style={[styles.statsGrid, { marginTop: 10 }]}>
            <StatCard icon="check-circle" label="✅ Completed" value={completedCount.toString()} color="#22c55e" />
            <StatCard icon="users" label="👥 Customers" value={customerList.length.toString()} color="#dc2626" />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📊 By Service</Text>
          {[
            { label: "🚗 Car Wash", earnings: carWashEarnings, color: "#dc2626" },
            { label: "🏍️ Bike Wash", earnings: bikeWashEarnings, color: "#7c3aed" },
            { label: "💧 Tank Cleaning", earnings: tankEarnings, color: "#059669" },
          ].map((s) => (
            <View
              key={s.label}
              style={[styles.serviceEarningsRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.serviceEarningsLabel, { color: colors.foreground }]}>{s.label}</Text>
              <Text style={[styles.serviceEarningsValue, { color: s.color }]}>₹{s.earnings}</Text>
            </View>
          ))}

          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>🔧 Workers</Text>
            <TouchableOpacity onPress={() => setShowAddWorker(!showAddWorker)} style={[styles.inlineBtn, { backgroundColor: colors.primary }]}>
              <Feather name={showAddWorker ? "x" : "plus"} size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{showAddWorker ? "Close" : "New"}</Text>
            </TouchableOpacity>
          </View>

          {showAddWorker && (
            <View style={[styles.addWorkerForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <TextInput style={[styles.nwInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="Name" placeholderTextColor={colors.mutedForeground} value={nwName} onChangeText={setNwName} />
               <TextInput style={[styles.nwInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="Email" placeholderTextColor={colors.mutedForeground} value={nwEmail} onChangeText={setNwEmail} keyboardType="email-address" autoCapitalize="none" />
               <TextInput style={[styles.nwInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="Phone" placeholderTextColor={colors.mutedForeground} value={nwPhone} onChangeText={setNwPhone} keyboardType="phone-pad" />
               <TextInput style={[styles.nwInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="Password (min 6 chars)" placeholderTextColor={colors.mutedForeground} value={nwPassword} onChangeText={setNwPassword} secureTextEntry />
               <TouchableOpacity style={[styles.createWorkerBtn, { backgroundColor: colors.primary }]} onPress={handleCreateWorker} disabled={workerLoading}>
                 {workerLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createWorkerBtnText}>Create Worker</Text>}
               </TouchableOpacity>
               <Text style={[styles.warningText, { color: colors.mutedForeground }]}>⚠️ Note: Creating a worker will temporarily log you out of your Admin session.</Text>
            </View>
          )}
          {workerList.map((w) => {
            const wBookings = bookings.filter((b) => b.workerId === w.id && b.status === "completed");
            const wStatus = workerStatuses[w.id] || "available";
            return (
              <View key={w.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: "#7c3aed20" }]}>
                  <Text style={{ fontSize: 20 }}>🔧</Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Text style={[styles.userName, { color: colors.foreground, marginBottom: 0 }]}>{w.name}</Text>
                    <View style={{ backgroundColor: wStatus === "available" ? "#10b98115" : "#ef444415", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: wStatus === "available" ? "#10b981" : "#ef4444" }}>
                        {wStatus === "available" ? "🟢 Available" : "🔴 Busy"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.userMeta, { color: colors.mutedForeground }]}>{w.email}</Text>
                  <Text style={[styles.userMeta, { color: colors.mutedForeground }]}>{w.phone}</Text>
                </View>
                <View style={styles.workerStats}>
                  <Text style={[styles.statValue, { color: "#7c3aed" }]}>
                    ₹{wBookings.reduce((s, b) => s + b.price, 0)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    {wBookings.length} jobs
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleDeleteUser(w.id, w.name)}
                  style={{ marginLeft: 12, padding: 8 }}
                >
                  <Feather name="trash-2" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>👤 Customers</Text>
          {customerList.map((c) => {
            const cBookings = bookings.filter((b) => b.userId === c.id);
            return (
              <View key={c.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: "#dc262620" }]}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{c.name}</Text>
                  <Text style={[styles.userMeta, { color: colors.mutedForeground }]}>{c.email}</Text>
                  <Text style={[styles.userMeta, { color: colors.mutedForeground }]}>{c.phone}</Text>
                </View>
                <View style={styles.workerStats}>
                  <Text style={[styles.statValue, { color: "#dc2626" }]}>{cBookings.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>bookings</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleDeleteUser(c.id, c.name)}
                  style={{ marginLeft: 12, padding: 8 }}
                >
                  <Feather name="trash-2" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── FEEDBACK TAB ── */}
      {activeTab === "feedback" && (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]} 
          showsVerticalScrollIndicator={false}
        >
          {feedbackLoading ? <ActivityIndicator color={colors.primary} /> : (() => {
            const workers = users.filter(u => u.role === "worker");
            const platformAvg = workers.length > 0 ? workers.reduce((s, w) => s + (w.average_rating || 0), 0) / workers.length : 0;
            const totalFeedbacks = feedbacks.length;
            
            const getRatingColor = (rating: number) => {
              if (rating >= 4.5) return "#22c55e";
              if (rating >= 3.5) return "#f59e0b";
              return "#ef4444";
            };

            return (
              <>
                <View style={[styles.statsGrid, { marginBottom: 20 }]}>
                  <View style={[styles.premiumStatCard, { backgroundColor: "#f59e0b10", borderColor: "#f59e0b30" }]}>
                    <Text style={[styles.pStatLabel, { color: colors.mutedForeground }]}>Platform Average</Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={[styles.pStatValue, { color: "#f59e0b" }]}>{platformAvg.toFixed(1)}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#f59e0b" }}>★</Text>
                    </View>
                  </View>
                  <View style={[styles.premiumStatCard, { backgroundColor: "#7c3aed10", borderColor: "#7c3aed30" }]}>
                    <Text style={[styles.pStatLabel, { color: colors.mutedForeground }]}>Total Reviews</Text>
                    <Text style={[styles.pStatValue, { color: "#7c3aed" }]}>{totalFeedbacks}</Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 10 }]}>Worker Performance Analytics</Text>
                {workers.map(w => {
                  const isExpanded = selectedWorkerFeedback === w.id;
                  const workerRating = Number(w.average_rating || 0);
                  const workerFeedbacks = feedbacks.filter(f => f.worker_id === w.id);
                  
                  return (
                    <TouchableOpacity 
                      key={w.id} 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedWorkerFeedback(isExpanded ? null : w.id);
                      }}
                      style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: isExpanded ? colors.primary : colors.border }]}
                    >
                      <View style={styles.aCardHeader}>
                        <View style={[styles.aAvatar, { backgroundColor: colors.primary + "10" }]}>
                          <Feather name="user" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.aName, { color: colors.foreground }]}>{w.name}</Text>
                          <Text style={[styles.aMeta, { color: colors.mutedForeground }]}>{w.total_feedbacks || 0} customer reviews</Text>
                        </View>
                        <View style={[styles.aScoreBox, { backgroundColor: getRatingColor(workerRating) + "15" }]}>
                          <Text style={[styles.aScore, { color: getRatingColor(workerRating) }]}>{workerRating.toFixed(1)}</Text>
                          <Feather name="star" size={10} color={getRatingColor(workerRating)} />
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.aExpandContent}>
                          <View style={styles.aDivider} />
                          
                          <Text style={styles.aSubTitle}>Rating Distribution</Text>
                          <View style={styles.aDistribution}>
                            {[5, 4, 3, 2, 1].map(star => {
                              const count = workerFeedbacks.filter(f => f.rating === star).length;
                              const pct = workerFeedbacks.length > 0 ? (count / workerFeedbacks.length) * 100 : 0;
                              return (
                                <View key={star} style={styles.aDistRow}>
                                  <Text style={styles.aDistLabel}>{star} ★</Text>
                                  <View style={[styles.aDistBarBg, { backgroundColor: colors.background }]}>
                                    <View style={[styles.aDistBarFill, { width: `${pct}%`, backgroundColor: getRatingColor(star) }]} />
                                  </View>
                                  <Text style={styles.aDistCount}>{count}</Text>
                                </View>
                              );
                            })}
                          </View>

                          <View style={styles.aDivider} />
                          <Text style={styles.aSubTitle}>Recent Customer Comments</Text>
                          {workerFeedbacks.length === 0 ? (
                            <Text style={styles.aEmptyText}>No detailed comments yet.</Text>
                          ) : (
                            workerFeedbacks.map(f => (
                              <View key={f.id} style={[styles.aCommentBox, { backgroundColor: colors.background }]}>
                                <View style={styles.aCommentHeader}>
                                  <Text style={[styles.aCommentUser, { color: colors.foreground }]}>{f.customer?.name || "Customer"}</Text>
                                  <View style={styles.aCommentStars}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Feather key={i} name="star" size={8} color={i < f.rating ? "#f59e0b" : colors.border} />
                                    ))}
                                  </View>
                                </View>
                                {f.description && <Text style={[styles.aCommentText, { color: colors.mutedForeground }]}>{f.description}</Text>}
                                <Text style={styles.aCommentDate}>{new Date(f.created_at).toLocaleDateString()}</Text>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                      
                      {!isExpanded && (
                         <View style={{ marginTop: 12, flexDirection: "row", gap: 4 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Feather key={i} name="star" size={12} color={i < Math.round(workerRating) ? "#f59e0b" : colors.border} />
                            ))}
                         </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            );
          })()}
        </ScrollView>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === "attendance" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scroll, 
            { paddingBottom: insets.bottom + 120 } // Increased padding for better visibility
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>👷 Worker Management</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workerChips}>
            {workerList.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[
                  styles.workerChip,
                  {
                    backgroundColor: selectedWorkerId === w.id ? colors.primary : colors.card,
                    borderColor: selectedWorkerId === w.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { setSelectedWorkerId(w.id); Haptics.selectionAsync(); }}
              >
                <View style={[styles.miniAvatar, { backgroundColor: selectedWorkerId === w.id ? "rgba(255,255,255,0.2)" : colors.primary + "15" }]}>
                   <Feather name="user" size={12} color={selectedWorkerId === w.id ? "#fff" : colors.primary} />
                </View>
                <Text style={[styles.workerChipText, { color: selectedWorkerId === w.id ? "#fff" : colors.foreground }]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📆 Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthChips}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: selectedMonth === i + 1 ? colors.primary : colors.card,
                    borderColor: selectedMonth === i + 1 ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { setSelectedMonth(i + 1); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.monthChipText, { color: selectedMonth === i + 1 ? "#fff" : colors.foreground }]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedWorkerId && selectedWorker && (
            <>
              <View style={[styles.adminFormBox, { backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 16 }]}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
                  📈 Service Commission Settings
                </Text>
                <View style={styles.rateRow}>
                  <View style={[styles.rateInputWrap, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}>
                    <TextInput
                      style={[styles.rateInput, { color: colors.foreground }]}
                      value={editingRates[selectedWorkerId] ?? ""}
                      onChangeText={(v) => setEditingRates((prev) => ({ ...prev, [selectedWorkerId]: v }))}
                      keyboardType="numeric"
                      placeholder="70"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <Text style={[styles.rateSuffix, { color: colors.mutedForeground }]}>% Worker Cut</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.saveRateBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleSaveRate(selectedWorkerId)}
                  >
                    <Feather name="check" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {(() => {
                const sal = calculateMonthlySalary(selectedWorkerId, selectedYear, selectedMonth);
                return (
                  <View style={[styles.premiumSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.summaryHeader}>
                      <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
                        💰 {MONTHS[selectedMonth - 1]} Earnings Report
                      </Text>
                      <View style={[styles.badge, { backgroundColor: "#22c55e15" }]}>
                        <Text style={{ color: "#22c55e", fontSize: 11, fontWeight: "800" }}>PAID PER SERVICE</Text>
                      </View>
                    </View>
                    
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricItem}>
                        <View style={[styles.metricIcon, { backgroundColor: "#3b82f615" }]}>
                          <Feather name="settings" size={14} color="#3b82f6" />
                        </View>
                        <Text style={[styles.metricValue, { color: colors.foreground }]}>{sal.totalServices}</Text>
                        <Text style={styles.metricLabel}>Services</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <View style={[styles.metricIcon, { backgroundColor: "#22c55e15" }]}>
                          <Feather name="trending-up" size={14} color="#22c55e" />
                        </View>
                        <Text style={[styles.metricValue, { color: colors.foreground }]}>₹{sal.totalRevenue}</Text>
                        <Text style={styles.metricLabel}>Revenue</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <View style={[styles.metricIcon, { backgroundColor: "#7c3aed15" }]}>
                          <Feather name="calendar" size={14} color="#7c3aed" />
                        </View>
                        <Text style={[styles.metricValue, { color: colors.foreground }]}>{sal.presentDays}d</Text>
                        <Text style={styles.metricLabel}>Active</Text>
                      </View>
                    </View>

                    <View style={[styles.netEarningCard, { backgroundColor: colors.primary + "10" }]}>
                      <View>
                        <Text style={[styles.netLabel, { color: colors.mutedForeground }]}>Net Worker Payout</Text>
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>Based on {sal.commissionPercentage}% Commission</Text>
                      </View>
                      <Text style={[styles.netValue, { color: colors.primary }]}>₹{sal.totalSalary.toLocaleString("en-IN")}</Text>
                    </View>
                  </View>
                );
              })()}

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                📅 Mark Attendance
              </Text>
              <View style={styles.calendarGrid}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dateStr = formatDate(selectedYear, selectedMonth, day);
                  const cellDate = new Date(selectedYear, selectedMonth - 1, day);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = cellDate < today;
                  
                  const status = getAttendanceForDay(selectedWorkerId, dateStr);
                  const statusConfig = STATUS_OPTIONS.find((s) => s.id === status);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calDay,
                        {
                          backgroundColor: statusConfig ? statusConfig.color + "20" : colors.card,
                          borderColor: statusConfig ? statusConfig.color : colors.border,
                          opacity: isPast ? 0.3 : 1,
                        },
                      ]}
                      disabled={isPast}
                      onPress={() => {
                        Haptics.selectionAsync();
                        Alert.alert(
                          `📅 Day ${day} — ${MONTHS[selectedMonth - 1]}`,
                          `Mark attendance for ${selectedWorker.name}`,
                          STATUS_OPTIONS.map((opt) => ({
                            text: `${opt.emoji} ${opt.label}`,
                            onPress: () =>
                              markAttendance(selectedWorkerId, selectedWorker.name, dateStr, opt.id),
                            style: status === opt.id ? "destructive" : "default",
                          }))
                        );
                      }}
                    >
                      <Text style={[styles.calDayNum, { color: colors.foreground }]}>{day}</Text>
                      {statusConfig && (
                        <Text style={styles.calDayEmoji}>{statusConfig.emoji}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.legend}>
                {STATUS_OPTIONS.map((opt) => (
                  <View key={opt.id} style={styles.legendItem}>
                    <Text style={styles.legendEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{opt.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {workerList.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔧</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No workers registered yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── CHARGES TAB ── */}
      {activeTab === "charges" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Text style={styles.infoEmoji}>ℹ️</Text>
            <Text style={[styles.infoText, { color: colors.accentForeground }]}>
              Edit the prices below and tap "Save Changes" to update service charges for all customers.
            </Text>
          </View>

          {prices.map((service) => (
            <View
              key={service.id}
              style={[styles.chargeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.chargeHeader}>
                <Text style={styles.chargeEmoji}>{service.emoji}</Text>
                <View style={styles.chargeInfo}>
                  <Text style={[styles.chargeName, { color: colors.foreground }]}>{service.label}</Text>
                  <Text style={[styles.chargeDesc, { color: colors.mutedForeground }]}>{service.description}</Text>
                </View>
                <View style={[styles.currentPriceBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.currentPriceText, { color: colors.primary }]}>
                    ₹{service.price}
                  </Text>
                </View>
              </View>

              <View style={[styles.priceInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.pricePrefix, { color: colors.mutedForeground }]}>₹</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.foreground }]}
                  value={editingPrices[service.id] ?? service.price.toString()}
                  onChangeText={(v) =>
                    setEditingPrices((prev) => ({ ...prev, [service.id]: v }))
                  }
                  keyboardType="numeric"
                  placeholder={service.price.toString()}
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.priceSuffix, { color: colors.mutedForeground }]}>per visit</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSavePrices}
            activeOpacity={0.85}
          >
            <Feather name="save" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>💾 Save Changes</Text>
          </TouchableOpacity>

          <View style={[styles.noteCard, { backgroundColor: colors.muted }]}>
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              📌 Note: Updated prices apply to new bookings only. Existing bookings retain their original prices.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, marginBottom: 14 },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 12, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  earningsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },
  earningsLabel: { fontSize: 13, fontWeight: "500" },
  earningsAmount: { fontSize: 34, fontWeight: "900", marginTop: 4, letterSpacing: -1 },
  statsGrid: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginTop: 20, marginBottom: 12, letterSpacing: -0.2 },
  serviceEarningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  serviceEarningsLabel: { fontSize: 14, fontWeight: "600" },
  serviceEarningsValue: { fontSize: 16, fontWeight: "800" },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700" },
  userMeta: { fontSize: 12, marginTop: 1 },
  workerStats: { alignItems: "flex-end" },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  // Attendance styles
  workerChips: { gap: 8, paddingBottom: 4 },
  workerChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  workerChipText: { fontSize: 13, fontWeight: "700" },
  monthChips: { gap: 8, paddingBottom: 4 },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  monthChipText: { fontSize: 13, fontWeight: "600" },
  rateRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  rateInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  ratePrefix: { fontSize: 16, fontWeight: "700", color: "#22c55e" },
  rateInput: { flex: 1, fontSize: 16, fontWeight: "700" },
  rateSuffix: { fontSize: 13 },
  saveRateBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  salarySummary: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
    marginBottom: 4,
    gap: 12,
  },
  salaryTitle: { fontSize: 14, fontWeight: "700" },
  salaryGrid: { flexDirection: "row", gap: 10 },
  salaryItem: { flex: 1, alignItems: "center" },
  salaryItemValue: { fontSize: 16, fontWeight: "800" },
  salaryItemLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  salaryTotal: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salaryTotalLabel: { fontSize: 13, fontWeight: "600" },
  salaryTotalValue: { fontSize: 22, fontWeight: "900" },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  calDay: {
    width: "13%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayNum: { fontSize: 11, fontWeight: "700" },
  calDayEmoji: { fontSize: 8, marginTop: 1 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 0, // Snapped directly below calendar
    paddingHorizontal: 4,
  },
  legendItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  legendEmoji: { fontSize: 12 },
  legendLabel: { fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, fontWeight: "500" },
  adminFormBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  premiumSummary: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
  netEarningCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
  },
  netLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  netValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  infoEmoji: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  chargeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  chargeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chargeEmoji: { fontSize: 28 },
  chargeInfo: { flex: 1 },
  chargeName: { fontSize: 16, fontWeight: "700" },
  chargeDesc: { fontSize: 12, marginTop: 2 },
  currentPriceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currentPriceText: { fontSize: 13, fontWeight: "800" },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  pricePrefix: { fontSize: 18, fontWeight: "700" },
  priceInput: { flex: 1, fontSize: 18, fontWeight: "700" },
  priceSuffix: { fontSize: 13 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  noteCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  noteText: { fontSize: 12, lineHeight: 18 },
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },
  inlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addWorkerForm: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  nwInput: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, fontSize: 15 },
  createWorkerBtn: { borderRadius: 12, padding: 16, alignItems: "center" },
  createWorkerBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  feedbackDetailWrap: { width: "100%", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  breakdownContainer: { gap: 4 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  feedbackItem: { marginBottom: 12, padding: 8, backgroundColor: "#f8fafc", borderRadius: 8 },
  warningText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  premiumStatCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    justifyContent: "center",
  },
  pStatLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  pStatValue: { fontSize: 28, fontWeight: "900" },
  analyticsCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  aCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  aAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  aName: { fontSize: 16, fontWeight: "800" },
  aMeta: { fontSize: 12, marginTop: 2 },
  aScoreBox: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  aScore: { fontSize: 16, fontWeight: "900" },
  aExpandContent: { marginTop: 16 },
  aDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginVertical: 16 },
  aSubTitle: { fontSize: 13, fontWeight: "800", marginBottom: 12, textTransform: "uppercase", color: "#64748b" },
  aDistribution: { gap: 8 },
  aDistRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  aDistLabel: { fontSize: 11, fontWeight: "700", width: 30, color: "#94a3b8" },
  aDistBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  aDistBarFill: { height: "100%", borderRadius: 3 },
  aDistCount: { fontSize: 10, fontWeight: "700", width: 20, textAlign: "right", color: "#94a3b8" },
  aEmptyText: { fontSize: 12, textAlign: "center", color: "#94a3b8", fontStyle: "italic", marginVertical: 10 },
  aCommentBox: { padding: 12, borderRadius: 12, marginBottom: 8 },
  aCommentHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  aCommentUser: { fontSize: 13, fontWeight: "700" },
  aCommentStars: { flexDirection: "row", gap: 2 },
  aCommentText: { fontSize: 13, fontStyle: "italic", lineHeight: 18 },
  aCommentDate: { fontSize: 10, color: "#94a3b8", marginTop: 8, alignSelf: "flex-end" },
});
