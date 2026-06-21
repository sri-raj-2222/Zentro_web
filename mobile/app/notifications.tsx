import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";


import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
}

const updateDeviceBadgeCount = async (count: number) => {
  if (Platform.OS === "web") return;
  // Bypass completely in Expo Go environment to prevent SDK 53 errors
  if (Constants.appOwnership === "expo") {
    return;
  }
  try {
    const Notifications = require("expo-notifications");
    if (Notifications && typeof Notifications.setBadgeCountAsync === "function") {
      await Notifications.setBadgeCountAsync(count);
    }
  } catch (e) {
    // Silently ignore to avoid polluting logs
  }
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state changes with native app badge and home screen unreadCount instantly
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    DeviceEventEmitter.emit("updateUnreadCount", unread);
    updateDeviceBadgeCount(unread);
  }, [notifications]);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Real-time listener for new notifications
    const channel = supabase
      .channel(`user_notifications_${user.id}_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNotifications((prev) => [payload.new as NotificationItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as NotificationItem) : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    } catch (e) {
      console.error("Error marking all notifications as read:", e);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setNotifications([]);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    } catch (e) {
      console.error("Error clearing all notifications:", e);
    }
  };

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
    
    // Navigate based on booking actions
    if (item.data?.booking_id) {
      if (user?.role === "admin") {
        router.push("/(tabs)/admin");
      } else if (user?.role === "worker") {
        router.push("/(tabs)/jobs");
      } else {
        router.push("/(tabs)/bookings");
      }
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "new_booking":
        return { name: "calendar" as const, color: colors.primary };
      case "booking_accepted":
        return { name: "check-circle" as const, color: colors.success };
      case "booking_completed":
        return { name: "award" as const, color: "#a855f7" };
      default:
        return { name: "bell" as const, color: colors.mutedForeground };
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
            <Text style={[styles.clearAllText, { color: colors.destructive }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action panel (Mark all as read) */}
      {notifications.some((n) => !n.read) && (
        <View style={[styles.actionPanel, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.accentForeground }]}>
            You have unread notifications
          </Text>
          <TouchableOpacity onPress={handleMarkAllAsRead} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.muted + "20" }]}>
            <Feather name="bell-off" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            We'll notify you when bookings get updated, accepted, or requested.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const iconConfig = getNotificationIcon(item.data?.type);
            return (
              <TouchableOpacity
                onPress={() => handleNotificationPress(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: item.read ? colors.border : colors.primary + "30",
                    borderWidth: item.read ? 1 : 1.5,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrapper, { backgroundColor: iconConfig.color + "15" }]}>
                    <Feather name={iconConfig.name} size={18} color={iconConfig.color} />
                  </View>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: colors.foreground,
                        fontWeight: item.read ? "600" : "800",
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.cardText, { color: colors.mutedForeground }]}>{item.body}</Text>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  {!item.read && (
                    <TouchableOpacity
                      onPress={() => handleMarkAsRead(item.id)}
                      style={[styles.smallBtn, { backgroundColor: colors.muted }]}
                    >
                      <Feather name="check" size={12} color={colors.foreground} />
                      <Text style={[styles.smallBtnText, { color: colors.foreground }]}>Mark read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteNotification(item.id)}
                    style={[styles.smallBtn, { marginLeft: "auto", backgroundColor: colors.destructive + "10" }]}
                  >
                    <Feather name="trash-2" size={12} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 16,
  },
  clearAllBtn: {
    marginLeft: "auto",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    padding: 24,
    borderRadius: 30,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardBody: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
