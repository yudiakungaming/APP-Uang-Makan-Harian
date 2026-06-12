import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  officeName?: string;
  radius?: number;
}

export default function LeafletMap({
  latitude,
  longitude,
  onLocationChange,
  officeName = 'Pusat Kantor',
  radius = 100,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Keep callback in a ref to avoid recreating listener bindings
  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center map initially
    const position: L.LatLngTuple = [latitude, longitude];
    
    // Create the map instance
    const map = L.map(mapContainerRef.current, {
      center: position,
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;

    // Use OpenStreetMap tile template
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Beautiful custom HTML markup marker so it doesn't fail on missing static PNG asserts
    const pinIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
          <div class="absolute w-8 h-8 bg-indigo-500 rounded-full border-2 border-white shadow-lg animate-ping duration-1000 opacity-30"></div>
          <div class="relative w-8 h-8 bg-indigo-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold select-none text-xs">
            🏢
          </div>
          <div class="absolute -bottom-1.5 w-2 h-2 bg-indigo-800 border-l border-t border-indigo-800 rotate-45"></div>
        </div>
      `,
      className: '',
      iconSize: [32, 40],
      iconAnchor: [16, 36],
    });

    // Add draggable marker
    const marker = L.marker(position, {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // Add Geofence circle
    const circle = L.circle(position, {
      color: '#4f46e5',
      fillColor: '#818cf8',
      fillOpacity: 0.15,
      radius: radius,
      weight: 1.5,
    }).addTo(map);
    circleRef.current = circle;

    // Listen to drag events
    marker.on('dragend', () => {
      const latLng = marker.getLatLng();
      onLocationChangeRef.current(
        parseFloat(latLng.lat.toFixed(6)),
        parseFloat(latLng.lng.toFixed(6))
      );
    });

    // Listen to map click events
    map.on('click', (e) => {
      const latLng = e.latlng;
      marker.setLatLng(latLng);
      circle.setLatLng(latLng);
      onLocationChangeRef.current(
        parseFloat(latLng.lat.toFixed(6)),
        parseFloat(latLng.lng.toFixed(6))
      );
    });

    // Cleanup map instance on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync marker, circle, and radius from prop updates
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current) {
      const currentPos = markerRef.current.getLatLng();
      const needsCenterUpdate = currentPos.lat !== latitude || currentPos.lng !== longitude;
      
      if (needsCenterUpdate) {
        const newPos = L.latLng(latitude, longitude);
        markerRef.current.setLatLng(newPos);
        circleRef.current.setLatLng(newPos);
        mapRef.current.setView(newPos, mapRef.current.getZoom());
      }
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  return (
    <div className="w-full h-full relative group">
      {/* Map Element */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full rounded-xl"
        style={{ zIndex: 1 }}
      />
      {/* Floating Indicator */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/95 text-white rounded-lg px-3 py-2 text-[10px] font-sans font-medium flex items-center gap-1.5 shadow-lg backdrop-blur-sm pointer-events-none select-none" style={{ zIndex: 1000 }}>
        <span className="w-2 h-2 rounded-full bg-emerald-450 animate-pulse shrink-0" />
        <span>📍 KLIK area peta mana saja atau GESER pin gedung kantor untuk menentukan pusat geofence secara instan.</span>
      </div>
    </div>
  );
}
