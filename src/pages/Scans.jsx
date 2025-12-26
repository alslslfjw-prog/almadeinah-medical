import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  Activity, Zap, Eye, ChevronLeft, 
  LayoutGrid, HeartPulse
} from 'lucide-react';

const Scans = () => {
  const [scansList, setScansList] = useState([]);
  const [equipmentsList, setEquipmentsList] = useState([]);
  // State specifically for the Endoscopy table
  const [endoscopyList, setEndoscopyList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [structuredScans, setStructuredScans] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Main Scans Categories
        const { data: scansData, error: scansError } = await supabase
          .from('scans')
          .select('*')
          .order('id', { ascending: true });
        if (scansError) throw scansError;
        setScansList(scansData || []);

        // 2. Fetch Equipments
        const { data: equipmentsData, error: equipError } = await supabase
          .from('equipments')
          .select('*')
          .order('id', { ascending: true });
        if (equipError) throw equipError;
        setEquipmentsList(equipmentsData || []);

        // 3. Fetch from the specific "Gastrointestinal-and-Liver-Endoscopy" table
        const { data: endoscopyData, error: endoError } = await supabase
            .from('gastrointestinal_and_liver_endoscopy')
            .select('*');
        
        if (endoError) throw endoError;
        setEndoscopyList(endoscopyData || []);

      } catch (error) {
        console.error('Error fetching data:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- LOGIC: Group Scans ---
  useEffect(() => {
    if (scansList.length > 0) {
      
      const findScan = (name) => scansList.find(s => s.name && s.name.includes(name));
      const getID = (name) => findScan(name)?.id;

      const groups = [
        {
          title: "الأشعة المقطعية",
          type: "single",
          id: getID("الأشعة المقطعية") || getID("المقطعية"), 
          icon: <LayoutGrid size={40} />,
          bg: "bg-blue-100 text-blue-600",
          image: "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/equipment-images/ct-scan.jpg.png"
        },
        {
          // UPDATED: Fetches children from the specific 'endoscopyList' state
          title: "مناظير الجهاز الهضمي والكبد",
          type: "parent",
          icon: <Eye size={40} />,
          bg: "bg-orange-100 text-orange-600",
          image: "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/equipment-images/Gastrointestinal-and-Liver-Endoscopy.png",
          children: endoscopyList.map(item => ({ name: item.name, id: null })) 
        },
        {
          title: "الأشعة السينية الرقمية",
          type: "parent",
          icon: <Zap size={40} />,
          bg: "bg-indigo-100 text-indigo-600",
          image: "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/equipment-images/xray.jpg.png",
          children: [
            "الاشعة السينية للعظام",
            "الاشعة السينية للصدر",
            "الاشعة السينية للبطن",
            "فحص الكلى بالصبغة I.V.U",
            "فحص القولون بصبغة الباريوم",
            "اشعة الصبغة للرحم وقنوات فالوب",
            "فحص البلعوم والمعده بصبغة الباريوم"
          ].map(name => ({ name, id: getID(name) })).filter(c => c.id)
        },
        {
          title: "التصوير بالموجات فوق الصوتية",
          type: "parent",
          icon: <Activity size={40} />,
          bg: "bg-teal-100 text-teal-600",
          image: "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/equipment-images/ultrasound.jpg.png",
          children: [
            "الموجات فوق الصوتية للبطن",
            "تصوير البروستات بالموجات فوق الصوتية",
            "تصوير الغدة الدرقية بالموجات فوق الصوتية",
            "تصوير الخصية بالموجات فوق الصوتية",
            "تصوير الاوعية الدمويه - الدوبلر",
            "إيكو القلب (Echo)"
          ].map(name => ({ name, id: getID(name) })).filter(c => c.id)
        },
        {
          title: "أشعة الماموجرام وتخطيطات أخرى",
          type: "parent",
          icon: <HeartPulse size={40} />,
          bg: "bg-pink-100 text-pink-600",
          image: "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/equipment-images/mammogram.jpg.png",
          children: [
            "أشعة الماموجرام",
            "تخطيط كهربية القلب (ECG)",
            "تخطيط كهربية الدماغ (EEG)"
          ].map(name => ({ name, id: getID(name) || getID(name.split(' ')[0]) })).filter(c => c.id)
        }
      ];

      setStructuredScans(groups);
    }
  }, [scansList, endoscopyList]); // Added endoscopyList to dependency array

  return (
    <div className="font-sans text-gray-800 bg-white" dir="rtl">
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 pb-20 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            
            {/* Text Side */}
            <div className="lg:w-1/2 text-center lg:text-right z-10 order-2 lg:order-1">
               <span className="inline-block py-1.5 px-4 rounded-full bg-teal-100 text-teal-700 text-sm font-bold mb-6 shadow-sm">
                  <i className="fas fa-hospital-alt ml-2"></i>
                  مركز المدينة الطبي التخصصي
               </span>
               <h1 className="text-4xl md:text-6xl font-bold text-blue-900 leading-tight mb-6">
                  الجيل الجديد <br/> <span className="text-teal-500">للرعاية الصحية</span>
               </h1>
               <p className="text-gray-500 text-lg mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  نقدم أحدث تقنيات التصوير الطبي والتشخيص بأعلى معايير الجودة والدقة لضمان صحتك وراحتك، مع نخبة من أفضل الأطباء والاستشاريين.
               </p>
               
               <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <button className="bg-blue-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    احجز موعد الآن
                  </button>
                  <button className="bg-white text-blue-900 border-2 border-blue-100 px-8 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition">
                    تعرف علينا
                  </button>
               </div>
            </div>

            {/* Image Side */}
            <div className="lg:w-1/2 relative order-1 lg:order-2">
               <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
                  <img
                    src="https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/equipment-images/ct-scan.jpg.png"
                    alt="CT Scan Machine"
                    className="w-full h-[400px] md:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg flex justify-between items-center text-center border border-gray-100">
                      <div className="flex-1">
                         <span className="block text-2xl md:text-3xl font-bold text-blue-900">+1400</span>
                         <span className="text-xs text-gray-500 font-bold">مريض سعيد</span>
                      </div>
                      <div className="w-px h-10 bg-gray-200"></div>
                      <div className="flex-1">
                         <span className="block text-2xl md:text-3xl font-bold text-teal-500">+5</span>
                         <span className="text-xs text-gray-500 font-bold">طبيب متخصص</span>
                      </div>
                      <div className="w-px h-10 bg-gray-200"></div>
                      <div className="flex-1">
                         <span className="block text-2xl md:text-3xl font-bold text-blue-900">5</span>
                         <span className="text-xs text-gray-500 font-bold">غرفة مجهزة</span>
                      </div>
                  </div>
               </div>
               <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-teal-100/50 rounded-full blur-3xl opacity-50"></div>
            </div>

          </div>
        </div>
      </section>

      {/* --- SERVICES / SCANS SECTION --- */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-blue-900 mb-3">خدمات التشخيص المتقدمة</h2>
            <p className="text-gray-500">نوفر مجموعة واسعة من خدمات الفحص الطبي بأعلى معايير الجودة</p>
          </div>

          {loading ? (
            <div className="text-center py-10">جارٍ تحميل الخدمات...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {structuredScans.map((group, index) => {
                
                // CASE 1: Single Scan
                if (group.type === 'single') {
                  return (
                    <Link to={group.id ? `/scans/${group.id}` : '#'} key={index} className="block group h-full">
                      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
                        <div className="h-64 overflow-hidden relative">
                           <img src={group.image} alt={group.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                           <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-xl p-2 shadow-sm">
                              {group.icon}
                           </div>
                        </div>
                        <div className="p-6 flex flex-col flex-grow items-center justify-center text-center">
                           <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-teal-600 transition-colors">
                             {group.title}
                           </h3>
                           <span className="text-sm text-gray-400">اضغط لعرض التفاصيل</span>
                        </div>
                      </div>
                    </Link>
                  );
                }

                // CASE 2: Parent Category
                return (
                  <div key={index} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full group">
                     <div className="h-56 overflow-hidden relative">
                        <img src={group.image} alt={group.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-transparent"></div>
                        <div className="absolute bottom-4 right-4 text-white">
                           <h3 className="text-xl font-bold">{group.title}</h3>
                        </div>
                        <div className={`absolute top-4 left-4 p-2 rounded-lg ${group.bg}`}>
                           {group.icon}
                        </div>
                     </div>

                     <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                        {group.children.length > 0 ? (
                          <div className="max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                            <ul className="space-y-2">
                                {group.children.map((child, cIdx) => (
                                <li key={cIdx}>
                                    {child.id ? (
                                        <Link 
                                        to={`/scans/${child.id}`}
                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-teal-200 hover:shadow-sm hover:translate-x-1 transition-all duration-200 cursor-pointer"
                                        >
                                        <span className="text-sm font-bold text-gray-700">{child.name}</span>
                                        <ChevronLeft size={16} className="text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                                            <span className="text-sm font-bold text-gray-700">{child.name}</span>
                                        </div>
                                    )}
                                </li>
                                ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            جاري إضافة الخدمات الفرعية...
                          </div>
                        )}
                     </div>
                  </div>
                );

              })}
            </div>
          )}
        </div>
      </section>

      {/* --- EQUIPMENTS SECTION --- */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-blue-900 mb-3">المعدات الطبية</h2>
            <p className="text-gray-500">أحدث الأجهزة الطبية لتشخيص دقيق وآمن</p>
          </div>

          {loading ? (
             <div className="text-center py-10">جارٍ تحميل المعدات...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {equipmentsList.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 group flex flex-col">
                  
                  {/* Image Container */}
                  <div className="relative h-64 overflow-hidden bg-gray-100">
                    <img 
                      src={item.image_url || "https://via.placeholder.com/400x300"} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                    {item.badge && (
                      <span className="absolute top-4 right-4 bg-teal-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm tracking-wider uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="mb-4 text-right">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{item.name}</h3>
                        <p className="text-gray-400 text-sm font-medium dir-ltr" dir="ltr">
                            {item.description}
                        </p>
                    </div>
                    
                    <div className="mt-auto flex justify-end">
                        <Link 
                            to={`/equipments/${item.id}`} 
                            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-teal-200 shadow-lg"
                        >
                            عرض التفاصيل 
                            <i className="fas fa-arrow-left text-xs mt-1"></i>
                        </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Scans;