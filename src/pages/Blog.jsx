import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Search, ArrowLeft, Heart, Activity, Apple, Baby, Stethoscope } from 'lucide-react';

// خريطة الأيقونات لتحويل النص من القاعدة إلى أيقونة
const iconMap = {
  'Heart': <Heart size={16} />,
  'Activity': <Activity size={16} />,
  'Apple': <Apple size={16} />,
  'Baby': <Baby size={16} />,
  'default': <Stethoscope size={16} />
};

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('الكل');

  // جلب المقالات من قاعدة البيانات
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setPosts(data);
      } catch (error) {
        console.error('Error fetching blogs:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // استخراج الأقسام الفريدة من البيانات تلقائياً
  const categories = ['الكل', ...new Set(posts.map(post => post.category))];

  // فلترة المقالات
  const filteredPosts = activeCategory === 'الكل' 
    ? posts 
    : posts.filter(post => post.category === activeCategory);

  const featuredPost = posts.find(post => post.is_featured);

  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen" dir="rtl">
      
      {/* --- Hero Section --- */}
      <section className="bg-white pt-16 pb-12 border-b border-gray-100">
        <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center">
                <span className="inline-block text-teal-600 font-bold bg-teal-50 px-4 py-1.5 rounded-full text-sm mb-6 border border-teal-100">
                    المدونة الطبية
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-blue-900 leading-tight mb-6">
                    نصائح طبية ومقالات <span className="text-teal-500">لصحتك</span>
                </h1>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                    اكتشف أحدث المقالات الطبية، ونصائح التغذية، والمعلومات الصحية الموثوقة المقدمة من نخبة أطباء مركز المدينة الطبي.
                </p>

                {/* Search Bar */}
                <div className="max-w-xl mx-auto relative">
                    <input 
                        type="text" 
                        placeholder="ابحث عن مقال، مرض، أو نصيحة طبية..." 
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-4 px-6 pr-14 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition shadow-sm"
                    />
                    <Search className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
                    <button className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-teal-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-600 transition">
                        بحث
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* --- Main Content --- */}
      <section className="py-12">
        <div className="container mx-auto px-6 max-w-6xl">
            
            {loading ? (
                <div className="text-center py-20 text-teal-600 font-bold">جاري تحميل المقالات...</div>
            ) : (
                <>
                    {/* Categories Filter */}
                    <div className="flex overflow-x-auto gap-3 pb-6 mb-8 no-scrollbar">
                        {categories.map((cat, index) => (
                            <button 
                                key={index}
                                onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                                    activeCategory === cat 
                                    ? 'bg-blue-900 text-white shadow-md' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Featured Article */}
                    {activeCategory === 'الكل' && featuredPost && (
                        <div className="mb-16">
                            <Link to={`/blog/${featuredPost.id}`} className="group block">
                                <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-shadow duration-500 border border-gray-100 grid md:grid-cols-2">
                                    <div className="h-64 md:h-full overflow-hidden relative">
                                        <img 
                                            src={featuredPost.image_url} 
                                            alt={featuredPost.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-teal-600 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                                            {iconMap[featuredPost.icon_name] || iconMap['default']} {featuredPost.category}
                                        </div>
                                    </div>
                                    <div className="p-8 md:p-12 flex flex-col justify-center">
                                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 font-medium">
                                            <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(featuredPost.created_at).toLocaleDateString('ar-EG')}</span>
                                            <span className="flex items-center gap-1"><Clock size={14}/> {featuredPost.read_time}</span>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-black text-blue-900 mb-4 group-hover:text-teal-600 transition-colors leading-tight">
                                            {featuredPost.title}
                                        </h2>
                                        <p className="text-gray-500 leading-relaxed mb-8 line-clamp-3">
                                            {featuredPost.excerpt}
                                        </p>
                                        <div className="mt-auto inline-flex items-center gap-2 text-teal-600 font-bold group-hover:gap-3 transition-all">
                                            اقرأ المقال كاملاً <ArrowLeft size={18} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )}

                    {/* Articles Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.filter(post => !post.is_featured || activeCategory !== 'الكل').map((post) => (
                            <Link to={`/blog/${post.id}`} key={post.id} className="group block h-full">
                                <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col">
                                    <div className="h-56 overflow-hidden relative">
                                        <img 
                                            src={post.image_url} 
                                            alt={post.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-teal-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                            {iconMap[post.icon_name] || iconMap['default']} {post.category}
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                                            {post.title}
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-6 line-clamp-3 leading-relaxed">
                                            {post.excerpt}
                                        </p>
                                        <div className="mt-auto flex justify-between items-center text-xs text-gray-400 border-t border-gray-50 pt-4 font-medium">
                                            <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(post.created_at).toLocaleDateString('ar-EG')}</span>
                                            <span className="flex items-center gap-1"><Clock size={14}/> {post.read_time}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {filteredPosts.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-100">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Search size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد مقالات في هذا القسم حالياً</h3>
                        </div>
                    )}
                </>
            )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-br from-blue-900 to-teal-500 text-white text-center mt-8">
        <div className="container mx-auto px-6 max-w-2xl">
            <h2 className="text-3xl font-black mb-4">اشترك في نشرتنا الطبية</h2>
            <p className="text-blue-100 mb-8 leading-relaxed">
                احصل على أحدث النصائح الطبية، والمقالات، وعروض المركز مباشرة إلى بريدك الإلكتروني.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <input 
                    type="email" 
                    placeholder="أدخل بريدك الإلكتروني" 
                    className="px-6 py-4 rounded-xl text-gray-800 w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
                <button className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition">
                    اشتراك الآن
                </button>
            </div>
        </div>
      </section>

    </div>
  );
}