import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  MapPin, Clock, Phone, Stethoscope, User, 
  ArrowRight, CheckCircle, Star, Calendar, ChevronDown, AlertCircle 
} from 'lucide-react';

export default function ClinicDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data States
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Form States
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    date: '',
    shift: ''
  });

  // --- 1. Define Shifts (Same as Home Page) ---
  const shiftPeriods = [
    { label: 'الفترة الصباحية (9:00 ص - 1:00 م)', id: 'morning' },
    { label: 'الفترة المسائية (4:00 م - 8:00 م)', id: 'evening' },
  ];

  // Fetch Data
  useEffect(() => {
    async function fetchClinicDetails() {
      try {
        // 1. Fetch Clinic Info
        const { data: clinicData, error: clinicError } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', id)
          .single();

        if (clinicError) throw clinicError;
        setClinic(clinicData);

        // 2. Fetch Services
        const { data: servicesData } = await supabase
            .from('clinic_services')
            .select('service_name')
            .eq('clinic_id', id);

        if (servicesData) setServices(servicesData.map(s => s.service_name));

        // 3. Fetch Doctors (Using the NEW clinic_id relation)
        const { data: doctorsData } = await supabase
            .from('doctors')
            .select('*')
            .eq('clinic_id', id)
            // Sort by priority just like Home Page
            .order('priority', { ascending: true, nullsFirst: false }) 
            .order('id', { ascending: true });
          
        setDoctors(doctorsData || []);

      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchClinicDetails();
  }, [id]);

  // --- 2. Smart Logic: Get Selected Doctor Object ---
  const selectedDoctor = doctors.find(d => d.id.toString() === bookingForm.doctorId);

  // --- 3. Smart Logic: Filter Shifts based on Doctor ---
  const getAvailableShifts = () => {
    // If no doctor selected, or doctor has no shift data, show all
    if (!selectedDoctor || !selectedDoctor.shift) return shiftPeriods;
    
    const shift = selectedDoctor.shift;
    const showMorning = shift.includes('صباح');
    const showEvening = shift.includes('عصر') || shift.includes('مساء') || shift.includes('م');
    
    if (showMorning && !showEvening) return [shiftPeriods[0]];
    if (!showMorning && showEvening) return [shiftPeriods[1]];
    
    return shiftPeriods;
  };

  const availableShifts = getAvailableShifts();

  // Handle Booking Submit
  const handleBookNow = () => {
    // Validation
    if (!bookingForm.doctorId) {
      alert("يرجى اختيار الطبيب");
      return;
    }
    if (!bookingForm.date) {
      alert("يرجى اختيار التاريخ");
      return;
    }
    if (!bookingForm.shift) {
      alert("يرجى اختيار فترة الدوام");
      return;
    }

    // Navigate to Checkout (Data Structure Matches Home Page)
    navigate('/checkout', {
      state: {
        type: 'clinics', // Source
        primarySelection: clinic.name, // Clinic Name
        doctor: selectedDoctor, // Full Doctor Object
        date: bookingForm.date,
        time: bookingForm.shift,
        isPackage: false
      }
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-teal-600 font-bold">جاري تحميل البيانات...</div>;
  if (!clinic) return <div className="min-h-screen flex items-center justify-center text-red-500">العيادة غير موجودة</div>;

  // Theme Colors
  const colorMap = {
    'green': 'from-emerald-600 to-teal-500',
    'blue': 'from-blue-700 to-blue-500',
    'red': 'from-red-600 to-rose-500',
    'purple': 'from-purple-700 to-violet-500',
    'orange': 'from-orange-600 to-amber-500',
    'default': 'from-blue-800 to-teal-500'
  };
  const gradient = colorMap[clinic.color] || colorMap['default'];

  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen" dir="rtl">

      {/* --- Header --- */}
      <div className={`relative bg-gradient-to-r ${gradient} text-white py-16 md:py-24 overflow-hidden`}>
        <div className="container mx-auto px-6 relative z-10">
            <Link to="/clinics" className="inline-flex items-center text-blue-100 hover:text-white mb-6 transition text-sm font-bold">
                <ArrowRight size={16} className="ml-2" />
                العودة لقائمة العيادات
            </Link>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 flex items-center gap-3">
                        {clinic.name}
                        <span className="bg-white/20 text-white text-lg px-3 py-1 rounded-full font-mono">
                            {String(clinic.clinic_number).padStart(2, '0')}
                        </span>
                    </h1>
                    <p className="text-blue-100 text-lg max-w-2xl leading-relaxed opacity-90">
                        {clinic.description || `عيادة متخصصة في تشخيص وعلاج أمراض ${clinic.name.replace('عيادة', '')} بأحدث التقنيات الطبية.`}
                    </p>
                </div>
                <div className="hidden md:block opacity-10 transform scale-150 translate-x-10 translate-y-10">
                    <Stethoscope size={200} />
                </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-12 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* --- RIGHT COLUMN: The Booking Sidebar --- */}
            <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 sticky top-24">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                        <Calendar className="text-teal-500" size={24} />
                        احجز موعدك
                    </h3>
                    
                    {/* Dynamic Form */}
                    <div className="space-y-4">
                        
                        {/* 1. Doctor Select */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">اختر الطبيب</label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer disabled:bg-gray-100"
                                    value={bookingForm.doctorId}
                                    onChange={(e) => {
                                        // Reset shift when doctor changes because new doctor might have different shifts
                                        setBookingForm({...bookingForm, doctorId: e.target.value, shift: ''});
                                    }}
                                    disabled={doctors.length === 0}
                                >
                                    <option value="">{doctors.length === 0 ? "لا يوجد أطباء متاحين حالياً" : "اختر الطبيب المعالج..."}</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        {/* 2. Date Select */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">التاريخ</label>
                            <input 
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={bookingForm.date}
                                onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
                            />
                        </div>

                        {/* 3. Shift Select (Dynamic based on selected doctor) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">فترة الدوام</label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                                    value={bookingForm.shift}
                                    onChange={(e) => setBookingForm({...bookingForm, shift: e.target.value})}
                                    disabled={!bookingForm.doctorId} // Disable if no doctor selected
                                >
                                    <option value="">
                                        {!bookingForm.doctorId ? "يرجى اختيار الطبيب أولاً" : "اختر الفترة..."}
                                    </option>
                                    
                                    {/* Map over the filtered shifts */}
                                    {availableShifts.map((shift, idx) => (
                                        <option key={idx} value={shift.label}>
                                            {shift.label}
                                        </option>
                                    ))}
                                </select>
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            onClick={handleBookNow}
                            disabled={doctors.length === 0}
                            className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 mt-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            احجز موعد الآن
                        </button>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                         <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
                            <span className="text-sm text-blue-800 font-bold">للحجز والاستفسار</span>
                            <div className="flex items-center gap-2 text-blue-600" dir="ltr">
                                <Phone size={16} />
                                <span className="font-bold">777 552 666</span>
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* --- LEFT COLUMN: Info & Doctors --- */}
            <div className="lg:col-span-2 order-1 lg:order-2 space-y-8">
                
                {/* Info Cards */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">الموقع</h4>
                            <p className="text-gray-500 text-sm">عدن - المنصورة - ريمي</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 shrink-0">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">مواعيد العمل</h4>
                            <p className="text-gray-500 text-sm">السبت - الخميس: 8 ص - 10 م</p>
                        </div>
                    </div>
                </div>

                {/* Services List */}
                <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 border-r-4 border-teal-500 pr-4">الخدمات المقدمة</h3>
                    {services.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-y-4 gap-x-8">
                            {services.map((service, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-gray-600">
                                    <CheckCircle size={18} className="text-teal-500 shrink-0" />
                                    <span className="text-sm font-medium">{service}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500 bg-gray-50 p-4 rounded-xl">
                            <AlertCircle size={20} />
                            <span>يتم تحديث قائمة الخدمات حالياً...</span>
                        </div>
                    )}
                </div>

                {/* Doctors List */}
                <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 border-r-4 border-blue-500 pr-4">الأطباء المناوبون</h3>
                    
                    {doctors.length > 0 ? (
                        <div className="space-y-4">
                            {doctors.map((doctor) => (
                                <div key={doctor.id} className="flex flex-col md:flex-row items-center md:items-start gap-6 p-4 rounded-2xl border border-gray-50 hover:border-blue-100 hover:bg-blue-50/30 transition group">
                                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0">
                                        <img src={doctor.image_url || "https://via.placeholder.com/150"} alt={doctor.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-grow text-center md:text-right">
                                        <h4 className="font-bold text-lg text-gray-800 group-hover:text-blue-700 transition">{doctor.name}</h4>
                                        <p className="text-teal-600 text-sm mb-2">{doctor.title || doctor.category}</p>
                                        <div className="flex items-center justify-center md:justify-start gap-1 text-yellow-400 text-xs mb-3">
                                            <Star size={12} fill="currentColor" />
                                            <span className="text-gray-400 font-medium">(4.8 تقييم)</span>
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="text-center md:text-left shrink-0">
                                        <p className="text-gray-400 text-xs mb-1">سعر الكشف</p>
                                        <p className="text-teal-600 font-bold text-lg mb-3">3,000 ر.ي</p>
                                        <button 
                                            onClick={() => {
                                                setBookingForm({...bookingForm, doctorId: doctor.id.toString()});
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="inline-block bg-white text-blue-600 border border-blue-200 px-6 py-2 rounded-full text-sm font-bold hover:bg-blue-600 hover:text-white transition"
                                        >
                                            احجز موعد
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <User size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500 font-medium">لا يوجد أطباء مسجلين في هذا القسم حالياً.</p>
                            <p className="text-xs text-gray-400 mt-1">يرجى التأكد من إضافة الأطباء وربطهم بالعيادة من لوحة التحكم.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}