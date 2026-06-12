import { Employee, GeofenceSettings } from './types';

// Calculate geodesic distance on earth in meters using Haversine Formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// Format number to Indonesian Rupiah (IDR)
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format standard date to long Indonesian format (e.g. Kamis, 12 Juni 2026)
export function formatIndonesianDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Seed data: Predefined employees
export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp-admin', name: 'Yudi Pratama (Admin Utama)', department: 'Finance & HR', employeeCode: 'ADM001', email: 'yudiakungaming@gmail.com' },
  { id: 'emp-1', name: 'Budi Santoso', department: 'IT Support', employeeCode: 'K001', email: 'budi@corp.com' },
  { id: 'emp-2', name: 'Siti Aminah', department: 'Finance & HR', employeeCode: 'K002', email: 'siti@corp.com' },
  { id: 'emp-3', name: 'Ahmad Fauzi', department: 'Marketing', employeeCode: 'K003', email: 'ahmad@corp.com' },
  { id: 'emp-4', name: 'Dewi Lestari', department: 'Operations', employeeCode: 'K004', email: 'dewi@corp.com' },
  { id: 'emp-5', name: 'Rian Hidayat', department: 'Software Engineering', employeeCode: 'K005', email: 'rian@corp.com' },
];

// Seed data: Predefined Geofence (Office Center) - Monas area Jakarta as default
export const DEFAULT_GEOFENCE: GeofenceSettings = {
  officeName: 'Kantor Pusat Jakarta (Monas)',
  latitude: -6.175392,
  longitude: 106.827153,
  radius: 100, // 100 meters
  mealAllowance: 25000, // Rp 25.000,- per day as requested by the user
};
