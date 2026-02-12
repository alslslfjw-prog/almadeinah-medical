import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, ChevronDown, Phone, 
  Stethoscope, User, Activity, Microscope, CheckCircle, X
} from 'lucide-react';

// ... (Keep the LAB_PACKAGES array exactly as it was) ...
const LAB_PACKAGES = [
  "الفحص العام", "الفحص العام (رجال) بلس", "الفحص العام (نساء) بلس", "مقاومة الأنسولين", "تحاليل ما قبل الزواج للنساء", "تحاليل ما قبل الزواج للنساء بلس", "النظام الغذائي", "تحاليل هشاشة العظام", "تحاليل الروماتيزم", "تحاليل الغده الدرقيه", "تحاليل الغده الدرقيه بلس", "تحاليل فقر الدم", "تحاليل فقر الدم بلس", "تحاليل الجلد والشعر", "تحاليل غياب الدورة الشهرية", "وظائف الغده النخاميه", "تحاليل تعدد الاكياس", "تحاليل متابعة الحمل", "تحاليل مخاطر الاصابه بالجلطات", "تحاليل التسمم بالحديد", "تحاليل التخطيط للحمل", "تحاليل العقم للرجال+", "تحاليل للنساء عمر اكبر من 45", "تحاليل للرجال عمر اكبر من 45", "تحاليل مرضى السكر", "تحاليل مخاطر الامراض القلبية", "تحاليل دلالات الأورام", "تحاليل الأطفال", "تحاليل الأيض الشامل"
];

