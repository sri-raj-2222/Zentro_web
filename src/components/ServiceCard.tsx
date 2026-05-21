"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import styles from "./ServiceCard.module.css";

interface ServiceCardProps {
  image?: string; // path relative to public e.g. "/images/car_service.png"
  icon?: LucideIcon;
  title: string;
  subtitle: string;
  price?: string | number;
  color: string;
  onPress: () => void;
}

export function ServiceCard({
  image,
  icon: Icon,
  title,
  subtitle,
  price,
  color,
  onPress,
}: ServiceCardProps) {
  return (
    <button className={styles.card} onClick={onPress}>
      <div className={styles.iconWrap}>
        {image ? (
          <img src={image} alt={title} className={styles.serviceImage} />
        ) : Icon ? (
          <Icon size={28} style={{ color: color }} />
        ) : null}
      </div>
      <div className={styles.info}>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      {price && (
        <div className={styles.priceBadge} style={{ backgroundColor: `${color}15`, color: color }}>
          ₹{price}
        </div>
      )}
    </button>
  );
}
