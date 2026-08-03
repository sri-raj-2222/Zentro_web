import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { getNotificationConfig } from "@/lib/notificationHelper";
import { getCachedNotifications, saveNotificationsToCache } from "@/lib/notificationCache";

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
  if (Constants.appOwnership === "expo") {
    return;
  }
  try {
    const Notifications = require("expo-notifications");
    if (Notifications && typeof Notifications.setBadgeCountAsync === "function") {
      await Notifications.setBadgeCountAsync(count);
    }
  } catch (e) {
    // Silently ignore
  }
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync state changes with native app badge and home screen unreadCount instantly
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    DeviceEventEmitter.emit("updateUnreadCount", unread);
    updateDeviceBadgeCount(unread);
  }, [notifications]);

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
      await saveNotificationsToCache(data || []);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  // Load from cache first, then fetch latest
  useEffect(() => {
    async function init() {
      const cached = await getCachedNotifications();
      if (cached && cached.length > 0) {
        setNotifications(cached);
        setLoading(false);
      }
      await fetchNotifications();
    }
    init();
  }, [user]);

  // Real-time updates subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_notifications_screen_${user.id}_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNotifications((prev) => {
              const updated = [payload.new as NotificationItem, ...prev];
              saveNotificationsToCache(updated);
              return updated;
            });
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) => {
              const updated = prev.map((item) =>
                item.id === payload.new.id ? (payload.new as NotificationItem) : item
              );
              saveNotificationsToCache(updated);
              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) => {
              const updated = prev.filter((item) => item.id !== payload.old.id);
              saveNotificationsToCache(updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const original = [...notifications];

    // Optimistic Update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
      
      const cached = await getCachedNotifications();
      const updatedCache = cached.map((n) => (n.id === id ? { ...n, read: true } : n));
      await saveNotificationsToCache(updatedCache);
    } catch (e) {
      console.error("Error marking notification as read:", e);
      // Rollback
      setNotifications(original);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const original = [...notifications];

    // Optimistic Update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
      
      const cached = await getCachedNotifications();
      const updatedCache = cached.map((n) => ({ ...n, read: true }));
      await saveNotificationsToCache(updatedCache);
    } catch (e) {
      console.error("Error marking all notifications as read:", e);
      // Rollback
      setNotifications(original);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const original = [...notifications];

    // Optimistic Update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      
      const cached = await getCachedNotifications();
      const updatedCache = cached.filter((n) => n.id !== id);
      await saveNotificationsToCache(updatedCache);
    } catch (e) {
      console.error("Error deleting notification:", e);
      // Rollback
      setNotifications(original);
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to permanently delete all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const original = [...notifications];

            // Optimistic Update
            setNotifications([]);

            try {
              const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("user_id", user.id);
              if (error) throw error;
              await saveNotificationsToCache([]);
            } catch (e) {
              console.error("Error clearing all notifications:", e);
              // Rollback
              setNotifications(original);
            }
          },
        },
      ]
    );
  };

  const handleLongPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDeleteNotification(id) },
      ]
    );
  };

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
    
    if (item.data?.booking_id) {
      router.push(`/bookings/${item.data.booking_id}` as any);
    }
  };

  // Group notifications by relative date
  const groupNotifications = () => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const thisWeek: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - oneDay;
    const sevenDaysAgoMidnight = todayMidnight - (6 * oneDay);

    notifications.forEach((item) => {
      const date = new Date(item.created_at).getTime();

      if (date >= todayMidnight) {
        today.push(item);
      } else if (date >= yesterdayMidnight) {
        yesterday.push(item);
      } else if (date >= sevenDaysAgoMidnight) {
        thisWeek.push(item);
      } else {
        earlier.push(item);
      }
    });

    const sections: { title: string; data: NotificationItem[] }[] = [];
    if (today.length > 0) sections.push({ title: "Today", data: today });
    if (yesterday.length > 0) sections.push({ title: "Yesterday", data: yesterday });
    if (thisWeek.length > 0) sections.push({ title: "This Week", data: thisWeek });
    if (earlier.length > 0) sections.push({ title: "Earlier", data: earlier });

    return sections;
  };

  const flatListData = React.useMemo(() => {
    const sections = groupNotifications();
    const data: any[] = [];
    sections.forEach((sec) => {
      data.push({ isHeader: true, title: sec.title });
      sec.data.forEach((item) => {
        data.push(item);
      });
    });
    return data;
  }, [notifications]);

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
        <View style={[styles.actionPanel, { backgroundColor: colors.primary + "10", borderColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            You have unread notifications
          </Text>
          <TouchableOpacity onPress={handleMarkAllAsRead} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.border + "40" }]}>
            <Feather name="bell-off" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            We'll notify you when bookings get updated, accepted, or requested.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatListData}
          keyExtractor={(item, index) => (item.isHeader ? `h-${item.title}-${index}` : item.id)}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
          renderItem={({ item }) => {
            if (item.isHeader) {
              return (
                <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                  <Text style={[styles.sectionHeaderText, { color: colors.mutedForeground }]}>
                    {item.title}
                  </Text>
                </View>
              );
            }

            const type = item.data?.type || "";
            const config = getNotificationConfig(type, item.title, item.body);

            return (
              <TouchableOpacity
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.8}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: item.read ? colors.border : colors.primary + "30",
                    borderWidth: item.read ? 1 : 1.5,
                  },
                ]}
              >
                {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrapper, { backgroundColor: config.color + "15" }]}>
                    <Feather name={config.icon} size={18} color={config.color} />
                  </View>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                    {config.title}
                  </Text>
                  <Text style={[styles.cardText, { color: colors.mutedForeground }]}>{config.body}</Text>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  {!item.read && (
                    <TouchableOpacity
                      onPress={() => handleMarkAsRead(item.id)}
                      style={[styles.smallBtn, { backgroundColor: colors.border }]}
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
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
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
