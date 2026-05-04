import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface ServiceCardProps {
  image?: any;
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  price: string;
  color: string;
  onPress: () => void;
}

export function ServiceCard({
  image,
  icon,
  title,
  subtitle,
  price,
  color,
  onPress,
}: ServiceCardProps) {
  const colors = useColors();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: "#fff" }]}>
        {image ? (
          <Image source={image} style={styles.serviceImage} contentFit="contain" />
        ) : (
          <Feather name={icon || "truck"} size={28} color={color} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <View style={[styles.priceBadge, { backgroundColor: color + "15" }]}>
        <Text style={[styles.price, { color }]}>₹{price}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  serviceImage: {
    width: "100%",
    height: "100%",
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
  },
});
