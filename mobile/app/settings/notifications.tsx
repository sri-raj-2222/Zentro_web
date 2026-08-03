import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

export default function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState({
    booking_updates: true,
    promotions: true,
    reminders: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    async function loadPreferences() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("notification_preferences")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        if (data?.notification_preferences) {
          setPreferences(data.notification_preferences as any);
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [user]);

  const togglePreference = async (key: keyof typeof preferences) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const original = { ...preferences };
    const updated = { ...preferences, [key]: !preferences[key] };
    
    // Optimistic Update
    setPreferences(updated);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: updated })
        .eq("id", user.id);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to save preference:", err);
      // Rollback
      setPreferences(original);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notification Preferences</Text>
      </View>

      {/* Preferences List */}
      <View style={styles.content}>
        <View style={[styles.prefRow, { borderBottomColor: colors.border }]}>
          <View style={styles.prefTextContainer}>
            <Text style={[styles.prefTitle, { color: colors.foreground }]}>Booking Updates</Text>
            <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>
              Receive status updates about your service bookings, worker assignments, tracking, and completions.
            </Text>
          </View>
          <Switch
            value={preferences.booking_updates}
            onValueChange={() => togglePreference("booking_updates")}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={Platform.OS === "android" ? "#fff" : undefined}
            disabled={saving}
          />
        </View>

        <View style={[styles.prefRow, { borderBottomColor: colors.border }]}>
          <View style={styles.prefTextContainer}>
            <Text style={[styles.prefTitle, { color: colors.foreground }]}>Promotions & Offers</Text>
            <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>
              Get updates on new discounts, seasonal promotions, referral bonuses, and loyalty rewards.
            </Text>
          </View>
          <Switch
            value={preferences.promotions}
            onValueChange={() => togglePreference("promotions")}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={Platform.OS === "android" ? "#fff" : undefined}
            disabled={saving}
          />
        </View>

        <View style={[styles.prefRow, { borderBottomColor: colors.border }]}>
          <View style={styles.prefTextContainer}>
            <Text style={[styles.prefTitle, { color: colors.foreground }]}>Reminders</Text>
            <Text style={[styles.prefDesc, { color: colors.mutedForeground }]}>
              Get reminders when you schedule a cleaning session or need to review/rate a worker's service.
            </Text>
          </View>
          <Switch
            value={preferences.reminders}
            onValueChange={() => togglePreference("reminders")}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={Platform.OS === "android" ? "#fff" : undefined}
            disabled={saving}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 16,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  prefTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  prefTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  prefDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
});
