import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, CheckCircle, Tag, Activity } from 'lucide-react';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // جلب الباقات من Supabase
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data, error } = await supabase
          .from('medical_packages')
          .select('*')
          .order('id');
        
        if (error) throw error;
        setPackages(data || []);
      } catch (error) {
        console.error('Error fetching packages:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-right font-sans" dir="rtl">
      
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <Link to="/examinations" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-teal-500 hover:text-white transition">
                <ArrowRight size={20} />
            </Link>
            <div>
                <h1 className="text-xl font-bold text-blue-900">باقات الفحوصات</h1>
                <p className="text-xs text-gray-500">باقات متكاملة وموفرة لصحتك</p>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-10">
        
        {loading ? (
           <div className="text-center py-20 text-gray-500">
              <Package size={40} className="mx-auto mb-2 animate-bounce text-teal-600" />
              <p>جاري تحميل الباقات...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 group flex flex-col">
                
                {/* Image Area */}
                <div className="relative h-64 overflow-hidden bg-gray-200">
                    <img 
                        // ملاحظة: تأكد من رفع الصورة في Supabase Storage ووضع الرابط في الجدول
                        src={pkg.image_url} 
                        alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    
                    {/* Discount Badge */}
                    {pkg.discount_text && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-1 rounded-full font-bold text-sm shadow-md animate-pulse">
                            خصم {pkg.discount_text}
                        </div>
                    )}

                    {/* Tests Count Badge */}
                    {pkg.tests_count && (
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur text-blue-900 px-3 py-1 rounded-lg font-bold text-sm shadow-sm flex items-center gap-1">
                            <Activity size={16} className="text-teal-500" />
                            {pkg.tests_count} تحليل
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">{pkg.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6">
                        {pkg.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-2 mb-8 bg-gray-50 p-4 rounded-xl">
                        {pkg.features && pkg.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                <CheckCircle size={16} className="text-teal-500 shrink-0" />
                                {feature}
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto">
                        <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-teal-200 flex items-center justify-center gap-2">
                            <Package size={18} />
                            احجز الباقة الآن
                        </button>
                    </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}