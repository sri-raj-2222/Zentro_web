import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zentro - Doorstep Car Wash & Water Tank Cleaning in Warangal",
  description:
    "Zentro offers doorstep car wash, bike wash & water tank cleaning in Warangal, Hanamkonda & Kazipet. Professional service at your home. Book now!",
  keywords: [
    "car wash near me",
    "doorstep car wash Warangal",
    "car wash Warangal",
    "bike wash Warangal",
    "water tank cleaning Warangal",
    "sump cleaning Warangal",
    "car wash Hanamkonda",
    "car wash Kazipet",
    "home car wash service",
    "Zentro",
  ],
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  shortcut: "/images/logo.png",
  verification: {
    google: "y9ZXZe6G2JHP07fFToYXf_VW27o8-YnX_qDp2YMWME",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Providers>
          <Navbar />
          <main style={{ flex: "1 0 auto" }}>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
