"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Droplet, Menu, X, LogOut, User, Shield, Briefcase, Calendar } from "lucide-react";
import styles from "./Navbar.module.css";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
    setIsOpen(false);
  };

  const getLinks = () => {
    if (!user) {
      return [
        { label: "Home", href: "/" },
      ];
    }

    if (user.role === "admin") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Attendance", href: "/attendance" },
        { label: "Pricing Manager", href: "/charges" },
        { label: "Bookings", href: "/bookings" },
        { label: "Profile", href: "/profile" },
      ];
    } else if (user.role === "worker") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claimable Jobs", href: "/jobs" },
        { label: "My History", href: "/bookings" },
        { label: "Profile", href: "/profile" },
      ];
    } else {
      // Customer
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Book a Service", href: "/book" },
        { label: "My Bookings", href: "/bookings" },
        { label: "Profile", href: "/profile" },
      ];
    }
  };

  const links = getLinks();

  return (
    <header className={styles.header}>
      <nav className={styles.navContainer}>
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className={styles.logo}>
          <img src="/images/logo.png" alt="Zentro Logo" className={styles.logoImage} />
          <span>ZENTRO</span>
        </Link>

        {/* Desktop Links */}
        <ul className={styles.navLinks}>
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Actions / User Profile */}
        <div className={styles.actions}>
          {user ? (
            <>
              <Link href="/profile" className={styles.userMenu}>
                <div className={styles.avatar}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userRole}>
                    {user.role === "admin" && (
                      <span className="flex items-center gap-1">
                        <Shield size={10} style={{ display: "inline", marginRight: 2 }} />
                        Admin
                      </span>
                    )}
                    {user.role === "worker" && (
                      <span className="flex items-center gap-1">
                        <Briefcase size={10} style={{ display: "inline", marginRight: 2 }} />
                        Worker
                      </span>
                    )}
                    {user.role === "user" && "Customer"}
                  </span>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className={`${styles.btn} ${styles.btnSecondary}`}
                title="Sign Out"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                Log In
              </Link>
              <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className={styles.menuButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.mobileMenuOpen : ""}`}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.mobileLink}
            onClick={() => setIsOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        {user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <Link
              href="/profile"
              className={styles.mobileLink}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
              onClick={() => setIsOpen(false)}
            >
              <User size={16} />
              <span>Profile ({user.name})</span>
            </Link>
            <button
              onClick={handleLogout}
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <Link
              href="/login"
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setIsOpen(false)}
            >
              Log In
            </Link>
            <Link
              href="/register"
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setIsOpen(false)}
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
