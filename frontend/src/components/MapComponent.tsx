"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { getStatusColor, getCategoryIconSymbol } from '@/lib/mapUtils';

export { getStatusColor, getCategoryIconSymbol };

const L = typeof window !== 'undefined' ? require('leaflet') : null;

// Create category + status visually distinct DivIcon
function createMarkerIcon(category?: string, status?: string) {
  if (typeof window === 'undefined') return undefined as any;
  const iconSymbol = getCategoryIconSymbol(category);
  const statusColor = getStatusColor(status);

  return L.divIcon({
    className: 'custom-civic-marker',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        background: #ffffff;
        border: 3px solid ${statusColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        color: ${statusColor};
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        cursor: pointer;
      ">
        <span class="material-symbols-outlined" style="font-size: 18px; font-weight: 600; line-height: 1;">${iconSymbol}</span>
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background-color: ${statusColor};
          border: 1.5px solid #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

// Distinct pin icon for selected report location
function createSelectedLocationIcon() {
  if (typeof window === 'undefined') return undefined as any;
  return L.divIcon({
    className: 'custom-selected-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        background: #ef4444;
        border: 3px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
        cursor: pointer;
      ">
        <span class="material-symbols-outlined" style="transform: rotate(45deg); font-size: 20px; color: #ffffff; line-height: 1;">location_on</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

// Distinct icon for User Location (pulsing blue dot)
function createUserLocationIcon() {
  if (typeof window === 'undefined') return undefined as any;
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        background: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.3), 0 4px 12px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  status: string;
  category?: string;
  zone?: string;
  department_name?: string;
  affected_count?: number;
  created_at?: string;
  image_url?: string;
}

export interface MapComponentProps {
  mapId?: string;
  markers?: MapMarkerItem[];
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  showSearch?: boolean;
  showUserLocationButton?: boolean;
  onUserLocationFound?: (lat: number, lng: number) => void;
  onUserLocationError?: (msg: string) => void;
}

export default function MapComponent({
  mapId = "default-map",
  markers = [],
  interactive = true,
  onMapClick,
  selectedLocation,
  userLocation,
  showSearch = false,
  showUserLocationButton = false,
  onUserLocationFound,
  onUserLocationError
}: MapComponentProps) {
  const [mounted, setMounted] = useState(false);
  const [mapKey] = useState(() => `${mapId}-${Math.random().toString(36).substring(2, 9)}`);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Search & feedback state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Geolocation locating state
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);

  const initialCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [40.7128, -74.0060];

  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);

  useEffect(() => {
    setMounted(true);
    const container = document.getElementById(mapKey);
    if (container) {
      // @ts-ignore
      container._leaflet_id = null;
    }
    return () => {
      const el = document.getElementById(mapKey);
      if (el) {
        // @ts-ignore
        el._leaflet_id = null;
      }
    };
  }, [mapKey]);

  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    } else if (selectedLocation) {
      setMapCenter([selectedLocation.lat, selectedLocation.lng]);
    } else if (markers.length > 0) {
      setMapCenter([markers[0].lat, markers[0].lng]);
    }
  }, [userLocation?.lat, userLocation?.lng, selectedLocation?.lat, selectedLocation?.lng, markers.length]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        setSearchError("Location not found.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Failed to search location. Check connection.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      const errMsg = "Geolocation is not supported by your browser.";
      setLocationFeedback(errMsg);
      if (onUserLocationError) onUserLocationError(errMsg);
      return;
    }

    setLocatingUser(true);
    setLocationFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setLocatingUser(false);
        setLocationFeedback("Centered to your current location!");
        if (onUserLocationFound) {
          onUserLocationFound(latitude, longitude);
        }
        setTimeout(() => setLocationFeedback(null), 4000);
      },
      (error) => {
        setLocatingUser(false);
        let errMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = "Location permission was denied.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errMsg = "Location request timed out.";
        }
        setLocationFeedback(errMsg);
        if (onUserLocationError) onUserLocationError(errMsg);
        setTimeout(() => setLocationFeedback(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Offset identical coordinates slightly to ensure overlapping markers remain accessible
  const processedMarkers = useMemo(() => {
    const coordsMap = new Map<string, number>();
    return markers.map((m) => {
      const key = `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`;
      const count = coordsMap.get(key) || 0;
      coordsMap.set(key, count + 1);

      if (count === 0) return m;

      // Apply small spiraling offset for dense/duplicate coordinates
      const angle = count * 1.25;
      const radius = 0.00015 * Math.sqrt(count);
      return {
        ...m,
        lat: m.lat + radius * Math.cos(angle),
        lng: m.lng + radius * Math.sin(angle),
      };
    });
  }, [markers]);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
        <span className="text-on-surface-variant font-label-md">Loading Map...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative z-0">
      {/* Top Search Bar & Controls Overlay */}
      {(showSearch || showUserLocationButton) && (
        <div className="absolute top-md left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto flex flex-col items-center gap-2 max-w-[90vw]">
          <div className="flex items-center bg-surface-container rounded-full shadow-lg border border-outline-variant p-1 gap-1">
            {showSearch && (
              <div className="flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Search location..."
                  className="bg-transparent text-on-surface text-sm px-4 py-1.5 outline-none w-44 sm:w-64"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searchLoading}
                  className="bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Search Location"
                >
                  {searchLoading ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">search</span>
                  )}
                </button>
              </div>
            )}

            {showUserLocationButton && (
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locatingUser}
                className="bg-surface-container-high text-on-surface hover:bg-surface-variant px-3 py-1.5 rounded-full text-xs font-label-md flex items-center gap-1.5 border border-outline-variant transition-colors disabled:opacity-50 flex-shrink-0 shadow-sm"
                title="Use My Location"
              >
                {locatingUser ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin text-primary">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px] text-primary">my_location</span>
                )}
                <span className="hidden sm:inline">Use My Location</span>
              </button>
            )}
          </div>

          {searchError && (
            <div className="bg-error/90 text-on-error text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-sm animate-fade-in">
              {searchError}
            </div>
          )}

          {locationFeedback && (
            <div className="bg-surface-container-highest text-on-surface text-xs px-3 py-1 rounded-full shadow-md border border-outline-variant animate-fade-in flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">info</span>
              {locationFeedback}
            </div>
          )}
        </div>
      )}

      <MapContainer
        key={mapKey}
        id={mapKey}
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        style={{ height: '100%', width: '100%', background: '#f8f9fa' }}
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />
        <MapUpdater center={mapCenter} />

        {interactive && onMapClick && <MapClickHandler onClick={onMapClick} />}

        {/* Selected Location Pin */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={createSelectedLocationIcon()}>
            <Popup>
              <div className="p-1 text-center font-label-md text-xs">
                <span className="font-bold block text-primary">Selected Report Location</span>
                <span className="text-on-surface-variant">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* User Location Pulsing Dot */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()}>
            <Popup>
              <div className="p-1 text-center font-label-md text-xs">
                <span className="font-bold text-primary block">Your Current Location</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Issue Markers with Category & Status distinction */}
        {processedMarkers.map((marker) => {
          const statusColor = getStatusColor(marker.status);
          const iconSymbol = getCategoryIconSymbol(marker.category);

          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createMarkerIcon(marker.category, marker.status)}
            >
              <Popup minWidth={240} maxWidth={320}>
                <div className="flex flex-col gap-2 p-1.5 w-full min-w-[220px]">
                  {marker.image_url && (
                    <img
                      src={marker.image_url}
                      alt={marker.title}
                      onClick={() => setExpandedImage(marker.image_url!)}
                      className="w-full h-32 object-cover rounded-lg mb-1 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-on-surface leading-snug mb-1">{marker.title}</h4>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white inline-flex items-center gap-1 shadow-sm"
                        style={{ backgroundColor: statusColor }}
                      >
                        <span className="material-symbols-outlined text-[12px]">{iconSymbol}</span>
                        {marker.category || 'Issue'}
                      </span>

                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ borderColor: statusColor, color: statusColor }}
                      >
                        {marker.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-on-surface-variant flex flex-col gap-0.5">
                      {marker.zone && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
                          <span>Zone: <strong>{marker.zone}</strong></span>
                        </div>
                      )}

                      {marker.department_name && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">domain</span>
                          <span>Assigned: <strong>{marker.department_name}</strong></span>
                        </div>
                      )}

                      {typeof marker.affected_count === 'number' && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">group</span>
                          <span>Affected: <strong>{marker.affected_count} citizens</strong></span>
                        </div>
                      )}

                      {marker.created_at && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">calendar_today</span>
                          <span>Reported: {new Date(marker.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/issues/${marker.id}`}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors no-underline shadow-sm"
                  >
                    <span>View Issue</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Image Preview Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center">
            <button
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black transition-colors z-50 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImage(null);
              }}
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            <img
              src={expandedImage}
              alt="Expanded evidence"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
