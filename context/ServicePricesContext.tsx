import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export interface ServicePrice {
  id: string;
  label: string;
  emoji: string;
  price: number;
  description: string;
}

export interface ServiceSubType {
  id: string;
  serviceName: "car" | "bike" | "tank";
  typeName: string;
  price: number;
  isActive: boolean;
  imageUrl?: string;
  type?: "vehicle" | "tank";
  label?: string;
  pricePerUnit?: number;
  unit?: string;
  updatedAt?: string;
}

interface ServicePricesContextType {
  prices: ServicePrice[];
  subTypes: ServiceSubType[];
  updatePrice: (id: string, price: number) => Promise<void>;
  getPrice: (id: string) => number;
  updateSubTypePrice: (id: string, price: number) => Promise<void>;
  toggleSubTypeStatus: (id: string, isActive: boolean) => Promise<void>;
  addNewSubType: (serviceName: "car" | "bike" | "tank", typeName: string, price: number) => Promise<void>;
  updateSubTypeComplete: (id: string, updatedFields: Partial<ServiceSubType>) => Promise<void>;
}

const ServicePricesContext = createContext<ServicePricesContextType | null>(null);

export const DEFAULT_PRICES: ServicePrice[] = [
  { id: "car_wash", label: "Car Wash", emoji: "🚗", price: 499, description: "Full exterior & interior cleaning" },
  { id: "bike_wash", label: "Bike Wash", emoji: "🏍️", price: 249, description: "Thorough bike cleaning & polishing" },
  { id: "water_tank", label: "Water Tank Cleaning", emoji: "💧", price: 799, description: "Deep tank cleaning & sanitization" },
];

export const DEFAULT_SUBTYPES: ServiceSubType[] = [
  // Car sub-types
  { id: "car-hatchback", serviceName: "car", typeName: "Hatchback", price: 399, isActive: true, imageUrl: "https://images.unsplash.com/photo-1517524285303-d6fc683dddf8?auto=format&fit=crop&w=250&q=80" },
  { id: "car-sedan", serviceName: "car", typeName: "Sedan", price: 499, isActive: true, imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=250&q=80" },
  { id: "car-suv", serviceName: "car", typeName: "SUV", price: 599, isActive: true, imageUrl: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=250&q=80" },
  { id: "car-offroader", serviceName: "car", typeName: "Off-roader", price: 699, isActive: true, imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=250&q=80" },

  // Bike sub-types
  { id: "bike-scooty", serviceName: "bike", typeName: "Scooty", price: 199, isActive: true, imageUrl: "https://images.unsplash.com/photo-1558383429-21669466f28b?auto=format&fit=crop&w=250&q=80" },
  { id: "bike-standard", serviceName: "bike", typeName: "Standard Bike", price: 249, isActive: true, imageUrl: "https://images.unsplash.com/photo-1558383429-1c6913ea3295?auto=format&fit=crop&w=250&q=80" },
  { id: "bike-super", serviceName: "bike", typeName: "Super Bike", price: 349, isActive: true, imageUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=250&q=80" },

  // Tank sub-types
  { id: "tank-per-liter", serviceName: "tank", typeName: "Cost Per Liter", price: 0.5, isActive: true },
];

import { useAuth } from "@/context/AuthContext";

export function ServicePricesProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<ServicePrice[]>(DEFAULT_PRICES);
  const [subTypes, setSubTypes] = useState<ServiceSubType[]>(DEFAULT_SUBTYPES);
  const { user } = useAuth();

  useEffect(() => {
    loadPrices();
  }, [user]);

  async function loadPrices() {
    try {
      // 1. Fetch main prices
      const { data: servicesData } = await supabase.from("services").select("*");
      if (servicesData && servicesData.length > 0) {
        setPrices(
          servicesData.map((row) => ({
            id: row.id,
            label: row.label,
            emoji: row.emoji || "",
            price: Number(row.price),
            description: row.description || "",
          }))
        );
      }

      // 2. Fetch or initialize sub types from local cache
      const storedSubTypes = await AsyncStorage.getItem("@zentro_subtypes");
      if (storedSubTypes) {
        setSubTypes(JSON.parse(storedSubTypes));
      } else {
        setSubTypes(DEFAULT_SUBTYPES);
      }
    } catch (e) {
      console.error("Error fetching service prices", e);
    }
  }

  async function updatePrice(id: string, price: number) {
    try {
      const { error } = await supabase.from("services").update({ price }).eq("id", id);
      if (error) throw error;
      setPrices((prev) => prev.map((p) => (p.id === id ? { ...p, price } : p)));
    } catch (e) {
      console.error("Error updating price", e);
    }
  }

  function getPrice(id: string): number {
    return prices.find((p) => p.id === id)?.price ?? 499;
  }

  async function updateSubTypePrice(id: string, price: number) {
    try {
      const updated = subTypes.map((st) => (st.id === id ? { ...st, price } : st));
      setSubTypes(updated);
      await AsyncStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
    } catch (e) {
      console.error("Error updating sub type price", e);
    }
  }

  async function toggleSubTypeStatus(id: string, isActive: boolean) {
    try {
      const updated = subTypes.map((st) => (st.id === id ? { ...st, isActive } : st));
      setSubTypes(updated);
      await AsyncStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
    } catch (e) {
      console.error("Error toggling sub type status", e);
    }
  }

  async function addNewSubType(serviceName: "car" | "bike" | "tank", typeName: string, price: number) {
    try {
      const newSubType: ServiceSubType = {
        id: `${serviceName}-${typeName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        serviceName,
        typeName,
        price,
        isActive: true,
      };
      const updated = [...subTypes, newSubType];
      setSubTypes(updated);
      await AsyncStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
    } catch (e) {
      console.error("Error adding new sub type", e);
    }
  }

  async function updateSubTypeComplete(id: string, updatedFields: Partial<ServiceSubType>) {
    try {
      const updated = subTypes.map((st) => (st.id === id ? { ...st, ...updatedFields } : st));
      setSubTypes(updated);
      await AsyncStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
    } catch (e) {
      console.error("Error updating subtype complete", e);
    }
  }

  return (
    <ServicePricesContext.Provider value={{ prices, subTypes, updatePrice, getPrice, updateSubTypePrice, toggleSubTypeStatus, addNewSubType, updateSubTypeComplete }}>
      {children}
    </ServicePricesContext.Provider>
  );
}

export function useServicePrices() {
  const ctx = useContext(ServicePricesContext);
  if (!ctx) throw new Error("useServicePrices must be used within ServicePricesProvider");
  return ctx;
}
