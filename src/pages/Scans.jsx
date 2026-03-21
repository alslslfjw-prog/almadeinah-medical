import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

// Cycle through these for category badge backgrounds
const COLOR_SCHEMES = [
  'bg-blue-100 text-blue-600',
  'bg-orange-100 text-orange-600',
  'bg-indigo-100 text-indigo-600',
  'bg-teal-100 text-teal-600',
  'bg-pink-100 text-pink-600',
  'bg-red-100 text-red-600',
  'bg-purple-100 text-purple-600',
  'bg-green-100 text-green-600',
];

const Scans = () => {
  const [categories,    setCategories]    = useState([]);
  const [uncategorized, setUncategorized] = useState([]);
  const [equipmentsList,setEquipmentsList]= useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch categories with their child scans
        const { data: cats, error: catsErr } = await supabase
          .from('scan_categories')
          .select('*, scans(*)')
          .order('display_order', { ascending: true });
        if (catsErr) throw catsErr;
        setCategories(cats || []);

        // 2. Fetch scans with no category assigned
        const { data: uncat } = await supabase
          .from('scans')
          .select('*')
          .is('category_id', null);
        setUncategorized(uncat || []);

        // 3. Fetch equipments
        const { data: equip, error: equipErr } = await supabase
          .from('equipments')
          .select('*')
          .order('id', { ascending: true });
        if (equipErr) throw equipErr;
        setEquipmentsList(equip || []);

      } catch (error) {
        console.error('Error fetching scans data:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build the full list: DB categories + optional "Other" bucket
  const allGroups = [
    ...categories,
    ...(uncategorized.length > 0
      ? [{ id: 'other', name: 'أخرى', icon_class: 'fas fa-list', image_url: null, scans: uncategorized }]
      : []),
  ];

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
            <div className="text-center py-10 text-teal-600 font-bold">جارٍ تحميل الخدمات...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allGroups.map((group, index) => {
                const colorScheme = COLOR_SCHEMES[index % COLOR_SCHEMES.length];
                const scansInGroup = group.scans || [];

                return (
                  <div key={group.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full group">

                    {/* Category image header */}
                    <div className="h-56 overflow-hidden relative bg-gradient-to-br from-blue-900 to-teal-600">
                      {group.image_url && (
                        <img src={group.image_url} alt={group.name}
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-transparent"></div>
                      <div className="absolute bottom-4 right-4 text-white">
                        <h3 className="text-xl font-bold drop-shadow">{group.name}</h3>
                        <span className="text-xs text-blue-200">{scansInGroup.length} خدمة</span>
                      </div>
                      <div className={`absolute top-4 left-4 p-2.5 rounded-xl ${colorScheme}`}>
                        <i className={`${group.icon_class || 'fas fa-x-ray'} text-2xl`}></i>
                      </div>
                    </div>

                    {/* Scans list */}
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex-grow">
                      {scansInGroup.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          <ul className="space-y-2">
                            {scansInGroup.map((scan) => (
                              <li key={scan.id}>
                                <Link
                                  to={`/scans/${scan.id}`}
                                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-teal-200 hover:shadow-sm hover:translate-x-1 transition-all duration-200"
                                >
                                  <span className="text-sm font-bold text-gray-700">{scan.name}</span>
                                  <ChevronLeft size={16} className="text-teal-500 shrink-0" />
                                </Link>
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

              {allGroups.length === 0 && (
                <div className="col-span-3 text-center py-20 text-gray-400">
                  لا توجد فئات بعد. أضف الفئات من لوحة التحكم.
                </div>
              )}
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

                  {/* Image */}
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

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="mb-4 text-right">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{item.name}</h3>
                        <p className="text-gray-400 text-sm font-medium dir-ltr" dir="ltr">{item.description}</p>
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