import { Feather } from "@expo/vector-icons";

export type NotificationType =
  | "booking_created"
  | "booking_accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "new_booking";

export interface NotificationConfig {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  title: string;
  body: string;
}

export function getNotificationConfig(
  type: string,
  title?: string,
  body?: string
): NotificationConfig {
  switch (type) {
    case "booking_created":
      return {
        icon: "bell",
        color: "#3b82f6", // Blue
        title: title || "Booking Confirmed 🔔",
        body: body || "Your booking has been placed.",
      };
    case "booking_accepted":
      return {
        icon: "check-circle",
        color: "#22c55e", // Green
        title: title || "Worker Assigned ✅",
        body: body || "A worker is on the way.",
      };
    case "in_progress":
      return {
        icon: "tool",
        color: "#f59e0b", // Amber
        title: title || "Service Started 🔧",
        body: body || "The worker has started your service.",
      };
    case "completed":
      return {
        icon: "star",
        color: "#3b82f6", // Blue
        title: title || "Service Completed! ⭐",
        body: body || "Your service has been marked as completed.",
      };
    case "cancelled":
      return {
        icon: "x-circle",
        color: "#ef4444", // Red
        title: title || "Booking Cancelled ❌",
        body: body || "Your booking has been cancelled.",
      };
    case "new_booking":
      return {
        icon: "calendar",
        color: "#8b5cf6", // Purple
        title: title || "New Booking Request 🚗",
        body: body || "A new job request has arrived.",
      };
    default:
      return {
        icon: "bell",
        color: "#6b7280", // Gray
        title: title || "Notification",
        body: body || "",
      };
  }
}
