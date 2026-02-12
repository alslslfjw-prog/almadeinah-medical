import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  Activity, Microscope, Zap, Dna, Droplet, Shield, 
  AlertTriangle, BadgeCheck, ShieldCheck,
  Package, ClipboardList, ArrowLeft, FlaskConical 
} from 'lucide-react';

// 1. خريطة الأيقونات (استخدمنا فقط الأيقونات المضمونة لتجنب الأخطاء)
const iconMap = {
  'Activity': <Activity size={28} />,
  'Microscope': <Microscope size={28} />,
  'Zap': <Zap size={28} />,
  'Dna': <Dna size={28} />,
  'Droplet': <Droplet size={28} />,
  'Shield': <Shield size={28} />,
  'Bug': <Microscope size={28} />, // استبدلنا Bug بـ Microscope للأمان
  'Flask': <FlaskConical size={28} />,
  'Virus': <Activity size={28} />, // استبدال مؤقت
  'Heart': <Activity size={28} />, // استبدال مؤقت
  'Syringe': <FlaskConical size={28} />, // استبدال مؤقت
  'Scan': <Activity size={28} />, // استبدال مؤقت
  'default': <Activity size={28} />
};

// 2. قائمة الألوان (Safelist)
// وجود هذه المصفوفة في الكود يجبر Tailwind على تحميل هذه الألوان وعدم حذفها
// حتى لو كانت قادمة من قاعدة البيانات
const colorSafelist = [
  'bg-red-600',
  'bg-teal-600',
  'bg-orange-500',
  'bg-green-600',
  'bg-teal-500',
  'bg-purple-600',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-emerald-600',
  'bg-violet-600'
];

