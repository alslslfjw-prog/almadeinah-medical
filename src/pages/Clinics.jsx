import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  Heart, Smile, Brain, Bone, Eye, Baby, 
  Stethoscope, Activity, ArrowLeft, Ear, 
  Droplet, Sparkles, Apple, Microscope, 
  Siren, Scissors, Building2, Camera, 
  Syringe, Ribbon, Wind, HeartPulse, Salad, Phone, Clock
} from 'lucide-react';

// 1. Map database text to Lucide icons
const iconMap = {
  'Heart': <Heart size={40} className="text-white opacity-90" />,
  'Smile': <Smile size={40} className="text-white opacity-90" />, // For Dental
  'Brain': <Brain size={40} className="text-white opacity-90" />,
  'Bone': <Bone size={40} className="text-white opacity-90" />,
  'Eye': <Eye size={40} className="text-white opacity-90" />,
  'Baby': <Baby size={40} className="text-white opacity-90" />,
  'Stethoscope': <Stethoscope size={40} className="text-white opacity-90" />,
  'Ear': <Ear size={40} className="text-white opacity-90" />,
  'Droplet': <Droplet size={40} className="text-white opacity-90" />,
  'Sparkles': <Sparkles size={40} className="text-white opacity-90" />, // Dermatology
  'Apple': <Apple size={40} className="text-white opacity-90" />,
  'Scissors': <Scissors size={40} className="text-white opacity-90" />, // Surgery
  'Ribbon': <Ribbon size={40} className="text-white opacity-90" />, // Oncology
  'Microscope': <Microscope size={40} className="text-white opacity-90" />,
  'Siren': <Siren size={40} className="text-white opacity-90" />,
  'Building2': <Building2 size={40} className="text-white opacity-90" />, // Urology/Hospital
  'Camera': <Camera size={40} className="text-white opacity-90" />, // Radiology
  'Syringe': <Syringe size={40} className="text-white opacity-90" />, // Hematology
  'Wind': <Wind size={40} className="text-white opacity-90" />, // Chest/Pulmonary
  'HeartPulse': <HeartPulse size={40} className="text-white opacity-90" />, // Pediatric Cardio
  'Salad': <Salad size={40} className="text-white opacity-90" />, // Nutrition
  'default': <Stethoscope size={40} className="text-white opacity-90" />
};

// 2. Gradients matching the images
const gradientMap = {
  'green': 'bg-gradient-to-r from-emerald-500 to-teal-400',
  'blue': 'bg-gradient-to-r from-blue-600 to-blue-400',
  'red': 'bg-gradient-to-r from-red-600 to-rose-400',
  'cyan': 'bg-gradient-to-r from-cyan-500 to-blue-400',
  'pink': 'bg-gradient-to-r from-pink-500 to-rose-400',
  'purple': 'bg-gradient-to-r from-purple-600 to-violet-400',
  'yellow': 'bg-gradient-to-r from-yellow-500 to-amber-400',
  'indigo': 'bg-gradient-to-r from-indigo-600 to-blue-500',
  'rose': 'bg-gradient-to-r from-rose-600 to-pink-500',
  'gray': 'bg-gradient-to-r from-slate-600 to-slate-400',
  'orange': 'bg-gradient-to-r from-orange-500 to-amber-400',
  'teal': 'bg-gradient-to-r from-teal-600 to-emerald-400',
};

export default function Clinics() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClinics() {
      // UPDATED: Fetch sorted by 'sort_order' first, then 'clinic_number'
      const { data } = await supabase
        .from('clinics')
        .select('*')
        .order('sort_order', { ascending: true }) 
        .order('clinic_number', { ascending: true });
        
      setClinics(data || []);
      setLoading(false);
    }
    fetchClinics();
  }, []);

  if (loading) return <div className="text-center py-40 text-teal-600 font-bold">جاري تحميل العيادات...</div>;

  return (
    <div className="font-sans text-right bg-gray-50 min-h-screen" dir="rtl">
        
        {/* Header Section */}
        <div className="bg-white py-16 mb-10">
            <div className="container mx-auto px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-blue-900">العيادات التخصصية</h1>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                   جميع العيادات متاحة لخدمتكم بأعلى معايير الجودة وتحت إشراف نخبة من الاستشاريين
                </p>
                
                {/* Stats Icons */}
                <div className="flex justify-center gap-12 mt-12 border-t pt-8 w-fit mx-auto px-10">
                    <div className="text-center">
                        <i className="fas fa-hospital text-3xl text-teal-500 mb-2"></i>
                        <span className="block text-2xl font-bold text-gray-800">18</span>
                        <span className="text-xs text-gray-400">عيادة متخصصة</span>
                    </div>
                    <div className="text-center">
                        <i className="fas fa-user-md text-3xl text-blue-500 mb-2"></i>
                        <span className="block text-2xl font-bold text-gray-800">+35</span>
                        <span className="text-xs text-gray-400">طبيب استشاري</span>
                    </div>
                    <div className="text-center">
                        <i className="fas fa-smile text-3xl text-yellow-500 mb-2"></i>
                        <span className="block text-2xl font-bold text-gray-800">+1000</span>
                        <span className="text-xs text-gray-400">مريض راضٍ</span>
                    </div>
                </div>
            </div>
        </div>

      <div className="container mx-auto px-6 pb-20">
        
        {/* Subtitle */}
        <div className="text-center mb-10">
             <h2 className="text-2xl font-bold text-teal-600">جميع العيادات المتاحة</h2>
             <p className="text-sm text-gray-400">تصفح التخصصات واحجز موعدك الآن</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {clinics.map((clinic) => {
            const Icon = iconMap[clinic.icon_name] || iconMap['default'];
            const gradientClass = gradientMap[clinic.color] || gradientMap['blue'];

            return (
              <div key={clinic.id} className="group">
                  {/* Upper Colored Card */}
                  <Link to={`/clinics/${clinic.id}`}>
                    <div 
                        className={`rounded-t-2xl p-6 h-40 relative shadow-md transition-transform duration-300 group-hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${gradientClass}`}
                    >
                        {/* Number Badge */}
                        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold font-mono border border-white/30">
                            {clinic.clinic_number}
                        </div>

                        {/* Icon */}
                        <div className="self-end mt-2 transform group-hover:scale-110 transition duration-300">
                            {Icon}
                        </div>

                        {/* Name */}
                        <h3 className="text-white font-bold text-lg text-right mt-auto drop-shadow-sm">
                            {clinic.name}
                        </h3>
                    </div>
                  </Link>

                  {/* Bottom White Info Section */}
                  <div className="bg-white rounded-b-2xl p-4 shadow-sm border border-t-0 border-gray-100 group-hover:shadow-md transition">
                      
                      {/* Availability */}
                      <div className="flex items-center justify-end gap-2 text-gray-500 text-xs font-bold mb-3">
                          <span>متاح يومياً 8 ص - 8 م</span>
                          <Clock size={14} className="text-purple-400" />
                      </div>

                      {/* Phone */}
                      <div className="flex items-center justify-end gap-2 text-gray-400 text-xs font-medium dir-ltr">
                          <span className="font-mono">777552666</span>
                          <Phone size={14} className="text-teal-500" />
                      </div>
                  </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}