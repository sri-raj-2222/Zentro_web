"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import styles from "./StatCard.module.css";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string; // Hex color string
  trend?: string;
}

export function StatCard({ icon: Icon, label, value, color, trend }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div 
        className={styles.iconWrap} 
        style={{ backgroundColor: `${color}15`, color: color }}
      >
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {trend && (
        <div className={styles.trend}>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
