import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, DeviceEventEmitter } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { getNotificationConfig } from "../lib/notificationHelper";

export default function InAppBanner() {
  const [currentNotification, setCurrentNotification] = useState<any>(null);
  const queue = useRef<any[]>([]);
  const isAnimating = useRef(false);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Shared value for Y translation
  const translateY = useSharedValue(-120);

  const processQueue = () => {
    if (isAnimating.current || queue.current.length === 0) return;
    
    isAnimating.current = true;
    const nextItem = queue.current.shift();
    setCurrentNotification(nextItem);

    // Slide In
    translateY.value = withSpring(insets.top + 10, { damping: 15 }, (finished) => {
      if (finished) {
        runOnJS(startDismissTimeout)();
      }
    });
  };

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener("showInAppBanner", (notification) => {
      queue.current.push(notification);
      processQueue();
    });
    return () => listener.remove();
  }, []);

  const startDismissTimeout = () => {
    setTimeout(() => {
      dismissBanner();
    }, 4000);
  };

  const dismissBanner = (onComplete?: () => void) => {
    // Slide Out
    translateY.value = withTiming(-120, { duration: 350 }, (finished) => {
      if (finished) {
        runOnJS(cleanupBanner)(onComplete);
      }
    });
  };

  const cleanupBanner = (onComplete?: () => void) => {
    setCurrentNotification(null);
    isAnimating.current = false;
    if (onComplete) onComplete();
    processQueue();
  };

  const handlePress = () => {
    const bookingId = currentNotification?.data?.booking_id;
    dismissBanner(() => {
      if (bookingId) {
        router.push(`/bookings/${bookingId}` as any);
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!currentNotification) return null;

  const type = currentNotification.data?.type || "";
  const config = getNotificationConfig(type, currentNotification.title, currentNotification.body);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.accentBar, { backgroundColor: config.color }]} />
        <View style={[styles.iconContainer, { backgroundColor: config.color + "15" }]}>
          <Feather name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {config.title}
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
            {config.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
  },
});
