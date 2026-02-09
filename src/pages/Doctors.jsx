import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Doctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State for Quick Booking Modal
  const [bookingDoctor, setBookingDoctor] = useState(null);
  
  // --- NEW: Form State for Booking ---
  const [formData, setFormData] = useState({ name: '', phone: '', date: '', time: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'الكل', 'باطنية', 'القلب', 'أطفال', 'نساء وولادة', 'عظام', 'أنف وأذن', 'عيون', 'أسنان', 'تغذية', 'جراحة عامة', 'الأشعة التشخيصية', 'مخ وأعصاب', 'أورام', 'أمراض دم', 'مسالك بولية', 'مختبر'
  ];

  // Helper: Get Current Day
  const getCurrentDay = () => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[new Date().getDay()];
  };

  // Helper: Check Availability
  const checkAvailability = (workDays) => {
    if (!workDays) return false;
    const today = getCurrentDay();
    return workDays.includes(today);
  };

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('doctors').select('*');
        if (error) throw error;
        setDoctors(data || []);
        setFilteredDoctors(data || []);
      } catch (error) {
        console.error('Error fetching doctors:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Filtering Logic
  useEffect(() => {
    let result = doctors;
    if (activeCategory !== 'الكل') {
      result = result.filter(doc => doc.category === activeCategory);
    }
    if (searchTerm) {
      result = result.filter(doc => 
        doc.name.includes(searchTerm) || (doc.title && doc.title.includes(searchTerm))
      );
    }
    setFilteredDoctors(result);
  }, [activeCategory, searchTerm, doctors]);

  // --- HANDLERS ---

  // 1. Open Doctor Details Page
  const handleCardClick = (doctorId) => {
    navigate(`/doctors/${doctorId}`);
  };

  // 2. Open Booking Modal
  const handleBookingClick = (e, doctor) => {
    e.stopPropagation(); 
    setBookingDoctor(doctor);
    // Reset form when opening modal
    setFormData({ name: '', phone: '', date: '', time: '' });
  };

  // 3. Submit Booking to Supabase
  const handleSubmitBooking = async () => {
    // Validation
    if (!formData.name || !formData.phone) {
      alert("يرجى كتابة الاسم ورقم الهاتف لإتمام الحجز");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('appointments').insert([{
        patient_name: formData.name,
        phone_number: formData.phone,
        appointment_date: formData.date || null,   // Optional
        appointment_time: formData.time || null,   // Optional
        doctor_id: bookingDoctor.id,               // Link to Doctor
        status: 'pending'
      }]);

      if (error) throw error;

      // Success
      alert(`تم استلام طلبك لحجز موعد مع د. ${bookingDoctor.name} بنجاح! سنتصل بك قريباً.`);
      setBookingDoctor(null); // Close Modal

    } catch (error) {
      console.error("Booking Error:", error);
      alert("حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen" dir="rtl">
      
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-r from-blue-900 to-teal-500 text-white py-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">ابحث عن طبيب</h1>
            <p className="text-blue-100 text-lg mb-8">د. عون - نخبة من أفضل الأطباء في جميع التخصصات</p>
            
            <div className="max-w-2xl mx-auto relative">
                <input 
                    type="text" 
                    placeholder="ابحث بالاسم أو التخصص..." 
                    className="w-full py-4 px-6 pr-12 rounded-full text-gray-800 shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-300 transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-2 top-2 bottom-2">
                    <button className="bg-teal-500 hover:bg-teal-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition">
                         <i className="fas fa-search"></i>
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* 2. CATEGORY FILTERS */}
      <section className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 py-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition border 
                        ${activeCategory === cat 
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md' 
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-teal-500 hover:text-teal-600'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>
      </section>

      {/* 3. DOCTORS GRID */}
      <section className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 border-r-4 border-teal-500 pr-3">
                نتائج البحث ({filteredDoctors.length})
            </h2>
        </div>

        {loading ? (
            <div className="text-center py-20 text-gray-500">
                <i className="fas fa-spinner fa-spin text-3xl mb-4 text-teal-600"></i>
                <p>جارٍ تحميل الأطباء...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredDoctors.map((doctor) => {
                    const isAvailable = checkAvailability(doctor.work_days);
                    return (
                        <div 
                            key={doctor.id} 
                            onClick={() => handleCardClick(doctor.id)} 
                            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 group flex flex-col cursor-pointer"
                        >
                            {/* Image Section - RESTORED h-64, ADDED object-top */}
                            <div className="relative h-64 overflow-hidden bg-gray-100">
                                <img 
                                    src={doctor.image_url} 
                                    alt={doctor.name} 
                                    className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1
                                    ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}>
                                    <i className={`fas ${isAvailable ? 'fa-check-circle' : 'fa-clock'}`}></i>
                                    {isAvailable ? 'متاح اليوم' : 'غير متاح'}
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-5 flex flex-col flex-grow text-center">
                                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition">
                                    {doctor.name}
                                </h3>
                                <p className="text-teal-600 text-sm font-medium mb-4">{doctor.title}</p>
                                
                                <div className="mt-auto">
                                    <button 
                                            onClick={(e) => handleBookingClick(e, doctor)} 
                                            className="w-full bg-white text-teal-600 border border-teal-600 hover:bg-teal-600 hover:text-white py-2.5 rounded-xl text-sm font-bold transition duration-300 flex items-center justify-center gap-2"
                                        >
                                            احجز موعد
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

      </section>

      {/* --- QUICK BOOKING MODAL (UPDATED) --- */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setBookingDoctor(null)}>
            <div 
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-teal-600 p-4 text-center text-white relative">
                     <h3 className="font-bold text-lg">حجز موعد سريع</h3>
                     <p className="text-sm opacity-90">د. {bookingDoctor.name}</p>
                     <button onClick={() => setBookingDoctor(null)} className="absolute top-4 left-4 text-white hover:text-gray-200">
                         <i className="fas fa-times"></i>
                     </button>
                </div>
                
                <div className="p-6 space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                         <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-teal-500" 
                            placeholder="اسم المريض" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                         <input 
                            type="tel" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-teal-500" 
                            placeholder="05xxxxxxxx" 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                         />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
                             <input 
                                type="date" 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-teal-500" 
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">الوقت</label>
                             <input 
                                type="time" 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-teal-500" 
                                value={formData.time}
                                onChange={(e) => setFormData({...formData, time: e.target.value})}
                             />
                         </div>
                     </div>
                     
                     <button 
                        onClick={handleSubmitBooking}
                        disabled={isSubmitting}
                        className={`w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold mt-2 shadow-lg transition flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                     >
                         {isSubmitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> جارٍ الحجز...
                            </>
                         ) : 'تأكيد الحجز'}
                     </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Doctors;