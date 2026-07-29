"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js + Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

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

interface MapComponentProps {
  mapId?: string;
  markers?: {
    id: string;
    lat: number;
    lng: number;
    title: string;
    status: string;
  }[];
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  showSearch?: boolean;
}

export default function MapComponent({ mapId = "default-map", markers = [], interactive = true, onMapClick, selectedLocation, showSearch = false }: MapComponentProps) {
  const [mounted, setMounted] = useState(false);
  const [mapKey] = useState(() => `${mapId}-${Math.random().toString(36).substr(2, 9)}`);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Fix for React 18 Strict Mode and HMR "Map container is being reused"
      const container = document.getElementById(mapKey);
      if (container) {
        // @ts-ignore
        container._leaflet_id = null;
      }
    };
  }, [mapKey]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  if (!mounted) {
    // Placeholder while Leaflet loads client-side
    return (
      <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
        <span className="text-on-surface-variant font-label-md">Loading Map...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative z-0">
      {showSearch && (
        <div className="absolute top-md left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
          <div className="flex items-center bg-surface-container rounded-full shadow-lg border border-outline-variant overflow-hidden p-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search location..." 
              className="bg-transparent text-on-surface text-sm px-4 py-2 outline-none w-48 sm:w-64"
            />
            <button 
              type="button" 
              onClick={handleSearch}
              disabled={searchLoading}
              className="bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0 mr-1"
            >
              {searchLoading ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">search</span>
              )}
            </button>
          </div>
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
        {/* Voyager tiles from CartoDB (Aesthetic warm/color map) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapUpdater center={mapCenter} />
        
        {interactive && onMapClick && <MapClickHandler onClick={onMapClick} />}
        
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
            <Popup>Selected Location</Popup>
          </Marker>
        )}
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="flex flex-col gap-1 p-1">
                <span className="font-label-md text-surface-dim">{marker.title}</span>
                <span className="text-xs text-primary">{marker.status}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
