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

    const channel = supabase
      .channel(`public:services_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => {
          loadPrices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function loadPrices() {
    try {
      // 1. Fetch main prices
      const { data: servicesData } = await supabase.from("services").select("*");
      if (servicesData && servicesData.length > 0) {
        // Main services filter
        const mainServiceIds = ["car_wash", "bike_wash", "water_tank"];
        const mainServices = servicesData.filter((row) => mainServiceIds.includes(row.id));
        setPrices(
          mainServices.map((row) => {
            let desc = row.description || "";
            try {
              if (desc.trim().startsWith("{")) {
                const parsed = JSON.parse(desc);
                if (parsed && typeof parsed === "object" && parsed.description) {
                  desc = parsed.description;
                }
              }
            } catch (e) {
              // Ignore and use original description
            }
            return {
              id: row.id,
              label: row.label,
              emoji: row.emoji || "",
              price: Number(row.price),
              description: desc,
            };
          })
        );

        // Subtypes filter
        const subtypeRows = servicesData.filter((row) => !mainServiceIds.includes(row.id));

        if (subtypeRows.length === 0) {
          // No subtypes in DB yet. Seed them so they exist.
          const payload = DEFAULT_SUBTYPES.map((st) => ({
            id: st.id,
            label: st.typeName,
            description: st.serviceName,
            price: st.price,
            emoji: st.isActive ? "active" : "inactive",
          }));
          await supabase.from("services").insert(payload);
          setSubTypes(DEFAULT_SUBTYPES);
        } else {
          // Map database rows to ServiceSubType
          const mappedSubtypes: ServiceSubType[] = subtypeRows.map((row) => {
            const def = DEFAULT_SUBTYPES.find((d) => d.id === row.id);
            return {
              id: row.id,
              serviceName: row.description as "car" | "bike" | "tank",
              typeName: row.label,
              price: Number(row.price),
              isActive: row.emoji !== "inactive",
              imageUrl: def?.imageUrl,
            };
          });
          setSubTypes(mappedSubtypes);
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
      const { error } = await supabase
        .from("services")
        .update({ price })
        .eq("id", id);
      if (error) throw error;

      setSubTypes((prev) => prev.map((st) => (st.id === id ? { ...st, price } : st)));
    } catch (e) {
      console.error("Error updating sub type price", e);
    }
  }

  async function toggleSubTypeStatus(id: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from("services")
        .update({ emoji: isActive ? "active" : "inactive" })
        .eq("id", id);
      if (error) throw error;

      setSubTypes((prev) => prev.map((st) => (st.id === id ? { ...st, isActive } : st)));
    } catch (e) {
      console.error("Error toggling sub type status", e);
    }
  }

  async function addNewSubType(serviceName: "car" | "bike" | "tank", typeName: string, price: number) {
    try {
      const id = `${serviceName}-${typeName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      const { error } = await supabase
        .from("services")
        .insert({
          id,
          label: typeName,
          description: serviceName,
          price,
          emoji: "active",
        });
      if (error) throw error;

      const newSubType: ServiceSubType = {
        id,
        serviceName,
        typeName,
        price,
        isActive: true,
      };
      setSubTypes((prev) => [...prev, newSubType]);
    } catch (e) {
      console.error("Error adding new sub type", e);
    }
  }

  async function updateSubTypeComplete(id: string, updatedFields: Partial<ServiceSubType>) {
    try {
      const payload: any = {};
      if (updatedFields.price !== undefined) {
        payload.price = updatedFields.price;
      }
      if (updatedFields.typeName !== undefined) {
        payload.label = updatedFields.typeName;
      }
      if (updatedFields.serviceName !== undefined) {
        payload.description = updatedFields.serviceName;
      }
      if (updatedFields.isActive !== undefined) {
        payload.emoji = updatedFields.isActive ? "active" : "inactive";
      }

      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      setSubTypes((prev) =>
        prev.map((st) => (st.id === id ? { ...st, ...updatedFields } : st))
      );
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
