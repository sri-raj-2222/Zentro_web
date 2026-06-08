"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAddress, Address } from "@/context/AddressContext";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  Compass, 
  Trash2, 
  Star, 
  Check, 
  ArrowLeft,
  Loader2,
  Lock,
  X
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, updateProfile, updatePassword } = useAuth();
  const { 
    addresses, 
    isLoading: addressLoading, 
    addAddress, 
    deleteAddress, 
    setAddressDefault, 
    fetchCurrentLocation 
  } = useAddress();

  // Profile Edit fields
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password edit fields
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Address creation form fields
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newFullAddress, setNewFullAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newLat, setNewLat] = useState(12.9716);
  const [newLng, setNewLng] = useState(77.5946);
  const [isLocating, setIsLocating] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Feedback messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg("");
    } else {
      setSuccessMsg(msg);
      setErrorMsg("");
    }
    // Auto-clear after 4 seconds
    setTimeout(() => {
      setErrorMsg("");
      setSuccessMsg("");
    }, 4000);
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Sync profile edits with session profile data
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone);
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Opening profile control card...</p>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profilePhone.trim()) {
      showFeedback("Name and Phone number are required fields.", true);
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const res = await updateProfile(profileName.trim(), profilePhone.trim());
      if (res.success) {
        showFeedback("Profile details updated successfully!");
      } else {
        showFeedback("Failed to update profile: " + res.error, true);
      }
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");

    if (!oldPassword.trim()) {
      setPwdError("Current password is required.");
      return;
    }
    if (!newPassword.trim()) {
      setPwdError("New password cannot be empty.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const pwdRes = await updatePassword(newPassword.trim(), oldPassword.trim());
      if (pwdRes.success) {
        showFeedback("Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordModal(false);
      } else {
        setPwdError("Failed to update password: " + pwdRes.error);
      }
    } catch (err: any) {
      setPwdError(err.message || "An unexpected error occurred.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
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
        showFeedback(res.error || "Failed to acquire location. Please allow GPS browser access.", true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullAddress || !newCity || !newState || !newPincode) {
      showFeedback("Please fill out all address details.", true);
      return;
    }
    setIsAddingAddress(true);
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
        setShowAddressForm(false);
        setNewFullAddress("");
        setNewCity("");
        setNewState("");
        setNewPincode("");
        showFeedback("New address inserted successfully!");
      } else {
        showFeedback("Failed to save address: " + res.error, true);
      }
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (confirm("Are you sure you want to delete this address?")) {
      const res = await deleteAddress(id);
      if (!res.success) {
        showFeedback("Error deleting address: " + res.error, true);
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    const res = await setAddressDefault(id);
    if (!res.success) {
      showFeedback("Error setting default address: " + res.error, true);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>
          {user.role === "admin" || user.role === "worker"
            ? "Configure your user details and profile settings."
            : "Configure your user details, default geolocations, and service profiles."}
        </p>
      </div>

      {errorMsg && (
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
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.2)",
          borderRadius: "6px",
          color: "#22c55e",
          fontWeight: "750",
          fontSize: "14px",
          marginBottom: "24px",
          textAlign: "center"
        }}>
          {successMsg}
        </div>
      )}

      <div 
        className={styles.grid} 
        style={
          user.role === "admin" || user.role === "worker" 
            ? { gridTemplateColumns: "1fr", maxWidth: "600px", margin: "0 auto" } 
            : {}
        }
      >
        {/* Profile Card & Info update form */}
        <div className={styles.profileCol}>
          <div className={styles.card}>
            <div className={styles.profileHero}>
              <div className={styles.avatar}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className={styles.profileName}>{user.name}</h2>
              <span className={styles.roleBadge}>{user.role.toUpperCase()}</span>
              
              {user.role === "worker" && (
                <div className={styles.ratingInfo}>
                  <Star size={16} fill="#f59e0b" color="#f59e0b" />
                  <span>{user.average_rating ? user.average_rating.toFixed(1) : "0.0"} Rating</span>
                  <span className={styles.dot}>•</span>
                  <span>{user.total_feedbacks || 0} Jobs Completed</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className={styles.form}>
              <div className={styles.formGroup}>
                <label>
                  <User size={14} />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Name"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <Mail size={14} />
                  <span>Email Address (Read-only)</span>
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className={styles.disabledInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <Phone size={14} />
                  <span>Contact Phone</span>
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="Phone number"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPwdError("");
                  setShowPasswordModal(true);
                }}
                className={styles.changePasswordLink}
              >
                Change Password
              </button>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className={styles.updateBtn}
              >
                {isUpdatingProfile ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>

        {/* Addresses list & new address forms */}
        {user.role !== "admin" && user.role !== "worker" && (
          <div className={styles.addressCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Saved Addresses</h3>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className={styles.addBtn}
                >
                  <Plus size={16} />
                  <span>New Location</span>
                </button>
              </div>

              {showAddressForm && (
                <form onSubmit={handleCreateAddress} className={styles.addressForm}>
                  <h4>Configure Service Location</h4>
                  
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className={styles.locateBtn}
                  >
                    <Compass size={16} className={isLocating ? "animate-spin" : ""} />
                    <span>{isLocating ? "Locating..." : "Use Current GPS Coordinates"}</span>
                  </button>

                  <div className={styles.formGroup}>
                    <label>Address / Landmark</label>
                    <input
                      type="text"
                      value={newFullAddress}
                      onChange={(e) => setNewFullAddress(e.target.value)}
                      placeholder="Flat/House no, Area, LandMark"
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
                      <label>Pincode</label>
                      <input
                        type="text"
                        value={newPincode}
                        onChange={(e) => setNewPincode(e.target.value)}
                        placeholder="Pincode"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formButtonRow}>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingAddress}
                      className={styles.saveBtn}
                    >
                      {isAddingAddress ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </form>
              )}

              {addressLoading ? (
                <p className={styles.loadingText}>Syncing addresses...</p>
              ) : addresses.length === 0 ? (
                <div className={styles.emptyState}>
                  <MapPin size={32} />
                  <p>No locations saved. Add your coordinates above.</p>
                </div>
              ) : (
                <div className={styles.addressList}>
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`${styles.addressItem} ${addr.isDefault ? styles.defaultItem : ""}`}>
                      <div className={styles.addressIconWrap}>
                        <MapPin size={18} />
                      </div>
                      
                      <div className={styles.addressDetails}>
                        <p className={styles.fullAddress}>{addr.fullAddress}</p>
                        <p className={styles.subAddress}>
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className={styles.coords}>
                          Coords: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                        </p>
                      </div>

                      <div className={styles.addressActions}>
                        {addr.isDefault ? (
                          <span className={styles.defaultBadge}>
                            <Check size={12} />
                            <span>Default</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(addr.id)}
                            className={styles.defaultBtn}
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className={styles.deleteBtn}
                          title="Delete address"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.contactCard}>
              <h3 className={styles.contactTitle}>Contact Us</h3>
              <div className={styles.contactInfo}>
                <div className={styles.contactItem}>
                  <Mail size={16} className={styles.contactIcon} />
                  <span>Email:</span>
                  <a href="mailto:Zentroofficial@gmail.com" className={styles.contactLink}>
                    Zentroofficial@gmail.com
                  </a>
                </div>
                <div className={styles.contactItem}>
                  <Phone size={16} className={styles.contactIcon} />
                  <span>Mobile:</span>
                  <a href="tel:+916281892357" className={styles.contactLink}>
                    +91 6281892357
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal Overlay */}
      {showPasswordModal && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => !isUpdatingPassword && setShowPasswordModal(false)}
        >
          <div 
            className={styles.modal} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Change Password</h2>
              <button 
                type="button" 
                onClick={() => !isUpdatingPassword && setShowPasswordModal(false)}
                className={styles.modalCloseBtn}
                disabled={isUpdatingPassword}
                title="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {pwdError && (
              <div className={styles.modalErrorMsg}>
                {pwdError}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className={styles.modalForm}>
              <div className={styles.modalFormGroup}>
                <label className={styles.modalFormLabel}>
                  <Lock size={14} />
                  <span>Current Password</span>
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className={styles.modalFormInput}
                  disabled={isUpdatingPassword}
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label className={styles.modalFormLabel}>
                  <Lock size={14} />
                  <span>New Password</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  required
                  className={styles.modalFormInput}
                  disabled={isUpdatingPassword}
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label className={styles.modalFormLabel}>
                  <Lock size={14} />
                  <span>Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className={styles.modalFormInput}
                  disabled={isUpdatingPassword}
                />
              </div>

              <div className={styles.modalFormActions}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={styles.cancelModalBtn}
                  disabled={isUpdatingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitModalBtn}
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
