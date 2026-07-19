"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import styles from "./MapPicker.module.css";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number, addressDetails?: any) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Close results list on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      handleSearch(searchQuery);
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle address lookup using Nominatim
  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5&email=Zentroofficial@gmail.com`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowResults(true);
      }
    } catch (e) {
      console.error("Autocomplete search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  // Reverse geocoding helper
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en&email=Zentroofficial@gmail.com`
      );
      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};
        const full = data.display_name || `${latitude}, ${longitude}`;
        return {
          success: true,
          address: full,
          data: {
            street: addr.road || addr.suburb || addr.neighbourhood || "",
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: addr.state || "",
            country: addr.country || "",
            pincode: addr.postcode || "",
          },
        };
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e);
    }
    return { success: false };
  };

  const handleSelectResult = async (item: any) => {
    const selectedLat = parseFloat(item.lat);
    const selectedLng = parseFloat(item.lon);

    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);

    // Update map marker & pan
    if (mapInstanceRef.current && markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([selectedLat, selectedLng]);
      mapInstanceRef.current.setView([selectedLat, selectedLng], 16);
    }

    // Convert display name or fetch detailed address components
    let fullAddr = item.display_name;
    let details = {
      street: item.address?.road || item.address?.suburb || "",
      city: item.address?.city || item.address?.town || item.address?.village || "",
      state: item.address?.state || "",
      country: item.address?.country || "",
      pincode: item.address?.postcode || "",
    };

    onChange(selectedLat, selectedLng, {
      success: true,
      address: fullAddr,
      data: details,
    });
  };

  // Sync prop changes (e.g. from Auto Detect) to Map marker
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !markerInstanceRef.current) return;

    const currentLatLng = markerInstanceRef.current.getLatLng();
    if (currentLatLng.lat !== lat || currentLatLng.lng !== lng) {
      markerInstanceRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 15);
    }
  }, [lat, lng]);

  // Load Leaflet dynamically on mount
  useEffect(() => {
    let mapInstance: any = null;
    let markerInstance: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      // Clean up previous contents to prevent multiple map elements in strict mode
      if (mapRef.current.innerHTML !== "") {
        mapRef.current.innerHTML = "";
      }

      const mapContainer = document.createElement("div");
      mapContainer.className = styles.mapContainerElement;
      mapRef.current.appendChild(mapContainer);

      mapInstance = L.map(mapContainer, {
        zoomControl: true,
      }).setView([lat || 12.9716, lng || 77.5946], 13);

      mapInstanceRef.current = mapInstance;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance);

      // Custom marker icon to render correctly in all build environments without failing
      const DefaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
      });

      markerInstance = L.marker([lat || 12.9716, lng || 77.5946], {
        draggable: true,
        icon: DefaultIcon,
      }).addTo(mapInstance);

      markerInstanceRef.current = markerInstance;

      // Event listener for dragging marker
      markerInstance.on("dragend", async () => {
        const position = markerInstance.getLatLng();
        const dragLat = position.lat;
        const dragLng = position.lng;
        const geoResult = await reverseGeocode(dragLat, dragLng);
        onChange(dragLat, dragLng, geoResult.success ? geoResult : undefined);
      });

      // Event listener for clicking map
      mapInstance.on("click", async (e: any) => {
        const clickLat = e.latlng.lat;
        const clickLng = e.latlng.lng;
        markerInstance.setLatLng([clickLat, clickLng]);
        const geoResult = await reverseGeocode(clickLat, clickLng);
        onChange(clickLat, clickLng, geoResult.success ? geoResult : undefined);
      });
    };

    if (!(window as any).L) {
      // Create CSS link
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-style-link";
      document.head.appendChild(link);

      // Create Script
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.id = "leaflet-script-link";
      script.onload = () => {
        initMap();
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.mapWrapper}>
      {/* Autocomplete Search input */}
      <div className={styles.searchContainer} ref={resultsRef}>
        <div className={styles.searchInputRow}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search address, city, area or landmark..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
          />
          {isSearching && <Loader2 size={16} className={`${styles.searchLoader} animate-spin`} />}
        </div>

        {showResults && searchResults.length > 0 && (
          <div className={styles.resultsDropdown}>
            {searchResults.map((item, index) => (
              <div
                key={index}
                className={styles.resultItem}
                onClick={() => handleSelectResult(item)}
              >
                <MapPin size={14} className={styles.pinIcon} />
                <span className={styles.resultText}>{item.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map viewport */}
      <div className={styles.mapContainer} ref={mapRef}>
        {/* Map will be rendered dynamically here */}
      </div>

      <div className={styles.mapTip}>
        💡 Tip: You can drag the red map pin or click anywhere on the map to select your location.
      </div>
    </div>
  );
}
