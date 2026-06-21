import { useState, useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// Detect if the app is currently running inside Expo Go
const isExpoGo = Constants.appOwnership === "expo";

export function usePushNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === "web") return;

    // Gracefully handle Expo Go environment where remote push notifications are not supported
    if (isExpoGo) {
      console.warn(
        "Zentro Notification Warning: Remote push notifications are disabled in Expo Go. Use a development build for push support."
      );
      return;
    }

    let Notifications: any;
    let Device: any;
    
    try {
      // Dynamically require to avoid crash during static import phase in unsupported environments
      Notifications = require("expo-notifications");
      Device = require("expo-device");

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
    } catch (e) {
      console.warn("Failed to initialize notifications module:", e);
      return;
    }

    async function registerForPushNotificationsAsync(): Promise<string | null> {
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        } catch (err) {
          console.warn("Failed to create android notification channel:", err);
        }
      }

      let token = null;

      if (Device.isDevice) {
        try {
          const permission = (await Notifications.getPermissionsAsync()) as any;
          let finalStatus = permission.status;
          
          if (finalStatus !== "granted") {
            const request = (await Notifications.requestPermissionsAsync()) as any;
            finalStatus = request.status;
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
      } else {
        console.log("Must use physical device for Push Notifications");
      }

      return token;
    }

    let notificationListener: any = null;
    let responseListener: any = null;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        
        // Save the push token in Supabase public.profiles
        const { error } = await supabase
          .from("profiles")
          .update({ expo_push_token: token })
          .eq("id", userId);
          
        if (error) {
          console.error("Error updating push token in profiles:", error.message);
        }
      }
    });

    try {
      // Foreground listener
      notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
        setNotification(notification);
      });

      // Tapped notification listener
      responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log("Push notification tapped:", response.notification.request.content.data);
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

  return { expoPushToken, notification };
}
