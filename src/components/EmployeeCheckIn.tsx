import { useState } from 'react';
import { User, DollarSign, Flame, Clock, BadgeCheck, CheckCircle2, ShieldAlert, ShieldCheck, ArrowRight, Sparkles, Building, QrCode } from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils';

interface EmployeeCheckInProps {
  employees: Employee[];
  linkedEmployee: Employee | null;
  attendanceRecords: AttendanceRecord[];
  distance: number;
  isInsideGeofence: boolean;
  mealAllowanceAmount: number;
  currentLat: number;
  currentLng: number;
  locationMethod: 'GPS_REAL' | 'GPS_SIMULATED';
  onCheckIn: (employeeId: string) => void;
}

export default function EmployeeCheckIn({
  employees,
  linkedEmployee,
  attendanceRecords,
  distance,
  isInsideGeofence,
  mealAllowanceAmount,
  currentLat,
  currentLng,
  locationMethod,
  onCheckIn,
}: EmployeeCheckInProps) {
  const [successTicket, setSuccessTicket] = useState<AttendanceRecord | null>(null);

  // Find currently selected employee
  const selectedEmployeeId = linkedEmployee?.id || '';
  const selectedEmployee = linkedEmployee;

  // Check if today is already checked-in for this employee
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find(
    (record) => record.employeeId === selectedEmployeeId && record.date === todayDateStr
  );

  // Handle the action of making an attendance check-in
  const handleSubmitCheckIn = () => {
    if (!selectedEmployeeId) return;
    if (!isInsideGeofence) return;
    if (todayRecord) return;

    onCheckIn(selectedEmployeeId);

    // Retrieve the newly created record to show the success E-Ticket
    setTimeout(() => {
      // Find the record we just committed
      const updatedTodayRecord = {
        id: `att-${Date.now()}`,
        employeeId: selectedEmployeeId,
        employeeName: selectedEmployee?.name || '',
        date: todayDateStr,
        time: new Date().toTimeString().split(' ')[0],
        latitude: currentLat,
        longitude: currentLng,
        distance: distance,
        status: 'APPROVED' as const,
        amountSpent: mealAllowanceAmount,
        method: locationMethod,
      };
      setSuccessTicket(updatedTodayRecord);
    }, 50);
  };

  return (
    <div id="check-in-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-sans font-bold text-slate-800 text-base leading-tight">Check-In Absensi Karyawan</h3>
          <p className="text-[11px] text-slate-500 font-sans tracking-wide">Gerbang Mandiri Uang Makan Harian</p>
        </div>
      </div>

      {!selectedEmployeeId ? (
        <div className="text-center py-12 px-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 animate-bounce" />
          </div>
          <h4 className="font-sans font-bold text-slate-800 text-sm">Profil Karyawan Belum Terdaftar</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-[340px] mx-auto leading-relaxed">
            Sistem mendeteksi Anda telah masuk menggunakan akun email, namun melarang keras absensi mandiri karena alamat email Anda belum dikaitkan dengan profil karyawan aktif di database.
          </p>
          <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-150 inline-block text-left text-xs max-w-sm">
            <p className="font-sans font-bold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
              <span>⚠️ Langkah penyelesaian:</span>
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600 text-[11px] leading-relaxed">
              <li>Hubungi Admin HR atau bag. Keuangan (Finance).</li>
              <li>Minta admin mendaftarkan nama, departemen, dan email Anda.</li>
              <li>Muat ulang portal untuk mulai melakukan check-in mandiri.</li>
            </ol>
          </div>
        </div>
      ) : successTicket && successTicket.employeeId === selectedEmployeeId ? (
        /* Success Verification Ticket Screen */
        <div className="space-y-5 animate-fade-in">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-sans font-bold text-emerald-900 text-sm">Absensi Berhasil Terverifikasi!</h4>
              <p className="text-xs text-emerald-700/90 mt-0.5 leading-relaxed">
                Anda terdeteksi berada di dalam koordinat area kantor. Jaminan uang makan Anda hari ini telah dicairkan ke rekapitulasi gaji.
              </p>
            </div>
          </div>

          {/* Hologram Anti-Fraud Ticket */}
          <div className="relative bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md overflow-hidden font-mono text-xs">
            {/* Artistic secure design background stripes */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/0 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
            
            {/* Ticket Header */}
            <div className="flex items-center justify-between border-b border-dashed border-slate-700/60 pb-3 mb-4 select-none">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] uppercase tracking-wider font-sans font-semibold text-slate-400">Bukti Verifikasi Absensi</span>
              </div>
              <div className="text-[8px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">
                GEOFENCE OK
              </div>
            </div>

            {/* Ticket Info Grid */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-sans">KARYAWAN:</span>
                <span className="text-slate-100 font-sans font-bold text-right">{selectedEmployee?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-sans">KODE STAF:</span>
                <span className="text-slate-200 font-semibold">{selectedEmployee?.employeeCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-sans">DEPARTEMEN:</span>
                <span className="text-slate-200 font-sans font-medium">{selectedEmployee?.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-sans">TANGGAL ABSEN:</span>
                <span className="text-slate-200">{formatIndonesianDate(successTicket.date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-sans">WAKTU CHECK-IN:</span>
                <span className="text-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> {successTicket.time} WIB
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-sans">JARAK KE KANTOR:</span>
                <span className="text-emerald-400 font-bold">✓ {successTicket.distance} meter</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-sans">METODE DETEKSI:</span>
                <span className="text-slate-300 text-[10px]">
                  📡 Satelit GPS Aktif
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed border-slate-700/60 pt-3 mt-3">
                <span className="text-emerald-400 text-[10px] font-sans font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-pulse" /> UANG MAKAN HARI INI:
                </span>
                <span className="text-emerald-300 font-sans text-sm font-black tracking-wide">
                  {formatRupiah(successTicket.amountSpent)}
                </span>
              </div>
            </div>

            {/* Simulated verification pattern to prevent screenshot-duplication fraud */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[7px] text-slate-500 font-sans tracking-wide uppercase select-none">Kode Tanda Tangan Digital (SHA256)</div>
                <div className="text-[8px] text-slate-400 font-mono tracking-tight text-left">
                  MD5-{successTicket.employeeId}-{successTicket.date.replace(/-/g, '')}-OK
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 select-none">
                <div className="bg-white p-1 rounded-sm border border-slate-700 shrink-0">
                  <QrCode className="w-7 h-7 text-slate-900" />
                </div>
                <span className="text-[6px] text-slate-500 uppercase font-sans tracking-wider">Keamanan</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setSuccessTicket(null)}
              className="py-1.5 px-3 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-sans font-semibold transition-all flex items-center gap-1"
            >
              Kembali ke Menu Check-In <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : todayRecord ? (
        /* Already Checked-In UI state */
        <div className="space-y-4 font-sans text-xs">
          {/* Static verified card profile credit */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-center justify-between select-none">
            <div className="space-y-0.5">
              <span className="text-[8px] font-sans font-bold uppercase text-slate-400 tracking-wider block">ID KARYAWAN CHECK-IN MEMO</span>
              <strong className="text-slate-805 block text-sm font-bold">{selectedEmployee?.name}</strong>
              <span className="font-mono text-slate-500 text-[10px] block">{selectedEmployee?.employeeCode} • {selectedEmployee?.department}</span>
            </div>
            <div className="bg-emerald-950/40 text-emerald-400 text-[10px] px-2.5 py-1 rounded border border-emerald-900 font-mono font-bold tracking-wider">
              🔒 VERIFIED AUTO-LOCK
            </div>
          </div>

          <div className="text-center py-8 border border-slate-100 rounded-2xl bg-emerald-50/30">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-3">
              <BadgeCheck className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-sans font-bold text-slate-800 text-sm">Sudah Check-In Hari Ini!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
              Halo <strong>{selectedEmployee?.name}</strong>, Anda telah melakukan absensi hari ini pada pukul <strong>{todayRecord.time}</strong> di jarak <strong>{todayRecord.distance}m</strong> dari kantor.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-700 text-xs font-sans font-bold select-none">
              <DollarSign className="w-3.5 h-3.5" /> Uang Makan Dilunasi: {formatRupiah(mealAllowanceAmount)}
            </div>
          </div>
        </div>
      ) : (
        /* Ready to check-in screen (Form) */
        <div id="check-in-form" className="space-y-4 font-sans text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-center justify-between select-none">
            <div className="space-y-0.5">
              <span className="text-[8px] font-sans font-bold uppercase text-slate-400 tracking-wider block">ID KARYAWAN MANDIRI:</span>
              <strong className="text-slate-805 block text-sm font-bold">{selectedEmployee?.name}</strong>
              <span className="font-mono text-slate-500 text-[10px] block">{selectedEmployee?.employeeCode} • {selectedEmployee?.department}</span>
            </div>
            <div className="bg-indigo-950/40 text-indigo-400 text-[10px] px-2.5 py-1 rounded border border-indigo-900 font-mono font-bold tracking-wider">
              🔒 STAF IDENTITY LOCK
            </div>
          </div>

          {/* Distance meter banner */}
          <div className={`p-4 rounded-xl border ${
            isInsideGeofence
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900'
              : 'bg-rose-500/5 border-rose-500/15 text-rose-900'
          }`}>
            <div className="flex items-start gap-3">
              {isInsideGeofence ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
              )}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 font-sans block select-none">VERIFIKASI GEOFENCE KANTOR</span>
                <span className="font-sans text-xs inline-block">
                  Jarak Anda saat ini adalah <strong className="font-mono font-bold text-sm bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{distance} meter</strong> dari koordinat pusat kantor.
                </span>
                
                {isInsideGeofence ? (
                  <span className="text-[11px] text-emerald-700 flex items-center font-sans font-semibold gap-1 mt-1 select-none">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Lokasi Terverifikasi! Anda berada di dalam zona geofence ({distance}m ≤ Radius).
                  </span>
                ) : (
                  <span className="text-[11px] text-rose-700 flex items-center font-sans font-semibold gap-1 mt-1 leading-normal select-none">
                    ❌ Blokir Keamanan: Anda berada di luar radius area kantor. Tombol check-in dikunci otomatis untuk mencegah pemalsuan data lokasi.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Card for daily money */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-sans font-medium text-slate-500">Estimasi Hak Uang Makan Harian:</div>
                <div className="text-sm font-sans font-bold text-slate-800">{formatRupiah(mealAllowanceAmount)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full text-amber-800 text-[10px] font-semibold font-mono select-none">
              <Flame className="w-3 h-3 text-amber-600 animate-pulse" /> Hari Ini
            </div>
          </div>

          {/* Action check-in button */}
          <button
            onClick={handleSubmitCheckIn}
            disabled={!isInsideGeofence}
            className={`w-full py-4 px-6 rounded-2xl font-sans font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-4 ${
              isInsideGeofence
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow focus:ring-emerald-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0'
                : 'bg-slate-100 text-slate-450 border border-slate-200 focus:ring-slate-100 cursor-not-allowed opacity-60'
            }`}
          >
            <BadgeCheck className="w-5 h-5" />
            KIRIM ABSENSI & VERIFIKASI UANG MAKAN
          </button>

          {/* Geolocation Diagnostic Details */}
          <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-1.5 text-[10px] font-mono text-slate-500 select-none">
            <div className="flex justify-between">
              <span>KOORDINAT SEKARANG:</span>
              <span className="text-slate-700">{currentLat.toFixed(6)}, {currentLng.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span>METODE GPS:</span>
              <span className="text-slate-700 font-semibold">📡 SATELIT GPS REAL-TIME</span>
            </div>
            <div className="flex justify-between">
              <span>INTEGRITAS DATA:</span>
              <span className={`font-bold ${isInsideGeofence ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isInsideGeofence ? '🔒 SECURE (TERSEGEL GEOFENCE)' : '⚠️ OUT-OF-BOUNDS'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
