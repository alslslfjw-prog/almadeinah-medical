import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Clock, ChevronDown, Phone,
  Stethoscope, User, Activity, Microscope, CheckCircle, X, LogIn
} from 'lucide-react';
import { getDoctors } from '../api/doctors';
import { getClinics } from '../api/clinics';
import { supabase } from '../lib/supabaseClient';   // only for scans & lab_tests_list (no hooks yet)
import useAuthStore from '../store/authStore';

// ── Lab packages list unchanged ──────────────────────────────────────────────
const LAB_PACKAGES = [
  "الفحص العام", "الفحص العام (رجال) بلس", "الفحص العام (نساء) بلس", "مقاومة الأنسولين",
  "تحاليل ما قبل الزواج للنساء", "تحاليل ما قبل الزواج للنساء بلس", "النظام الغذائي",
  "تحاليل هشاشة العظام", "تحاليل الروماتيزم", "تحاليل الغده الدرقيه", "تحاليل الغده الدرقيه بلس",
  "تحاليل فقر الدم", "تحاليل فقر الدم بلس", "تحاليل الجلد والشعر", "تحاليل غياب الدورة الشهرية",
  "وظائف الغده النخاميه", "تحاليل تعدد الاكياس", "تحاليل متابعة الحمل",
  "تحاليل مخاطر الاصابه بالجلطات", "تحاليل التسمم بالحديد", "تحاليل التخطيط للحمل",
  "تحاليل العقم للرجال+", "تحاليل للنساء عمر اكبر من 45", "تحاليل للرجال عمر اكبر من 45",
  "تحاليل مرضى السكر", "تحاليل مخاطر الامراض القلبية", "تحاليل دلالات الأورام",
  "تحاليل الأطفال", "تحاليل الأيض الشامل"
];

