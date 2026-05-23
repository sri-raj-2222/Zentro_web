import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useBookings } from "@/context/BookingsContext";
import { useAddress } from "@/context/AddressContext";
import { useColors } from "@/hooks/useColors";

const ROLE_CONFIG = {
  user: { color: "#0ea5e9", icon: "user" as const, label: "Customer" },
  worker: { color: "#8b5cf6", icon: "tool" as const, label: "Worker" },
  admin: { color: "#f59e0b", icon: "shield" as const, label: "Admin" },
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateProfile, updatePassword } = useAuth();
  const { bookings } = useBookings();
  const { addresses, deleteAddress, setAddressDefault } = useAddress();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [editedPhone, setEditedPhone] = useState(user?.phone || "");

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  React.useEffect(() => {
    if (!user) {
      router.replace("/welcome");
    }
  }, [user]);

  if (!user) return null;

  async function handleSave() {
    if (!editedName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }

    setIsSaving(true);
    const result = await updateProfile(editedName.trim(), editedPhone.trim());
    setIsSaving(false);

    if (result.success) {
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Update Failed", result.error || "Something went wrong");
    }
  }

  async function handleChangePassword() {
    if (!oldPassword.trim()) {
      Alert.alert("Error", "Current password is required");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Error", "New password cannot be empty");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    const result = await updatePassword(newPassword.trim(), oldPassword.trim());
    setIsUpdatingPassword(false);

    if (result.success) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordFields(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Password updated successfully!");
    } else {
      Alert.alert("Update Failed", result.error || "Something went wrong");
    }
  }

  function toggleEdit() {
    if (isEditing) {
      // Cancel: Reset states
      setEditedName(user?.name || "");
      setEditedPhone(user?.phone || "");
    }
    setIsEditing(!isEditing);
  }

  const roleConfig = ROLE_CONFIG[user.role];

  const userBookings =
    user.role === "user"
      ? bookings.filter((b) => b.userId === user.id)
      : user.role === "worker"
      ? bookings.filter((b) => b.workerId === user.id)
      : bookings;

  const completed = userBookings.filter((b) => b.status === "completed").length;
  const totalSpent =
    user.role === "user"
      ? userBookings
          .filter((b) => b.status === "completed")
          .reduce((sum, b) => sum + b.price, 0)
      : 0;
  const totalEarned =
    user.role === "worker"
      ? userBookings
          .filter((b) => b.status === "completed")
          .reduce((sum, b) => sum + b.price, 0)
      : 0;

  async function handleLogout() {
    if (Platform.OS === "web") {
      const ok = window.confirm("Are you sure you want to sign out?");
      if (ok) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await logout();
        router.replace("/welcome");
      }
      return;
    }

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/welcome");
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + 80,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Hero */}
      <View style={styles.profileHero}>
        <View
          style={[
            styles.avatarLarge,
            { backgroundColor: roleConfig.color + "20" },
          ]}
        >
          <Feather name={roleConfig.icon} size={36} color={roleConfig.color} />
        </View>
        <Text style={[styles.profileName, { color: colors.foreground }]}>
          {user.name}
        </Text>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: roleConfig.color + "15" },
          ]}
        >
          <Text style={[styles.roleLabel, { color: roleConfig.color }]}>
            {roleConfig.label}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statItem,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statNumber, { color: colors.foreground }]}>
            {userBookings.length}
          </Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
            {user.role === "admin" ? "Total" : "Bookings"}
          </Text>
        </View>
        <View
          style={[
            styles.statItem,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statNumber, { color: colors.foreground }]}>
            {completed}
          </Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
            Completed
          </Text>
        </View>
        {user.role === "user" ? (
          <View
            style={[
              styles.statItem,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statNumber, { color: "#0ea5e9" }]}>
              ₹{totalSpent}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
              Spent
            </Text>
          </View>
        ) : user.role === "worker" ? (
          <View
            style={[
              styles.statItem,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statNumber, { color: "#22c55e" }]}>
              ₹{totalEarned}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
              Earned
            </Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Account Info
        </Text>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: isEditing ? colors.secondary : colors.primary + "15" }]}
          onPress={toggleEdit}
          disabled={isSaving}
        >
          {isEditing ? (
            <Feather name="x" size={16} color={colors.mutedForeground} />
          ) : (
            <Feather name="edit-3" size={16} color={colors.primary} />
          )}
          <Text style={[styles.editBtnText, { color: isEditing ? colors.mutedForeground : colors.primary }]}>
            {isEditing ? "Cancel" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          {
            icon: "user" as const,
            label: "Full Name",
            value: user.name,
            key: "name",
            editable: true,
            tempValue: editedName,
            setter: setEditedName,
          },
          {
            icon: "mail" as const,
            label: "Email",
            value: user.email,
            key: "email",
            editable: false,
          },
          {
            icon: "phone" as const,
            label: "Phone",
            value: user.phone,
            key: "phone",
            editable: true,
            tempValue: editedPhone,
            setter: setEditedPhone,
            keyboardType: "phone-pad" as const,
          },
          {
            icon: roleConfig.icon,
            label: "Role",
            value: roleConfig.label,
            key: "role",
            editable: false,
          },
        ].map((item, idx, arr) => (
          <View key={item.key}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={item.icon} size={16} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                  {item.label}
                </Text>
                {isEditing && item.editable ? (
                  <TextInput
                    style={[styles.infoInput, { color: colors.foreground, borderBottomColor: colors.primary + "40" }]}
                    value={item.tempValue}
                    onChangeText={item.setter}
                    placeholder={`Enter ${item.label}`}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={item.keyboardType || "default"}
                    autoFocus={item.key === "name"}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>
                    {item.value || "Not set"}
                  </Text>
                )}
              </View>
              {item.editable && !isEditing && (
                <Feather name="chevron-right" size={14} color={colors.border} />
              )}
            </View>
            {idx < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          </View>
        ))}
      </View>

      {isEditing && (
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Change Password Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Change Password
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
        {!showPasswordFields ? (
          <TouchableOpacity
            style={[styles.passwordBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPasswordFields(true);
            }}
          >
            <Feather name="lock" size={16} color="#fff" />
            <Text style={styles.passwordBtnText}>Modify Password</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.formGroupMobile}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>
                Current Password
              </Text>
              <TextInput
                style={[
                  styles.infoInputMobile,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.secondary,
                  },
                ]}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Enter current password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroupMobile}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>
                New Password
              </Text>
              <TextInput
                style={[
                  styles.infoInputMobile,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.secondary,
                  },
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroupMobile}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>
                Confirm New Password
              </Text>
              <TextInput
                style={[
                  styles.infoInputMobile,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.secondary,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.passwordBtn, { backgroundColor: colors.secondary, flex: 1 }]}
                onPress={() => {
                  setShowPasswordFields(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                <Text style={[styles.passwordBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordBtn, { backgroundColor: colors.primary, flex: 2 }]}
                onPress={handleChangePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.passwordBtnText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Admin Charges / Settings Management */}
      {user.role === "admin" && (
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/charges");
          }}
        >
          <Feather name="settings" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Manage Charges & Pricing</Text>
        </TouchableOpacity>
      )}

      {/* Address Management System */}
      {user.role === "user" && (
        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              📍 Manage Addresses
            </Text>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primary + "15" }]}
              onPress={() => router.push("/addresses")}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>
                Add New
              </Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 16, alignItems: "center" }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
                No addresses added yet. Add your current location or a specific address.
              </Text>
            </View>
          ) : (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 4 }]}>
              {addresses.map((addr, idx) => (
                <View key={addr.id} style={{ padding: 14, borderBottomWidth: idx < addresses.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
                        {addr.fullAddress}
                      </Text>
                      {addr.isDefault && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                          <View style={{ backgroundColor: "#10b98120", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                            <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "700" }}>
                              Default
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {!addr.isDefault && (
                        <TouchableOpacity onPress={() => {
                          setAddressDefault(addr.id);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}>
                          <Feather name="star" size={18} color="#eab308" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => router.push({ pathname: "/addresses", params: { editId: addr.id } })}>
                        <Feather name="edit-2" size={17} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete", style: "destructive", onPress: () => {
                              deleteAddress(addr.id);
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                          }
                        ]);
                      }}>
                        <Feather name="trash-2" size={17} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Contact Us Section - User Only */}
      {user.role === "user" && (
        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.contactIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="mail" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactHeading, { color: colors.mutedForeground }]}>
              Contact us at
            </Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL('mailto:Zentrooffficial@gmail.com')}
              activeOpacity={0.6}
              style={{ marginBottom: 4 }}
            >
              <Text style={[styles.contactEmail, { color: colors.primary, textDecorationLine: 'underline' }]}>
                Zentrooffficial@gmail.com
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => Linking.openURL('tel:+916281892357')}
              activeOpacity={0.6}
            >
              <Text style={[styles.contactEmail, { color: colors.primary, textDecorationLine: 'underline' }]}>
                +91 6281892357
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: "#ef4444" + "40" }]}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Feather name="log-out" size={18} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  profileHero: { alignItems: "center", marginBottom: 28 },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  profileName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleLabel: { fontSize: 13, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statNumber: { fontSize: 20, fontWeight: "800" },
  statLbl: { fontSize: 11, marginTop: 3, fontWeight: "500" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: "500" },
  infoValue: { fontSize: 15, fontWeight: "600", marginTop: 2 },
  infoInput: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 16,
  },
  logoutText: { color: "#ef4444", fontSize: 15, fontWeight: "700" },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactHeading: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  formGroupMobile: {
    marginBottom: 10,
  },
  infoInputMobile: {
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  passwordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  passwordBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
