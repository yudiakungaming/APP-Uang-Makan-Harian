import { useState, useEffect, FormEvent } from 'react';
import {
  MapPin,
  Building,
  User,
  Sliders,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Cpu,
  Tv,
  Users,
  Utensils,
  BookOpen,
  LogOut,
  Chrome,
  KeyRound,
  Info
} from 'lucide-react';

import RadarMap from './components/RadarMap';
import EmployeeCheckIn from './components/EmployeeCheckIn';
import AdminDashboard from './components/AdminDashboard';
import FinanceReport from './components/FinanceReport';

import { Employee, AttendanceRecord, GeofenceSettings } from './types';
import {
  calculateDistance,
  formatRupiah,
  formatIndonesianDate,
  INITIAL_EMPLOYEES,
  DEFAULT_GEOFENCE,
} from './utils';

// Firebase core configuration
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

interface SimulatedUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'employee' | 'admin';
  employeeId?: string;
}

export default function App() {
  // --- Loading States ---
  const [dbLoading, setDbLoading] = useState(true);

  // --- Core Domain Entity States ---
  const [geofenceSettings, setGeofenceSettings] = useState<GeofenceSettings>(DEFAULT_GEOFENCE);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // --- Auth state ---
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<SimulatedUser | null>(() => {
    const cached = localStorage.getItem('antiforge_simulated_user');
    return cached ? JSON.parse(cached) : null;
  });

  // --- email-password login/register view states ---
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regDept, setRegDept] = useState('Teknologi Informasi');
  const [regBankName, setRegBankName] = useState('Bank Mandiri');
  const [regBankAccount, setRegBankAccount] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authActionLoading, setAuthActionLoading] = useState(false);

  // --- Router hash state ---
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '#/');

  // --- GPS Tracking Coordinate states ---
  const [currentLat, setCurrentLat] = useState(() => DEFAULT_GEOFENCE.latitude);
  const [currentLng, setCurrentLng] = useState(() => DEFAULT_GEOFENCE.longitude);
  const [locationMethod, setLocationMethod] = useState<'GPS_REAL' | 'GPS_SIMULATED'>('GPS_REAL');

  // --- Clock text ---
  const [currentTimeCode, setCurrentTimeCode] = useState(() => new Date().toLocaleTimeString('id-ID'));

  // --- Hash Listener ---
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- Auth observer ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setFirebaseUser(usr);
    });
    return unsubscribe;
  }, []);

  // Save/clean simulated cache
  useEffect(() => {
    if (simulatedUser) {
      localStorage.setItem('antiforge_simulated_user', JSON.stringify(simulatedUser));
    } else {
      localStorage.removeItem('antiforge_simulated_user');
    }
  }, [simulatedUser]);

  // --- Computed Active Authenticated User state ---
  const activeUser = firebaseUser ? {
    uid: firebaseUser.uid,
    displayName: employees.find(emp => emp.email.toLowerCase() === firebaseUser.email?.toLowerCase())?.name || firebaseUser.displayName || 'Karyawan Aktif',
    email: firebaseUser.email || '',
    isDemo: !!simulatedUser
  } : (simulatedUser ? {
    uid: simulatedUser.uid,
    displayName: simulatedUser.displayName,
    email: simulatedUser.email,
    isDemo: true
  } : null);

  // --- Role verification checks ---
  const isAdminUser = !!(activeUser && (
    activeUser.email === 'yudiakungaming@gmail.com' || 
    (activeUser.isDemo && simulatedUser?.role === 'admin')
  ));

  const matchedEmployee = activeUser ? employees.find(
    emp => emp.email.toLowerCase() === activeUser.email.toLowerCase()
  ) : null;

  // --- Firestore Real-time listeners & Database Seeding ---
  useEffect(() => {
    // If no active user, do not attach listeners to prevent permissions errors
    if (!activeUser) {
      setDbLoading(false);
      return;
    }

    setDbLoading(true);

    // 1. Listen to geofence settings document
    const geofenceRef = doc(db, 'settings', 'geofence');
    const unsubGeofence = onSnapshot(geofenceRef, (snapshot) => {
      if (snapshot.exists()) {
        setGeofenceSettings(snapshot.data() as GeofenceSettings);
      } else {
        // Seed if missing
        setDoc(geofenceRef, DEFAULT_GEOFENCE).catch(err => 
          handleFirestoreError(err, OperationType.CREATE, 'settings/geofence')
        );
      }
    }, (err) => {
      console.warn("Geofence settings fetch error: ", err);
    });

    // 2. Listen to employees collection
    const employeesCol = collection(db, 'employees');
    const unsubEmployees = onSnapshot(employeesCol, async (snapshot) => {
      if (snapshot.empty) {
        // Core Auto-seeding: write standard list when missing
        try {
          for (const emp of INITIAL_EMPLOYEES) {
            await setDoc(doc(db, 'employees', emp.id), emp);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'employees/initial-seeding');
        }
      } else {
        const list: Employee[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Employee);
        });
        setEmployees(list);
      }
    }, (err) => {
      console.warn("Employees fetch error: ", err);
    });

    // 3. Listen to attendance records collection
    const recordsCol = collection(db, 'attendanceRecords');
    const unsubRecords = onSnapshot(recordsCol, (snapshot) => {
      const records: AttendanceRecord[] = [];
      snapshot.forEach(docSnap => {
        records.push(docSnap.data() as AttendanceRecord);
      });
      // Sort newest first
      records.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
      setAttendanceRecords(records);
      setDbLoading(false);
    }, (err) => {
      console.warn("Attendance records fetch error: ", err);
      setDbLoading(false);
    });

    return () => {
      unsubGeofence();
      unsubEmployees();
      unsubRecords();
    };
  }, [activeUser?.uid]);

  // Sync clock ticker
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTimeCode(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // --- Auto GPS Tracking Real-Time Background Listener ---
  useEffect(() => {
    if (!activeUser) return;

    let watchId: number | null = null;

    if (navigator.geolocation) {
      // 1. Fetch immediately
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLat(position.coords.latitude);
          setCurrentLng(position.coords.longitude);
          setLocationMethod('GPS_REAL');
        },
        (err) => {
          console.warn("Initial background GPS lookup blocked or errored:", err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      // 2. Start streaming live updates
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLat(position.coords.latitude);
          setCurrentLng(position.coords.longitude);
          setLocationMethod('GPS_REAL');
        },
        (err) => {
          console.warn("Background GPS watch stream error:", err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      );
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeUser?.uid]);

  // --- Distance Calculations ---
  const distance = calculateDistance(
    geofenceSettings.latitude,
    geofenceSettings.longitude,
    currentLat,
    currentLng
  );

  const isInsideGeofence = distance <= geofenceSettings.radius;

  // --- Mutational Event Handlers via Firestore ---

  const handleLocationChange = (lat: number, lng: number, method: 'GPS_REAL' | 'GPS_SIMULATED') => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setLocationMethod(method);
  };

  const handleAddEmployee = async (name: string, department: string, code: string, email: string) => {
    const id = `emp-${Date.now()}`;
    const newEmp: Employee = { id, name, department, employeeCode: code, email };
    try {
      await setDoc(doc(db, 'employees', id), newEmp);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `employees/${id}`);
    }
  };

  const handleRemoveEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
    }
  };

  const handleUpdateGeofence = async (newSettings: GeofenceSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'geofence'), newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/geofence');
    }
  };

  const handleClearRecords = async () => {
    try {
      const colRef = collection(db, 'attendanceRecords');
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'attendanceRecords');
    }
  };

  const handleCheckInCommit = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !activeUser) return;

    const todayDateStr = new Date().toISOString().split('T')[0];
    const recordId = `att-${Date.now()}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      employeeId,
      employeeName: employee.name,
      employeeEmail: activeUser.email,
      date: todayDateStr,
      time: new Date().toTimeString().split(' ')[0],
      latitude: currentLat,
      longitude: currentLng,
      distance: distance,
      status: 'APPROVED',
      amountSpent: geofenceSettings.mealAllowance,
      method: locationMethod,
    };

    try {
      await setDoc(doc(db, 'attendanceRecords', recordId), newRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `attendanceRecords/${recordId}`);
    }
  };

  // --- Auth Actions ---

  const handleEmailPasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!loginEmail || !loginPassword) {
      setAuthError('Silakan masukkan email dan kata sandi Anda.');
      return;
    }
    setAuthActionLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      setAuthSuccess('Berhasil masuk!');
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      console.error('Login error:', err);
      let errMsg = 'Gagal masuk. Silakan periksa kembali email dan kata sandi Anda.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'Email atau kata sandi tidak valid. Silakan coba lagi.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Format alamat email tidak valid.';
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = 'Terlalu banyak percobaan masuk yang gagal. Silakan coba beberapa saat lagi.';
      }
      setAuthError(errMsg);
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleEmailPasswordRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    
    if (!regName.trim()) {
      setAuthError('Nama Lengkap wajib diisi.');
      return;
    }
    if (!regEmail.trim()) {
      setAuthError('Alamat Email wajib diisi.');
      return;
    }
    if (!regCode.trim()) {
      setAuthError('Nomor Induk Pegawai (NIK) wajib diisi.');
      return;
    }
    if (regCode.trim().length > 25) {
      setAuthError('Nomor Induk Pegawai (NIK) maksimal 25 karakter.');
      return;
    }
    if (!regBankName.trim()) {
      setAuthError('Nama Bank wajib diisi.');
      return;
    }
    if (!regBankAccount.trim()) {
      setAuthError('Nomor Rekening wajib diisi.');
      return;
    }
    if (!regPassword) {
      setAuthError('Kata sandi wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setAuthActionLoading(true);
    try {
      // 1. Create firebase auth user
      await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      
      // 2. Create the associated employee metadata document in Firestore
      const id = `emp-${Date.now()}`;
      const newEmp: Employee = { 
        id, 
        name: regName.trim(), 
        department: regDept, 
        employeeCode: regCode.trim(), 
        email: regEmail.trim().toLowerCase(),
        bankName: regBankName.trim(),
        bankAccount: regBankAccount.trim()
      };
      
      await setDoc(doc(db, 'employees', id), newEmp);
      
      setAuthSuccess('Pendaftaran berhasil! Akun Pegawai Anda telah terdaftar dan Anda otomatis masuk.');
      setRegName('');
      setRegEmail('');
      setRegCode('');
      setRegBankName('Bank Mandiri');
      setRegBankAccount('');
      setRegPassword('');
      setRegConfirmPassword('');
      setAuthMode('LOGIN');
    } catch (err: any) {
      console.error('Registration error:', err);
      let errMsg = 'Gagal mendaftar. Silakan coba lagi.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Alamat email tersebut sudah terdaftar digunakan oleh akun lain.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Format alamat email tidak valid.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      }
      setAuthError(errMsg);
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Core Google Auth Popup blocked or aborted: ', err);
      if (err && err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setAuthError(
          `Firebase Error: Domain "${domain}" belum di-authorized di Firebase Console Anda. Sebagai Admin, silakan masuk ke Firebase Console -> Authentication -> Settings -> Authorized Domains, lalu tambahkan domain "${domain}" tersebut agar Google Sign-In dapat berjalan.`
        );
      } else {
        setAuthError(
          'Sign-In Google diinterupsi atau diblokir. Pastikan browser Anda mengizinkan pop-up, atau gunakan pilihan masuk lainnya.'
        );
      }
    }
  };

  const handleDemoLogin = async (emp: Employee, role: 'employee' | 'admin') => {
    setAuthError(null);
    setAuthSuccess(null);
    setAuthActionLoading(true);
    const demoPassword = 'Password123!';
    try {
      // First try signing in
      await signInWithEmailAndPassword(auth, emp.email.trim(), demoPassword);
      setSimulatedUser({
        uid: auth.currentUser?.uid || `demo-uid-${emp.id}`,
        email: emp.email,
        displayName: emp.name,
        role,
        employeeId: emp.id
      });
    } catch (err: any) {
      console.warn('Demo login failed, attempting auto-registration: ', err);
      // If user does not exist or invalid credential, register the demo user
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, emp.email.trim(), demoPassword);
          // Make sure they exist in the employees list too
          await setDoc(doc(db, 'employees', emp.id), emp);
          
          setSimulatedUser({
            uid: cred.user.uid,
            email: emp.email,
            displayName: emp.name,
            role,
            employeeId: emp.id
          });
        } catch (regErr: any) {
          console.error('Auto registration for demo user failed: ', regErr);
          // Ultimate fallback (local-only state)
          setSimulatedUser({
            uid: `demo-uid-${emp.id}`,
            email: emp.email,
            displayName: emp.name,
            role,
            employeeId: emp.id
          });
        }
      } else {
        setSimulatedUser({
          uid: `demo-uid-${emp.id}`,
          email: emp.email,
          displayName: emp.name,
          role,
          employeeId: emp.id
        });
      }
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setSimulatedUser(null);
    await signOut(auth);
    window.location.hash = '#/';
  };

  // --- RENDER 1: DB Loading Screen ---
  if (dbLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center animate-pulse shadow-md shadow-emerald-500/20">
            <Utensils className="w-6 h-6 text-slate-900" />
          </div>
          <h2 className="font-extrabold text-lg tracking-tight">Koneksi Database Firestore</h2>
          <p className="text-xs text-slate-400 max-w-xs text-center leading-relaxed">
            Menghubungkan ke server awan Google Firestore dan memverifikasi sertifikat ruleset. Silakan tunggu...
          </p>
          <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div className="w-1/2 h-full bg-emerald-400 animate-infinite-loading" />
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 2: Unified Login Gateway (if not authenticated) ---
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-x-hidden">
        
        {/* Subtle decorative background assets */}
        <div className="fixed top-0 right-0 w-[45rem] h-[45rem] bg-gradient-to-br from-emerald-500/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[30rem] h-[30rem] bg-gradient-to-tr from-indigo-500/5 to-transparent blur-[100px] rounded-full pointer-events-none" />

        <header className="max-w-7xl w-full mx-auto p-5 flex items-center justify-between select-none shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
              <Utensils className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-sm tracking-tight">AntiForge Absensi™</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
            PORTAL KEAMANAN
          </div>
        </header>

        {/* Central Auth Interface box */}
        <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10 shrink-0">
          <div className="max-w-md w-full bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-md shadow-2xl space-y-6">
            
            {/* View Title Router */}
            {authMode === 'LOGIN' ? (
              <div className="text-center space-y-2 select-none">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest font-mono">
                  Mandiri & Terverifikasi
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">Portal Presensi Pegawai</h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Silakan masuk menggunakan Akun Google atau Email &amp; Kata Sandi Anda.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2 select-none">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/35 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest font-mono">
                  Pendaftaran Pegawai Baru
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">Daftar Akun Pegawai</h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Lengkapi data diri serta rincian rekening bank Anda untuk sinkronisasi payroll uang makan otomatis.
                </p>
              </div>
            )}

            {/* Alert Panel */}
            {authError && (
              <div className="bg-rose-950/40 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-normal">{authError}</p>
              </div>
            )}
            {authSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-normal">{authSuccess}</p>
              </div>
            )}

            {/* View Form Router */}
            {authMode === 'LOGIN' ? (
              /* LOGIN FORM */
              <div className="space-y-6">
                <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        @
                      </span>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="contoh@perusahaan.com"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-4 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <KeyRound className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-4 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authActionLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                  >
                    {authActionLoading ? 'Memproses Masuk...' : 'Masuk Sekarang'}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <hr className="flex-1 border-slate-800/80" />
                  <span className="text-[9px] text-slate-600 font-mono block uppercase select-none">Atau masuk dengan</span>
                  <hr className="flex-1 border-slate-800/80" />
                </div>

                {/* Google Sign In Option */}
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-sans font-bold flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <Chrome className="w-4 h-4 text-slate-800 shrink-0" />
                    Hubungkan Akun Google
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                      Belum memiliki akun?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('REGISTER'); setAuthError(null); setAuthSuccess(null); }}
                        className="text-emerald-400 hover:text-emerald-355 font-bold hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Daftar disini jika belum memiliki akun
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* REGISTER FORM WITH IDENTITY DETAILS */
              <div className="space-y-6 animate-fade-in">
                <form onSubmit={handleEmailPasswordRegister} className="space-y-4">
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                      Nama Lengkap Pegawai
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Nama Lengkap Identitas Pegawai"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-4 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                        Nomor Induk Pegawai (NIK)
                      </label>
                      <input
                        type="text"
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        placeholder="Kode Pegawai / NIK"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                        Divisi / Departemen
                      </label>
                      <select
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs font-sans text-slate-300 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="Teknologi Informasi">Teknologi Informasi</option>
                        <option value="Sumber Daya Manusia (HRD)">Sumber Daya Manusia</option>
                        <option value="Keuangan &amp; Akuntansi">Keuangan &amp; Akuntansi</option>
                        <option value="Marketing &amp; Sales">Marketing &amp; Sales</option>
                        <option value="Operasional Lapangan">Operasional Lapangan</option>
                        <option value="Logistik &amp; Supply Chain">Logistik &amp; Supply Chain</option>
                      </select>
                    </div>
                  </div>

                  {/* Bank Details section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                        Nama Bank
                      </label>
                      <select
                        value={regBankName}
                        onChange={(e) => setRegBankName(e.target.value)}
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs font-sans text-slate-300 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="Bank Mandiri">Bank Mandiri</option>
                        <option value="Bank BCA">Bank BCA</option>
                        <option value="Bank BRI">Bank BRI</option>
                        <option value="Bank BNI">Bank BNI</option>
                        <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                        <option value="Bank CIMB Niaga">Bank CIMB Niaga</option>
                        <option value="Bank Permata">Bank Permata</option>
                        <option value="Bank Danamon">Bank Danamon</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                        Nomor Rekening
                      </label>
                      <input
                        type="text"
                        value={regBankAccount}
                        onChange={(e) => setRegBankAccount(e.target.value)}
                        placeholder="Masukkan No. Rekening"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                      Alamat Email Kantor
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        @
                      </span>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="email.pegawai@perusahaan.com"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-4 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                        Kata Sandi
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 Karakter"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-sans font-bold uppercase text-slate-400 tracking-wider">
                        Konfirmasi Sandi
                      </label>
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Ulangi Sandi"
                        disabled={authActionLoading}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs font-sans text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authActionLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
                  >
                    {authActionLoading ? 'Memproses Pendaftaran...' : 'Daftar Pegawai Sekarang'}
                  </button>
                </form>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                    Sudah memiliki akun?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('LOGIN'); setAuthError(null); setAuthSuccess(null); }}
                      className="text-indigo-400 hover:text-indigo-350 font-bold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Masuk di Sini
                    </button>
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Login Footer */}
        <footer className="py-6 mt-6 border-t border-slate-900 shrink-0 text-center text-xs text-slate-500 font-sans">
          <p>© {new Date().getFullYear()} Absensi Anti-Fraud — Terintegrasi Firebase Database & PWA.</p>
        </footer>

      </div>
    );
  }

  // --- RENDER 3: FINANCE REPORT SCREEN (Dedicated router link #/finance) ---
  if (currentHash === '#/finance') {
    if (!isAdminUser) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full text-center space-y-4 bg-slate-950 border border-rose-500/20 p-8 rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-rose-950 flex items-center justify-center text-rose-400 border border-rose-500/20 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-tight">AKSES LEVEL KEUANGAN DITOLAK</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Maaf, akun Anda ({activeUser?.email}) tidak memiliki otorisasi level Administrator atau Keuangan. Panel laporan rekap finansial ini dikunci ketat demi keamanan.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => { window.location.hash = '#/'; }}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-sans font-bold cursor-pointer transition-all border border-slate-800"
              >
                Kembali ke Portal Karyawan
              </button>
              <button 
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:underline font-semibold"
              >
                Keluar & Cari Akun Lain
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <FinanceReport 
        employees={employees}
        attendanceRecords={attendanceRecords}
        onBackToPortal={() => { window.location.hash = '#/'; }}
      />
    );
  }

  // --- RENDER 4: ADMIN DASHBOARD (Routed link #/admin) ---
  if (currentHash === '#/admin') {
    if (!isAdminUser) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full text-center space-y-4 bg-slate-950 border border-rose-500/20 p-8 rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-rose-950 flex items-center justify-center text-rose-400 border border-rose-500/20 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-tight">AKSES LEVEL ADMIN DITOLAK</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Maaf, akun Anda ({activeUser.email}) tidak memiliki otorisasi level Administrator. Panel konsol data karyawan & pengaturan koordinat geofence ini dikunci ketat demi keamanan.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => { window.location.hash = '#/'; }}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-sans font-bold cursor-pointer transition-all border border-slate-800"
              >
                Kembali ke Portal Karyawan
              </button>
              <button 
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:underline font-semibold"
              >
                Keluar & Cari Akun Lain
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
        
        {/* Admin Header navigation */}
        <header className="bg-indigo-950 border-b border-indigo-900 text-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                <Sliders className="w-4.5 h-4.5" />
              </div>
              <div>
                <h1 className="font-sans font-black text-base tracking-tight leading-none">
                  KONSOL HR & ADMIN UTAMA
                </h1>
                <p className="text-[10px] text-indigo-300 font-sans font-medium mt-1 uppercase tracking-wider">
                  Log Kedatangan & Konsep Geofence Multi Devices
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 text-xs">
              <button 
                onClick={() => { window.location.hash = '#/finance'; }}
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl font-bold font-sans cursor-pointer transition-all flex items-center gap-1.5 border border-amber-400"
              >
                <Coins className="w-3.5 h-3.5" /> Portal Laporan Finance
              </button>

              <button 
                onClick={() => { window.location.hash = '#/'; }}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-indigo-200 rounded-xl font-semibold font-sans cursor-pointer transition-all flex items-center gap-1.5"
              >
                Portal Check-In Karyawan
              </button>

              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-indigo-900">
                <span className="text-[9px] text-slate-400 ml-1 block">{activeUser.displayName} (Admin)</span>
                <button onClick={handleLogout} className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded transition-all cursor-pointer">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Admin content stage */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          <AdminDashboard
            employees={employees}
            attendanceRecords={attendanceRecords}
            geofenceSettings={geofenceSettings}
            onAddEmployee={handleAddEmployee}
            onRemoveEmployee={handleRemoveEmployee}
            onUpdateGeofence={handleUpdateGeofence}
            onClearRecords={handleClearRecords}
          />
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 leading-normal">
          <p>© {new Date().getFullYear()} Aplikasi Absensi & Uang Makan — Konsol Kendali Terenskripsi.</p>
        </footer>

      </div>
    );
  }

  // --- RENDER 5: STANDARD EMPLOYEE PORTAL (Default routed link #/) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Upper Navigation/Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md select-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-sans font-black text-lg tracking-tight flex items-center gap-1.5 leading-none">
                AntiForge Absensi <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-black">Harian</span>
              </h1>
              <p className="text-[10px] text-slate-400/90 font-sans mt-1">Verifikasi Geofence GPS Presisi & Kalkulasi Uang Makan Saku</p>
            </div>
          </div>

          <div id="status-clock-strip" className="flex items-center flex-wrap gap-3 text-xs font-mono">
            {/* Realtime Live clock Indotech style */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold">{currentTimeCode}</span>
              <span className="text-slate-500 text-[10px]">WIB</span>
            </div>

            {/* Quick routed navigation options */}
            <div className="flex items-center gap-2 select-none">
              
              {/* If is admin, show a shortcuts to admin dash */}
              {isAdminUser && (
                <button
                  onClick={() => { window.location.hash = '#/admin'; }}
                  className="py-1.5 px-3 bg-indigo-950/80 border border-indigo-900 hover:bg-indigo-900 text-indigo-300 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer font-sans"
                  title="Masuk ke panel Admin"
                >
                  <Sliders className="w-3.5 h-3.5" /> Panel Admin
                </button>
              )}

              {/* Special link to Finance weekly report */}
              {isAdminUser && (
                <button
                  onClick={() => { window.location.hash = '#/finance'; }}
                  className="py-1.5 px-3 bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:text-white text-amber-400 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer font-sans"
                  title="Separated Link Rekap Uang Makan Mingguan"
                >
                  <Coins className="w-3.5 h-3.5 animate-pulse" /> Rekap Finance (Mingguan)
                </button>
              )}

              {/* Auth active state indicator */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-left font-sans flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="text-[10px]">
                  <span className="font-bold text-slate-300 block leading-tight truncate max-w-32">{activeUser.displayName}</span>
                  <span className="text-slate-500 text-[8px] font-mono block tracking-normal uppercase truncate max-w-32">
                    {activeUser.isDemo ? 'SIMULATOR DEMO' : 'GOOGLE GOV'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition-all ml-1 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </header>

      {/* Hero Banner Area (Integritas GPS penjelasan) */}
      <section className="bg-gradient-to-r from-emerald-900 to-slate-950 text-white py-6 px-4 shrink-0 shadow-inner select-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[30rem] h-full bg-gradient-to-br from-emerald-500/5 to-transparent blur-[80px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest font-mono">
              Protokol Lokasi Terenkripsi PWA
            </span>
            <h2 className="text-base sm:text-lg font-sans font-extrabold tracking-tight">Karantina Verifikasi Lokasi & Anti-Forge Absensi Pegawai</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Subsidi uang makan harian senilai <strong className="text-emerald-300">{formatRupiah(geofenceSettings.mealAllowance)}</strong> per hari hanya dilepaskan secara mandiri jika koordinat GPS HP Anda terverifikasi secara presisi berada di dalam <span className="bg-slate-950/40 text-emerald-300 px-1.5 py-0.2 rounded font-semibold">{geofenceSettings.radius} meter</span> dari pusat kantor. Rangkuman ini akan direkap otomatis per minggu untuk dicairkan oleh bagian <strong>Finance pada hari Jumat</strong>.
            </p>
          </div>

          <div className="flex bg-slate-950/40 border border-slate-800/80 backdrop-blur rounded-xl p-3.5 items-center gap-3 shrink-0 max-w-xs text-xs font-sans">
            <Building className="w-8 h-8 text-emerald-400 shrink-0 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-mono">PEMBERITAHUAN GEOFENCE KANTOR</span>
              <strong className="text-slate-100 font-bold block truncate max-w-44">{geofenceSettings.officeName}</strong>
              <span className="text-slate-400 text-[10px] font-mono">Radius: {geofenceSettings.radius}m • Subs: {formatRupiah(geofenceSettings.mealAllowance)}/Hari</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace Frame container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand Column: Double columns (For GPS Maps / Radar visualization) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Geofence Detector Map Radar */}
          <RadarMap
            officeLat={geofenceSettings.latitude}
            officeLng={geofenceSettings.longitude}
            geofenceRadius={geofenceSettings.radius}
            currentLat={currentLat}
            currentLng={currentLng}
            onLocationChange={handleLocationChange}
            locationMethod={locationMethod}
          />

          {/* Quick Informative Guide Accordion (Cara Kerja) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 px-6 select-none text-xs">
            <h4 className="font-sans font-bold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600 animate-pulse" /> Panduan Pembuktian Anti-Fraud
            </h4>
            
            <div className="space-y-3 font-sans text-slate-600 text-[11px] leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 text-[10px]">1</div>
                <p>
                  <strong>Identitas Terkunci Otomatis</strong>: Sesuai aturan keamanan absensi korporat mandiri, nama Anda otomatis terkunci ke email yang berhasil didaftarkan oleh Admin HRD.
                </p>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 text-[10px]">2</div>
                <p>
                  <strong>Masuk dalam Geofence</strong>: Radar digital mensimulasikan titik lokasi Anda pada dot biru. Lakukan simulasi dengan mengklik di dalam lingkaran radius hijau di radar, atau aktifkan GPS asli HP Anda.
                </p>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 text-[10px]">3</div>
                <p>
                  <strong>Check-in Mandiri Selesai</strong>: Ketika dot radar berstatus <strong className="text-emerald-600">✓ APPROVED</strong>, klik tombol Check-In. Sistem aman menerbitkan Tiket holografis bukti saku sah dan menyimpan record di cloud database Firestore.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Hand Column: Seven columns width (Portal Check-In OR Dashboard Admin HR) */}
        <div className="lg:col-span-7">
          
          <EmployeeCheckIn
            employees={employees}
            linkedEmployee={matchedEmployee}
            attendanceRecords={attendanceRecords}
            distance={distance}
            isInsideGeofence={isInsideGeofence}
            mealAllowanceAmount={geofenceSettings.mealAllowance}
            currentLat={currentLat}
            currentLng={currentLng}
            locationMethod={locationMethod}
            onCheckIn={handleCheckInCommit}
          />

        </div>

      </main>

      {/* Compact aesthetic footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 select-none shrink-0 text-center text-xs text-slate-400 leading-normal">
        <p className="font-sans font-medium">© {new Date().getFullYear()} Aplikasi Absensi & Uang Makan Harian — Keamanan Geofence Terenkripsi.</p>
        <p className="font-mono text-[10px] text-slate-450 mt-1 uppercase tracking-widest">
          SYSTEM ACTIVE • PWA STANDALONE GEOFENCE READY • SECURE FIRESTORE ENGINE
        </p>
      </footer>

    </div>
  );
}
