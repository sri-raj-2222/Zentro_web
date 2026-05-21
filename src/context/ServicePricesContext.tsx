"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

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
  { id: "car-hatchback", serviceName: "car", typeName: "Hatchback", price: 399, isActive: true, imageUrl: "/images/car-hatchback.png" },
  { id: "car-sedan", serviceName: "car", typeName: "Sedan", price: 499, isActive: true, imageUrl: "/images/car-sedan.png" },
  { id: "car-suv", serviceName: "car", typeName: "SUV", price: 599, isActive: true, imageUrl: "/images/car-suv.png" },
  { id: "car-offroader", serviceName: "car", typeName: "Off-roader", price: 699, isActive: true, imageUrl: "/images/car-offroader.png" },

  // Bike sub-types
  { id: "bike-scooty", serviceName: "bike", typeName: "Scooty", price: 199, isActive: true, imageUrl: "/images/bike-scooty.png" },
  { id: "bike-standard", serviceName: "bike", typeName: "Standard Bike", price: 249, isActive: true, imageUrl: "/images/bike-standard.png" },
  { id: "bike-super", serviceName: "bike", typeName: "Super Bike", price: 349, isActive: true, imageUrl: "/images/bike-super.png" },

  // Tank sub-types
  { id: "tank-per-liter", serviceName: "tank", typeName: "Cost Per Liter", price: 0.5, isActive: true },
];

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
      if (typeof window !== "undefined") {
        const storedSubTypes = localStorage.getItem("@zentro_subtypes");
        if (storedSubTypes) {
          const parsed = JSON.parse(storedSubTypes) as ServiceSubType[];
          // Merge to ensure imageUrl exists from DEFAULT_SUBTYPES
          const merged = parsed.map(st => {
            const def = DEFAULT_SUBTYPES.find(d => d.id === st.id);
            return {
              ...st,
              imageUrl: st.imageUrl || def?.imageUrl
            };
          });
          setSubTypes(merged);
        } else {
          setSubTypes(DEFAULT_SUBTYPES);
        }
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
      if (typeof window !== "undefined") {
        localStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Error updating sub type price", e);
    }
  }

  async function toggleSubTypeStatus(id: string, isActive: boolean) {
    try {
      const updated = subTypes.map((st) => (st.id === id ? { ...st, isActive } : st));
      setSubTypes(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
      }
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
      if (typeof window !== "undefined") {
        localStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Error adding new sub type", e);
    }
  }

  async function updateSubTypeComplete(id: string, updatedFields: Partial<ServiceSubType>) {
    try {
      const updated = subTypes.map((st) => (st.id === id ? { ...st, ...updatedFields } : st));
      setSubTypes(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("@zentro_subtypes", JSON.stringify(updated));
      }
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
