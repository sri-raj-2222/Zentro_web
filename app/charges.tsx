import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useServicePrices, ServiceSubType } from "@/context/ServicePricesContext";
import { useColors } from "@/hooks/useColors";

export default function ChargesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    prices,
    subTypes,
    updatePrice,
    updateSubTypePrice,
    toggleSubTypeStatus,
    addNewSubType,
    updateSubTypeComplete,
  } = useServicePrices();

  // States for adding a new service subtype/variant
  const [newTypeName, setNewTypeName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newServiceName, setNewServiceName] = useState<"car" | "bike" | "tank">("car");

  // States for editing full fields inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState<string>("");
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [editingServiceName, setEditingServiceName] = useState<"car" | "bike" | "tank">("car");

  if (!user || user.role !== "admin") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Access denied. Admin only.</Text>
      </View>
    );
  }

  async function handleAddSubType() {
    if (!newTypeName.trim() || !newPrice.trim()) {
      Alert.alert("Error", "Please fill in type name and price.");
      return;
    }
    const priceVal = parseFloat(newPrice.trim());
    if (isNaN(priceVal) || priceVal < 0) {
      Alert.alert("Error", "Invalid price value.");
      return;
    }

    await addNewSubType(newServiceName, newTypeName.trim(), priceVal);
    setNewTypeName("");
    setNewPrice("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Success", `Variant "${newTypeName}" added!`);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.foreground }]}>⚡ Manage Charges</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Set and edit rates for all vehicle types and tank services. 💳
          </Text>

          {/* Add a new Service SubType/Variant */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              ✨ Add New Pricing Variant
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 12 }}>
              Add custom types of car, bike, or specialized cleaning services.
            </Text>

            <View style={{ gap: 12 }}>
              {/* Dropdown / Service selection */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["car", "bike", "tank"] as const).map((svc) => {
                  const active = newServiceName === svc;
                  return (
                    <TouchableOpacity
                      key={svc}
                      style={[
                        styles.svcChoice,
                        {
                          backgroundColor: active ? colors.primary + "15" : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setNewServiceName(svc)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "bold",
                          textTransform: "capitalize",
                          color: active ? colors.primary : colors.mutedForeground,
                        }}
                      >
                        {svc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Text Input for variant name */}
              <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="edit-3" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="e.g., Mini Truck, Heavy Cruiser"
                  placeholderTextColor={colors.mutedForeground}
                  value={newTypeName}
                  onChangeText={setNewTypeName}
                />
              </View>

              {/* Price per unit/liter input */}
              <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="dollar-sign" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Price (₹ or rate per liter)"
                  placeholderTextColor={colors.mutedForeground}
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAddSubType}>
                <Feather name="plus" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Add Variant</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Existing pricing options list */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 12 }]}>
            📋 Active Pricing Options
          </Text>

          {subTypes.map((st) => {
            const isTank = st.serviceName === "tank";
            return (
              <View
                key={st.id}
                style={[
                  styles.priceItemCard,
                  { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "column", alignItems: "stretch", padding: 16 },
                ]}
              >
                {editingId === st.id ? (
                  <View style={{ flex: 1, gap: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.foreground }}>
                      Edit Pricing Variant
                    </Text>
                    {/* Edit Name */}
                    <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Feather name="edit-3" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                      <TextInput
                        style={[styles.input, { color: colors.foreground }]}
                        value={editingTypeName}
                        onChangeText={setEditingTypeName}
                        placeholder="Type Name"
                      />
                    </View>

                    {/* Edit Service Category */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["car", "bike", "tank"] as const).map((svc) => {
                        const active = editingServiceName === svc;
                        return (
                          <TouchableOpacity
                            key={svc}
                            style={[
                              styles.svcChoice,
                              {
                                backgroundColor: active ? colors.primary + "15" : colors.card,
                                borderColor: active ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => setEditingServiceName(svc)}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "bold",
                                textTransform: "capitalize",
                                color: active ? colors.primary : colors.mutedForeground,
                              }}
                            >
                              {svc}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Edit Price */}
                    <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Feather name="dollar-sign" size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                      <TextInput
                        style={[styles.input, { color: colors.foreground }]}
                        value={editingPrice}
                        onChangeText={setEditingPrice}
                        placeholder="Price"
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Submit and Cancel row */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary, flex: 1 }]}
                        onPress={async () => {
                          const num = parseFloat(editingPrice);
                          if (!editingTypeName.trim()) {
                            Alert.alert("Invalid", "Type name cannot be empty");
                            return;
                          }
                          if (isNaN(num) || num < 0) {
                            Alert.alert("Invalid", "Please enter a valid price");
                            return;
                          }
                          await updateSubTypeComplete(st.id, {
                            typeName: editingTypeName.trim(),
                            price: num,
                            serviceName: editingServiceName,
                          });
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setEditingId(null);
                        }}
                      >
                        <Feather name="check" size={16} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.secondary, flex: 1 }]}
                        onPress={() => setEditingId(null)}
                      >
                        <Feather name="x" size={16} color={colors.foreground} />
                        <Text style={{ color: colors.foreground, fontWeight: "700" }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.priceTitle, { color: colors.foreground }]}>
                        {st.typeName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, textTransform: "capitalize" }}>
                        Service: {st.serviceName}
                      </Text>
                      <Text style={[styles.priceTag, { color: colors.primary }]}>
                        {isTank ? `₹${st.price} / liter` : `₹${st.price}`}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                        onPress={() => {
                          setEditingId(st.id);
                          setEditingTypeName(st.typeName);
                          setEditingPrice(st.price.toString());
                          setEditingServiceName(st.serviceName);
                        }}
                      >
                        <Feather name="edit-2" size={16} color={colors.foreground} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: st.isActive ? "#ef444420" : "#22c55e20" },
                        ]}
                        onPress={() => toggleSubTypeStatus(st.id, !st.isActive)}
                      >
                        <Feather
                          name={st.isActive ? "eye-off" : "eye"}
                          size={16}
                          color={st.isActive ? "#ef4444" : "#22c55e"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  sectionCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  svcChoice: { flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inputWrap: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  input: { flex: 1, fontSize: 14, minHeight: 24, textAlignVertical: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, gap: 6 },
  priceItemCard: { borderWidth: 1, borderRadius: 14, marginBottom: 10 },
  priceTitle: { fontSize: 15, fontWeight: "700" },
  priceTag: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  actionBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
