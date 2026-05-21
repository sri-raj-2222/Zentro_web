import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  FadeInDown,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

interface FeedbackCardProps {
  booking: any;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip: () => void;
}

export function FeedbackCard({ booking, onSubmit, onSkip }: FeedbackCardProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Animation for stars
  const starScales = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ];

  const handleRating = (index: number) => {
    setRating(index + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate the selected star and preceding ones
    starScales[index].value = withSequence(
      withSpring(1.5),
      withSpring(1)
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setIsSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Modal transparent visible={true} animationType="fade">
        <View style={styles.overlay}>
          <Animated.View 
            entering={FadeInDown.springify()} 
            exiting={FadeOutDown}
            style={[styles.container, styles.successContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.content}>
              <LinearGradient
                colors={["#22c55e", "#10b981"]}
                style={styles.successIcon}
              >
                <Feather name="check" size={40} color="#fff" />
              </LinearGradient>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Thank You!</Text>
              <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
                Your feedback helps us provide the best service experience.
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent visible={true} animationType="none">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Animated.View 
          entering={FadeInDown.springify().damping(12).mass(1.2)} 
          exiting={FadeOutDown}
          style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <ScrollView 
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 44 : 28) }
            ]}
            bounces={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            
            <View style={styles.headerRow}>
              <View style={[styles.serviceIcon, { backgroundColor: colors.primary }]}>
                <Feather name="star" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heading, { color: colors.foreground }]}>Rate Your Service</Text>
                <Text style={[styles.context, { color: colors.mutedForeground }]} numberOfLines={1}>
                  How was your wash with <Text style={{ fontWeight: "800", color: colors.primary }}>{booking.workerName}</Text>?
                </Text>
              </View>
            </View>

            <View style={styles.starsContainer}>
              {[0, 1, 2, 3, 4].map((index) => {
                const animatedStyle = useAnimatedStyle(() => ({
                  transform: [{ scale: starScales[index].value }],
                }));

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleRating(index)}
                    activeOpacity={0.5}
                  >
                    <Animated.View style={animatedStyle}>
                      <Feather
                        name="star"
                        size={46}
                        color={index < rating ? "#f59e0b" : colors.border + "90"}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary + "50", borderColor: colors.border, color: colors.foreground }]}
              placeholder="Share your experience (optional)..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              value={comment}
              onChangeText={setComment}
              scrollEnabled={false}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={onSkip} style={[styles.actionBtn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Maybe Later</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSubmit} 
                disabled={rating === 0 || isSubmitting}
                style={[styles.actionBtn, { backgroundColor: rating === 0 ? colors.border : colors.primary, flex: 2, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>Submit Rating</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 99999,
  },
  container: {
    maxHeight: "85%",
    width: "100%",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1.5,
    elevation: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
  },
  dragHandle: {
    width: 44,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#000",
    marginBottom: 24,
    alignSelf: "center",
    opacity: 0.15,
  },
  headerRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 28,
    alignItems: "center",
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  heading: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  context: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  input: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    fontSize: 16,
    marginBottom: 28,
    textAlignVertical: "top",
    minHeight: 110,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 14,
  },
  actionBtn: {
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 17,
    fontWeight: "900",
  },
  successContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.6,
  },
});
