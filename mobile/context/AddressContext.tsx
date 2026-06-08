import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export interface Address {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  fullAddress: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isDefault: boolean;
}

interface AddressContextType {
  addresses: Address[];
  isLoading: boolean;
  addAddress: (addr: Omit<Address, "id" | "userId">) => Promise<{ success: boolean; error?: string }>;
  editAddress: (id: string, addr: Partial<Omit<Address, "id" | "userId">>) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
  setAddressDefault: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchCurrentLocation: () => Promise<{ success: boolean; coords?: { latitude: number; longitude: number }; address?: string; data?: any; error?: string }>;
}

const AddressContext = createContext<AddressContextType | null>(null);

const STORAGE_KEY_PREFIX = "@zentro_addresses_";

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAddresses();
    } else {
      setAddresses([]);
      setIsLoading(false);
    }
  }, [user]);

  async function loadAddresses() {
    if (!user) return;
    setIsLoading(true);

    try {
      // Attempt to load from Supabase
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        const formatted: Address[] = data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          latitude: parseFloat(d.latitude),
          longitude: parseFloat(d.longitude),
          fullAddress: d.full_address,
          city: d.city,
          state: d.state,
          country: d.country,
          pincode: d.pincode,
          isDefault: d.is_default,
        }));
        setAddresses(formatted);
        setIsLoading(false);
        return;
      }
    } catch (e: any) {
      console.log("[AddressContext] Supabase addresses load failed or table doesn't exist, falling back to AsyncStorage:", e.message);
    }

    // AsyncStorage fallback
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + user.id);
      if (stored) {
        setAddresses(JSON.parse(stored));
      } else {
        setAddresses([]);
      }
    } catch (e: any) {
      console.error("Failed to load addresses from AsyncStorage:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveToAsyncStorage(updatedAddresses: Address[]) {
    if (!user) return;
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_PREFIX + user.id,
        JSON.stringify(updatedAddresses)
      );
    } catch (e) {
      console.error("Failed to save to AsyncStorage:", e);
    }
  }

  async function addAddress(addr: Omit<Address, "id" | "userId">): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: "No user authenticated" };

    const newId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const newAddress: Address = {
      id: newId,
      userId: user.id,
      ...addr,
    };

    let updatedList = [...addresses];

    // Mark current default to false if this one is default
    if (newAddress.isDefault) {
      updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
    }

    // If first address, mark it as default
    if (updatedList.length === 0) {
      newAddress.isDefault = true;
    }

    updatedList.push(newAddress);

    try {
      // Attempt writing to Supabase
      const { error } = await supabase.from("addresses").insert({
        id: newAddress.id,
        user_id: user.id,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
        full_address: newAddress.fullAddress,
        city: newAddress.city,
        state: newAddress.state,
        country: newAddress.country,
        pincode: newAddress.pincode,
        is_default: newAddress.isDefault,
      });

      if (!error) {
        setAddresses(updatedList);
        return { success: true };
      }
      console.log("[AddressContext] Supabase insert failed, adding to AsyncStorage fallback:", error.message);
    } catch (e: any) {
      console.log("[AddressContext] Supabase addresses add failed, adding to AsyncStorage:", e.message);
    }

    setAddresses(updatedList);
    await saveToAsyncStorage(updatedList);
    return { success: true };
  }

  async function editAddress(id: string, addr: Partial<Omit<Address, "id" | "userId">>): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: "No user authenticated" };

    let updatedList = addresses.map((a) => {
      if (a.id === id) {
        return { ...a, ...addr };
      }
      return a;
    });

    if (addr.isDefault) {
      updatedList = updatedList.map((a) => {
        if (a.id !== id) return { ...a, isDefault: false };
        return a;
      });
    }

    try {
      const { error } = await supabase
        .from("addresses")
        .update({
          latitude: addr.latitude,
          longitude: addr.longitude,
          full_address: addr.fullAddress,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          pincode: addr.pincode,
          is_default: addr.isDefault,
        })
        .eq("id", id);

      if (!error) {
        setAddresses(updatedList);
        return { success: true };
      }
    } catch (e: any) {
      console.log("[AddressContext] Supabase edit failed, updating local state:", e.message);
    }

    setAddresses(updatedList);
    await saveToAsyncStorage(updatedList);
    return { success: true };
  }

  async function deleteAddress(id: string): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: "No user authenticated" };

    const addressToDelete = addresses.find((a) => a.id === id);
    let updatedList = addresses.filter((a) => a.id !== id);

    // If we delete default, mark first available address as default
    if (addressToDelete?.isDefault && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }

    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);

      if (!error) {
        setAddresses(updatedList);
        return { success: true };
      }
    } catch (e: any) {
      console.log("[AddressContext] Supabase delete failed, updating local state:", e.message);
    }

    setAddresses(updatedList);
    await saveToAsyncStorage(updatedList);
    return { success: true };
  }

  async function setAddressDefault(id: string): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: "No user authenticated" };

    const updatedList = addresses.map((a) => {
      if (a.id === id) return { ...a, isDefault: true };
      return { ...a, isDefault: false };
    });

    try {
      // 1. Reset all defaults to false for user
      const { error: err1 } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // 2. Set default for this address
      const { error: err2 } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);

      if (!err1 && !err2) {
        setAddresses(updatedList);
        return { success: true };
      }
    } catch (e: any) {
      console.log("[AddressContext] Supabase set default failed, updating local state:", e.message);
    }

    setAddresses(updatedList);
    await saveToAsyncStorage(updatedList);
    return { success: true };
  }

  async function fetchCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return { success: false, error: "Location permission denied" };
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;

      let reverseGeo: any = null;
      try {
        reverseGeo = await Location.reverseGeocodeAsync({ latitude, longitude });
      } catch (e) {
        console.error("Reverse geocoding with expo-location failed:", e);
      }

      if (reverseGeo && reverseGeo.length > 0) {
        const item = reverseGeo[0];
        const full = [
          item.streetNumber,
          item.street,
          item.city,
          item.region,
          item.postalCode,
          item.country,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          success: true,
          coords: { latitude, longitude },
          address: full || `${latitude}, ${longitude}`,
          data: item,
        };
      }

      return {
        success: true,
        coords: { latitude, longitude },
        address: `${latitude}, ${longitude}`,
      };
    } catch (e: any) {
      let msg = "Location services are unavailable. Please make sure GPS/Location is enabled in your device settings, or enter the address manually.";
      if (e.message && !e.message.includes("Location provider")) {
        msg = e.message;
      }
      return { success: false, error: msg };
    }
  }

  return (
    <AddressContext.Provider
      value={{
        addresses,
        isLoading,
        addAddress,
        editAddress,
        deleteAddress,
        setAddressDefault,
        fetchCurrentLocation,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddress must be used within AddressProvider");
  return ctx;
}
