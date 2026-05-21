"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAddress } from "@/context/AddressContext";
import { ArrowLeft, Eye, EyeOff, Loader2, MapPin } from "lucide-react";
import styles from "@/styles/auth.module.css";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const { addAddress, fetchCurrentLocation } = useAddress();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const isValidEmail = (text: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  };

  const emailHasError = email.length > 0 && !isValidEmail(email);

  const handleAutoFillLocation = async () => {
    setError("");
    setIsLocating(true);
    const result = await fetchCurrentLocation();
    setIsLocating(false);

    if (result.success && result.address) {
      setAddress(result.address);
    } else {
      setError(result.error || "Failed to fetch geolocation. Please enter it manually.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !phone.trim() || !password || !address.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (emailHasError) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        password,
        "user",
        address.trim()
      );

      if (result.success) {
        // Automatically fetch coords and save default address in backend
        try {
          const locRes = await fetchCurrentLocation();
          let lat = 0;
          let lng = 0;
          let city = "";
          let state = "";
          let country = "";
          let pincode = "";

          if (locRes.success && locRes.coords) {
            lat = locRes.coords.latitude;
            lng = locRes.coords.longitude;
            if (locRes.data) {
              city = locRes.data.city || "";
              state = locRes.data.state || "";
              country = locRes.data.country || "";
              pincode = locRes.data.pincode || "";
            }
          }

          await addAddress({
            fullAddress: address.trim(),
            city,
            state,
            country,
            pincode,
            latitude: lat,
            longitude: lng,
            isDefault: true,
          });
        } catch (addrErr) {
          console.error("Auto address creation failed on registration:", addrErr);
        }

        setSuccess("Registration successful! Redirecting...");
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1500);
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <div className={styles.card}>
          <Link href="/" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div className={styles.hero}>
            <div className={styles.logoWrap}>
              <img src="/images/logo.png" alt="Zentro Logo" className={styles.logoImage} />
            </div>
            <h2 className={styles.appName}>Zentro</h2>
            <p className={styles.tagline}>🎉 Create an account today to get started</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Full Name</span>
              <div className={styles.inputWrap}>
                <span className={styles.inputEmoji}>👤</span>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Email Address</span>
              <div className={styles.inputWrap} style={{ borderColor: emailHasError ? "var(--destructive)" : "" }}>
                <span className={styles.inputEmoji}>📧</span>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoCapitalize="none"
                />
              </div>
              {emailHasError && (
                <span style={{ color: "var(--destructive)", fontSize: 11, marginTop: 2 }}>
                  ⚠️ Please enter a valid email format
                </span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Phone Number</span>
              <div className={styles.inputWrap}>
                <span className={styles.inputEmoji}>📱</span>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Full Address</span>
              <div className={styles.inputWrap} style={{ height: "auto", padding: "12px 16px" }}>
                <span className={styles.inputEmoji} style={{ alignSelf: "flex-start", marginTop: 2 }}>🏠</span>
                <textarea
                  className={styles.input}
                  placeholder="Street, City, State, Country, Zip Code"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  style={{ minHeight: "60px", resize: "none" }}
                />
              </div>
            </div>

            <button
              type="button"
              className={styles.submitBtn}
              style={{
                backgroundColor: "transparent",
                border: "1.5px dashed var(--primary)",
                color: "var(--primary)",
                boxShadow: "none",
                marginTop: "-4px",
                height: "44px",
                fontSize: "14px"
              }}
              onClick={handleAutoFillLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <MapPin size={16} />
                  <span>Use Current Location</span>
                </>
              )}
            </button>

            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Password</span>
              <div className={styles.inputWrap}>
                <span className={styles.inputEmoji}>🔒</span>
                <input
                  type={showPw ? "text" : "password"}
                  className={styles.input}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.togglePwBtn}
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className={styles.errorText}>{error}</div>}
            {success && <div className={styles.successText}>{success}</div>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className={styles.linkRow}>
            Already have an account?{" "}
            <Link href="/login" className={styles.linkHighlight}>
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
