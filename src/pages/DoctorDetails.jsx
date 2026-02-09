import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// import Navbar from '../components/Navbar'; <--- REMOVED THIS

export default function DoctorDetails() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Doctor Data
  useEffect(() => {
    const fetchDoctor = async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) console.error('Error fetching doctor:', error);
      else setDoctor(data);
      setLoading(false);
    };
    fetchDoctor();
  }, [id]);

  if (loading) return <div className="text-center py-40 text-teal-600 font-bold">جاري تحميل البيانات...</div>;
  if (!doctor) return <div className="text-center py-40 text-red-500">لم يتم العثور على الطبيب</div>;

  // Split qualifications string into an array for the list
  const qualificationsList = doctor.qualifications 
    ? doctor.qualifications.split(/،|,/).map(q => q.trim()).filter(q => q) 
    : [];

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-right" dir="rtl">
      
      {/* Navbar Removed (It is already in App.jsx) */}

      {/* --- 1. HEADER SECTION (Gradient) --- */}
      <div className="bg-gradient-to-r from-blue-900 to-teal-500 relative pb-24 pt-10">
        <div className="container mx-auto px-6">
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-8">
                <Link to="/" className="hover:text-white transition">الرئيسية</Link> 
                <i className="fas fa-chevron-left text-xs"></i>
                <Link to="/doctors" className="hover:text-white transition">الأطباء</Link>
                <i className="fas fa-chevron-left text-xs"></i>
                <span className="text-white font-bold">{doctor.name}</span>
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                
                {/* Image (Circular with Border) */}
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-white/20 bg-white p-1 shadow-2xl">
                    <img 
                        src={doctor.image_url} 
                        alt={doctor.name} 
                        // Added 'object-top' to ensure the face is not cut off
                        className="w-full h-full object-cover object-top rounded-full"
                    />
                </div>

                {/* Text Info */}
                <div className="text-center md:text-right text-white pt-4">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{doctor.name}</h1>
                    <p className="text-blue-100 text-lg mb-4">{doctor.title}</p>
                    
                    {/* Category Badge */}
                    <span className="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-sm">
                        <i className="fas fa-stethoscope ml-2"></i>
                        {doctor.category}
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* --- 2. MAIN GRID CONTENT --- */}
      <div className="container mx-auto px-6 py-10 -mt-10 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8">
            
            {/* --- RIGHT COLUMN (Booking Card - Sticky) --- */}
            <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 sticky top-24">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                        احجز موعدك
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">اختر التاريخ</label>
                            <div className="relative">
                                <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500 transition" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">اختر الوقت</label>
                            <div className="relative">
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500 appearance-none bg-transparent">
                                    <option>صباحاً (8:00 - 1:00)</option>
                                    <option>عصراً (4:00 - 9:00)</option>
                                </select>
                                <i className="fas fa-chevron-down absolute left-3 top-4 text-gray-400 text-xs pointer-events-none"></i>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button className="w-full bg-teal-500 hover:bg-teal-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-500/20 transition transform active:scale-[0.98] flex items-center justify-center gap-2">
                            <i className="far fa-calendar-check"></i>
                            <span>تأكيد الحجز</span>
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            سيتم تأكيد الحجز خلال 24 ساعة عبر الهاتف
                        </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-teal-600 font-bold">
                        <i className="fas fa-phone-alt"></i>
                        <span dir="ltr">777552666</span>
                    </div>
                </div>
            </div>

            {/* --- LEFT COLUMN (Doctor Details) --- */}
            <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">
                
                {/* 1. About */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                        نبذة عن الطبيب
                    </h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        {doctor.title}. يتميز بخبرة واسعة في مجال {doctor.category}، ويسعى دائماً لتقديم أفضل رعاية طبية للمرضى باستخدام أحدث التقنيات العلاجية.
                    </p>
                </div>

                {/* 2. Working Hours */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                        <i className="far fa-clock text-teal-500"></i>
                        مواعيد العمل
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-700">
                             <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                             <span className="font-bold w-20">الأيام:</span>
                             <span>{doctor.work_days}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                             <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                             <span className="font-bold w-20">الفترة:</span>
                             <span>{doctor.shift}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                             <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                             <span className="font-bold w-20">الأوقات:</span>
                             <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold" dir="ltr">
                                {doctor.work_hours}
                             </span>
                        </div>
                    </div>
                </div>

                {/* 3. Qualifications */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                        <i className="fas fa-graduation-cap text-teal-500"></i>
                        المؤهلات العلمية
                    </h2>
                    <ul className="space-y-4">
                        {qualificationsList.length > 0 ? qualificationsList.map((qual, index) => (
                            <li key={index} className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 transition hover:border-teal-200">
                                <i className="fas fa-certificate text-teal-500 mt-1"></i>
                                <span className="text-gray-700 font-medium">{qual}</span>
                            </li>
                        )) : (
                            <li className="text-gray-500">لا توجد تفاصيل إضافية</li>
                        )}
                    </ul>
                </div>

                {/* 4. Specialties (Category) */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                        <i className="fas fa-stethoscope text-teal-500"></i>
                        التخصصات الدقيقة
                    </h2>
                    <div className="flex flex-wrap gap-3">
                         {/* We use the Category as the main specialty */}
                         <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
                            <i className="fas fa-check-circle"></i>
                            {doctor.category}
                         </div>
                         {/* Generic Tag since we don't have sub-specialties in DB yet */}
                         <div className="bg-gray-50 text-gray-600 px-6 py-3 rounded-xl font-medium text-sm">
                            تشخيص وعلاج الحالات المتقدمة
                         </div>
                    </div>
                </div>

            </div>
        </div>
      </div>

    </div>
  );
}