// --- ACCEPT PROPS HERE ---
export default function AppointmentWidget({ preSelectedDoctor = null }) {
  const navigate = useNavigate();
  
  // -- State Management --
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
    { id: 'clinics', label: 'العيادات', icon: <Stethoscope size={18} />, table: 'clinics', col: 'name' },
    { id: 'doctors', label: 'الأطباء', icon: <User size={18} />, table: 'doctors', col: 'name' },
    { id: 'scans', label: 'المدينة سكان', icon: <Activity size={18} />, table: 'scans', col: 'name' },
    { id: 'lab', label: 'الفحوصات', icon: <Microscope size={18} />, table: 'lab_tests_list', col: 'name' },
  ];

  const shiftPeriods = [
    { label: 'الفترة الصباحية (9:00 ص - 1:00 م)', id: 'morning' },
    { label: 'الفترة المسائية (4:00 م - 8:00 م)', id: 'evening' },
  ];

  const normalizeText = (text) => {
    if (!text) return "";
    return text.replace("عيادة", "").replace("قسم", "").replace(/ال/g, "").replace(/[ةه]/g, "").replace(/[أإآ]/g, "ا").replace(/\s/g, "").trim();
  };

  // --- NEW: Handle Pre-Selected Doctor (When coming from Doctor Details Page) ---
  useEffect(() => {
    if (preSelectedDoctor) {
      setActiveTab('doctors');
      setSelectedPrimary(preSelectedDoctor.name);
      setSelectedDoctor(preSelectedDoctor);
    }
  }, [preSelectedDoctor]);

  // 1. Fetch Primary Data
  useEffect(() => {
    const fetchPrimaryData = async () => {
      setLoading(true);
      setPrimaryOptions([]);
      
      // Only reset selection if we DO NOT have a pre-selected doctor
      if (!preSelectedDoctor) {
          setSelectedPrimary('');
          setSelectedDoctor(null);
      }

      setSecondaryOptions([]);
      setSelectedLabItems([]);
      setLabSelectionType(null);
      
      // Don't reset time if we are just switching tabs logically
      // setTime(''); 
      setError('');

      try {
        const currentTab = tabs.find(t => t.id === activeTab);
        if (currentTab) {
          
          try {
            let query = supabase
              .from(currentTab.table)
              .select(activeTab === 'doctors' ? '*' : currentTab.col);

            if (activeTab === 'clinics') {
               query = query.order('sort_order', { ascending: true, nullsFirst: false })
                            .order('clinic_number', { ascending: true });
            } else if (activeTab === 'doctors') {
               query = query.order('priority', { ascending: true, nullsFirst: false })
                            .order('id', { ascending: true });
            }

            const { data: mainData, error: mainError } = await query;
            if (mainError) throw mainError;
            setPrimaryOptions(mainData || []);

          } catch (sortError) {
            console.warn("Sorting failed, fallback...", sortError);
            const { data: fallbackData } = await supabase
              .from(currentTab.table)
              .select(activeTab === 'doctors' ? '*' : currentTab.col);
            setPrimaryOptions(fallbackData || []);
          }

          if (activeTab === 'clinics') {
            try {
                const { data: docsData, error: docsError } = await supabase
                  .from('doctors')
                  .select('*')
                  .order('priority', { ascending: true, nullsFirst: false })
                  .order('id', { ascending: true });
                if (docsError) throw docsError;
                setAllDoctors(docsData || []);
            } catch (docSortError) {
                const { data: docsFallback } = await supabase.from('doctors').select('*');
                setAllDoctors(docsFallback || []);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrimaryData();
  }, [activeTab, preSelectedDoctor]); // Added preSelectedDoctor to dependency

  // 2. Filter Doctors locally
  useEffect(() => {
    if (activeTab === 'clinics' && selectedPrimary && allDoctors.length > 0) {
      const clinicKey = normalizeText(selectedPrimary);
      const filtered = allDoctors.filter(doc => {
        if (!doc.category) return false;
        const docKey = normalizeText(doc.category);
        return docKey.includes(clinicKey) || clinicKey.includes(docKey);
      });
      setSecondaryOptions(filtered);
    }
  }, [activeTab, selectedPrimary, allDoctors]);

  const handleDoctorChange = (docName) => {
    let doc = null;
    if (activeTab === 'doctors') {
      doc = primaryOptions.find(d => d.name === docName);
    } else if (activeTab === 'clinics') {
      doc = secondaryOptions.find(d => d.name === docName);
    }
    setSelectedDoctor(doc);
    setTime('');
  };

  const handleAddSingleTest = (testName) => {
    if (!testName) return;
    if (labSelectionType === 'package') {
        setLabSelectionType('single');
        setSelectedLabItems([testName]);
    } else {
        setLabSelectionType('single');
        if (!selectedLabItems.includes(testName)) {
            setSelectedLabItems([...selectedLabItems, testName]);
        }
    }
  };

  const handleAddPackage = (packageName) => {
    if (!packageName) return;
    if (labSelectionType === 'single') {
        setLabSelectionType('package');
        setSelectedLabItems([packageName]);
    } else {
        setLabSelectionType('package');
        if (!selectedLabItems.includes(packageName)) {
            setSelectedLabItems([...selectedLabItems, packageName]);
        }
    }
  };

  const removeLabItem = (itemToRemove) => {
    const updated = selectedLabItems.filter(item => item !== itemToRemove);
    setSelectedLabItems(updated);
    if (updated.length === 0) setLabSelectionType(null);
  };

  const renderTimeInput = () => {
    if (activeTab === 'scans' || activeTab === 'lab') {
        return (
            <div className="relative">
                <input 
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition font-medium text-sm text-left ltr-input"
                    style={{ direction: 'ltr' }}
                />
            </div>
        );
    }

    let placeholder = "اختر الفترة...";
    let available = shiftPeriods;
    
    // LOGIC: Use selectedDoctor (which might be the preSelectedDoctor)
    if (selectedDoctor && selectedDoctor.shift) {
        const shift = selectedDoctor.shift;
        const showMorning = shift.includes('صباح');
        const showEvening = shift.includes('عصر') || shift.includes('مساء') || shift.includes('م');
        
        if (showMorning && !showEvening) available = [shiftPeriods[0]];
        if (!showMorning && showEvening) available = [shiftPeriods[1]];
    }
    
    let options = available.map(p => ({ label: p.label, value: p.label }));

    return (
      <div className="relative">
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
           <Clock size={18} />
        </div>
        <select 
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white appearance-none transition cursor-pointer font-medium text-xs md:text-sm"
        >
          <option value="">{placeholder}</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
      </div>
    );
  };

  const handleBookNow = () => {
    let finalSelection = selectedPrimary;

    if (activeTab === 'lab') {
        if (selectedLabItems.length === 0) {
            setError('يرجى اختيار فحص واحد على الأقل أو باقة');
            return;
        }
        finalSelection = selectedLabItems.join('، ');
    } else {
        if (!selectedPrimary) {
            setError('يرجى اختيار ' + (activeTab === 'doctors' ? 'الطبيب' : (activeTab === 'scans' ? 'نوع الأشعة' : 'العيادة')));
            return;
        }
    }

    if (activeTab === 'clinics' && !selectedDoctor && secondaryOptions.length > 0) {
       setError('يرجى اختيار الطبيب من القائمة');
       return;
    }
    if (!date) {
      setError('يرجى اختيار التاريخ');
      return;
    }
    if (!time) {
      setError('يرجى اختيار الوقت');
      return;
    }

    const bookingData = {
      type: activeTab,
      primarySelection: finalSelection,
      doctor: selectedDoctor,
      date,
      time,
      isPackage: labSelectionType === 'package'
    };

    navigate('/checkout', { state: bookingData });
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl p-5 md:p-8 w-full border border-gray-100 relative">
      
      {/* Tabs - Hide tabs if we are in "Single Doctor Mode" (optional, but cleaner) */}
      {!preSelectedDoctor && (
        <div className="relative mb-8">
            <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar snap-x touch-pan-x">
            {tabs.map((tab) => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                    flex-shrink-0 snap-start flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm md:text-base transition-all duration-300
                    ${activeTab === tab.id 
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 ring-2 ring-teal-100 ring-offset-2' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'}
                `}
                >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
                </button>
            ))}
            </div>
        </div>
      )}

      {/* Title for Doctor Mode */}
      {preSelectedDoctor && (
          <div className="mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <i className="fas fa-calendar-plus text-teal-500"></i>
                  حجز موعد مع د. {preSelectedDoctor.name}
              </h3>
          </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        
        {/* --- SECTION 1: SELECTION LOGIC --- */}
        {activeTab === 'lab' ? (
            <>
                <div className="md:col-span-3">
                    <label className={`block font-bold mb-2 text-sm ${labSelectionType === 'package' ? 'text-gray-300' : 'text-gray-700'}`}>الفحوصات الفردية</label>
                    <div className="relative">
                        <select 
                            disabled={loading}
                            value="" 
                            onChange={(e) => handleAddSingleTest(e.target.value)}
                            className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition cursor-pointer font-medium text-sm ${labSelectionType === 'package' ? 'bg-gray-100 border-gray-100 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-teal-500 focus:bg-white'}`}
                        >
                            <option value="">اختر فحصاً لإضافته...</option>
                            {!loading && primaryOptions.map((item, index) => (
                                <option key={index} value={item.name}>{item.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                </div>
                <div className="md:col-span-3">
                    <label className={`block font-bold mb-2 text-sm ${labSelectionType === 'single' ? 'text-gray-300' : 'text-gray-700'}`}>باقات الفحوصات</label>
                    <div className="relative">
                        <select 
                            value="" 
                            onChange={(e) => handleAddPackage(e.target.value)}
                            className={`w-full border py-3.5 px-4 pr-10 rounded-xl focus:outline-none appearance-none transition cursor-pointer font-medium text-sm ${labSelectionType === 'single' ? 'bg-gray-100 border-gray-100 text-gray-400' : 'bg-teal-50 border-teal-100 text-teal-800 focus:ring-2 focus:ring-teal-500 focus:bg-white'}`}
                        >
                            <option value="">اختر باقة لإضافتها...</option>
                            {LAB_PACKAGES.map((pkg, index) => (
                                <option key={index} value={pkg}>{pkg}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                </div>
            </>
        ) : (
            <div className={`${activeTab === 'clinics' ? 'md:col-span-3' : 'md:col-span-4'}`}>
                <label className="block text-gray-700 font-bold mb-2 text-sm">
                    {activeTab === 'doctors' ? 'الطبيب المختار' : activeTab === 'clinics' ? 'اختر العيادة' : 'اختر نوع الأشعة'}
                </label>
                <div className="relative">
                    <select 
                    // DISABLE SELECTION IF PRE-SELECTED
                    disabled={loading || !!preSelectedDoctor} 
                    value={selectedPrimary}
                    onChange={(e) => {
                        setSelectedPrimary(e.target.value);
                        if (activeTab === 'doctors') handleDoctorChange(e.target.value);
                    }}
                    className={`w-full border text-gray-700 py-3.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white appearance-none transition cursor-pointer font-medium text-sm
                        ${preSelectedDoctor ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-gray-50 border-gray-200'}
                    `}
                    >
                    <option value="">{loading ? "جاري التحميل..." : "اختر من القائمة..."}</option>
                    {!loading && primaryOptions.map((item, index) => {
                        const val = activeTab === 'doctors' ? item.name : item.name || item.title || item;
                        return <option key={index} value={val}>{val}</option>
                    })}
                    </select>
                    {!preSelectedDoctor && <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />}
                </div>
            </div>
        )}

        {/* --- SECTION 2: SECONDARY SELECTION --- */}
        {activeTab === 'clinics' && (
            <div className="md:col-span-3">
            <label className="block text-gray-700 font-bold mb-2 text-sm">اختر الطبيب</label>
            <div className="relative">
                <select 
                disabled={!selectedPrimary || secondaryOptions.length === 0}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white appearance-none transition cursor-pointer font-medium disabled:opacity-50 text-sm"
                >
                <option value="">
                    {!selectedPrimary ? "اختر العيادة أولاً" : 
                    secondaryOptions.length === 0 ? "لا يوجد أطباء متاحين" : "اختر الطبيب..."}
                </option>
                {secondaryOptions.map((doc, index) => (
                    <option key={index} value={doc.name}>{doc.name}</option>
                ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
            </div>
        )}

        {/* --- SECTION 3: DATE & TIME --- */}
        <div className={`${activeTab === 'clinics' || activeTab === 'lab' ? 'md:col-span-2' : 'md:col-span-3'}`}>
          <label className="block text-gray-700 font-bold mb-2 text-sm">التاريخ</label>
          <div className="relative">
            <input 
              type="date"
              min={new Date().toISOString().split('T')[0]} 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition font-medium text-sm"
            />
          </div>
        </div>

        <div className={`${activeTab === 'clinics' || activeTab === 'lab' ? 'md:col-span-2' : 'md:col-span-3'}`}>
          <label className="block text-gray-700 font-bold mb-2 text-sm">الوقت</label>
          {renderTimeInput()}
        </div>

        {/* --- SECTION 4: SUBMIT --- */}
        <div className="md:col-span-2">
          <button 
            onClick={handleBookNow}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-200 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            <span>احجز الآن</span>
          </button>
        </div>

        {/* --- SECTION 5: LAB TAGS --- */}
        {activeTab === 'lab' && selectedLabItems.length > 0 && (
            <div className="col-span-12 mt-2 pt-2 border-t border-gray-50">
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-400 ml-2 py-1">الخيارات المحددة:</span>
                    {selectedLabItems.map((item, idx) => (
                        <span key={idx} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border animate-fadeIn
                            ${labSelectionType === 'package' ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                        `}>
                            {item}
                            <button onClick={() => removeLabItem(item)} className="hover:bg-black/10 rounded-full p-0.5 transition">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    <button onClick={() => { setSelectedLabItems([]); setLabSelectionType(null); }} className="text-xs text-red-500 underline mr-2">
                        مسح الكل
                    </button>
                </div>
            </div>
        )}

      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg font-bold flex items-center gap-2 animate-bounce">
            <CheckCircle size={16} className="rotate-45" />
            {error}
        </div>
      )}

      {/* Hide footer info in Doctor Details mode to save space */}
      {!preSelectedDoctor && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm text-gray-500 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            فريق الدعم متاح الان
            </div>
            <div className="flex items-center gap-4" dir="ltr">
            <span className="flex items-center gap-1"><Clock size={14}/> 24/7 متاح</span>
            <span className="flex items-center gap-1 text-teal-600 font-bold"><Phone size={14}/> 777552666</span>
            </div>
        </div>
      )}

    </div>
  );
}