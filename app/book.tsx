import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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

import { useAuth } from "@/context/AuthContext";
import { useBookings, ServiceType } from "@/context/BookingsContext";
import { useAddress } from "@/context/AddressContext";
import { useServicePrices, ServiceSubType } from "@/context/ServicePricesContext";
import { useColors } from "@/hooks/useColors";


const SERVICE_META: {
  id: ServiceType;
  label: string;
  image: any;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  description: string;
  nameKey: "car" | "bike" | "tank";
}[] = [
  {
    id: "car_wash",
    label: "Car Wash",
    image: require("@/assets/images/car_service.png"),
    icon: "truck",
    color: "#0ea5e9",
    description: "Full exterior & interior cleaning",
    nameKey: "car",
  },
  {
    id: "bike_wash",
    label: "Bike Wash",
    image: require("@/assets/images/bike_service.png"),
    icon: "wind",
    color: "#8b5cf6",
    description: "Thorough bike cleaning & polishing",
    nameKey: "bike",
  },
  {
    id: "water_tank",
    label: "Water Tank Cleaning",
    image: require("@/assets/images/tank_service.png"),
    icon: "droplet",
    color: "#22c55e",
    description: "Deep tank cleaning & sanitization",
    nameKey: "tank",
  },
];

const SUBTYPE_IMAGES: Record<string, any> = {
  "car-hatchback": require("@/assets/images/car-hatchback.png"),
  "car-sedan": require("@/assets/images/car-sedan.png"),
  "car-suv": require("@/assets/images/car-suv.png"),
  "car-offroader": require("@/assets/images/car-offroader.png"),
  "bike-scooty": require("@/assets/images/bike-scooty.png"),
  "bike-standard": require("@/assets/images/bike-standard.png"),
  "bike-super": require("@/assets/images/bike-super.png"),
};

