"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import styles from "./page.module.css";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // prevent flash of wrong auth states during SSR
  }

  return (
    <div className={styles.root}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.logoWrap}>
          <img src="/images/logo.png" alt="Zentro Logo" className={styles.logoImage} />
        </div>
        <h1 className={styles.appName}>Zentro</h1>
        <p className={styles.tagline}>✨ Premium Cleaning, On Demand at Your Doorstep</p>
      </section>

      {/* Wave divider */}
      <div className={styles.waveDivider}>
        <div className={styles.waveBottom} />
      </div>

      {/* Feature section */}
      <main className={styles.content}>
        <div>
          <h2 className={styles.sectionTitle}>🧹 Our Services</h2>
          <div className={styles.featuresGrid}>
            <ServiceCard
              title="Car Wash"
              subtitle="Spotless exterior & interior cleaning at your doorstep"
              price="399"
              color="var(--primary)"
              image="/images/car_service.png"
              onPress={() => router.push(user ? "/book?service=car_wash" : "/login")}
            />
            <ServiceCard
              title="Bike Wash"
              subtitle="Thorough clean & premium polish for your two-wheeler"
              price="199"
              color="#f59e0b"
              image="/images/bike_service.png"
              onPress={() => router.push(user ? "/book?service=bike_wash" : "/login")}
            />
            <ServiceCard
              title="Water Tank Cleaning"
              subtitle="Safe, hygienic water tank sanitization & disinfection"
              price="0.5/L"
              color="#3b82f6"
              image="/images/tank_service.png"
              onPress={() => router.push(user ? "/book?service=water_tank" : "/login")}
            />
          </div>
        </div>

        {/* CTA section */}
        <section className={styles.ctaSection}>
          {user ? (
            <Link href="/dashboard" className={styles.btnPrimary}>
              <span>🚀 Go to Dashboard</span>
              <ArrowRight size={20} />
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.btnPrimary}>
                <span>🚀 Get Started</span>
                <ArrowRight size={20} />
              </Link>
              <div className={styles.loginLink}>
                Already have an account?{" "}
                <Link href="/login" className={styles.loginLinkText}>
                  Sign In
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