export default function Examinations() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExaminations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('examinations')
          .select('*')
          .order('id');
        
        if (error) throw error;
        if (data) setTests(data);
      } catch (error) {
        console.error('Error fetching examinations:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExaminations();
  }, []);

  const safetyStandards = [
    "إبلاغ المسؤول عن كافة الإصابات، والحوادث، والكسور الناتجة عن الزجاج أو المعدات الموجودة.",
    "ربط الشعر، وتغطيته لتلافي تعرضه للهب.",
    "اختيار الألبسة والأحذية الملائمة لبيئة المختبر، والحذر من لمس الألبسة الفضفاضة للنار، أو المواد الكيميائية.",
    "اتباع كافة الإرشادات والتوجيهات التي يعطيها مشرف المختبر.",
    "تجنب الأكل، والشرب في المختبر في كل الأوقات.",
    "تجنب الجلوس على طاولات المختبر.",
    "عدم التخلص من المواد الصلبة في المغاسل.",
    "عدم تذوق أو شم أي مادة كيميائية.",
    "الالتزام باستخدام النظارات المخصصة للمختبرات لحماية العين عند تسخين المواد، أو التشريح، أو غير ذلك.",
    "تجنب إجراء التجارب غير المُصرَّح بها.",
    "الحفاظ على مكان العمل نظيفاً قبل مغادرة المختبر.",
    "تجنب رفع المحاليل الكيميائية، أو الأوعية الزجاجية، أو أي من الأجهزة فوق مستوى العين."
  ];

  return (
    <div className="font-sans text-gray-800 bg-gray-50" dir="rtl">
      
      {/* Hero Section */}
      <section className="relative bg-white pt-16 pb-24 overflow-hidden">
        <div className="container mx-auto px-6 flex flex-col items-center text-center relative z-10">
             <span className="inline-block text-teal-600 font-bold bg-teal-50 px-4 py-1.5 rounded-full text-sm mb-6 border border-teal-100">
               خدمات المختبر والتحاليل
             </span>
             <h1 className="text-4xl md:text-6xl font-black text-blue-900 mb-6 leading-tight">
               دقة في التحليل.. <span className="text-teal-500">ثقة في النتائج</span>
             </h1>
             <p className="text-gray-500 text-lg mb-4 max-w-2xl leading-relaxed">
               نفتخر في مركز المدينة بامتلاكنا واحداً من أكثر المختبرات تطوراً، حيث نجمع بين الخبرة الطبية العريقة وأحدث التقنيات العالمية لضمان سلامتك.
             </p>
        </div>
      </section>

      {/* --- Main Categories Navigation --- */}
      <section className="relative z-20 -mt-16 pb-12">
        <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                
                {/* 1. All Tests Card */}
                <Link to="/examinations/all-tests" className="group">
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-100"></div>
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                                <ClipboardList size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">دليل الفحوصات</h3>
                                <p className="text-gray-500 text-sm">استعرض قائمة شاملة لجميع الفحوصات الفردية</p>
                            </div>
                        </div>
                        <div className="relative z-10 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <ArrowLeft size={20} />
                        </div>
                    </div>
                </Link>

                {/* 2. Packages Card */}
                <Link to="/examinations/packages" className="group">
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-teal-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-teal-100"></div>
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                                <Package size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-1 group-hover:text-teal-700 transition-colors">باقات الفحوصات</h3>
                                <p className="text-gray-500 text-sm">باقات متكاملة وموفرة لصحتك وصحة عائلتك</p>
                            </div>
                        </div>
                        <div className="relative z-10 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                            <ArrowLeft size={20} />
                        </div>
                    </div>
                </Link>

            </div>
        </div>
      </section>

      {/* Dynamic Examinations Grid (Departments) */}
      <section className="pb-20 bg-gray-50 pt-10">
        <div className="container mx-auto px-6">
          
            <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-gray-800">أقسام المختبر التخصصية</h2>
                <div className="h-1 w-20 bg-teal-500 mx-auto mt-4 rounded-full"></div>
            </div>

          {loading ? (
            <div className="text-center py-20">
               <i className="fas fa-spinner fa-spin text-4xl text-teal-600 mb-4"></i>
               <p className="text-gray-500">جارٍ تحميل أقسام المختبر...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {tests.map((test) => {
                // 1. الأيقونة
                const iconKey = test.icon_class ? test.icon_class.trim() : 'default';
                const Icon = iconMap[iconKey] || iconMap['default'];
                
                // 2. اللون (مع تنظيف المسافات)
                const dbColor = test.header_color ? test.header_color.trim() : 'bg-blue-600';
                // نستخدم اللون من الداتا، وإذا لم يكن موجوداً نستخدم الأزرق كلون افتراضي
                const headerColorClass = dbColor;

                return (
                  <Link to={`/examinations/${test.id}`} key={test.id} className="block h-full">
                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-shadow duration-300 border border-gray-100 group flex flex-col h-full cursor-pointer">
                        
                        {/* Header Section - تم الإصلاح */}
                        <div className={`${headerColorClass} p-5 flex justify-between items-center text-white relative overflow-hidden transition-colors duration-300`}>
                            <div>
                                <h3 className="font-bold text-xl mb-1">{test.title}</h3>
                                <p className="text-xs text-white/80 font-mono tracking-wider uppercase">{test.title_en}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-inner">
                                {Icon}
                            </div>
                            <div className="absolute -left-4 -bottom-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        </div>
                        
                        {/* Image */}
                        <div className="h-56 overflow-hidden bg-gray-100 relative">
                            <img 
                                src={test.image_url} 
                                alt={test.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-60"></div>
                        </div>

                        {/* Description */}
                        <div className="p-8 flex-grow">
                            <p className="text-gray-600 leading-loose text-justify text-sm md:text-base">
                                {test.description}
                            </p>
                        </div>

                        {/* Devices Footer */}
                        <div className="px-8 pb-8">
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                <h4 className="text-teal-600 font-bold text-sm mb-2 flex items-center gap-2">
                                    <i className="fas fa-microchip"></i>
                                    الأجهزة المستخدمة:
                                </h4>
                                <p className="text-gray-500 text-xs font-mono dir-ltr leading-relaxed" dir="ltr">
                                    {test.devices || "أحدث الأجهزة العالمية"}
                                </p>
                            </div>
                        </div>

                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* --- قسم ضبط الجودة --- */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                <span className="text-teal-600 font-bold text-sm bg-teal-50 px-3 py-1 rounded-full">الجودة والدقة</span>
                <h2 className="text-3xl font-bold text-blue-900 mt-2">أنواع ضبط الجودة في المختبرات الطبية</h2>
                <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
                    يهدف ضبط الجودة للوصول إلى النتائج المرجوة من الكفاءة والدقة لضمان سلامة التشخيص.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
                <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100 flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Activity size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-blue-900 mb-2">ضبط الجودة الداخلي</h3>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            يُعنى بالمتابعة اليومية الدقيقة لصحة نتائج التحاليل عن طريق قياس عينات عشوائية، ومقارنتها بقيمها الحقيقية للتأكد من دقة عمل أجهزة المختبر الطبي وقدرته على إصدار النتائج نفسها يومياً.
                        </p>
                    </div>
                </div>

                <div className="bg-teal-50 rounded-3xl p-8 border border-teal-100 flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-teal-900 mb-2">ضبط الجودة الخارجي</h3>
                        <p className="text-gray-600 leading-relaxed text-sm">
                             يشمل المتابعة الطويلة في أداء المختبر مقارنة بالمختبرات الدولية الأخرى، عن طريق مشاركتها ببرامج خاصة ومقارنة النتائج بمعامل دولية للتأكد من مدى صحتها.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-12">
                <h3 className="text-xl font-bold text-gray-800 mb-8 border-r-4 border-teal-500 pr-4">
                    شروط ضبط الجودة في المختبرات الطبية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        "توفر كفاءة في الاختصاصيين والفنيين",
                        "دقة المحاليل الطبية المستخدمة",
                        "الأجهزة الطبية المتطورة",
                        "استخدام تكنولوجيا المعلومات الحديثة"
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                            <BadgeCheck className="text-blue-600 shrink-0" size={24} />
                            <span className="font-bold text-gray-700 text-sm">{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </section>

      {/* --- قسم معايير السلامة --- */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px]"></div>
            <div className="absolute left-0 bottom-0 w-96 h-96 bg-teal-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                <div>
                    <h2 className="text-3xl font-bold mb-2">معايير السلامة في المختبرات</h2>
                    <p className="text-gray-400">نلتزم بأقصى درجات الحيطة والحذر لضمان سلامة المرضى والطاقم الطبي</p>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="text-yellow-400" size={24} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {safetyStandards.map((rule, idx) => (
                    <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition duration-300 flex gap-4 items-start">
                        <div className="text-teal-400 font-bold text-lg opacity-50 font-mono">
                            {String(idx + 1).padStart(2, '0')}
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {rule}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      </section>

    </div>
  );
};