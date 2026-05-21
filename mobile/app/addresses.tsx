import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
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

import { useAddress } from "@/context/AddressContext";
import { useColors } from "@/hooks/useColors";

export default function AddressesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const editId = params.editId as string | undefined;

  const { addresses, addAddress, editAddress, fetchCurrentLocation } = useAddress();

  const [fullAddress, setFullAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | string>("");
  const [longitude, setLongitude] = useState<number | string>("");
  const [isDefault, setIsDefault] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      const addr = addresses.find((a) => a.id === editId);
      if (addr) {
        setFullAddress(addr.fullAddress);
        setCity(addr.city);
        setState(addr.state);
        setCountry(addr.country);
        setPincode(addr.pincode);
        setLatitude(addr.latitude);
        setLongitude(addr.longitude);
        setIsDefault(addr.isDefault);
      }
    }
  }, [editId, addresses]);

  // Debounced search for manual address selection
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      handleSearch(searchQuery);
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  async function handleSearch(query: string) {
    setIsSearching(true);
    try {
      // Use free Nominatim Geocoding API if no Google API Key is provided
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
        { headers: { "User-Agent": "Zentro-Address-App" } }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAutoDetect() {
    setIsLoadingLocation(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const res = await fetchCurrentLocation();
    setIsLoadingLocation(false);

    if (res.success && res.coords) {
      setLatitude(res.coords.latitude);
      setLongitude(res.coords.longitude);
      setFullAddress(res.address || "");
      if (res.data) {
        setCity(res.data.city || res.data.subregion || "");
        setState(res.data.region || "");
        setCountry(res.data.country || "");
        setPincode(res.data.postalCode || "");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Location Failed", res.error || "Could not fetch current position.");
    }
  }

  function handleSelectResult(item: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLatitude(parseFloat(item.lat));
    setLongitude(parseFloat(item.lon));
    setFullAddress(item.display_name);
    
    if (item.address) {
      setCity(item.address.city || item.address.town || item.address.village || "");
      setState(item.address.state || "");
      setCountry(item.address.country || "");
      setPincode(item.address.postcode || "");
    }
    setSearchResults([]);
    setSearchQuery("");
  }

  async function handleSave() {
    if (!fullAddress.trim()) {
      Alert.alert("Error", "Please provide a complete address.");
      return;
    }
    if (!latitude || !longitude) {
      Alert.alert("Error", "Please select or manually input valid coordinates.");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const addrData = {
      fullAddress: fullAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      pincode: pincode.trim(),
      latitude: typeof latitude === "string" ? parseFloat(latitude) : latitude,
      longitude: typeof longitude === "string" ? parseFloat(longitude) : longitude,
      isDefault,
    };

    let res;
    if (editId) {
      res = await editAddress(editId, addrData);
    } else {
      res = await addAddress(addrData);
    }

    setIsSaving(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert("Error", res.error || "Failed to save address.");
    }
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {editId ? "✏️ Edit Address" : "📍 Add Address"}
            </Text>
          </View>

          {/* Location Detection */}
          <TouchableOpacity
            style={[styles.autoBtn, { borderColor: colors.primary }]}
            onPress={handleAutoDetect}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Feather name="map-pin" size={16} color={colors.primary} />
                <Text style={[styles.autoText, { color: colors.primary }]}>
                  Detect Current Location via GPS
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Autocomplete Places Search */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            🔍 Search for Location
          </Text>
          <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search city, area or street..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && <ActivityIndicator color={colors.primary} size="small" />}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.resultItem, { borderBottomWidth: index < searchResults.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                  onPress={() => handleSelectResult(item)}
                >
                  <Feather name="map-pin" size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                  <Text style={[styles.resultText, { color: colors.foreground }]}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Form */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
            🏠 Complete Address Fields
          </Text>

          {/* Address Fields */}
          <View style={styles.form}>
            <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Street / Full Address</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Ex. 123 Main Street"
                placeholderTextColor={colors.mutedForeground}
                value={fullAddress}
                onChangeText={setFullAddress}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>City</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex. Bangalore"
                  placeholderTextColor={colors.mutedForeground}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>State</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex. Karnataka"
                  placeholderTextColor={colors.mutedForeground}
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Country</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex. India"
                  placeholderTextColor={colors.mutedForeground}
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Pincode</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex. 560001"
                  placeholderTextColor={colors.mutedForeground}
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Latitude</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex. 12.9716"
                  placeholderTextColor={colors.mutedForeground}
                  value={latitude.toString()}
                  onChangeText={(val) => setLatitude(val)}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Longitude</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex. 77.5946"
                  placeholderTextColor={colors.mutedForeground}
                  value={longitude.toString()}
                  onChangeText={(val) => setLongitude(val)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Is Default Checkbox */}
            <TouchableOpacity
              style={styles.defaultCheckbox}
              onPress={() => setIsDefault(!isDefault)}
            >
              <View style={[styles.checkSquare, { borderColor: colors.primary, backgroundColor: isDefault ? colors.primary : "transparent" }]}>
                {isDefault && <Feather name="check" size={14} color="#fff" />}
              </View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                Set as default address
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="save" size={18} color="#fff" />
                <Text style={styles.saveText}>Save Address</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  backBtn: { padding: 6, borderRadius: 10 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 20,
  },
  autoText: { fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  resultsCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
  },
  resultText: { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 18 },
  form: { gap: 12 },
  inputGroup: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  input: { fontSize: 15, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10 },
  defaultCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    paddingVertical: 4,
  },
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginTop: 24,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
