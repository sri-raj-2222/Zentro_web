"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useBookings } from "@/context/BookingsContext";
import { useServicePrices, ServiceSubType } from "@/context/ServicePricesContext";
import { useAddress, Address } from "@/context/AddressContext";
import { CalendarGrid } from "@/components/CalendarGrid";
import { ServiceCard } from "@/components/ServiceCard";
import { 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  Check, 
  Plus, 
  Compass, 
  MessageSquare,
  Sparkles,
  Loader2
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

type Step = 1 | 2 | 3;

export default function BookServicePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { createBooking } = useBookings();
  const { prices, subTypes } = useServicePrices();
  const { addresses, addAddress, fetchCurrentLocation } = useAddress();

  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<string>("car_wash");
  const [selectedSubType, setSelectedSubType] = useState<ServiceSubType | null>(null);
  
  // Dynamic Tank fields
  const [tankCapacity, setTankCapacity] = useState<number>(1000);
  
  // Location selection & creation fields
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newFullAddress, setNewFullAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newLat, setNewLat] = useState(12.9716);
  const [newLng, setNewLng] = useState(77.5946);
  const [isLocating, setIsLocating] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Date and notes fields
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Redirect if not logged in or if worker/admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "worker" || user.role === "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  // Read query params for pre-selecting service
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const svc = searchParams.get("service");
      if (svc && (svc === "car_wash" || svc === "bike_wash" || svc === "water_tank")) {
        setSelectedService(svc);
      }
    }
  }, []);

  // Set default address when loaded
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      setSelectedAddress(defaultAddr);
    }
  }, [addresses, selectedAddress]);

  // Set default subtype when main service changes
  useEffect(() => {
    const serviceName = selectedService === "car_wash" ? "car" : selectedService === "bike_wash" ? "bike" : "tank";
    const available = subTypes.filter(s => s.serviceName === serviceName && s.isActive);
    if (available.length > 0) {
      setSelectedSubType(available[0]);
    } else {
      setSelectedSubType(null);
    }
  }, [selectedService, subTypes]);

  if (authLoading || !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Initializing book service portal...</p>
      </div>
    );
  }

  const getServiceImage = (type: string) => {
    if (type === "car_wash") return "/images/car_service.png";
    if (type === "bike_wash") return "/images/bike_service.png";
    if (type === "water_tank") return "/images/tank_service.png";
    return undefined;
  };

  const getServiceLabel = (type: string) => {
    return prices.find(p => p.id === type)?.label || "Wash Service";
  };

  const getServiceColor = (type: string) => {
    if (type === "car_wash") return "var(--primary)";
    if (type === "bike_wash") return "#f59e0b";
    return "#3b82f6";
  };

  // Price computation logic
  const calculatePrice = () => {
    if (!selectedSubType) return 0;
    if (selectedService === "water_tank") {
      // cost per liter * capacity
      return Math.round(selectedSubType.price * tankCapacity);
    }
    return selectedSubType.price;
  };

  const finalPrice = calculatePrice();

  // Handle location fetching
  const handleFetchCurrentLocation = async () => {
    setIsLocating(true);
    setValidationError("");
    try {
      const res = await fetchCurrentLocation();
      if (res.success && res.coords) {
        setNewFullAddress(res.address || "");
        setNewCity(res.data?.city || "");
        setNewState(res.data?.state || "");
        setNewPincode(res.data?.pincode || "");
        setNewLat(res.coords.latitude);
        setNewLng(res.coords.longitude);
      } else {
        setValidationError("Geolocation Error: " + (res.error || "Could not retrieve coordinates."));
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    if (!newFullAddress || !newCity || !newState || !newPincode) {
      setValidationError("Please fill in all address parameters.");
      return;
    }
    setAddressLoading(true);
    try {
      const res = await addAddress({
        latitude: newLat,
        longitude: newLng,
        fullAddress: newFullAddress,
        city: newCity,
        state: newState,
        country: "India",
        pincode: newPincode,
        isDefault: addresses.length === 0,
      });

      if (res.success) {
        setShowNewAddressForm(false);
        // Clear fields
        setNewFullAddress("");
        setNewCity("");
        setNewState("");
        setNewPincode("");
      } else {
        setValidationError("Failed to insert address: " + res.error);
      }
    } catch (err: any) {
      setValidationError(err.message);
    } finally {
      setAddressLoading(false);
    }
  };

  // Submit final booking payload
  const handleConfirmBooking = async () => {
    setValidationError("");
    if (!selectedAddress) {
      setValidationError("Please configure a washing destination address first.");
      return;
    }
    if (!selectedDate) {
      setValidationError("Please pick a scheduled service date.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if all workers are busy
      const { data: availableWorkers } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "worker")
        .eq("availability_status", "available");

      const allBusy = !availableWorkers || availableWorkers.length === 0;

      const label = selectedService === "water_tank" 
        ? `${getServiceLabel(selectedService)} (${tankCapacity}L)`
        : `${getServiceLabel(selectedService)} (${selectedSubType?.typeName || "Standard"})`;

      await createBooking({
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        serviceType: selectedService as any,
        serviceLabel: label,
        price: finalPrice,
        location: selectedAddress.fullAddress,
        locationLink: `https://maps.google.com/?q=${selectedAddress.latitude},${selectedAddress.longitude}`,
        notes: notes,
        scheduledDate: selectedDate.toISOString(),
      });

      if (allBusy) {
        alert("the workers are busy our team will contact you in one hour");
      }
      router.push("/dashboard");
    } catch (err: any) {
      setValidationError("Booking Failed: " + (err.message || "Something went wrong."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceName = selectedService === "car_wash" ? "car" : selectedService === "bike_wash" ? "bike" : "tank";
  const activeSubtypes = subTypes.filter(s => s.serviceName === serviceName && s.isActive);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>
        <h1 className={styles.title}>Book Wash Service</h1>
        
        {/* Step Indicators */}
        <div className={styles.stepIndicatorRow}>
          <div className={`${styles.stepIndicator} ${step >= 1 ? styles.stepActive : ""}`}>
            <span className={styles.stepNum}>1</span>
            <span className={styles.stepText}>Configure Service</span>
          </div>
          <div className={styles.stepConnector}></div>
          <div className={`${styles.stepIndicator} ${step >= 2 ? styles.stepActive : ""}`}>
            <span className={styles.stepNum}>2</span>
            <span className={styles.stepText}>Wash Location</span>
          </div>
          <div className={styles.stepConnector}></div>
          <div className={`${styles.stepIndicator} ${step >= 3 ? styles.stepActive : ""}`}>
            <span className={styles.stepNum}>3</span>
            <span className={styles.stepText}>Schedule & Pay</span>
          </div>
        </div>
      </div>

      <div className={styles.wizardContent}>
        {validationError && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "6px",
            color: "#ef4444",
            fontWeight: "750",
            fontSize: "14px",
            marginBottom: "24px",
            textAlign: "center"
          }}>
            {validationError}
          </div>
        )}
        {/* STEP 1: CONFIGURE SERVICE */}
        {step === 1 && (
          <div className={styles.stepWrapper}>
            <h2 className={styles.stepTitle}>Choose Wash Type</h2>
            <div className={styles.servicesGrid}>
              {prices.map((p) => {
                const isSel = selectedService === p.id;
                const sColor = getServiceColor(p.id);
                return (
                  <div key={p.id} className={`${styles.serviceCardWrap} ${isSel ? styles.activeService : ""}`}>
                    <ServiceCard
                      title={p.label}
                      subtitle={p.description}
                      price={p.price}
                      color={sColor}
                      image={getServiceImage(p.id)}
                      onPress={() => setSelectedService(p.id)}
                    />
                  </div>
                );
              })}
            </div>

            <h2 className={styles.stepTitle} style={{ marginTop: 32 }}>Select Service Option</h2>
            <div className={styles.subtypeGrid}>
              {activeSubtypes.map((st) => {
                const isSel = selectedSubType?.id === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedSubType(st)}
                    className={`${styles.subtypeItem} ${isSel ? styles.activeSubtypeItem : ""}`}
                  >
                    {isSel && <div className={styles.checkPin}><Check size={12} /></div>}
                    {st.imageUrl && (
                      <div className={styles.subtypeImageWrap}>
                        <img src={st.imageUrl} alt={st.typeName} className={styles.subtypeImage} />
                      </div>
                    )}
                    <span className={styles.subtypeName}>{st.typeName}</span>
                    {selectedService === "water_tank" ? (
                      <span className={styles.subtypePrice}>₹{st.price} / Liter</span>
                    ) : (
                      <span className={styles.subtypePrice}>₹{st.price}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedService === "water_tank" && (
              <div className={styles.tankInputWrap}>
                <h3 className={styles.tankLabel}>Water Tank Capacity (Liters)</h3>
                <div className={styles.capacitySliderBox}>
                  <input
                    type="range"
                    min="500"
                    max="10000"
                    step="500"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(Number(e.target.value))}
                    className={styles.capacitySlider}
                  />
                  <div className={styles.sliderOutput}>
                    <input
                      type="number"
                      value={tankCapacity}
                      onChange={(e) => setTankCapacity(Math.max(0, Number(e.target.value)))}
                      className={styles.capacityInput}
                    />
                    <span>Liters</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.footerNav}>
              <div></div>
              <button 
                onClick={() => setStep(2)}
                disabled={!selectedSubType}
                className={styles.nextBtn}
              >
                <span>Continue to Location</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: WASH LOCATION */}
        {step === 2 && (
          <div className={styles.stepWrapper}>
            <h2 className={styles.stepTitle}>Select Washing Address</h2>
            
            {addresses.length === 0 && !showNewAddressForm ? (
              <div className={styles.emptyAddressBlock}>
                <MapPin size={36} className={styles.emptyIcon} />
                <p>No addresses configured on your profile.</p>
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className={styles.addAddrBtn}
                >
                  <Plus size={16} />
                  <span>Add New Address</span>
                </button>
              </div>
            ) : (
              <div className={styles.addressList}>
                {addresses.map((addr) => {
                  const isSel = selectedAddress?.id === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddress(addr)}
                      className={`${styles.addressItem} ${isSel ? styles.activeAddressItem : ""}`}
                    >
                      <MapPin size={18} className={styles.addrIcon} />
                      <div className={styles.addrDetails}>
                        <p className={styles.addrText}>{addr.fullAddress}</p>
                        <p className={styles.addrSub}>{addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                      {isSel && <div className={styles.checkCircle}><Check size={12} /></div>}
                    </div>
                  );
                })}

                {!showNewAddressForm && (
                  <button
                    onClick={() => setShowNewAddressForm(true)}
                    className={styles.addAddrBtn}
                    style={{ marginTop: 12 }}
                  >
                    <Plus size={16} />
                    <span>Add Another Address</span>
                  </button>
                )}
              </div>
            )}

            {showNewAddressForm && (
              <form onSubmit={handleAddNewAddress} className={styles.addressForm}>
                <h3>New Cleaning Location</h3>
                
                <button
                  type="button"
                  onClick={handleFetchCurrentLocation}
                  disabled={isLocating}
                  className={styles.locateBtn}
                >
                  <Compass size={16} className={isLocating ? "animate-spin" : ""} />
                  <span>{isLocating ? "Locating..." : "Use Current Geolocation"}</span>
                </button>

                <div className={styles.formGroup}>
                  <label>Full Address / Landmark</label>
                  <input
                    type="text"
                    value={newFullAddress}
                    onChange={(e) => setNewFullAddress(e.target.value)}
                    placeholder="Street name, Flat/House number, Landmark"
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>City</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="City"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>State</label>
                    <input
                      type="text"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      placeholder="State"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Pincode / Postal Code</label>
                    <input
                      type="text"
                      value={newPincode}
                      onChange={(e) => setNewPincode(e.target.value)}
                      placeholder="6-digit Pincode"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formButtonRow}>
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressLoading}
                    className={styles.saveBtn}
                  >
                    {addressLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Location"}
                  </button>
                </div>
              </form>
            )}

            <div className={styles.footerNav}>
              <button onClick={() => setStep(1)} className={styles.backStepBtn}>
                <ArrowLeft size={16} />
                <span>Choose Service</span>
              </button>
              <button 
                onClick={() => setStep(3)}
                disabled={!selectedAddress}
                className={styles.nextBtn}
              >
                <span>Continue to Schedule</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SCHEDULE & CONFIRM */}
        {step === 3 && (
          <div className={styles.stepWrapper}>
            <div className={styles.splitGrid}>
              {/* Calendar Selector */}
              <div>
                <h2 className={styles.stepTitle}>Select Washing Date</h2>
                <CalendarGrid
                  selectedDate={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  minDate={new Date()}
                />
              </div>

              {/* Instructions and Summary */}
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryHeading}>Booking Summary</h2>
                
                <div className={styles.summaryList}>
                  <div className={styles.summaryItem}>
                    <span className={styles.sumLabel}>Selected Service:</span>
                    <span className={styles.sumVal}>
                      {getServiceLabel(selectedService)} 
                      {selectedSubType && ` (${selectedSubType.typeName})`}
                    </span>
                  </div>

                  {selectedService === "water_tank" && (
                    <div className={styles.summaryItem}>
                      <span className={styles.sumLabel}>Tank Capacity:</span>
                      <span className={styles.sumVal}>{tankCapacity} Liters</span>
                    </div>
                  )}

                  <div className={styles.summaryItem}>
                    <span className={styles.sumLabel}>Date:</span>
                    <span className={styles.sumVal}>
                      {selectedDate ? selectedDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      }) : "Not selected"}
                    </span>
                  </div>

                  <div className={styles.summaryItem}>
                    <span className={styles.sumLabel}>Washing Destination:</span>
                    <span className={styles.sumVal}>{selectedAddress?.fullAddress}</span>
                  </div>

                  <div className={styles.summaryDivider}></div>

                  <div className={styles.summaryPriceRow}>
                    <span>Estimated Price</span>
                    <span className={styles.finalPriceText}>₹{finalPrice}</span>
                  </div>
                </div>

                <div className={styles.notesWrap}>
                  <label className={styles.notesLabel}>
                    <MessageSquare size={14} />
                    <span>Special Instructions (Optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Gate code, water tap availability, vehicle registration number..."
                    maxLength={300}
                    className={styles.notesArea}
                  />
                </div>

                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className={styles.confirmBtn}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Creating Booking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Confirm Wash Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.footerNav}>
              <button onClick={() => setStep(2)} className={styles.backStepBtn}>
                <ArrowLeft size={16} />
                <span>Change Address</span>
              </button>
              <div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
