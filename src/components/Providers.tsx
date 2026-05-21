"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { BookingsProvider } from "@/context/BookingsContext";
import { ServicePricesProvider } from "@/context/ServicePricesContext";
import { AddressProvider } from "@/context/AddressContext";
import { AttendanceProvider } from "@/context/AttendanceContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BookingsProvider>
        <ServicePricesProvider>
          <AddressProvider>
            <AttendanceProvider>{children}</AttendanceProvider>
          </AddressProvider>
        </ServicePricesProvider>
      </BookingsProvider>
    </AuthProvider>
  );
}

