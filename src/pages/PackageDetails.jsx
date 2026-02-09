import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowRight, Clock, CheckCircle, AlertTriangle, 
  TestTube, Calendar, Phone, Share2 
} from 'lucide-react';

export default function PackageDetails() {
  const { id } = useParams(); // جلب رقم الباقة من الرابط
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackageDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('medical_packages')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPkg(data);
      } catch (error) {
        console.error('Error fetching package:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageDetails();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-teal-600">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>
  );

  if (!pkg) return <div className="text-center py-20">عفواً، الباقة غير موجودة.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-right" dir="rtl">
      
      {/* --- Header / Image Section --- */}
      <div className="relative h-[400px] md:h-[500px]">
        <img 
          src={pkg.image_url} 
          alt={pkg.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/40 to-transparent"></div>
        
        {/* Top Navigation */}
        <div className="absolute top-0 w-full p-6">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/examinations/packages" className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-2 rounded-full transition">
                    <ArrowRight size={24} />
                </Link>
                {/* Share Button (Optional) */}
                <button className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-2 rounded-full transition">
                    <Share2 size={24} />
                </button>
            </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 w-full p-6 md:p-12">
            <div className="container mx-auto">
                <span className="bg-teal-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold mb-4 inline-block shadow-lg">
                    باقة مميزة
                </span>
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                    {pkg.title}
                </h1>
                {pkg.discount_text && (
                    <div className="flex items-center gap-3">
                        <span className="text-yellow-400 font-bold text-xl md:text-2xl bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                            خصم خاص {pkg.discount_text}
                        </span>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="container mx-auto px-6 py-12 -mt-10 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Right Column: Details & Tests */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Description */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-blue-900 mb-4">نبذة عن الباقة</h2>
                    <p className="text-gray-600 leading-loose text-lg">
                        {pkg.description}
                    </p>
                </div>

                {/* 2. Included Tests List */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                            <TestTube className="text-teal-500" />
                            الفحوصات المتضمنة
                        </h2>
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                            {pkg.tests_included ? pkg.tests_included.length : 0} تحليل
                        </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {pkg.tests_included && pkg.tests_included.map((test, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-teal-200 transition">
                                <CheckCircle className="text-teal-500 shrink-0" size={20} />
                                <span className="text-gray-700 font-medium text-sm">{test}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Preparations (Important) */}
                <div className="bg-yellow-50 rounded-3xl p-8 border border-yellow-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-100 rounded-full blur-3xl -translate-x-10 -translate-y-10"></div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-yellow-600" />
                            تجهيزات مطلوبة قبل الفحص
                        </h2>
                        <p className="text-yellow-900/80 font-medium leading-relaxed">
                            {pkg.detailed_prep || "لا توجد شروط خاصة لهذا الفحص."}
                        </p>
                    </div>
                </div>

            </div>

            {/* Left Column: Sticky Booking Card */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 sticky top-24">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">احجز هذه الباقة</h3>
                    
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
                            <Clock size={20} className="text-teal-500" />
                            <span className="text-sm">نتائج سريعة ودقيقة</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
                            <Calendar size={20} className="text-teal-500" />
                            <span className="text-sm">متاح طوال أيام الأسبوع</span>
                        </div>
                    </div>

                    <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-500/20 transition transform active:scale-[0.98] mb-4">
                        احجز موعد الآن
                    </button>
                    
                    <div className="text-center">
                        <p className="text-xs text-gray-400 mb-2">أو احجز عبر الهاتف</p>
                        <a href="tel:777552666" className="inline-flex items-center gap-2 text-xl font-bold text-blue-900 hover:text-teal-600 transition">
                            <Phone size={20} />
                            <span dir="ltr">777 552 666</span>
                        </a>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}