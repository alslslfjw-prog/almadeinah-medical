import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // تأكد أن المسار صحيح
import { Link } from 'react-router-dom';
import { 
  Search, ArrowRight, X, Activity, Clock, 
  AlertCircle, FileText, CheckCircle, Filter, 
  TestTube, HeartPulse, ShieldAlert
} from 'lucide-react';

export default function AllTests() {
  const [testsData, setTestsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [categories, setCategories] = useState(['الكل']);

  // جلب البيانات من Supabase عند تحميل الصفحة
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('medical_tests_guide')
          .select('*')
          .order('category', { ascending: true });

        if (error) throw error;

        if (data) {
          setTestsData(data);
          // استخراج الفئات الفريدة من البيانات القادمة من قاعدة البيانات
          const uniqueCategories = ["الكل", ...new Set(data.map(item => item.category))];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error fetching medical tests:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  // تصفية البيانات (Filter Logic)
  const filteredTests = testsData.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'الكل' || test.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-right font-sans" dir="rtl">
      
      {/* Header Sticky */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title & Back Button */}
            <div className="flex items-center gap-4">
                <Link to="/examinations" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-teal-500 hover:text-white transition">
                    <ArrowRight size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-blue-900">دليل الفحوصات الشامل</h1>
                    <p className="text-xs text-gray-500">مركز المدينة الطبي</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-96">
                <input 
                    type="text" 
                    placeholder="ابحث عن اسم الفحص (مثال: سكر، فيتامين د)..." 
                    className="w-full bg-gray-100 border-none rounded-full py-2.5 px-5 pr-10 focus:ring-2 focus:ring-teal-500 transition text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            </div>
        </div>
        
        {/* Categories Scroller */}
        <div className="border-t border-gray-100 bg-white">
            <div className="container mx-auto px-6 py-3 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition
                                ${activeCategory === cat 
                                    ? 'bg-teal-600 text-white shadow-md' 
                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="container mx-auto px-6 py-8">
        
        {loading ? (
            <div className="text-center py-20 text-gray-500">
                <Activity size={32} className="mx-auto mb-2 animate-spin text-teal-600" />
                <p>جاري تحميل دليل الفحوصات...</p>
            </div>
        ) : filteredTests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTests.map((test) => (
                    <div 
                        key={test.id} 
                        onClick={() => setSelectedTest(test)}
                        className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all duration-300 cursor-pointer group flex flex-col h-full"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <TestTube size={20} />
                            </div>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md">{test.category}</span>
                        </div>
                        
                        <h3 className="font-bold text-gray-800 text-base mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                            {test.name}
                        </h3>
                        
                        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-4 flex-grow">
                            {test.about}
                        </p>
                        
                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                            <span className="text-gray-400 flex items-center gap-1">
                                <Activity size={12} /> اضغط للتفاصيل
                            </span>
                            <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition">
                                <ArrowRight size={12} className="rotate-180" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <Filter size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-600">لا توجد نتائج مطابقة</h3>
                <p className="text-gray-400 mt-2">حاول البحث بكلمة مختلفة أو تغيير التصنيف</p>
                <button onClick={() => {setSearchTerm(''); setActiveCategory('الكل');}} className="mt-4 text-teal-600 font-bold hover:underline">
                    عرض جميع الفحوصات
                </button>
            </div>
        )}

      </div>

      {/* --- POPUP MODAL (التفاصيل) --- */}
      {selectedTest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-fadeIn">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
                onClick={() => setSelectedTest(null)}
            ></div>

            {/* Modal Card */}
            <div className="bg-white rounded-2xl w-full max-w-lg relative z-10 overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-teal-600 p-6 text-white shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold mb-3 inline-block backdrop-blur-md border border-white/10">
                                {selectedTest.category}
                            </span>
                            <h2 className="text-xl md:text-2xl font-bold leading-tight">{selectedTest.name}</h2>
                        </div>
                        <button 
                            onClick={() => setSelectedTest(null)} 
                            className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body (Scrollable) */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    
                    {/* About */}
                    <div className="mb-6">
                        <h4 className="text-blue-900 font-bold mb-3 flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><FileText size={16} /></div>
                            نبذة عن الفحص
                        </h4>
                        <p className="text-gray-600 leading-relaxed text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {selectedTest.about || "لا توجد تفاصيل إضافية متاحة حالياً."}
                        </p>
                    </div>

                    {/* Reasons */}
                    {selectedTest.reasons && selectedTest.reasons.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-blue-900 font-bold mb-3 flex items-center gap-2 text-sm">
                                <div className="p-1.5 bg-teal-100 rounded-lg text-teal-600"><HeartPulse size={16} /></div>
                                لماذا يُطلب هذا الفحص؟
                            </h4>
                            <ul className="space-y-3">
                                {selectedTest.reasons.map((reason, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 bg-teal-50/50 p-3 rounded-lg">
                                        <CheckCircle size={16} className="text-teal-500 mt-0.5 shrink-0" />
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Prep */}
                    <div>
                        <h4 className="text-blue-900 font-bold mb-3 flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-yellow-100 rounded-lg text-yellow-600"><ShieldAlert size={16} /></div>
                            التجهيزات المطلوبة
                        </h4>
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-100 flex items-start gap-3">
                            <div className="mt-0.5"><Clock size={18} /></div>
                            <p className="text-sm font-bold leading-relaxed">
                                {selectedTest.prep || "لا توجد تجهيزات خاصة."}
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center shrink-0">
                    <button 
                        onClick={() => setSelectedTest(null)}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-teal-500/20"
                    >
                        حسناً، فهمت
                    </button>
                </div>

            </div>
        </div>
      )}

    </div>
  );
}