export default function BookScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ service: ServiceType }>();
  const { user } = useAuth();
  const { bookings, createBooking, isAnyWorkerAvailable } = useBookings();
  const { addresses } = useAddress();
  const { subTypes } = useServicePrices();

  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<ServiceSubType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());

  useEffect(() => {
    if (params.service && SERVICE_META.some((s) => s.id === params.service)) {
      setSelectedService(params.service);
    }
  }, [params.service]);

  // Date format YYYY-MM-DD string state
  const formatDateString = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [dateText, setDateText] = useState(formatDateString(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);

  // Month navigation for visual full calendar grid
  const [currentMonthYear, setCurrentMonthYear] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeServiceMeta = SERVICE_META.find((s) => s.id === selectedService);

  // Get service subtypes for the picked main service
  const serviceSubTypes = activeServiceMeta
    ? subTypes.filter((st) => st.serviceName === activeServiceMeta.nameKey && st.isActive)
    : [];

  // Reset subType when picking a different service
  useEffect(() => {
    setSelectedSubType(null);
    setQuantity(1);
  }, [selectedService]);

  const [tankCapacity, setTankCapacity] = useState("");

  // Address matching
  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
  const userHasAddress = !!defaultAddr || !!user?.address;
  const displayAddress = defaultAddr ? defaultAddr.fullAddress : (user?.address || "");

  // Total price calculation
  const tankItem = subTypes.find((st) => st.serviceName === "tank");
  const costPerLiter = tankItem ? tankItem.price : 0.5;
  const calculatedPrice =
    selectedService === "water_tank"
      ? parseFloat(tankCapacity || "0") * costPerLiter
      : selectedSubType
      ? selectedSubType.price * quantity
      : 0;

  // Functions for parsing date changes
  const handleDateChange = (text: string) => {
    setDateText(text);
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (regex.test(text)) {
      const d = new Date(text);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d < today) {
          setError("Cannot book for a past date");
          return;
        }
        setError("");
        setScheduledDate(d);
        setCurrentMonthYear({ month: d.getMonth(), year: d.getFullYear() });
      }
    }
  };

  const handleDaySelect = (day: number) => {
    const d = new Date(currentMonthYear.year, currentMonthYear.month, day);
    setScheduledDate(d);
    setDateText(formatDateString(d));
    setShowCalendar(false);
    Haptics.selectionAsync();
  };

  const changeMonth = (delta: number) => {
    let nextMonth = currentMonthYear.month + delta;
    let nextYear = currentMonthYear.year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    setCurrentMonthYear({ month: nextMonth, year: nextYear });
  };

  // Calendar parameters
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonthYear.month, currentMonthYear.year);
  const firstDay = getFirstDayOfMonth(currentMonthYear.month, currentMonthYear.year);

  // Build grid of empty slots + month days
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  async function handleBook() {
    if (!user) return;

    if (!userHasAddress) {
      Alert.alert(
        "Address Required",
        "Please set your address before booking a service.",
        [
          { text: "Go to Profile", onPress: () => router.push("/(tabs)/profile") },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    if (!selectedService) {
      setError("Please select a service");
      return;
    }

    if (selectedService === "water_tank") {
      const cap = parseFloat(tankCapacity);
      if (isNaN(cap) || cap <= 0) {
        setError("Please enter a valid tank capacity in liters");
        return;
      }
    } else {
      if (!selectedSubType) {
        setError("Please select a specific variant/type of service");
        return;
      }

      if (quantity < 1) {
        setError("Please select a valid quantity (1 or more)");
        return;
      }
    }

    if (!scheduledDate) {
      setError("Please enter or pick a valid scheduled date");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const isAvailable = isAnyWorkerAvailable();

      const bookingLabel =
        selectedService === "water_tank"
          ? `${activeServiceMeta!.label} (${tankCapacity}L)`
          : `${activeServiceMeta!.label} (${selectedSubType!.typeName})`;

      await createBooking({
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        serviceType: selectedService,
        serviceLabel: bookingLabel,
        price: calculatedPrice,
        location: displayAddress,
        notes: description.trim() || undefined,
        scheduledDate: scheduledDate.toISOString(),
      });

      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const isToday =
        scheduledDate.getDate() === new Date().getDate() &&
        scheduledDate.getMonth() === new Date().getMonth() &&
        scheduledDate.getFullYear() === new Date().getFullYear();

      if (!isAvailable && isToday) {
        Alert.alert(
          "Workers Busy",
          "All our workers are currently busy. Our team will approach you within 1 hour.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/bookings") }]
        );
      } else {
        router.replace("/(tabs)/bookings");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Failed to book service.");
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.foreground }]}>📅 Book a Service</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Centralized address and scheduled date-driven booking 📍
          </Text>

          {/* Service Selection */}
          {!params.service && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Select Service
              </Text>
              <View style={styles.servicesGrid}>
                {SERVICE_META.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.serviceItem,
                      {
                        backgroundColor:
                          selectedService === s.id ? s.color + "15" : colors.card,
                        borderColor:
                          selectedService === s.id ? s.color : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedService(s.id);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.serviceIcon,
                        { backgroundColor: "#fff", padding: 4 },
                      ]}
                    >
                      <Image source={s.image} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                    </View>
                    <Text
                      style={[
                        styles.serviceItemLabel,
                        {
                          color:
                            selectedService === s.id
                              ? s.color
                              : colors.foreground,
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                    <Text
                      style={[styles.serviceDesc, { color: colors.mutedForeground }]}
                    >
                      {s.description}
                    </Text>
                    {selectedService === s.id && (
                      <View
                        style={[styles.checkmark, { backgroundColor: s.color }]}
                      >
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Sub Type Selection Option */}
          {selectedService && selectedService !== "water_tank" && serviceSubTypes.length > 0 && (
            <View style={{ marginBottom: 18 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Pick Service Type
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subTypesGrid}
              >
                {serviceSubTypes.map((st) => {
                  const isPicked = selectedSubType?.id === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.subTypeItem,
                        {
                          backgroundColor: isPicked ? colors.primary + "15" : colors.card,
                          borderColor: isPicked ? colors.primary : colors.border,
                          transform: [{ scale: isPicked ? 1.04 : 1 }],
                          shadowColor: isPicked ? colors.primary : "transparent",
                          shadowOpacity: isPicked ? 0.25 : 0,
                          shadowRadius: isPicked ? 6 : 0,
                          elevation: isPicked ? 3 : 0,
                        },
                      ]}
                      onPress={() => {
                        setSelectedSubType(st);
                        Haptics.selectionAsync();
                      }}
                    >
                      {/* Custom Illustration */}
                      <View
                        style={{
                          width: "100%",
                          height: 70,
                          borderRadius: 8,
                          backgroundColor: "#fff",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 8,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: isPicked ? colors.primary : "#f0f0f0",
                        }}
                      >
                        <Image 
                          source={SUBTYPE_IMAGES[st.id] || activeServiceMeta?.image} 
                          style={{ width: "100%", height: "100%" }} 
                          contentFit="contain" 
                        />
                      </View>
                      <Text style={[styles.subTypeName, { color: colors.foreground, fontWeight: "bold" }]}>
                        {st.typeName}
                      </Text>
                      <Text style={[styles.subTypePrice, { color: colors.primary, fontWeight: "700" }]}>
                        ₹{st.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Water Tank Capacity Input */}
          {selectedService === "water_tank" && (
            <View style={{ marginBottom: 18 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Tank Capacity
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="droplet" size={18} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Enter tank capacity in liters (e.g., 500, 1000)"
                  placeholderTextColor={colors.mutedForeground}
                  value={tankCapacity}
                  onChangeText={setTankCapacity}
                  keyboardType="numeric"
                />
              </View>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4, fontWeight: "600" }}>
                Cost per liter: ₹{costPerLiter.toFixed(2)}
              </Text>
            </View>
          )}

              {/* Quantity Selection Stepper Counter */}
              {selectedService !== "water_tank" && (
                <View style={[styles.quantityWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View>
                    <Text style={[styles.quantityLabel, { color: colors.foreground }]}>Quantity</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Specify total units</Text>
                  </View>
                  <View style={styles.quantityStepper}>
                    <TouchableOpacity
                      style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => {
                        if (quantity > 1) {
                          setQuantity(quantity - 1);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Feather name="minus" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.quantityNumber, { color: colors.foreground }]}>
                      {quantity}
                    </Text>
                    <TouchableOpacity
                      style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => {
                        if (quantity < 10) {
                          setQuantity(quantity + 1);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Feather name="plus" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

          {/* Address Preview */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Selected Address
          </Text>
          <View style={[styles.addressBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="map-pin" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: colors.mutedForeground }}>
                  Default Address Selected
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 2 }} numberOfLines={2}>
                  {displayAddress || "No saved address found."}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.changeBtn, { borderColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text style={[styles.changeBtnText, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker Section with Input + Calendar Toggle Right Option */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 18 }]}>
            Scheduled Date
          </Text>
          <View style={[styles.datePickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.dateInput, { color: colors.foreground }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={dateText}
              onChangeText={handleDateChange}
              maxLength={10}
            />
            <TouchableOpacity
              style={[styles.calendarIconBtn, { backgroundColor: colors.primary + "15" }]}
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <Feather name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Full Visual Monthly Calendar Grid Toggle */}
          {showCalendar && (
            <View style={[styles.fullCalendarBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Calendar Month Header Controller */}
              <View style={styles.calendarControlRow}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                  <Feather name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.monthLabelText, { color: colors.foreground }]}>
                  {monthNames[currentMonthYear.month]} {currentMonthYear.year}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                  <Feather name="chevron-right" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={styles.daysHeaderRow}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, dIdx) => (
                  <Text key={dIdx} style={[styles.dayHeaderText, { color: colors.mutedForeground }]}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar slots grid */}
              <View style={styles.daysGridWrap}>
                {calendarDays.map((day, cIdx) => {
                  if (day === null) {
                    return <View key={cIdx} style={styles.calendarSlotEmpty} />;
                  }

                  const isSelected =
                    scheduledDate?.getDate() === day &&
                    scheduledDate?.getMonth() === currentMonthYear.month &&
                    scheduledDate?.getFullYear() === currentMonthYear.year;

                  const cellDate = new Date(currentMonthYear.year, currentMonthYear.month, day);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // ⏳ Only disable dates that are strictly in the past
                  const isPast = cellDate < today;
                  const isDisabled = isPast;

                  return (
                    <TouchableOpacity
                      key={cIdx}
                      style={[
                        styles.calendarSlotFilled,
                        {
                          backgroundColor: isSelected ? colors.primary : "transparent",
                          opacity: isDisabled ? 0.3 : 1,
                        },
                      ]}
                      onPress={() => !isDisabled && handleDaySelect(day)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.slotDayNumberText,
                          {
                            color: isSelected ? "#fff" : colors.foreground,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Notes/Description */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 18 }]}>
            Booking Description
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="file-text" size={18} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Additional notes / request description..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Smart Availability Logic moved to handleBook popup */}

          {/* Live Summary Card */}
          {scheduledDate && (selectedSubType || (selectedService === "water_tank" && tankCapacity)) && (
            <View
              style={[
                styles.summary,
                { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30", padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 18 },
              ]}
            >
              {selectedService === "water_tank" ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                      Tank Capacity:
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground, fontWeight: "bold" }]}>
                      {tankCapacity}L
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                      Price Per Litre:
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground, fontWeight: "bold" }]}>
                      ₹{costPerLiter}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                      Vehicle Type:
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground, fontWeight: "bold" }]}>
                      {selectedSubType?.typeName}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                      Price Per Unit:
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground, fontWeight: "bold" }]}>
                      ₹{selectedSubType?.price}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                      Quantity:
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground, fontWeight: "bold" }]}>
                      {quantity}
                    </Text>
                  </View>
                </>
              )}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8, width: "100%" }} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Total Amount:
                </Text>
                <Text style={[styles.summaryAmount, { color: colors.primary, fontSize: 18, fontWeight: "800" }]}>
                  ₹{calculatedPrice}
                </Text>
              </View>
            </View>
          )}

          {/* Booking Trigger */}
          <TouchableOpacity
            style={[
              styles.bookBtn,
              {
                backgroundColor: colors.primary,
                opacity:
                  !selectedService ||
                  (selectedService !== "water_tank" && !selectedSubType) ||
                  (selectedService === "water_tank" && !tankCapacity) ||
                  !scheduledDate
                    ? 0.6
                    : 1,
              },
            ]}
            onPress={handleBook}
            disabled={
              loading ||
              !selectedService ||
              (selectedService !== "water_tank" && !selectedSubType) ||
              (selectedService === "water_tank" && !tankCapacity) ||
              !scheduledDate
            }
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="calendar" size={18} color="#fff" />
                <Text style={styles.bookBtnText}>Confirm Booking</Text>
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
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  backBtn: { marginBottom: 12, padding: 4, alignSelf: "flex-start" },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  servicesGrid: { gap: 10, marginBottom: 16 },
  serviceItem: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    position: "relative",
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  serviceItemLabel: { fontSize: 15, fontWeight: "700" },
  serviceDesc: { fontSize: 12, marginTop: 1 },
  checkmark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subTypesGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  subTypeItem: {
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  subTypeName: { fontSize: 14, fontWeight: "700" },
  subTypePrice: { fontSize: 15, fontWeight: "800" },
  quantityWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  quantityLabel: { fontSize: 15, fontWeight: "700" },
  quantityStepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityNumber: { fontSize: 16, fontWeight: "700", minWidth: 20, textAlign: "center" },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  changeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeBtnText: { fontSize: 12, fontWeight: "700" },
  datePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dateInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  calendarIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fullCalendarBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  calendarControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  monthLabelText: { fontSize: 15, fontWeight: "700" },
  daysHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayHeaderText: { width: 34, fontSize: 12, fontWeight: "700", textAlign: "center" },
  daysGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 4,
  },
  calendarSlotEmpty: { width: 34, height: 34 },
  calendarSlotFilled: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  slotDayNumberText: { fontSize: 13 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, minHeight: 36, textAlignVertical: "top" },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  summary: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: "600" },
  summaryAmount: { fontSize: 18, fontWeight: "800" },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 16,
  },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  warningBanner: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
  },
});
