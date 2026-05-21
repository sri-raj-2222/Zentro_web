"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
      // Attempt load from Supabase
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
      console.log("[AddressContext] Supabase addresses load failed, falling back to localStorage:", e.message);
    }

    // localStorage fallback
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY_PREFIX + user.id);
        if (stored) {
          setAddresses(JSON.parse(stored));
        } else {
          setAddresses([]);
        }
      }
    } catch (e: any) {
      console.error("Failed to load addresses from localStorage:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveToLocalStorage(updatedAddresses: Address[]) {
    if (!user || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY_PREFIX + user.id,
        JSON.stringify(updatedAddresses)
      );
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
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

    if (newAddress.isDefault) {
      updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
    }

    if (updatedList.length === 0) {
      newAddress.isDefault = true;
    }

    updatedList.push(newAddress);

    try {
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
      console.log("[AddressContext] Supabase insert failed, falling back to localStorage:", error.message);
    } catch (e: any) {
      console.log("[AddressContext] Supabase addresses add failed, using localStorage:", e.message);
    }

    setAddresses(updatedList);
    await saveToLocalStorage(updatedList);
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
      console.log("[AddressContext] Supabase edit failed, updating locally:", e.message);
    }

    setAddresses(updatedList);
    await saveToLocalStorage(updatedList);
    return { success: true };
  }

  async function deleteAddress(id: string): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: "No user authenticated" };

    const addressToDelete = addresses.find((a) => a.id === id);
    let updatedList = addresses.filter((a) => a.id !== id);

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
      console.log("[AddressContext] Supabase delete failed, updating locally:", e.message);
    }

    setAddresses(updatedList);
    await saveToLocalStorage(updatedList);
    return { success: true };
  }

  async function setAddressDefault(id: string): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: "No user authenticated" };

    const updatedList = addresses.map((a) => {
      if (a.id === id) return { ...a, isDefault: true };
      return { ...a, isDefault: false };
    });

    try {
      const { error: err1 } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      const { error: err2 } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);

      if (!err1 && !err2) {
        setAddresses(updatedList);
        return { success: true };
      }
    } catch (e: any) {
      console.log("[AddressContext] Supabase set default failed, updating locally:", e.message);
    }

    setAddresses(updatedList);
    await saveToLocalStorage(updatedList);
    return { success: true };
  }

  async function fetchCurrentLocation(): Promise<{ success: boolean; coords?: { latitude: number; longitude: number }; address?: string; data?: any; error?: string }> {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return { success: false, error: "Geolocation is not supported by this browser" };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // HTML5 Geolocation Reverse lookup using OpenStreetMap Nominatim API
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`
            );
            if (!response.ok) throw new Error("Nominatim API response failed");
            
            const data = await response.json();
            const addr = data.address;
            const full = data.display_name || `${latitude}, ${longitude}`;

            resolve({
              success: true,
              coords: { latitude, longitude },
              address: full,
              data: {
                street: addr.road || addr.suburb || "",
                city: addr.city || addr.town || addr.village || "",
                state: addr.state || "",
                country: addr.country || "",
                pincode: addr.postcode || "",
              },
            });
          } catch (e: any) {
            console.error("OSM Reverse Geocoding failed:", e);
            resolve({
              success: true,
              coords: { latitude, longitude },
              address: `${latitude}, ${longitude}`,
            });
          }
        },
        (error) => {
          resolve({ success: false, error: error.message || "Failed to fetch geolocation" });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
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
