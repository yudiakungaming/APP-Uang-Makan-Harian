import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Compass, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { calculateDistance } from '../utils';

interface RadarMapProps {
  officeLat: number;
  officeLng: number;
  geofenceRadius: number; // in meters
  currentLat: number;
  currentLng: number;
  onLocationChange: (lat: number, lng: number, method: 'GPS_REAL' | 'GPS_SIMULATED') => void;
  locationMethod: 'GPS_REAL' | 'GPS_SIMULATED';
}

export default function RadarMap({
  officeLat,
  officeLng,
  geofenceRadius,
  currentLat,
  currentLng,
  onLocationChange,
  locationMethod,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingGps, setLoadingGps] = useState<boolean>(false);

  // Constants for coordinate mapping
  const METERS_PER_DEGREE_LAT = 111139;
  const officeLatRad = (officeLat * Math.PI) / 180;
  const METERS_PER_DEGREE_LNG = METERS_PER_DEGREE_LAT * Math.cos(officeLatRad);

  // Calculate actual distance
  const distance = calculateDistance(officeLat, officeLng, currentLat, currentLng);
  const isInside = distance <= geofenceRadius;

  // Map latitude/longitude offsets to graphic offsets inside a 300x300 viewBox (center is 150, 150)
  // Let the radius of the geofence represent 90px in the SVG canvas.
  const SVG_CENTER = 150;
  const PIXELS_FOR_GEOFENCE = 85; 
  const pixelsPerMeter = PIXELS_FOR_GEOFENCE / geofenceRadius;

  // Offsets in meters
  const yOffsetMeters = (currentLat - officeLat) * METERS_PER_DEGREE_LAT;
  const xOffsetMeters = (currentLng - officeLng) * METERS_PER_DEGREE_LNG;

  // SVG coordinates: positive X is East, positive Y is North (which is -y in SVG screen space)
  const employeeX = SVG_CENTER + (xOffsetMeters * pixelsPerMeter);
  const employeeY = SVG_CENTER - (yOffsetMeters * pixelsPerMeter);

  // Clamp within SVG boundaries for safety, though they can go off-radar if very far
  const isOffRadar = Math.sqrt(xOffsetMeters * xOffsetMeters + yOffsetMeters * yOffsetMeters) > (geofenceRadius * 1.6);

  // Convert SVG clicks back to coordinates to allow simulated positions
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Relative coordinates scaled to 0-300
    const clickX = ((e.clientX - rect.left) / rect.width) * 300;
    const clickY = ((e.clientY - rect.top) / rect.height) * 300;

    // Meters offset from center
    const dxMeters = (clickX - SVG_CENTER) / pixelsPerMeter;
    const dyMeters = -(clickY - SVG_CENTER) / pixelsPerMeter; // Invert SVG y

    // Calculate simulated coordinates
    const simLat = officeLat + (dyMeters / METERS_PER_DEGREE_LAT);
    const simLng = officeLng + (dxMeters / METERS_PER_DEGREE_LNG);

    onLocationChange(
      Math.round(simLat * 1000000) / 1000000,
      Math.round(simLng * 1000000) / 1000000,
      'GPS_SIMULATED'
    );
    setErrorMsg(null);
  };

  // Pre-configured simulation buttons
  const setPreset = (type: 'inside' | 'outside' | 'center') => {
    let latOffset = 0;
    let lngOffset = 0;

    if (type === 'inside') {
      // ~35 meters South-East
      latOffset = -0.00022;
      lngOffset = 0.00022;
    } else if (type === 'outside') {
      // ~220 meters North-West
      latOffset = 0.0014;
      lngOffset = -0.0014;
    } else if (type === 'center') {
      // Exactly 0 meters
      latOffset = 0;
      lngOffset = 0;
    }

    const nextLat = officeLat + latOffset;
    const nextLng = officeLng + lngOffset;

    onLocationChange(
      Math.round(nextLat * 1000000) / 1000000,
      Math.round(nextLng * 1000000) / 1000000,
      'GPS_SIMULATED'
    );
    setErrorMsg(null);
  };

  // Request actual GPS coordinates
  const triggerRealGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Browser Anda tidak mendukung Geolocation.');
      return;
    }

    setLoadingGps(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationChange(latitude, longitude, 'GPS_REAL');
        setLoadingGps(false);
      },
      (err) => {
        setLoadingGps(false);
        console.error('GPS error:', err);
        if (err.code === 1) {
          setErrorMsg(
            'Akses GPS ditolak. Jika berada di dalam frame AI Studio, silakan gunakan "Mode Simulasi" interaktif (klik pada radar untuk bergeser posisi) atau buka aplikasi di tab baru untuk mengizinkan GPS asli browser.'
          );
        } else {
          setErrorMsg(`Gagal memuat GPS: ${err.message}.`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div id="radar-container" ref={containerRef} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
          <h3 className="font-sans font-semibold tracking-wide text-slate-200 text-sm uppercase">Radar Detektor Geofence</h3>
        </div>
        <div className="flex select-none items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full text-xs font-mono">
          <span className={`w-2.5 h-2.5 rounded-full ${locationMethod === 'GPS_REAL' ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
          {locationMethod === 'GPS_REAL' ? 'GPS ASLI' : 'GPS SIMULASI'}
        </div>
      </div>

      <div className="relative w-full max-w-[280px] bg-slate-950 rounded-xl p-2 border border-slate-800/80 aspect-square overflow-hidden flex items-center justify-center">
        {/* Glowing sweep effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]" />
        
        {/* Animated Sweep Line */}
        <div className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%] pointer-events-none bg-[conic-gradient(from_0deg,transparent_50%,rgba(16,185,129,0.08)_95%,rgba(16,185,129,0.35)_100%)] rounded-full animate-sweep" />

        {/* The SVG Radar Interface */}
        <svg
          id="svg-radar-map"
          viewBox="0 0 300 300"
          className="w-full h-full relative z-10 cursor-crosshair"
          onClick={handleSvgClick}
        >
          {/* Circular grids */}
          <circle cx="150" cy="150" r="140" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="150" cy="150" r="115" fill="none" stroke="#1e293b" strokeWidth="1" />
          <circle cx="150" cy="150" r="50" fill="none" stroke="#1e293b" strokeWidth="1" />

          {/* Radar axis crosshairs */}
          <line x1="150" y1="10" x2="150" y2="290" stroke="#1e293b" strokeWidth="1" />
          <line x1="10" y1="150" x2="290" y2="150" stroke="#1e293b" strokeWidth="1" />

          {/* Cardinal direction indicators */}
          <text x="150" y="24" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold" className="font-sans select-none pointer-events-none">U</text>
          <text x="150" y="286" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold" className="font-sans select-none pointer-events-none">S</text>
          <text x="282" y="154" textAnchor="end" fill="#64748b" fontSize="10" fontWeight="bold" className="font-sans select-none pointer-events-none">T</text>
          <text x="18" y="154" textAnchor="start" fill="#64748b" fontSize="10" fontWeight="bold" className="font-sans select-none pointer-events-none">B</text>

          {/* Safe office geofence ring boundary */}
          <circle
            cx="150"
            cy="150"
            r={PIXELS_FOR_GEOFENCE}
            fill={isInside ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.02)'}
            stroke={isInside ? '#10b981' : '#f43f5e'}
            strokeWidth="2"
            strokeDasharray={isInside ? 'none' : '4 4'}
            className="transition-all duration-300"
          />

          {/* Office center point indicator */}
          <g transform="translate(150, 150)" className="pointer-events-none">
            <circle cx="0" cy="0" r="6" fill="#10b981" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="0" cy="0" r="4" fill="#059669" />
            {/* Legend label for office */}
            <rect x="-18" y="-22" width="36" height="14" rx="3" fill="#020617" stroke="#10b981" strokeWidth="1" />
            <text x="0" y="-12" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold" className="font-sans">KANTOR</text>
          </g>

          {/* Geofence radius text overlay on ring */}
          <rect x="152" y={150 - PIXELS_FOR_GEOFENCE - 14} width="35" height="12" rx="2" fill="#1e293b" opacity="0.8" className="pointer-events-none" />
          <text x="155" y={150 - PIXELS_FOR_GEOFENCE - 5} fill="#94a3b8" fontSize="8" className="font-mono pointer-events-none">
            R={geofenceRadius}m
          </text>

          {/* Employee current tracker dot */}
          {!isOffRadar ? (
            <g transform={`translate(${employeeX}, ${employeeY})`} className="cursor-grab active:cursor-grabbing transition-transform duration-300 ease-out">
              <circle
                cx="0"
                cy="0"
                r="10"
                fill={isInside ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.3)'}
                className="animate-pulse"
              />
              <circle
                cx="0"
                cy="0"
                r="5"
                fill={isInside ? '#3b82f6' : '#f97316'}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="shadow-md"
              />
              {/* Distance HUD flag */}
              <g transform="translate(0, 16)">
                <rect x="-24" y="0" width="48" height="14" rx="3" fill="#0f172a" stroke={isInside ? '#3b82f6' : '#f97316'} strokeWidth="1" />
                <text x="0" y="10" textAnchor="middle" fill={isInside ? '#93c5fd' : '#fdba74'} fontSize="8" fontWeight="bold" className="font-mono">
                  {distance}m
                </text>
              </g>
            </g>
          ) : (
            // If completely off-map, show helper indicator at coordinate border
            <g transform="translate(150, 270)">
              <rect x="-65" y="0" width="130" height="18" rx="4" fill="#ef4444" opacity="0.9" />
              <text x="0" y="12" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" className="font-sans select-none pointer-events-none">
                📍 POSISI JAUH DI LUAR RADAR
              </text>
            </g>
          )}
        </svg>

        {/* HUD Overlay detailing metric coordinates */}
        <div className="absolute bottom-2 left-2 right-2 flex bg-slate-950/95 border border-slate-800/80 rounded-lg p-2 text-[10px] justify-between font-mono z-20 pointer-events-none backdrop-blur-sm select-none">
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-tight">Kordinat Pegawai</div>
            <div className="text-slate-300 font-medium">Lat: {currentLat.toFixed(6)}</div>
            <div className="text-slate-300 font-medium">Lng: {currentLng.toFixed(6)}</div>
          </div>
          <div className="text-right flex flex-col justify-between">
            <span className="text-[9px] text-slate-500 uppercase tracking-tight">Geofence Status</span>
            <span className={`font-bold flex items-center justify-end gap-0.5 ${isInside ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isInside ? (
                <>
                  <ShieldCheck className="w-3 h-3" /> DI AREA
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 animate-bounce" style={{ animationDuration: '1.5s' }} /> DI LUAR
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full mt-3 text-center text-[10px] text-slate-400/80 font-sans flex items-center justify-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/40 select-none">
        <Cpu className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
        <span>Tips: <strong>Klik/Sentuh</strong> lingkaran radar di atas untuk memindahkan lokasi simulasi Anda.</span>
      </div>

      {/* Control Presets */}
      <div id="simulation-presets" className="w-full mt-4 flex flex-col gap-2.5">
        <div className="text-xs text-slate-400 font-semibold tracking-wide uppercase self-start text-[10px] select-none">Simulasi Posisi:</div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setPreset('center')}
            className={`py-2 px-1 text-[11px] rounded-lg border font-medium transition-all ${
              distance === 0 && locationMethod === 'GPS_SIMULATED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
            }`}
          >
            Tepat di Center (0m)
          </button>
          <button
            onClick={() => setPreset('inside')}
            className={`py-2 px-1 text-[11px] rounded-lg border font-medium transition-all ${
              isInside && distance > 0 && locationMethod === 'GPS_SIMULATED'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
            }`}
          >
            Dalam Kantor (35m)
          </button>
          <button
            onClick={() => setPreset('outside')}
            className={`py-2 px-1 text-[11px] rounded-lg border font-medium transition-all ${
              !isInside && locationMethod === 'GPS_SIMULATED'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
            }`}
          >
            Luar Kantor (220m)
          </button>
        </div>

        <button
          onClick={triggerRealGps}
          disabled={loadingGps}
          className={`w-full py-2.5 px-4 rounded-xl border font-sans font-medium text-xs flex items-center justify-center gap-2 transition-all ${
            locationMethod === 'GPS_REAL'
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
              : 'bg-indigo-950/40 hover:bg-indigo-950/80 text-indigo-300 border-indigo-900/60'
          } disabled:opacity-50`}
        >
          <Navigation className={`w-3.5 h-3.5 ${loadingGps ? 'animate-spin' : ''}`} />
          {loadingGps ? 'Menghubungkan ke GPS Satelit...' : 'Gunakan Akurasi GPS Asli Device'}
        </button>

        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-600/30 rounded-xl p-3 text-[11px] text-amber-300 font-sans leading-relaxed text-left relative mt-1">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
