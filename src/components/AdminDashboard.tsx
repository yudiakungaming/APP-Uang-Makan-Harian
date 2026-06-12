import React, { useState } from 'react';
import {
  Users,
  Settings,
  History,
  Coins,
  ClipboardCheck,
  Plus,
  Trash2,
  Sliders,
  DollarSign,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Employee, AttendanceRecord, GeofenceSettings } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils';
import LeafletMap from './LeafletMap';


interface AdminDashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  geofenceSettings: GeofenceSettings;
  onAddEmployee: (name: string, department: string, code: string, email: string) => void;
  onRemoveEmployee: (id: string) => void;
  onUpdateGeofence: (settings: GeofenceSettings) => void;
  onClearRecords: () => void;
}

export default function AdminDashboard({
  employees,
  attendanceRecords,
  geofenceSettings,
  onAddEmployee,
  onRemoveEmployee,
  onUpdateGeofence,
  onClearRecords,
}: AdminDashboardProps) {
  // Navigation for inner tabs in Admin Panel
  const [activeSubTab, setActiveSubTab] = useState<'rekap' | 'geofence' | 'karyawan'>('rekap');

  // New Employee state
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('IT Support');
  const [newCode, setNewCode] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Geofence configuration state
  const [geoName, setGeoName] = useState(geofenceSettings.officeName);
  const [geoLat, setGeoLat] = useState(geofenceSettings.latitude.toString());
  const [geoLng, setGeoLng] = useState(geofenceSettings.longitude.toString());
  const [geoRadius, setGeoRadius] = useState(geofenceSettings.radius.toString());
  const [geoAllowance, setGeoAllowance] = useState(geofenceSettings.mealAllowance.toString());

  // Search filter for logs
  const [searchQuery, setSearchQuery] = useState('');

  // Success notifications
  const [notif, setNotif] = useState<string | null>(null);

  // Parsed coordinates for map rendering
  const parsedLat = parseFloat(geoLat) || -6.175392;
  const parsedLng = parseFloat(geoLng) || 106.827153;

  const triggerNotification = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  // Handle adding new employee
  const handleAddNewEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      alert("Nama Lengkap dan email wajib diisi!");
      return;
    }

    // Auto-generate employee code if empty
    let codeToUse = newCode.trim();
    if (!codeToUse) {
      const nextNum = employees.length + 1;
      codeToUse = `K${nextNum.toString().padStart(3, '0')}`;
    }

    onAddEmployee(newName.trim(), newDept, codeToUse, newEmail.trim());
    setNewName('');
    setNewCode('');
    setNewEmail('');
    triggerNotification(`Karyawan "${newName}" berhasil ditambahkan ke database!`);
  };

  // Handle updates to geofence configurations
  const handleUpdateGeofenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(geoLat);
    const lng = parseFloat(geoLng);
    const rad = parseInt(geoRadius);
    const allow = parseFloat(geoAllowance);

    if (isNaN(lat) || isNaN(lng) || isNaN(rad) || isNaN(allow)) {
      alert('Semua bidang parameter geofence harus berupa angka valid!');
      return;
    }

    onUpdateGeofence({
      officeName: geoName.trim() || 'Pusat Kantor',
      latitude: lat,
      longitude: lng,
      radius: rad,
      mealAllowance: allow,
    });

    triggerNotification('Parameter geofence dan besaran uang makan berhasil diperbarui!');
  };

  // Calculate stats
  const totalEmployees = employees.length;
  
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayAttendanceCount = attendanceRecords.filter((rec) => rec.date === todayDateStr).length;

  const totalDisbursedAllowance = attendanceRecords.reduce(
    (acc, val) => acc + val.amountSpent,
    0
  );

  // Group allowances per employee for aggregate payroll summary
  const payrollSummary = employees.map((emp) => {
    const records = attendanceRecords.filter((rec) => rec.employeeId === emp.id);
    const occurrencesCount = records.length;
    const totalEarnings = records.reduce((acc, val) => acc + val.amountSpent, 0);
    return {
      id: emp.id,
      name: emp.name,
      code: emp.employeeCode,
      department: emp.department,
      attendanceCount: occurrencesCount,
      totalEarnings: totalEarnings,
    };
  });

  // Filter logs based on search query
  const filteredRecords = attendanceRecords.filter((rec) => {
    return (
      rec.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.date.includes(searchQuery)
    );
  });

  return (
    <div id="admin-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-base leading-tight">Dashboard Admin & HR</h3>
            <p className="text-[11px] text-slate-500 font-sans tracking-wide">Konsol Kendali Rekapitulasi & Parameter Keamanan</p>
          </div>
        </div>

        {/* Local Admin Tab Bar Navigation */}
        <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-250 shrink-0 self-start sm:self-auto select-none">
          <button
            onClick={() => setActiveSubTab('rekap')}
            className={`py-1.5 px-3 text-xs font-sans font-semibold rounded-lg transition-all ${
              activeSubTab === 'rekap'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Rekap & Payroll
          </button>
          <button
            onClick={() => setActiveSubTab('geofence')}
            className={`py-1.5 px-3 text-xs font-sans font-semibold rounded-lg transition-all ${
              activeSubTab === 'geofence'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Geofence & Rp
          </button>
          <button
            onClick={() => setActiveSubTab('karyawan')}
            className={`py-1.5 px-3 text-xs font-sans font-semibold rounded-lg transition-all ${
              activeSubTab === 'karyawan'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Database Staf
          </button>
        </div>
      </div>

      {/* Success Notification Toaster */}
      {notif && (
        <div className="bg-emerald-500 text-white rounded-xl px-4 py-3 text-xs font-sans font-medium flex items-center gap-2 shadow animate-fade-in select-none">
          <CheckCircle className="w-4 h-4 text-emerald-100 shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {/* 4 Bento Cards - Performance Highlighters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-semibold tracking-wider text-slate-400 block uppercase">Total Karyawan</span>
            <span className="text-xl font-sans font-extrabold text-slate-800">{totalEmployees} orang</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-500 border border-slate-200">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04] border border-emerald-150 rounded-xl p-4 flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-semibold tracking-wider text-emerald-600 block uppercase">Absen Hari ini</span>
            <span className="text-xl font-sans font-extrabold text-emerald-800">{todayAttendanceCount} check-in</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-indigo-500/[0.02] hover:bg-indigo-500/[0.04] border border-indigo-150 rounded-xl p-4 flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-semibold tracking-wider text-indigo-600 block uppercase">Total Disbursed</span>
            <span className="text-xl font-sans font-extrabold text-indigo-800">{formatRupiah(totalDisbursedAllowance)}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/************** SUB-TAB 1: REKAP & PAYROLL **************/
      activeSubTab === 'rekap' && (
        <div className="space-y-6">
          
          {/* Main Payroll Accumulator table per Employee */}
          <div className="space-y-3">
            <div className="flex items-center justify-between select-none">
              <h4 className="font-sans font-bold text-slate-700 text-xs uppercase tracking-wider">Arah Agregat Uang Makan Karyawan</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-100">Akumulatif Bulan Ini</span>
            </div>
            
            <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs bg-white text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-2.5 px-4 font-semibold">Kode</th>
                    <th className="py-2.5 px-4 font-semibold">Nama Karyawan</th>
                    <th className="py-2.5 px-4 font-semibold">Departemen</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Masuk Hari Kerja</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Uang Makan Akumulasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {payrollSummary.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{row.code}</td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-800">{row.name}</td>
                      <td className="py-3 px-4 font-sans text-slate-500">{row.department}</td>
                      <td className="py-3 px-4 font-sans text-center">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                          {row.attendanceCount} Hari
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-right font-black text-rose-600">
                        {formatRupiah(row.totalEarnings)}
                      </td>
                    </tr>
                  ))}
                  {payrollSummary.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 font-sans text-center text-slate-400 bg-slate-50/50">
                        Belum ada data karyawan terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Attendance Records logs sheet */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
              <span className="font-sans font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-500" /> Log Histori Absensi Geofence Terperinci
              </span>

              {/* Attendance searching and control actions */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Cari nama karyawan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-sans text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const confirmClear = window.confirm('Apakah Anda yakin ingin menghapus seluruh log absen? Tindakan ini tidak dapat dibatalkan.');
                    if (confirmClear) {
                      onClearRecords();
                      triggerNotification('Semua log data absensi berhasil dibersihkan!');
                    }
                  }}
                  className="py-1.5 px-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-sans transition-all flex items-center gap-1 cursor-pointer"
                  title="Reset Semua Absensi"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>

            {/* Logs Audit Sheets */}
            <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs bg-white text-xs">
              <div className="overflow-x-auto max-h-[280px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest static top-0">
                      <th className="py-2 px-3">Tanggal & Waktu</th>
                      <th className="py-2 px-3">Karyawan</th>
                      <th className="py-2 px-3 text-center">Jarak Meter</th>
                      <th className="py-2 px-3 text-center">Metode Pengujian</th>
                      <th className="py-2 px-3 text-center">Integritas</th>
                      <th className="py-2 px-3 text-right">Uang Makan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                    {filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {rec.date} {rec.time}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-800">
                          {rec.employeeName}
                        </td>
                        <td className="py-2 px-3 font-sans text-center font-semibold">
                          {rec.distance} m
                        </td>
                        <td className="py-2 px-3 font-mono text-center text-[10px]">
                          {rec.method === 'GPS_REAL' ? (
                            <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-sans font-semibold">🛰️ GPS Asli</span>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-sans font-semibold">💻 Simulasi</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-sans font-bold inline-flex items-center gap-0.5 text-[9px]">
                            APPROVED
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-right font-bold text-slate-800">
                          {formatRupiah(rec.amountSpent)}
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 font-sans text-center text-slate-400 bg-slate-50/50">
                          {searchQuery ? 'Tidak ada kecocokan log absen ditemukan.' : 'Belum ada riwayat check-in yang tercatat.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}


      {/************** SUB-TAB 2: GEOFENCE & RP SETTINGS **************/
      activeSubTab === 'geofence' && (
        <form onSubmit={handleUpdateGeofenceSubmit} className="space-y-4 animate-fade-in">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-start gap-3">
            <Settings className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-sans font-bold text-indigo-900 text-sm">Pengaturan Lokasi Kantor</h4>
              <p className="text-xs text-indigo-700/80 mt-0.5 leading-relaxed">
                Tentukan koordinat GPS geografis kantor, radius toleransi tangkapan wifi/gps, serta nominal uang makan harian yang menjadi hak karyawan jika check-in valid.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-sans font-bold uppercase text-slate-500">Nama Lokasi / Kantor</label>
              <input
                type="text"
                value={geoName}
                onChange={(e) => setGeoName(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-sans focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-sans font-bold uppercase text-slate-500">Uang Makan Harian (IDR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold font-sans">Rp</span>
                <input
                  type="number"
                  value={geoAllowance}
                  onChange={(e) => setGeoAllowance(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-sans font-bold uppercase text-slate-500">Latitude Pusat Kantor</label>
              <input
                type="text"
                value={geoLat}
                onChange={(e) => setGeoLat(e.target.value)}
                required
                placeholder="-6.175392"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-sans font-bold uppercase text-slate-500">Longitude Pusat Kantor</label>
              <input
                type="text"
                value={geoLng}
                onChange={(e) => setGeoLng(e.target.value)}
                required
                placeholder="106.827153"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Google Maps Selection Section replaced with Free Leaflet Map */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-sans font-bold uppercase text-slate-500 flex items-center gap-1.5">
                <span>🗺️ Titik Lokasi Kantor (Pilih Lewat Peta Interaktif)</span>
              </label>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner relative select-none">
                <div className="h-[290px] w-full bg-slate-100 relative">
                  <LeafletMap 
                    latitude={parsedLat}
                    longitude={parsedLng}
                    onLocationChange={(lat, lng) => {
                      setGeoLat(lat.toString());
                      setGeoLng(lng.toString());
                    }}
                    officeName={geoName}
                    radius={parseInt(geoRadius) || 100}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[11px] font-sans font-bold uppercase text-slate-500">Radius Toleransi Geofence (Meter)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={geoRadius}
                  onChange={(e) => setGeoRadius(e.target.value)}
                  className="w-full select-none cursor-pointer"
                />
                <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs font-mono font-bold shrink-0 text-indigo-700 min-w-16 text-center">
                  {geoRadius} m
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Radius standar geofence perkantoran disarankan antara 50m - 150m untuk mengantisipasi ketidakteraturan sinyal GPS pegunungan/dalam gedung.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-xs shadow-sm cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5"
          >
            Simpan & Terapkan Perubahan
          </button>
        </form>
      )}


      {/************** SUB-TAB 3: DATABASE KARYAWAN **************/
      activeSubTab === 'karyawan' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Quick form add karyawan */}
          <form onSubmit={handleAddNewEmployeeSubmit} className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3">
            <h4 className="font-sans font-bold text-slate-800 text-xs flex items-center gap-1 select-none">
              <Plus className="w-4 h-4 text-emerald-600" /> Daftarkan Karyawan Baru
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1 col-span-1">
                <label className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="e.g. Raditya Pramana"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1 col-span-1">
                <label className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Email Kerja (Untuk Login)</label>
                <input
                  type="email"
                  placeholder="e.g. raditya@corp.com"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1 col-span-1 font-sans">
                <label className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Departemen</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none cursor-pointer"
                >
                  <option value="IT Support">IT Support</option>
                  <option value="Finance & HR">Finance & HR</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Software Engineering">Software Engineering</option>
                </select>
              </div>

              <div className="space-y-1 col-span-1">
                <label className="block text-[9px] font-sans font-bold text-slate-400 uppercase">Kode Staf (Opsional)</label>
                <input
                  type="text"
                  placeholder="e.g. K006 (Kosongkan = otomatis)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-1.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Simpan Anggota
            </button>
          </form>

          {/* List of Karyawan */}
          <div className="space-y-2">
            <h4 className="font-sans font-bold text-slate-700 text-xs uppercase tracking-wider select-none">Manajemen Anggota Database ({employees.length})</h4>
            <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs bg-white text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-2.5 px-4">ID / Kode Staf</th>
                    <th className="py-2.5 px-4">Nama & Email Terdaftar</th>
                    <th className="py-2.5 px-4">Departemen</th>
                    <th className="py-2.5 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{emp.employeeCode}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-800">
                        <div>
                          <span className="font-bold block text-slate-850">{emp.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{emp.email}</span>
                          {emp.bankName || emp.bankAccount ? (
                            <div className="text-[10px] font-sans text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded px-1.5 py-0.5 mt-1 inline-flex items-center gap-1">
                              <span>🏦 {emp.bankName || '-'}</span>
                              <span className="text-slate-400 text-[9px]">•</span>
                              <span className="font-mono">{emp.bankAccount || '-'}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic block mt-0.5">(Rekening belum diisi)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-500">{emp.department}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus "${emp.name}"? Ini juga akan menghapus kaitannya pada rujukan absensi.`);
                            if (confirmDelete) {
                              onRemoveEmployee(emp.id);
                              triggerNotification(`Karyawan "${emp.name}" dihapus dari database.`);
                            }
                          }}
                          className="p-1 px-2 border border-slate-250 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-[11px] font-sans transition-all inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center font-sans text-slate-450 bg-slate-50/50">
                        Belum ada karyawan. Tambahkan di atas untuk memulai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
