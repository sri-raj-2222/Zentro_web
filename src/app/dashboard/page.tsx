"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBookings, Booking, BookingStatus } from "@/context/BookingsContext";
import { useAddress } from "@/context/AddressContext";
import { BookingCard } from "@/components/BookingCard";
import { StatCard } from "@/components/StatCard";
import { FeedbackCard } from "@/components/FeedbackCard";
import { ServiceCard } from "@/components/ServiceCard";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  UserCheck, 
  CheckCircle, 
  AlertCircle,
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  Star,
  Users,
  Compass
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { 
    bookings, 
    isLoading: bookingsLoading, 
    workerStatuses, 
    acceptBooking, 
    updateStatus, 
    cancelBooking, 
    submitFeedback,
    skipFeedback,
    updateWorkerStatus 
  } = useBookings();
  const { addresses } = useAddress();

  const [activeFeedbackBooking, setActiveFeedbackBooking] = useState<Booking | null>(null);
  const [selectedWorkerForOverride, setSelectedWorkerForOverride] = useState<Record<string, string>>({});
  
  // Date utils
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Check if customer needs feedback popup
  useEffect(() => {
    if (user && user.role === "user" && !bookingsLoading) {
      const pendingFeedback = bookings.find(
        (b) => b.userId === user.id && b.status === "completed" && !b.feedbackSubmitted
      );
      if (pendingFeedback) {
        setActiveFeedbackBooking(pendingFeedback);
      } else {
        setActiveFeedbackBooking(null);
      }
    }
  }, [bookings, user, bookingsLoading]);

  if (authLoading || bookingsLoading || !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading your dashboard dashboard...</p>
      </div>
    );
  }



  // 1. CUSTOMER DASHBOARD
  const renderCustomerDashboard = () => {
    const userBookings = bookings.filter((b) => b.userId === user.id);
    const activeBookings = userBookings.filter(
      (b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress"
    );
    const pastBookings = userBookings.filter(
      (b) => b.status === "completed" || b.status === "cancelled"
    );

    const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];

    return (
      <div className={styles.section}>
        <div className={styles.welcomeBanner}>
          <div className={styles.bannerText}>
            <h1>Welcome back, {user.name}!</h1>
            <p>Ready to get your vehicle shining? Book a professional wash in seconds.</p>
          </div>
          <Link href="/book" className={styles.bannerBtn}>
            <Compass size={18} />
            <span>Book A Wash Now</span>
          </Link>
        </div>

        <div className={styles.statsRow}>
          <StatCard 
            icon={Clock} 
            label="Active Bookings" 
            value={activeBookings.length} 
            color="#3b82f6" 
          />
          <StatCard 
            icon={CheckCircle} 
            label="Total Wash Completed" 
            value={pastBookings.filter(b => b.status === "completed").length} 
            color="#22c55e" 
          />
          <StatCard 
            icon={MapPin} 
            label="Saved Addresses" 
            value={addresses.length} 
            color="#ec4899" 
          />
        </div>

        {/* Services Grid */}
        <div className={styles.servicesSection}>
          <h2>🧹 Our Services</h2>
          <div className={styles.servicesGrid}>
            <div className={styles.dashboardServiceCard}>
              <ServiceCard
                title="Car Wash"
                subtitle="Full exterior & interior cleaning"
                price="399"
                color="var(--primary)"
                image="/images/car_service.png"
                onPress={() => router.push("/book?service=car_wash")}
              />
            </div>
            <div className={styles.dashboardServiceCard}>
              <ServiceCard
                title="Bike Wash"
                subtitle="Thorough bike cleaning & polishing"
                price="199"
                color="#f59e0b"
                image="/images/bike_service.png"
                onPress={() => router.push("/book?service=bike_wash")}
              />
            </div>
            <div className={styles.dashboardServiceCard}>
              <ServiceCard
                title="Water Tank Cleaning"
                subtitle="Deep tank cleaning & sanitization"
                price="0.5/L"
                color="#3b82f6"
                image="/images/tank_service.png"
                onPress={() => router.push("/book?service=water_tank")}
              />
            </div>
          </div>
        </div>

        <div className={styles.dashboardGrid}>
          {/* Active Bookings Column */}
          <div className={styles.cardContainer}>
            <div className={styles.cardHeader}>
              <h2>Active Bookings</h2>
              {activeBookings.length > 0 && <span className={styles.badge}>{activeBookings.length}</span>}
            </div>
            
            {activeBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <AlertCircle size={32} />
                <p>No active bookings at the moment.</p>
                <Link href="/book" className={styles.emptyLink}>Book a service</Link>
              </div>
            ) : (
              <div className={styles.bookingsList}>
                {activeBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    showUserActions={true}
                    onCancel={() => cancelBooking(booking.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Info & Default Address */}
          <div className={styles.sideColumn}>
            <div className={styles.infoCard}>
              <h3>Your Location</h3>
              {defaultAddress ? (
                <div className={styles.addressBox}>
                  <MapPin size={20} className={styles.locationIcon} />
                  <div>
                    <p className={styles.addressLabel}>Default Location</p>
                    <p className={styles.addressText}>{defaultAddress.fullAddress}</p>
                    <p className={styles.addressCity}>{defaultAddress.city}, {defaultAddress.state}</p>
                  </div>
                </div>
              ) : (
                <div className={styles.addressBoxEmpty}>
                  <AlertCircle size={20} />
                  <p>No address found. Add your address to speed up booking.</p>
                  <Link href="/profile" className={styles.actionLink}>Manage Addresses</Link>
                </div>
              )}
            </div>

            <div className={styles.infoCard}>
              <h3>Recent History</h3>
              {pastBookings.length === 0 ? (
                <p className={styles.noHistoryText}>No past service history found.</p>
              ) : (
                <div className={styles.historyCompactList}>
                  {pastBookings.slice(0, 3).map((b) => (
                    <div key={b.id} className={styles.historyCompactItem}>
                      <div>
                        <p className={styles.historyLabel}>{b.serviceLabel}</p>
                        <p className={styles.historyDate}>{new Date(b.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`${styles.statusLabelCompact} ${styles[b.status]}`}>{b.status}</span>
                    </div>
                  ))}
                  <Link href="/bookings" className={styles.viewAllLink}>View Complete History &rarr;</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeFeedbackBooking && (
          <FeedbackCard
            booking={activeFeedbackBooking}
            onSubmit={async (rating, comment) => {
              if (activeFeedbackBooking.workerId) {
                await submitFeedback({
                  bookingId: activeFeedbackBooking.id,
                  customerId: user.id,
                  workerId: activeFeedbackBooking.workerId,
                  serviceId: activeFeedbackBooking.serviceType,
                  rating,
                  description: comment,
                });
              } else {
                await skipFeedback(activeFeedbackBooking.id);
              }
            }}
            onSkip={() => skipFeedback(activeFeedbackBooking.id)}
          />
        )}
      </div>
    );
  };

  // 2. WORKER DASHBOARD
  const renderWorkerDashboard = () => {
    const workerBookings = bookings.filter((b) => b.workerId === user.id);
    const activeJobs = workerBookings.filter(
      (b) => b.status === "accepted" || b.status === "in_progress"
    );

    // Get completed wash services count for this month
    const prefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    const totalServices = bookings.filter((b) => {
      if (!b.scheduledDate) return false;
      return (
        b.workerId === user.id &&
        b.status === "completed" &&
        b.scheduledDate.startsWith(prefix)
      );
    }).length;

    // Get checked in state and list
    const workerStatus = workerStatuses[user.id]?.status || "available";

    return (
      <div className={styles.section}>
        <div className={styles.welcomeBannerWorker}>
          <div className={styles.bannerText}>
            <h1>Worker Portal: {user.name}</h1>
            <p>Keep your status available to receive and claim upcoming cleaning bookings.</p>
          </div>
          <div className={styles.bannerControls}>
            <div className={styles.statusToggleWrap}>
              <span className={styles.statusLabelText}>Status:</span>
              <span
                className={`${styles.statusToggleBtn} ${workerStatus === "available" ? styles.available : styles.busy}`}
                style={{ cursor: "default" }}
              >
                {workerStatus === "available" ? "Available" : "Busy"}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statsRow}>
          <StatCard 
            icon={Briefcase} 
            label="Wash Completed" 
            value={totalServices} 
            color="#3b82f6" 
          />
          <StatCard 
            icon={Star} 
            label="Average Rating" 
            value={user.average_rating ? `${user.average_rating.toFixed(1)} ★` : "New Worker"} 
            color="#eab308" 
            trend={`${user.total_feedbacks || 0} reviews`}
          />
        </div>

        <div className={styles.dashboardGrid}>
          {/* Active Job Tasks */}
          <div className={styles.cardContainer}>
            <div className={styles.cardHeader}>
              <h2>My Active Jobs</h2>
              {activeJobs.length > 0 && <span className={styles.badge}>{activeJobs.length}</span>}
            </div>

            {activeJobs.length === 0 ? (
              <div className={styles.emptyState}>
                <AlertCircle size={32} />
                <p>No active wash assigned. Claim jobs from the board.</p>
                <Link href="/jobs" className={styles.emptyLink}>Browse Claimable Jobs</Link>
              </div>
            ) : (
              <div className={styles.bookingsList}>
                {activeJobs.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    showWorkerActions={true}
                    onUpdateStatus={(status) => updateStatus(booking.id, status)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Jobs Board Summary & Attendance Checklist */}
          <div className={styles.sideColumn}>
            <div className={styles.infoCard}>
              <h3>Shift Checklist</h3>
              <ul className={styles.checklist}>
                <li className={workerStatus === "available" ? styles.completedTask : ""}>
                  <div className={styles.checkMarker}></div>
                  <span>Set status to "Available"</span>
                </li>
                <li>
                  <div className={styles.checkMarker}></div>
                  <span>Browse & Claim pending bookings</span>
                </li>
              </ul>
            </div>

            <div className={styles.infoCard}>
              <h3>Claimable Jobs</h3>
              <p className={styles.compactDesc}>There are jobs available for pick up. Claim now to start earning.</p>
              <Link href="/jobs" className={styles.bannerBtn} style={{ marginTop: 12, justifyContent: "center" }}>
                <span>Go to Jobs Board &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 3. ADMIN DASHBOARD
  const renderAdminDashboard = () => {
    const totalBookings = bookings.length;
    const activeCleaners = Object.values(workerStatuses).filter(w => w.status === "available").length;
    const cancelledJobs = bookings.filter(b => b.status === "cancelled").length;
    const pendingJobs = bookings.filter(b => b.status === "pending").length;
    const completedRevenue = bookings.filter(b => b.status === "completed").reduce((sum, b) => sum + b.price, 0);

    const activeBookings = bookings.filter(
      (b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress"
    );

    const workersList = Object.entries(workerStatuses).map(([id, info]) => ({
      id,
      ...info
    }));

    const handleAssignOverride = async (bookingId: string) => {
      const selectedWorkerId = selectedWorkerForOverride[bookingId];
      if (!selectedWorkerId) return;
      const workerName = workerStatuses[selectedWorkerId]?.name || "Worker";
      await acceptBooking(bookingId, selectedWorkerId, workerName);
      alert("Worker assigned successfully!");
    };

    return (
      <div className={styles.section}>
        <div className={styles.statsRowAdmin}>
          <StatCard 
            icon={TrendingUp} 
            label="Total Gross Volume" 
            value={`₹${completedRevenue.toLocaleString("en-IN")}`} 
            color="#22c55e" 
          />
          <StatCard 
            icon={Users} 
            label="Active Cleaners" 
            value={`${activeCleaners} Available`} 
            color="#3b82f6" 
          />
          <StatCard 
            icon={AlertCircle} 
            label="Pending Bookings" 
            value={pendingJobs} 
            color="#f59e0b" 
          />
          <StatCard 
            icon={ShieldAlert} 
            label="Cancelled Services" 
            value={cancelledJobs} 
            color="#ef4444" 
          />
        </div>

        <div className={styles.dashboardGridAdmin}>
          {/* Active Bookings & Dispatch Override Control */}
          <div className={styles.cardContainerFull}>
            <div className={styles.cardHeader}>
              <h2>Operations Monitor (Live Dispatch)</h2>
              <span className={styles.badge}>{activeBookings.length} Active</span>
            </div>

            {activeBookings.length === 0 ? (
              <p className={styles.emptyText}>All bookings completed or cleared.</p>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Booking Ref / Customer</th>
                      <th>Service Details</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Assigned Cleaner</th>
                      <th>Dispatch Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <p className={styles.bold}>{b.userName}</p>
                          <p className={styles.subtext}>{b.userPhone}</p>
                          <p className={styles.micro}>ID: {b.id.slice(0, 8)}...</p>
                        </td>
                        <td>
                          <p className={styles.bold}>{b.serviceLabel}</p>
                          <p className={styles.subtext}>{b.location}</p>
                          {b.scheduledDate && (
                            <p className={styles.micro}>Sched: {new Date(b.scheduledDate).toLocaleDateString()}</p>
                          )}
                        </td>
                        <td className={styles.bold}>₹{b.price}</td>
                        <td>
                          <span className={`${styles.statusTextBadge} ${styles[b.status]}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.workerName ? (
                            <div>
                              <p className={styles.bold}>{b.workerName}</p>
                              <p className={styles.subtext}>{b.workerPhone || "No Phone"}</p>
                            </div>
                          ) : (
                            <span className={styles.unassigned}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.dispatchControls}>
                            <select
                              value={selectedWorkerForOverride[b.id] || ""}
                              onChange={(e) => setSelectedWorkerForOverride({
                                ...selectedWorkerForOverride,
                                [b.id]: e.target.value
                              })}
                              className={styles.workerSelect}
                            >
                              <option value="">-- Assign Cleaner --</option>
                              {workersList.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name} ({w.status})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignOverride(b.id)}
                              disabled={!selectedWorkerForOverride[b.id]}
                              className={styles.assignBtn}
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => cancelBooking(b.id)}
                              className={styles.cancelBtn}
                              title="Force Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cleaners Status Card List */}
          <div className={styles.cardContainerSide}>
            <div className={styles.cardHeader}>
              <h2>Cleaner Availability</h2>
            </div>
            
            <div className={styles.workerStatusList}>
              {workersList.map((worker) => (
                <div key={worker.id} className={styles.workerStatusItem}>
                  <div className={styles.workerInfo}>
                    <p className={styles.workerNameText}>{worker.name}</p>
                    <p className={styles.workerRatingText}>
                      <Star size={12} fill="#eab308" color="#eab308" />
                      <span>{worker.average_rating ? worker.average_rating.toFixed(1) : "N/A"} ({worker.total_feedbacks || 0})</span>
                    </p>
                  </div>
                  <div className={styles.workerActionArea}>
                    <span className={`${styles.statusToggleBadge} ${styles[worker.status]}`}>
                      {worker.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {user.role === "admin" && renderAdminDashboard()}
      {user.role === "worker" && renderWorkerDashboard()}
      {user.role === "user" && renderCustomerDashboard()}
    </div>
  );
}
