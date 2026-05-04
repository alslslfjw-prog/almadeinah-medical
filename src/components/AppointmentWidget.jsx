import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Clock, ChevronDown, ChevronRight, Phone,
  Stethoscope, User, Activity, Microscope, CheckCircle, X, LogIn
} from 'lucide-react';
import { getDoctors } from '../api/doctors';
import { getDoctorSlotsForDate } from '../api/doctorSchedules';
import { getClinics } from '../api/clinics';
import { getScanCategories, getScansByCategory, getLabCategories, getLabTestsByCategory } from '../api/scans';
import { supabase } from '../lib/supabaseClient';   // only for lab_tests_list
import useAuthStore from '../store/authStore';
import { useSiteSettings } from '../hooks/useSiteSettings';
import PhoneOtpModal from './PhoneOtpModal';
import { toLocalDateKey } from '../utils/doctorScheduleDates';
import { formatTimeArabic } from '../utils/dateFormatter';



export default function AppointmentWidget({ preSelectedDoctor = null, onBookingReady = null }) {
  const navigate = useNavigate();

  // ✅ Auth state from Zustand — used to gate the booking action
  const { user, isAuthenticated } = useAuthStore();
  const siteSettings = useSiteSettings();

  const [showOtpModal, setShowOtpModal] = useState(false);
  const pendingBookingRef = useRef(null);   // holds bookingData while patient authenticates

  const [activeTab, setActiveTab] = useState('clinics');
  const [primaryOptions, setPrimaryOptions] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [secondaryOptions, setSecondaryOptions] = useState([]);
  const [selectedPrimary, setSelectedPrimary] = useState('');
  const [labSelectionType, setLabSelectionType] = useState(null);
  const [selectedLabItems, setSelectedLabItems] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorTimeSlots, setDoctorTimeSlots] = useState([]);
  const [doctorSchedulesLoading, setDoctorSchedulesLoading] = useState(false);
  const [selectedDoctorSlot, setSelectedDoctorSlot] = useState(null);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItemPriceUSD, setSelectedItemPriceUSD] = useState(0);
  const [dbPackages, setDbPackages] = useState([]);  // fetched from medical_packages

  // ── Scans cascading dropdowns state ─────────────────────────────────────────
  const [scanCategories, setScanCategories]         = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [scansForCategory, setScansForCategory]     = useState([]);
  const [scansLoading, setScansLoading]             = useState(false);

  // ── Lab cascading dropdowns state ─────────────────────────────────────────
  const [labCategories, setLabCategories]           = useState([]);
  const [selectedLabCategory, setSelectedLabCategory] = useState(null);  // integer ID
  const [testsForLabCategory, setTestsForLabCategory] = useState([]);
  const [labCatLoading, setLabCatLoading]           = useState(false);

  const tabs = [
    { id: 'clinics', label: 'العيادات', icon: <Stethoscope size={18} />, table: 'clinics' },
    { id: 'doctors', label: 'الأطباء', icon: <User size={18} />, table: 'doctors' },
    { id: 'scans', label: 'المدينة سكان', icon: <Activity size={18} />, table: 'scans' },
    { id: 'lab', label: 'الفحوصات', icon: <Microscope size={18} />, table: 'medical_tests_guide' },
  ];

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

  // Fetch lab packages from DB once on mount
  useEffect(() => {
    supabase
      .from('medical_packages')
      .select('id, title, price')
      .order('id', { ascending: true })
      .then(({ data }) => setDbPackages(data ?? []));
  }, []);

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

        } else if (activeTab === 'lab') {
          // lab tab now handled by its own dedicated useEffects below
          // (no-op here — just reset state via the effect that fires on tab change)
        }
        // scans tab: handled by dedicated useEffects below
      } catch (err) {
        console.error("AppointmentWidget fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrimaryData();
  }, [activeTab, preSelectedDoctor]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load scan categories when scans tab becomes active ───────────────────────
  useEffect(() => {
    if (activeTab !== 'scans') return;
    setScanCategories([]);
    setSelectedCategoryId(null);
    setScansForCategory([]);
    setSelectedPrimary('');
    setSelectedItemPriceUSD(0);
    setLoading(true);
    getScanCategories()
      .then(({ data }) => setScanCategories(data ?? []))
      .finally(() => setLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load lab categories when lab tab becomes active ───────────────────────
  useEffect(() => {
    if (activeTab !== 'lab') return;
    setLabCategories([]);
    setSelectedLabCategory(null);
    setTestsForLabCategory([]);
    setSelectedLabItems([]);
    setLabSelectionType(null);
    setLoading(true);
    getLabCategories()
      .then(({ data }) => setLabCategories(data ?? []))
      .finally(() => setLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load tests for the chosen lab category (Dropdown B) ────────────────
  useEffect(() => {
    if (!selectedLabCategory) { setTestsForLabCategory([]); return; }
    setLabCatLoading(true);
    getLabTestsByCategory(selectedLabCategory)
      .then(({ data }) => setTestsForLabCategory(data ?? []))
      .finally(() => setLabCatLoading(false));
  }, [selectedLabCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load tests for the chosen category (Dropdown 2) ─────────────────────────
  useEffect(() => {
    if (!selectedCategoryId) {
      setScansForCategory([]);
      setSelectedPrimary('');
      setSelectedItemPriceUSD(0);
      return;
    }
    setScansLoading(true);
    setSelectedPrimary('');
    setSelectedItemPriceUSD(0);
    getScansByCategory(selectedCategoryId)
      .then(({ data }) => setScansForCategory(data ?? []))
      .finally(() => setScansLoading(false));
  }, [selectedCategoryId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSelectedItemPriceUSD(doc?.price ?? 0);
    setTime('');
    setSelectedDoctorSlot(null);
    setTimePopoverOpen(false);
  };

  useEffect(() => {
    const isDoctorBooking = activeTab === 'doctors' || activeTab === 'clinics';
    if (!isDoctorBooking || !selectedDoctor?.id || !date) {
      setDoctorTimeSlots([]);
      setSelectedDoctorSlot(null);
      setTimePopoverOpen(false);
      setDoctorSchedulesLoading(false);
      return;
    }

    let cancelled = false;
    setDoctorTimeSlots([]);
    setSelectedDoctorSlot(null);
    setDoctorSchedulesLoading(true);
    getDoctorSlotsForDate(selectedDoctor.id, date)
      .then(({ data, error }) => {
        if (cancelled) return;
        setDoctorTimeSlots(error ? [] : data ?? []);
      })
      .finally(() => {
        if (!cancelled) setDoctorSchedulesLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab, selectedDoctor?.id, date]);

  const handleScanTestChange = (scanName) => {
    setSelectedPrimary(scanName);
    const item = scansForCategory.find(s => s.name === scanName);
    setSelectedItemPriceUSD(item?.price ?? 0);
  };

  // Capture price when a scan is selected from the dropdown
  useEffect(() => {
    if (activeTab === 'scans') {
      const item = scansForCategory.find(o => o.name === selectedPrimary);
      setSelectedItemPriceUSD(item?.price ?? 0);
    }
  }, [selectedPrimary, activeTab, scansForCategory]);

  const handleAddSingleTest = (testName) => {
    if (!testName) return;
    setLabSelectionType('single');
    if (!selectedLabItems.includes(testName)) {
      setSelectedLabItems(prev => [...prev, testName]);
      // Price is now derived from the full selectedLabItems array — no scalar tracking needed
    }
  };


  const handleAddPackage = (packageName) => {
    if (!packageName) return;
    setLabSelectionType('package');
    setSelectedLabItems([packageName]);
    // Mutual exclusivity: clear lab cascade state
    setSelectedLabCategory(null);
    setTestsForLabCategory([]);
  };

  const removeLabItem = (item) => {
    const updated = selectedLabItems.filter(i => i !== item);
    setSelectedLabItems(updated);
    if (updated.length === 0) { setLabSelectionType(null); setSelectedItemPriceUSD(0); }
  };

  const formatSlotRange = (slot) =>
    `${formatTimeArabic(slot.start_time)} - ${formatTimeArabic(slot.end_time)}`;

  const groupSlotsByHour = (slots) => {
    const map = new Map();
    slots.forEach(slot => {
      const hour = parseInt(slot.start_time.split(':')[0], 10);
      if (!map.has(hour)) map.set(hour, []);
      map.get(hour).push(slot);
    });
    return map;
  };

  const renderTimeInput = () => {
    // ── Scans / Lab: native time input ──────────────────────────────────────
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

    // ── Doctors / Clinics: hour-tabbed slot picker ───────────────────────────
    if (!selectedDoctor) return <SlotDisabled label="اختر الطبيب أولاً" />;
    if (!date)           return <SlotDisabled label="اختر التاريخ أولاً" />;
    if (doctorSchedulesLoading) return <SlotDisabled label="جاري تحميل المواعيد المتاحة..." />;
    if (doctorTimeSlots.length === 0) return <SlotDisabled label="لا توجد مواعيد متاحة في هذا التاريخ" />;

    const slotsByHour = groupSlotsByHour(doctorTimeSlots);
    const hours = [...slotsByHour.keys()].sort((a, b) => a - b);
    const activeHour = selectedHour ?? hours[0];
    const slotsForHour = slotsByHour.get(activeHour) ?? [];

    return (
      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => {
            setTimePopoverOpen(open => !open);
            setSelectedHour(null); // reset to first hour each open
          }}
          className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition cursor-pointer font-medium text-xs md:text-sm text-right"
        >
          <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <span className={time ? 'text-gray-700' : 'text-gray-400'}>
            {time || 'اختر الموعد...'}
          </span>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        </button>

        {timePopoverOpen && (
          <div className="absolute z-[100] top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden">

            {/* ── STEP 1: Hours grid (no hour selected yet) ─────────────── */}
            {!selectedHour ? (
              <div className="time-picker-scroll time-picker-hours-scroll p-3 pb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">اختر الساعة</p>
                <div className="grid grid-cols-3 gap-2">
                  {hours.map(hour => {
                    const slotsInHour = slotsByHour.get(hour) ?? [];
                    const allBooked = slotsInHour.every(s => s.is_blocked || s.status !== 'available');
                    return (
                      <button
                        key={hour}
                        type="button"
                        disabled={allBooked}
                        onClick={() => setSelectedHour(hour)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition text-center ${
                          allBooked
                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white border-teal-100 text-teal-700 hover:bg-teal-500 hover:text-white hover:border-teal-500 hover:shadow-sm'
                        }`}
                      >
                        {formatTimeArabic(`${String(hour).padStart(2, '0')}:00:00`)}
                        <span className="block text-[9px] font-medium mt-0.5 opacity-60">
                          {slotsInHour.filter(s => !s.is_blocked && s.status === 'available').length} متاح
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (

              /* ── STEP 2: Slots for selected hour ──────────────────────── */
              <div>
                {/* Back header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedHour(null)}
                    className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                    aria-label="رجوع"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <span className="text-xs font-bold text-gray-700">
                    مواعيد الساعة {formatTimeArabic(`${String(selectedHour).padStart(2, '0')}:00:00`)}
                  </span>
                </div>

                {/* Slot grid */}
                <div className="time-picker-scroll time-picker-slots-scroll p-3 pb-4">
                  <div className="grid grid-cols-3 gap-2">
                    {slotsForHour.map(slot => {
                      const unavailable = slot.is_blocked || slot.status !== 'available';
                      const selected = selectedDoctorSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={unavailable}
                          onClick={() => {
                            setSelectedDoctorSlot(slot);
                            setTime(formatSlotRange(slot));
                            setTimePopoverOpen(false);
                            setError('');
                          }}
                          className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                            selected
                              ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-100'
                              : unavailable
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-white border-teal-100 text-teal-700 hover:bg-teal-50 hover:border-teal-200'
                          }`}
                        >
                          <span className="block">{formatTimeArabic(slot.start_time)}</span>
                          {unavailable && (
                            <span className="block text-[10px] font-medium mt-0.5">
                              {slot.status === 'booked' ? 'محجوز' : 'غير متاح'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Derived YER price — shown in badge and forwarded to Checkout
  const priceYER = (() => {
    const rate = siteSettings?.usd_to_yer_rate ?? 0;
    if (!rate) return 0;
    // Multi-test tab: sum prices of ALL selected individual tests dynamically
    if (activeTab === 'lab' && labSelectionType === 'single') {
      const totalUSD = selectedLabItems.reduce((sum, name) => {
        const item = primaryOptions.find(o => o.name === name);
        return sum + (Number(item?.price) || 0);
      }, 0);
      return totalUSD > 0 ? Math.round(totalUSD * rate) : 0;
    }
    // Package tab: single-selection — direct lookup of the one selected package
    if (activeTab === 'lab' && labSelectionType === 'package') {
      const pkg = dbPackages.find(p => p.title === selectedLabItems[0]);
      const priceUSD = Number(pkg?.price) || 0;
      return priceUSD > 0 ? Math.round(priceUSD * rate) : 0;
    }
    // Doctors / Scans / Clinics — single scalar state
    return selectedItemPriceUSD > 0 ? Math.round(selectedItemPriceUSD * rate) : 0;
  })();

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
    } else if (activeTab === 'scans') {
      if (!selectedCategoryId) { setError('يرجى اختيار نوع الأشعة'); return; }
      if (!selectedPrimary)    { setError('يرجى اختيار الفحص المحدد'); return; }
    } else {
      if (!selectedPrimary) {
        const label = activeTab === 'doctors' ? 'طبيباً' : 'العيادة';
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
    if ((activeTab === 'doctors' || activeTab === 'clinics') && !selectedDoctorSlot) {
      setError('يرجى اختيار موعد متاح');
      return;
    }

    // ── Build booking data object ────────────────────────────────────────────
    const bookingData = {
      type:             activeTab,
      primarySelection: finalSelection,
      doctor:           selectedDoctor,
      date,
      time,
      doctorTimeSlotId: selectedDoctorSlot?.id ?? null,
      slotStart:        selectedDoctorSlot?.start_time ?? null,
      slotEnd:          selectedDoctorSlot?.end_time ?? null,
      isPackage:     labSelectionType === 'package',
      patientUserId: user?.id ?? null,
      priceUSD:      selectedItemPriceUSD,
      priceYER,
    };

    // ── onBookingReady: embedded mode (dashboard modal) ──────────────────────
    // When this prop is provided the caller handles navigation — no page redirect.
    if (onBookingReady) {
      onBookingReady(bookingData);
      return;
    }

    // ── Public mode: auth gate then navigate to /checkout ───────────────────
    if (!isAuthenticated) {
      // Store booking data and show inline OTP modal — no page reload
      pendingBookingRef.current = bookingData;
      setShowOtpModal(true);
      return;
    }
    navigate('/checkout', { state: bookingData });
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <>
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
            {/* ── Dropdown A: Lab Category ── */}
            <div className="md:col-span-2">
              <label className={`block font-bold mb-2 text-sm ${labSelectionType === 'package' ? 'text-gray-300' : 'text-gray-700'}`}>
                فئة الفحص
              </label>
              <div className="relative">
                <select
                  disabled={loading || labSelectionType === 'package'}
                  value={selectedLabCategory ?? ''}
                  onChange={(e) => { setSelectedLabCategory(e.target.value ? Number(e.target.value) : null); }}
                  className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition font-medium text-sm ${
                    labSelectionType === 'package'
                      ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-teal-500 cursor-pointer'
                  }`}
                >
                  <option value="">{loading ? 'جاري التحميل...' : 'اختر فئة الفحص...'}</option>
                  {!loading && labCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* ── Dropdown B: Specific Test (locked until category chosen) ── */}
            <div className="md:col-span-2">
              <label className={`block font-bold mb-2 text-sm ${
                labSelectionType === 'package' || !selectedLabCategory ? 'text-gray-400' : 'text-gray-700'
              }`}>
                الفحص المحدد
              </label>
              <div className="relative">
                <select
                  disabled={labSelectionType === 'package' || !selectedLabCategory || labCatLoading}
                  value=""
                  onChange={(e) => handleAddSingleTest(e.target.value)}
                  className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition font-medium text-sm ${
                    labSelectionType === 'package' || !selectedLabCategory
                      ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-teal-500 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {labCatLoading ? 'جارٍ التحميل...' : !selectedLabCategory ? 'اختر الفئة أولاً...' : 'أضف فحصاً...'}
                  </option>
                  {!labCatLoading && testsForLabCategory.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* ── Packages (disabled when a test is selected) ── */}
            <div className="md:col-span-2">
              <label className={`block font-bold mb-2 text-sm ${labSelectionType === 'single' ? 'text-gray-300' : 'text-gray-700'}`}>
                باقات الفحوصات
              </label>
              <div className="relative">
                <select
                  disabled={labSelectionType === 'single'}
                  value=""
                  onChange={(e) => handleAddPackage(e.target.value)}
                  className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition cursor-pointer font-medium text-sm ${labSelectionType === 'single' ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-teal-50 border-teal-100 text-teal-800 focus:ring-2 focus:ring-teal-500'}`}
                >
                  <option value="">اختر باقة لإضافتها...</option>
                  {dbPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.title}>{pkg.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
          </>
        ) : activeTab === 'scans' ? (
          <>
            {/* ── Dropdown 1: Main Category ── */}
            <div className="md:col-span-3">
              <label className="block text-gray-700 font-bold mb-2 text-sm">نوع الأشعة</label>
              <div className="relative">
                <select
                  disabled={loading}
                  value={selectedCategoryId ?? ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none transition cursor-pointer font-medium text-sm"
                >
                  <option value="">{loading ? 'جاري التحميل...' : 'اختر نوع الأشعة...'}</option>
                  {!loading && scanCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* ── Dropdown 2: Specific Test (locked until category chosen) ── */}
            <div className="md:col-span-3">
              <label className={`block font-bold mb-2 text-sm ${!selectedCategoryId ? 'text-gray-400' : 'text-gray-700'}`}>
                الفحص المحدد
              </label>
              <div className="relative">
                <select
                  disabled={!selectedCategoryId || scansLoading}
                  value={selectedPrimary}
                  onChange={(e) => handleScanTestChange(e.target.value)}
                  className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition font-medium text-sm ${
                    !selectedCategoryId
                      ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-teal-500 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {scansLoading ? 'جارٍ التحميل...' : !selectedCategoryId ? 'اختر النوع أولاً...' : 'اختر الفحص...'}
                  </option>
                  {!scansLoading && scansForCategory.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
          </>
        ) : (
          <div className={activeTab === 'clinics' ? 'md:col-span-3' : 'md:col-span-4'}>
            <label className="block text-gray-700 font-bold mb-2 text-sm">
              {activeTab === 'doctors' ? 'الطبيب المختار' : 'اختر العيادة'}
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
        <div className={activeTab === 'clinics' || activeTab === 'lab' || activeTab === 'scans' ? 'md:col-span-2' : 'md:col-span-3'}>
          <label className="block text-gray-700 font-bold mb-2 text-sm">التاريخ</label>
          <input
            type="date"
            min={toLocalDateKey(new Date())}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime('');
              setSelectedDoctorSlot(null);
              setTimePopoverOpen(false);
            }}
            className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition font-medium text-sm"
          />
        </div>

        <div className={activeTab === 'clinics' || activeTab === 'lab' || activeTab === 'scans' ? 'md:col-span-2' : 'md:col-span-3'}>
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
          <div className="col-span-full mt-2 pt-2 border-t border-gray-50">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-gray-400 ml-2 py-1">الخيارات المحددة:</span>

              {labSelectionType === 'single' ? (
                <>
                  {selectedLabItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200 animate-fadeIn"
                    >
                      {item}
                      <button onClick={() => removeLabItem(item)} className="hover:bg-black/10 rounded-full p-0.5 transition">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => { setSelectedLabItems([]); setLabSelectionType(null); setSelectedItemPriceUSD(0); }}
                    className="text-xs text-red-500 underline mr-2"
                  >
                    مسح الكل
                  </button>
                </>
              ) : (
                /* Package: plain text — no chip, no X button */
                <>
                  <span className="font-bold text-teal-700 text-sm py-1">{selectedLabItems[0]}</span>
                  <button
                    onClick={() => { setSelectedLabItems([]); setLabSelectionType(null); setSelectedItemPriceUSD(0); }}
                    className="text-xs text-red-500 underline mr-2"
                  >
                    مسح
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live price badge */}
      {priceYER > 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">السعر</span>
          <span className="text-2xl font-black text-teal-600">{priceYER.toLocaleString('ar-YE')}</span>
          <span className="text-sm font-bold text-gray-500">ر.ي</span>
        </div>
      )}

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

      {/* Inline OTP modal — shown when unauthenticated user clicks Book */}
      {showOtpModal && (
        <PhoneOtpModal
          onClose={() => setShowOtpModal(false)}
          onSuccess={() => {
            setShowOtpModal(false);
            navigate('/checkout', { state: pendingBookingRef.current });
          }}
        />
      )}
    </>
  );
}
