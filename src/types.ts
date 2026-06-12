export interface Employee {
  id: string;
  name: string;
  department: string;
  employeeCode: string;
  email: string; // Registered email for Google Auth matching
  bankName?: string;
  bankAccount?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string; // Auto-recorded verified email of check-in
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  latitude: number;
  longitude: number;
  distance: number; // in meters from office center
  status: 'APPROVED' | 'REJECTED_OUTSIDE';
  amountSpent: number; // daily meal allowance received
  method: 'GPS_REAL' | 'GPS_SIMULATED';
}

export interface GeofenceSettings {
  officeName: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  mealAllowance: number; // in IDR
}
