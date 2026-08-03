import { useState, useEffect } from "react";
import { Platform, DeviceEventEmitter } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

const isExpoGo = Constants.appOwnership === "expo";

// Dynamically require expo-notifications only outside of Expo Go to prevent warnOfExpoGoPushUsage crash.
let Notifications: any = null;
if (!isExpoGo && Platform.OS !== "web") {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    console.warn("Failed to load expo-notifications:", e);
  }
}

export function usePushNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === "web") return;
    if (isExpoGo || !Notifications) return;

    // Static Setup of iOS Categories and Actions
    try {
      Notifications.setNotificationCategoryAsync("BOOKING_UPDATE", [
        {
          identifier: "VIEW_BOOKING",
          buttonTitle: "View Booking 🚗",
          options: { opensAppToForeground: true },
        },
      ]);
    } catch (err) {
      console.warn("Failed to set notification categories:", err);
    }

    // Set how notifications are handled when the app is in the foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    async function registerForPushNotificationsAsync(): Promise<string | null> {
      if (Platform.OS === "android") {
        try {
          // Channel for booking_accepted (Green LED)
          await Notifications.setNotificationChannelAsync("booking-accepted", {
            name: "Booking Accepted",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#22c55e",
            enableLights: true,
            enableVibrate: true,
          });

          // Channel for in_progress (Amber LED)
          await Notifications.setNotificationChannelAsync("booking-in-progress", {
            name: "Service In Progress",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#f59e0b",
            enableLights: true,
            enableVibrate: true,
          });

          // Channel for completed (Blue LED)
          await Notifications.setNotificationChannelAsync("booking-completed", {
            name: "Service Completed",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#3b82f6",
            enableLights: true,
            enableVibrate: true,
          });

          // Channel for cancelled (Red LED)
          await Notifications.setNotificationChannelAsync("booking-cancelled", {
            name: "Booking Cancelled",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#ef4444",
            enableLights: true,
            enableVibrate: true,
          });
        } catch (err) {
          console.warn("Failed to create android notification channels:", err);
        }
      }

      let token = null;

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== "granted") {
          console.warn("Failed to get push token for push notifications!");
          return null;
        }
        
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;
          
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (e) {
        console.warn("Error getting expo push token:", e);
      }

      return token;
    }

    console.log("[Zentro Debug] Requesting push token for user ID:", userId);

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        console.log("[Zentro Debug] Successfully generated Expo Push Token:", token);
        setExpoPushToken(token);
        
        // Save the push token in Supabase public.profiles
        const { error } = await supabase
          .from("profiles")
          .update({ expo_push_token: token })
          .eq("id", userId);
          
        if (error) {
          console.error("[Zentro Debug] Error updating push token in profiles:", error.message);
        } else {
          console.log("[Zentro Debug] Successfully saved push token to Supabase profiles!");
        }
      } else {
        console.warn("[Zentro Debug] Push token registration returned null/undefined");
      }
    }).catch(err => {
      console.error("[Zentro Debug] Fatal error during push token registration:", err);
    });

    let notificationListener: any = null;
    let responseListener: any = null;

    try {
      // Foreground listener
      notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
        setNotification(notification);
      });

      // Tapped notification listener (handles body tap and category action buttons)
      responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data;
        const bookingId = data?.booking_id;

        if (bookingId && (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER || actionId === "VIEW_BOOKING")) {
          router.push(`/bookings/${bookingId}` as any);
        }
      });
    } catch (e) {
      console.warn("Error adding notification listeners:", e);
    }

    return () => {
      if (notificationListener) {
        try {
          notificationListener.remove();
        } catch (err) {}
      }
      if (responseListener) {
        try {
          responseListener.remove();
        } catch (err) {}
      }
    };
  }, [userId]);

  // Real-time listener for database changes (pushes to custom in-app banner in foreground)
  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === "web") return;

    const channel = supabase
      .channel(`global_user_notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          try {
            // Trigger custom in-app banner event
            DeviceEventEmitter.emit("showInAppBanner", payload.new);
            
            // Broadcast badge update request
            DeviceEventEmitter.emit("refreshUnreadCount");

            // Optional: Also trigger a local push notification if in background
            if (!isExpoGo && Notifications) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: payload.new.title || "New Notification",
                  body: payload.new.body || "",
                  data: payload.new.data || {},
                  categoryIdentifier: "BOOKING_UPDATE",
                },
                trigger: null,
              });
            }
          } catch (e) {
            console.warn("Failed to process incoming notification event:", e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { expoPushToken, notification };
}
