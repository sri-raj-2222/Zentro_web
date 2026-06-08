"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useServicePrices, ServiceSubType } from "@/context/ServicePricesContext";
import { 
  ArrowLeft, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  Car, 
  Bike, 
  Droplets 
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export default function PricingManagerPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    prices, 
    subTypes, 
    updatePrice, 
    updateSubTypePrice, 
    toggleSubTypeStatus, 
    addNewSubType 
  } = useServicePrices();

  // Baseline price states
  const [baselinePrices, setBaselinePrices] = useState<Record<string, number>>({});
  // Subtype price edit states
  const [subTypePrices, setSubTypePrices] = useState<Record<string, number>>({});

  // Add new subtype state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState<"car" | "bike" | "tank">("car");
  const [newTypeName, setNewTypeName] = useState("");
  const [newPrice, setNewPrice] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  // Redirect if not logged in or not an admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  // Sync pricing fields when context updates
  useEffect(() => {
    const base: Record<string, number> = {};
    prices.forEach(p => {
      base[p.id] = p.price;
    });
    setBaselinePrices(base);

    const subs: Record<string, number> = {};
    subTypes.forEach(s => {
      subs[s.id] = s.price;
    });
    setSubTypePrices(subs);
  }, [prices, subTypes]);

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Opening pricing matrix...</p>
      </div>
    );
  }

  const handleUpdateBasePrice = async (id: string) => {
    const price = baselinePrices[id];
    if (price === undefined || price < 0) return;
    await updatePrice(id, price);
  };

  const handleUpdateSubTypePrice = async (id: string) => {
    const price = subTypePrices[id];
    if (price === undefined || price < 0) return;
    await updateSubTypePrice(id, price);
  };

  const handleToggleSubType = async (id: string, currentStatus: boolean) => {
    await toggleSubTypeStatus(id, !currentStatus);
  };

  const handleAddNewSubType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || newPrice < 0) {
      console.error("Please fill in valid name and rate fields.");
      return;
    }

    setIsAdding(true);
    try {
      await addNewSubType(newServiceName, newTypeName.trim(), newPrice);
      setNewTypeName("");
      setNewPrice(0);
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Pricing Control Panel</h1>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.addBtn}
          >
            <Plus size={16} />
            <span>Configure Subtype</span>
          </button>
        </div>
        <p className={styles.subtitle}>
          Manage pricing rules, baseline rates, and configure availability switches for all wash services.
        </p>
      </div>

      {/* Inline Creation Form */}
      {showAddForm && (
        <form onSubmit={handleAddNewSubType} className={styles.addForm}>
          <h3>Add Service Subtype</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Service Category</label>
              <select
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value as any)}
                className={styles.selectInput}
              >
                <option value="car">Car Wash</option>
                <option value="bike">Bike Wash</option>
                <option value="tank">Water Tank Cleaning</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Subtype Name (e.g. Sedan, Cruiser)</label>
              <input
                type="text"
                placeholder="Sedan / Cruiser / SUV / etc."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                required
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Rate / Price (₹)</label>
              <input
                type="number"
                placeholder="Price"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                min="0"
                step="any"
                required
                className={styles.inputField}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isAdding}
              className={styles.submitBtn}
            >
              {isAdding ? "Adding..." : "Add Subtype"}
            </button>
          </div>
        </form>
      )}

      {/* Main Base Prices Grid */}
      <h2 className={styles.sectionTitle}>Baseline Service Rates</h2>
      <div className={styles.baseGrid}>
        {prices.map((p) => {
          const iconColor = p.id === "car_wash" ? "var(--primary)" : p.id === "bike_wash" ? "#f59e0b" : "#3b82f6";
          return (
            <div key={p.id} className={styles.baseCard}>
              <div className={styles.baseIconWrap} style={{ color: iconColor }}>
                {p.id === "car_wash" && <Car size={24} />}
                {p.id === "bike_wash" && <Bike size={24} />}
                {p.id === "water_tank" && <Droplets size={24} />}
              </div>
              <div className={styles.baseInfo}>
                <h4>{p.label}</h4>
                <p>{p.description}</p>
              </div>
              <div className={styles.priceEditRow}>
                <span>₹</span>
                <input
                  type="number"
                  value={baselinePrices[p.id] ?? p.price}
                  onChange={(e) => setBaselinePrices({
                    ...baselinePrices,
                    [p.id]: Math.max(0, Number(e.target.value))
                  })}
                  onBlur={() => handleUpdateBasePrice(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUpdateBasePrice(p.id);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className={styles.priceInput}
                />
                <button
                  onClick={() => handleUpdateBasePrice(p.id)}
                  className={styles.saveBtn}
                  title="Save Base Price"
                >
                  <Save size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtypes Pricing Matrices */}
      <h2 className={styles.sectionTitle} style={{ marginTop: 40 }}>Service Subtypes Management</h2>
      <div className={styles.matrixContainer}>
        {/* Car subtypes */}
        <div className={styles.matrixColumn}>
          <div className={styles.matrixHeader}>
            <Car size={18} />
            <h3>Car Wash Options</h3>
          </div>
          <div className={styles.matrixList}>
            {subTypes.filter(s => s.serviceName === "car").map((st) => (
              <div key={st.id} className={`${styles.matrixItem} ${!st.isActive ? styles.inactiveItem : ""}`}>
                <div className={styles.matrixNameCol}>
                  <p className={styles.bold}>{st.typeName}</p>
                  <p className={styles.subtext}>ID: {st.id.slice(0, 10)}</p>
                </div>
                
                <div className={styles.matrixControls}>
                  <input
                    type="number"
                    value={subTypePrices[st.id] ?? st.price}
                    onChange={(e) => setSubTypePrices({
                      ...subTypePrices,
                      [st.id]: Math.max(0, Number(e.target.value))
                    })}
                    onBlur={() => handleUpdateSubTypePrice(st.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateSubTypePrice(st.id);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={styles.subPriceInput}
                  />
                  
                  <button
                    onClick={() => handleUpdateSubTypePrice(st.id)}
                    className={styles.subSaveBtn}
                    title="Save Rate"
                  >
                    <Save size={14} />
                  </button>

                  <button
                    onClick={() => handleToggleSubType(st.id, st.isActive)}
                    className={`${styles.toggleBtn} ${st.isActive ? styles.active : ""}`}
                    title={st.isActive ? "Deactivate" : "Activate"}
                  >
                    {st.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bike subtypes */}
        <div className={styles.matrixColumn}>
          <div className={styles.matrixHeader}>
            <Bike size={18} />
            <h3>Bike Wash Options</h3>
          </div>
          <div className={styles.matrixList}>
            {subTypes.filter(s => s.serviceName === "bike").map((st) => (
              <div key={st.id} className={`${styles.matrixItem} ${!st.isActive ? styles.inactiveItem : ""}`}>
                <div className={styles.matrixNameCol}>
                  <p className={styles.bold}>{st.typeName}</p>
                  <p className={styles.subtext}>ID: {st.id.slice(0, 10)}</p>
                </div>
                
                <div className={styles.matrixControls}>
                  <input
                    type="number"
                    value={subTypePrices[st.id] ?? st.price}
                    onChange={(e) => setSubTypePrices({
                      ...subTypePrices,
                      [st.id]: Math.max(0, Number(e.target.value))
                    })}
                    onBlur={() => handleUpdateSubTypePrice(st.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateSubTypePrice(st.id);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={styles.subPriceInput}
                  />
                  
                  <button
                    onClick={() => handleUpdateSubTypePrice(st.id)}
                    className={styles.subSaveBtn}
                    title="Save Rate"
                  >
                    <Save size={14} />
                  </button>

                  <button
                    onClick={() => handleToggleSubType(st.id, st.isActive)}
                    className={`${styles.toggleBtn} ${st.isActive ? styles.active : ""}`}
                    title={st.isActive ? "Deactivate" : "Activate"}
                  >
                    {st.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tank subtypes */}
        <div className={styles.matrixColumn}>
          <div className={styles.matrixHeader}>
            <Droplets size={18} />
            <h3>Water Tank options</h3>
          </div>
          <div className={styles.matrixList}>
            {subTypes.filter(s => s.serviceName === "tank").map((st) => (
              <div key={st.id} className={`${styles.matrixItem} ${!st.isActive ? styles.inactiveItem : ""}`}>
                <div className={styles.matrixNameCol}>
                  <p className={styles.bold}>{st.typeName}</p>
                  <p className={styles.subtext}>per liter calculation</p>
                </div>
                
                <div className={styles.matrixControls}>
                  <input
                    type="number"
                    step="0.01"
                    value={subTypePrices[st.id] ?? st.price}
                    onChange={(e) => setSubTypePrices({
                      ...subTypePrices,
                      [st.id]: Math.max(0, Number(e.target.value))
                    })}
                    onBlur={() => handleUpdateSubTypePrice(st.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateSubTypePrice(st.id);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={styles.subPriceInput}
                  />
                  
                  <button
                    onClick={() => handleUpdateSubTypePrice(st.id)}
                    className={styles.subSaveBtn}
                    title="Save Rate"
                  >
                    <Save size={14} />
                  </button>

                  <button
                    onClick={() => handleToggleSubType(st.id, st.isActive)}
                    className={`${styles.toggleBtn} ${st.isActive ? styles.active : ""}`}
                    title={st.isActive ? "Deactivate" : "Activate"}
                  >
                    {st.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