export default function AppointmentWidget({ preSelectedDoctor = null }) {
  const navigate = useNavigate();

  // ✅ Auth state from Zustand — used to gate the booking action
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState('clinics');
  const [primaryOptions, setPrimaryOptions] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [secondaryOptions, setSecondaryOptions] = useState([]);
  const [selectedPrimary, setSelectedPrimary] = useState('');
  const [labSelectionType, setLabSelectionType] = useState(null);
  const [selectedLabItems, setSelectedLabItems] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tabs = [
    { id: 'clinics', label: 'العيادات', icon: <Stethoscope size={18} />, table: 'clinics' },
    { id: 'doctors', label: 'الأطباء', icon: <User size={18} />, table: 'doctors' },
    { id: 'scans', label: 'المدينة سكان', icon: <Activity size={18} />, table: 'scans' },
    { id: 'lab', label: 'الفحوصات', icon: <Microscope size={18} />, table: 'lab_tests_list' },
  ];

  // ── schedule‑aware time helpers ─────────────────────────────────────────────
  const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  /** Greyed-out disabled placeholder */
  const SlotDisabled = ({ label }) => (
    <div className="w-full bg-gray-100 border border-dashed border-gray-300 text-gray-400 py-3.5 px-4 rounded-xl text-sm font-medium flex items-center gap-2 select-none cursor-not-allowed">
      <Clock size={15} className="shrink-0" />
      <span>{label}</span>
    </div>
  );

  const normalizeText = (text) => {
    if (!text) return "";
    return text.replace("عيادة", "").replace("قسم", "").replace(/ال/g, "")
      .replace(/[ةه]/g, "").replace(/[أإآ]/g, "ا").replace(/\s/g, "").trim();
  };

  // Pre-selected doctor (from DoctorDetails page)
  useEffect(() => {
    if (preSelectedDoctor) {
      setActiveTab('doctors');
      setSelectedPrimary(preSelectedDoctor.name);
      setSelectedDoctor(preSelectedDoctor);
    }
  }, [preSelectedDoctor]);

  // ── Fetch primary data when tab changes ────────────────────────────────────
  useEffect(() => {
    const fetchPrimaryData = async () => {
      setLoading(true);
      setPrimaryOptions([]);
      if (!preSelectedDoctor) {
        setSelectedPrimary('');
        setSelectedDoctor(null);
      }
      setSecondaryOptions([]);
      setSelectedLabItems([]);
      setLabSelectionType(null);
      setError('');

      try {
        if (activeTab === 'doctors') {
          // ✅ Use the API module instead of raw supabase
          const { data } = await getDoctors({ withClinic: false });
          setPrimaryOptions(data ?? []);

        } else if (activeTab === 'clinics') {
          const { data: clinicsData } = await getClinics();
          setPrimaryOptions(clinicsData ?? []);
          // Also preload all doctors for secondary filter
          const { data: docsData } = await getDoctors({ withClinic: false });
          setAllDoctors(docsData ?? []);

        } else {
          // scans & lab_tests_list — no dedicated API hook yet, use supabaseClient directly
          const table = tabs.find(t => t.id === activeTab)?.table;
          if (!table) return;
          const { data } = await supabase.from(table).select('name').order('id', { ascending: true });
          setPrimaryOptions(data ?? []);
        }
      } catch (err) {
        console.error("AppointmentWidget fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrimaryData();
  }, [activeTab, preSelectedDoctor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter doctors by clinic (client-side join)
  useEffect(() => {
    if (activeTab === 'clinics' && selectedPrimary && allDoctors.length > 0) {
      const clinicKey = normalizeText(selectedPrimary);
      const filtered = allDoctors.filter(doc => {
        if (!doc.category) return false;
        return normalizeText(doc.category).includes(clinicKey) ||
          clinicKey.includes(normalizeText(doc.category));
      });
      setSecondaryOptions(filtered);
    }
  }, [activeTab, selectedPrimary, allDoctors]);

  const handleDoctorChange = (docName) => {
    const source = activeTab === 'doctors' ? primaryOptions : secondaryOptions;
    const doc = source.find(d => d.name === docName) ?? null;
    setSelectedDoctor(doc);
    setTime('');
  };

  const handleAddSingleTest = (testName) => {
    if (!testName) return;
    setLabSelectionType('single');
    if (!selectedLabItems.includes(testName)) setSelectedLabItems(prev => [...prev, testName]);
  };

  const handleAddPackage = (packageName) => {
    if (!packageName) return;
    if (labSelectionType === 'single') {
      setLabSelectionType('package');
      setSelectedLabItems([packageName]);
    } else {
      setLabSelectionType('package');
      if (!selectedLabItems.includes(packageName)) setSelectedLabItems(prev => [...prev, packageName]);
    }
  };

  const removeLabItem = (item) => {
    const updated = selectedLabItems.filter(i => i !== item);
    setSelectedLabItems(updated);
    if (updated.length === 0) setLabSelectionType(null);
  };

  const renderTimeInput = () => {
    // ── Scans / Lab: native time input ───────────────────────────────────────
    if (activeTab === 'scans' || activeTab === 'lab') {
      return (
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition font-medium text-sm"
          style={{ direction: 'ltr' }}
        />
      );
    }

    // ── Doctors / Clinics: shift-based (single option per day) ───────────────
    if (!selectedDoctor) return <SlotDisabled label="اختر الطبيب أولاً" />;
    if (!date)           return <SlotDisabled label="اختر التاريخ أولاً" />;

    const selectedDay = DAY_NAMES[new Date(date).getDay()];
    const schedule    = selectedDoctor?.schedule;

    const renderSelect = (children) => (
      <div className="relative">
        <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none transition cursor-pointer font-medium text-xs md:text-sm"
        >
          {children}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
      </div>
    );

    // Doctor has a JSONB schedule — show the exact shift string for the selected day
    if (schedule && typeof schedule === 'object' && !Array.isArray(schedule)) {
      const shiftStr = schedule[selectedDay];
      if (!shiftStr) return <SlotDisabled label={`الطبيب في إجازة يوم ${selectedDay} ❌`} />;
      return renderSelect(
        <>
          <option value="">الوردية ليوم {selectedDay}...</option>
          <option value={shiftStr}>{shiftStr}</option>
        </>
      );
    }

    // Fallback: no schedule JSONB (legacy doctor row)
    return renderSelect(
      <>
        <option value="">اختر الفترة...</option>
        <option value="الفترة الصباحية">الفترة الصباحية</option>
        <option value="الفترة المسائية">الفترة المسائية</option>
      </>
    );
  };

  // ── Main booking handler ───────────────────────────────────────────────────
  const handleBookNow = () => {
    setError('');

    // ── Validation ──────────────────────────────────────────────────────────
    let finalSelection = selectedPrimary;
    if (activeTab === 'lab') {
      if (selectedLabItems.length === 0) {
        setError('يرجى اختيار فحص واحد على الأقل أو باقة');
        return;
      }
      finalSelection = selectedLabItems.join('، ');
    } else {
      if (!selectedPrimary) {
        const label = activeTab === 'doctors' ? 'طبيباً' : activeTab === 'scans' ? 'نوع الأشعة' : 'العيادة';
        setError(`يرجى اختيار ${label}`);
        return;
      }
    }
    if (activeTab === 'clinics' && !selectedDoctor && secondaryOptions.length > 0) {
      setError('يرجى اختيار الطبيب من القائمة');
      return;
    }
    if (!date) { setError('يرجى اختيار التاريخ'); return; }
    if (!time) { setError('يرجى اختيار الوقت'); return; }

    // ── ✅ Auth gate: unauthenticated users get redirected to login ──────────
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    // ── Navigate to checkout, passing booking data + user id ────────────────
    const bookingData = {
      type: activeTab,
      primarySelection: finalSelection,
      doctor: selectedDoctor,
      date,
      time,
      isPackage: labSelectionType === 'package',
      patientUserId: user?.id ?? null,   // forwarded as a convenience; Checkout also reads authStore
    };
    navigate('/checkout', { state: bookingData });
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[2rem] shadow-xl p-5 md:p-8 w-full border border-gray-100 relative" dir="rtl">

      {/* Tabs */}
      {!preSelectedDoctor && (
        <div className="relative mb-8">
          <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar snap-x touch-pan-x">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 snap-start flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm md:text-base transition-all duration-300 ${activeTab === tab.id
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 ring-2 ring-teal-100 ring-offset-2'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                  }`}
              >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Single-doctor mode header */}
      {preSelectedDoctor && (
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <Calendar size={18} className="text-teal-500" />
            حجز موعد مع د. {preSelectedDoctor.name}
          </h3>
        </div>
      )}

      {/* ✅ Auth nudge banner (shown when unauthenticated, non-blocking) */}
      {!isAuthenticated && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          <LogIn size={16} className="shrink-0 text-blue-500" />
          <span>
            يُنصح بـ{' '}
            <Link to="/login" className="font-bold underline hover:text-blue-900">تسجيل الدخول</Link>
            {' '}قبل الحجز لتتمكن من متابعة مواعيدك.
          </span>
        </div>
      )}

      {/* Form grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

        {/* ── Section 1: Primary Selection ─── */}
        {activeTab === 'lab' ? (
          <>
            <div className="md:col-span-3">
              <label className={`block font-bold mb-2 text-sm ${labSelectionType === 'package' ? 'text-gray-300' : 'text-gray-700'}`}>
                الفحوصات الفردية
              </label>
              <div className="relative">
                <select
                  disabled={loading}
                  value=""
                  onChange={(e) => handleAddSingleTest(e.target.value)}
                  className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition cursor-pointer font-medium text-sm ${labSelectionType === 'package' ? 'bg-gray-100 border-gray-100 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-teal-500'}`}
                >
                  <option value="">اختر فحصاً لإضافته...</option>
                  {!loading && primaryOptions.map((item, i) => (
                    <option key={i} value={item.name}>{item.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className={`block font-bold mb-2 text-sm ${labSelectionType === 'single' ? 'text-gray-300' : 'text-gray-700'}`}>
                باقات الفحوصات
              </label>
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => handleAddPackage(e.target.value)}
                  className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition cursor-pointer font-medium text-sm ${labSelectionType === 'single' ? 'bg-gray-100 border-gray-100 text-gray-400' : 'bg-teal-50 border-teal-100 text-teal-800 focus:ring-2 focus:ring-teal-500'}`}
                >
                  <option value="">اختر باقة لإضافتها...</option>
                  {LAB_PACKAGES.map((pkg, i) => (
                    <option key={i} value={pkg}>{pkg}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
          </>
        ) : (
          <div className={activeTab === 'clinics' ? 'md:col-span-3' : 'md:col-span-4'}>
            <label className="block text-gray-700 font-bold mb-2 text-sm">
              {activeTab === 'doctors' ? 'الطبيب المختار' : activeTab === 'clinics' ? 'اختر العيادة' : 'اختر نوع الأشعة'}
            </label>
            <div className="relative">
              <select
                disabled={loading || !!preSelectedDoctor}
                value={selectedPrimary}
                onChange={(e) => {
                  setSelectedPrimary(e.target.value);
                  if (activeTab === 'doctors') handleDoctorChange(e.target.value);
                }}
                className={`w-full border text-gray-700 py-3.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none transition cursor-pointer font-medium text-sm ${preSelectedDoctor ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
              >
                <option value="">{loading ? 'جاري التحميل...' : 'اختر من القائمة...'}</option>
                {!loading && primaryOptions.map((item, i) => {
                  const val = item.name ?? item.title ?? item;
                  return <option key={i} value={val}>{val}</option>;
                })}
              </select>
              {!preSelectedDoctor && <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />}
            </div>
          </div>
        )}

        {/* ── Section 2: Secondary Doctor (clinics tab) ─── */}
        {activeTab === 'clinics' && (
          <div className="md:col-span-3">
            <label className="block text-gray-700 font-bold mb-2 text-sm">اختر الطبيب</label>
            <div className="relative">
              <select
                disabled={!selectedPrimary || secondaryOptions.length === 0}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none transition cursor-pointer font-medium disabled:opacity-50 text-sm"
              >
                <option value="">
                  {!selectedPrimary ? 'اختر العيادة أولاً' :
                    secondaryOptions.length === 0 ? 'لا يوجد أطباء متاحين' : 'اختر الطبيب...'}
                </option>
                {secondaryOptions.map((doc, i) => (
                  <option key={i} value={doc.name}>{doc.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>
        )}

        {/* ── Section 3: Date & Time ─── */}
        <div className={activeTab === 'clinics' || activeTab === 'lab' ? 'md:col-span-2' : 'md:col-span-3'}>
          <label className="block text-gray-700 font-bold mb-2 text-sm">التاريخ</label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={date}
            onChange={(e) => { setDate(e.target.value); setTime(''); }}
            className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition font-medium text-sm"
          />
        </div>

        <div className={activeTab === 'clinics' || activeTab === 'lab' ? 'md:col-span-2' : 'md:col-span-3'}>
          <label className="block text-gray-700 font-bold mb-2 text-sm">الوقت</label>
          {renderTimeInput()}
        </div>

        {/* ── Section 4: Submit ─── */}
        <div className="md:col-span-2">
          <button
            onClick={handleBookNow}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-200 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            <span>احجز الآن</span>
          </button>
        </div>

        {/* ── Section 5: Lab selected tags ─── */}
        {activeTab === 'lab' && selectedLabItems.length > 0 && (
          <div className="col-span-12 mt-2 pt-2 border-t border-gray-50">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold text-gray-400 ml-2 py-1">الخيارات المحددة:</span>
              {selectedLabItems.map((item, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border animate-fadeIn ${labSelectionType === 'package'
                      ? 'bg-teal-100 text-teal-700 border-teal-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                >
                  {item}
                  <button onClick={() => removeLabItem(item)} className="hover:bg-black/10 rounded-full p-0.5 transition">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => { setSelectedLabItems([]); setLabSelectionType(null); }}
                className="text-xs text-red-500 underline mr-2"
              >
                مسح الكل
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg font-bold flex items-center gap-2">
          <CheckCircle size={16} className="rotate-45" />
          {error}
        </div>
      )}

      {/* Footer (hidden in single-doctor mode) */}
      {!preSelectedDoctor && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm text-gray-500 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            فريق الدعم متاح الان
          </div>
          <div className="flex items-center gap-4" dir="ltr">
            <span className="flex items-center gap-1"><Clock size={14} /> 24/7 متاح</span>
            <span className="flex items-center gap-1 text-teal-600 font-bold"><Phone size={14} /> 777552666</span>
          </div>
        </div>
      )}
    </div>
  );
}