import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "@zentro_notifications_cache";

export async function getCachedNotifications(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveNotificationsToCache(notifications: any[]) {
  try {
    const subset = notifications.slice(0, 50);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(subset));
  } catch (err) {
    console.error("Failed to save notifications cache:", err);
  }
}
