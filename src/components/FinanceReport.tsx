import { useState } from 'react';
import { 
  History, 
  Coins, 
  Download, 
  Search, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Printer, 
  ArrowLeft, 
  Check, 
  FileSpreadsheet,
  UserCheck
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils';

interface FinanceReportProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  onBackToPortal: () => void;
}

export default function FinanceReport({
  employees,
  attendanceRecords,
  onBackToPortal,
}: FinanceReportProps) {
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Weekly selection state: default to current week number
  const getCurrentWeekNumber = () => {
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const [selectedWeek, setSelectedWeek] = useState<number>(getCurrentWeekNumber());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [disbursementStatus, setDisbursementStatus] = useState<Record<string, 'PAID' | 'UNPAID'>>(() => {
    return JSON.parse(localStorage.getItem('finance_weekly_payouts') || '{}');
  });

  const getWeekRange = (week: number, year: number) => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const ISOweekEnd = new Date(ISOweekStart);
    ISOweekEnd.setDate(ISOweekStart.getDate() + 4); // Mon to Fri
    return {
      start: ISOweekStart.toISOString().split('T')[0],
      end: ISOweekEnd.toISOString().split('T')[0]
    };
  };

  const { start: weekStart, end: weekEnd } = getWeekRange(selectedWeek, selectedYear);

  // Filter attendance records falling within selected week range and status is APPROVED
  const isDateWithinRange = (dateStr: string, startStr: string, endStr: string) => {
    return dateStr >= startStr && dateStr <= endStr;
  };

  const weeklyApprovedRecords = attendanceRecords.filter(rec => 
    rec.status === 'APPROVED' && 
    isDateWithinRange(rec.date, weekStart, weekEnd)
  );

  // Aggregate stats per employee for the selected week
  const employeeWeeklySummary = employees.map(emp => {
    const records = weeklyApprovedRecords.filter(rec => rec.employeeId === emp.id);
    const daysAttended = records.map(r => r.date);
    // Find unique days to prevent double check-ins on same day inflating budget
    const uniqueDaysAttended = Array.from(new Set(daysAttended));
    const workdaysCheckedIn = uniqueDaysAttended.length;
    const totalWageAllowance = workdaysCheckedIn * 25000; // Rp 25.000 sehari

    const payoutKey = `${selectedYear}-W${selectedWeek}-${emp.id}`;
    const status = disbursementStatus[payoutKey] || 'UNPAID';

    return {
      ...emp,
      workdaysCheckedIn,
      totalWageAllowance,
      checkedInDates: uniqueDaysAttended,
      status,
      payoutKey,
    };
  }).filter(row => {
    if (!searchQuery) return true;
    return (
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Financial aggregates
  const grandTotalAllowance = employeeWeeklySummary.reduce((sum, row) => sum + row.totalWageAllowance, 0);
  const totalCheckedInDaysAll = employeeWeeklySummary.reduce((sum, row) => sum + row.workdaysCheckedIn, 0);
  const paidCount = employeeWeeklySummary.filter(row => row.status === 'PAID' && row.workdaysCheckedIn > 0).length;
  const unpaidCount = employeeWeeklySummary.filter(row => row.status === 'UNPAID' && row.workdaysCheckedIn > 0).length;

  // Toggle paid status
  const handleTogglePayment = (payoutKey: string) => {
    const current = disbursementStatus[payoutKey] || 'UNPAID';
    const nextStatus = current === 'UNPAID' ? 'PAID' as const : 'UNPAID' as const;
    const updated = {
      ...disbursementStatus,
      [payoutKey]: nextStatus
    };
    setDisbursementStatus(updated);
    localStorage.setItem('finance_weekly_payouts', JSON.stringify(updated));
  };

  const handleMarkAllPaid = () => {
    const updated = { ...disbursementStatus };
    employeeWeeklySummary.forEach(row => {
      if (row.workdaysCheckedIn > 0) {
        updated[row.payoutKey] = 'PAID';
      }
    });
    setDisbursementStatus(updated);
    localStorage.setItem('finance_weekly_payouts', JSON.stringify(updated));
  };

  // Export report simulation in CSV format
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "REKAPITULASI UANG MAKAN MINGGUAN FINANCE\r\n";
    csvContent += `Periode Minggu ${selectedWeek} (${formatIndonesianDate(weekStart)} s/d ${formatIndonesianDate(weekEnd)})\r\n`;
    csvContent += "Kode Karyawan,Nama Karyawan,Departemen,Hari Kerja Valid (Check-in),Total Hak Uang Makan,Status Pembayaran\r\n";

    employeeWeeklySummary.forEach(row => {
      csvContent += `${row.employeeCode},${row.name},${row.department},${row.workdaysCheckedIn},${row.totalWageAllowance},${row.status === 'PAID' ? 'SUDAH DITRANSFER' : 'BELUM DITRANSFER'}\r\n`;
    });

    csvContent += `,,,Total Penerima Uang Makan: ${employeeWeeklySummary.filter(r => r.workdaysCheckedIn > 0).length} Orang,,Total Pengeluaran: ${grandTotalAllowance}\r\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Keuangan_Mingguan_W${selectedWeek}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="finance-portal-root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Finance Header */}
      <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToPortal}
              className="p-2 hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-slate-300"
              title="Kembali ke portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Departemen Keuangan (Finance)
              </span>
              <h1 className="font-sans font-black text-lg tracking-tight mt-1 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" /> Lap. Uang Makan Hari Jumat <span className="font-mono text-slate-500 text-xs">/ Week {selectedWeek}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 font-sans text-xs">
            {/* Week Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="bg-transparent border-none text-slate-200 font-bold px-2 py-1 select-none focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num} className="bg-slate-900 text-slate-200">
                    Minggu {num}
                  </option>
                ))}
              </select>
              <span className="text-slate-600">|</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent border-none text-slate-350 px-2 py-1 font-mono focus:outline-none cursor-pointer"
              >
                <option value={2026} className="bg-slate-900">2026</option>
                <option value={2025} className="bg-slate-900">2025</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Finance Content wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Helper info on جمعه (Fridays) Disbursement */}
        <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-amber-400 text-sm flex items-center gap-2">
              📅 Periode Penyaluran Mingguan (Setiap Hari Jumat)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-3xl">
              Sesuai dengan kebijakan perusahaan, absensi dilakukan secara harian, namun pembayaran uang makan harian senilai <strong className="text-amber-400">Rp 25.000,- per hari kerja</strong> tetap diakumulasikan dan dicarikan kepada karyawan pada hari <strong>Jumat sore</strong>. Laporan ini merinci akumulasi kehadiran selama hari kerja (Senin s/d Jumat).
            </p>
            <div className="text-[10px] text-slate-400 font-mono pt-1">
              RENTANG MINGGU INDEKS {selectedWeek}: <span className="text-amber-300 font-semibold">{formatIndonesianDate(weekStart)}</span> s/d <span className="text-amber-300 font-semibold">{formatIndonesianDate(weekEnd)}</span>
            </div>
          </div>

          <div className="flex bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl gap-4 items-center shrink-0 w-full md:w-auto">
            <Coins className="w-8 h-8 text-amber-400 shrink-0" />
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider">TOTAL UANG PERLU DIBAYAR</span>
              <strong className="text-amber-400 text-lg font-black block font-sans">{formatRupiah(grandTotalAllowance)}</strong>
              <span className="text-[9px] text-slate-300 font-mono">Dilihat dari {totalCheckedInDaysAll} total mandays absensi</span>
            </div>
          </div>
        </div>

        {/* Quick KPI stats blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-mono">Penerima Uang Makan</span>
              <strong className="text-lg font-extrabold text-slate-100 font-sans">
                {employeeWeeklySummary.filter(r => r.workdaysCheckedIn > 0).length} Orang
              </strong>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 text-xs">
              M
            </div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-emerald-500 block uppercase font-mono">Pembayaran Selesai</span>
              <strong className="text-lg font-extrabold text-emerald-400 font-sans">
                {paidCount} Orang
              </strong>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-amber-500 block uppercase font-mono">Tertunda (Belum Dibayar)</span>
              <strong className="text-lg font-extrabold text-amber-400 font-sans">
                {unpaidCount} Orang
              </strong>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-950 border border-amber-900 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-mono">Rata-rata Kehadiran</span>
              <strong className="text-lg font-extrabold text-slate-100 font-sans">
                {employeeWeeklySummary.length > 0 
                  ? (totalCheckedInDaysAll / employeeWeeklySummary.length).toFixed(1) 
                  : 0} Hari / orang
              </strong>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 text-xs">
              %
            </div>
          </div>
        </div>

        {/* Main interactive reporting console */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none border-b border-slate-850 pb-4">
            <div className="space-y-0.5">
              <h3 className="font-sans font-bold text-slate-200 text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Lembar Evaluasi Payroll & Transfer Keuangan
              </h3>
              <p className="text-[10px] text-slate-500">Tandai pembayaran atau ekspor rekap ke orang keuangan pusat.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-sans text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 sm:w-44"
                />
              </div>

              {/* Mark all paid */}
              {unpaidCount > 0 && (
                <button
                  onClick={handleMarkAllPaid}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-sans font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Bayar Semua
                </button>
              )}

              {/* Export button */}
              <button
                onClick={handleExportCSV}
                className="py-1.5 px-3 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-sans transition-all flex items-center gap-1 cursor-pointer"
                title="Ekspor Rekap CSV"
              >
                <Download className="w-3.5 h-3.5" /> Ekspor Keuangan
              </button>

              <button
                onClick={handlePrint}
                className="py-1.5 px-3 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-sans transition-all flex items-center gap-1 cursor-pointer"
                title="Cetak Laporan Penyaluran"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950 text-xs">
            <table className="w-full text-left border-collapse" id="finance-print-area">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-4 font-semibold">Kode</th>
                  <th className="py-3 px-4 font-semibold">Nama Karyawan</th>
                  <th className="py-3 px-4 font-semibold">Departemen</th>
                  <th className="py-3 px-4 text-center font-semibold">Total Masuk GEOFENCE (Senin-Jumat)</th>
                  <th className="py-3 px-4 text-right font-semibold">Uang Saku Dilunasi (Mingguan)</th>
                  <th className="py-3 px-4 text-center font-semibold">Tindakan Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {employeeWeeklySummary.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/40 transition-all font-sans">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-400">{row.employeeCode}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-200 block">{row.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">{row.email}</span>
                        {row.bankName || row.bankAccount ? (
                          <div className="text-[10px] font-sans text-amber-500 bg-amber-950/40 border border-amber-900/40 rounded px-1.5 py-0.5 mt-1 inline-flex items-center gap-1">
                            <span>🏦 {row.bankName || '-'}</span>
                            <span className="text-slate-600 text-[9px]">•</span>
                            <span className="font-mono">{row.bankAccount || '-'}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-500 italic block mt-0.5">(Rekening belum diisi)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{row.department}</td>
                    <td className="py-3.5 px-4 text-center">
                      {row.workdaysCheckedIn > 0 ? (
                        <span className="bg-emerald-950/60 text-emerald-400 px-2.5 py-1 rounded font-mono font-bold border border-emerald-900">
                          {row.workdaysCheckedIn} Hari Kerja
                        </span>
                      ) : (
                        <span className="bg-slate-900 text-slate-600 px-2.5 py-1 rounded font-mono border border-slate-850">
                          0 Hari Kerja
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-400 font-mono">
                      {formatRupiah(row.totalWageAllowance)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.workdaysCheckedIn > 0 ? (
                        <button
                          onClick={() => handleTogglePayment(row.payoutKey)}
                          className={`py-1 px-3 rounded-full text-[10px] font-sans font-bold cursor-pointer transition-all border outline-none ${
                            row.status === 'PAID'
                              ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
                              : 'bg-amber-950/40 border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500'
                          }`}
                        >
                          {row.status === 'PAID' ? '✓ SUDAH DITRANSFER' : '⏳ TANDAI DITRANSFER'}
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px] font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {employeeWeeklySummary.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 font-sans text-center text-slate-500 bg-slate-900/10">
                      {searchQuery ? 'Tidak ada kecocokan data karyawan ditemukan.' : 'Tidak ada database karyawan terdaftar.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Trail Note */}
          <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400 font-sans">
            <p className="font-bold text-slate-300">Catatan Audit Keuangan:</p>
            <p>1. Rekapan di atas dihitung murni dari log check-in yang berstempel <strong>🔒 APPROVED (LOKASI GEOFENCE DI DALAM KANTOR)</strong>.</p>
            <p>2. Sensor anti-cheating memblokir setiap check-in di luar radius kantor sehingga mencegah pengisian data palsu oleh karyawan dari rumah.</p>
            <p>3. Nominal subsidi makan harian diatur senilai Rp 25.000 per orang per hari kerja.</p>
          </div>

        </div>

      </main>

    </div>
  );
}
