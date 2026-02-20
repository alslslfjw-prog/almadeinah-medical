import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, User, ArrowRight, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';

export default function BlogDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPost(data);
      } catch (error) {
        console.error('Error fetching blog details:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
    // Scroll to top when page loads
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-teal-600 font-bold">جاري تحميل المقال...</div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">المقال غير موجود.</div>;

  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen pb-20" dir="rtl">
      
      {/* Breadcrumb & Back Button */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-teal-600 font-bold transition mb-6">
            <ArrowRight size={20} /> العودة للمدونة
        </Link>
      </div>

      {/* Header Image */}
      <div className="container mx-auto px-6 max-w-5xl mb-12">
        <div className="w-full h-[400px] md:h-[500px] rounded-[2rem] overflow-hidden shadow-xl relative">
            <img 
                src={post.image_url} 
                alt={post.title} 
                className="w-full h-full object-cover"
            />
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md text-teal-600 px-5 py-2 rounded-full text-sm font-bold shadow-lg">
                {post.category}
            </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 md:p-12 -mt-24 relative z-10">
            
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium mb-8 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <User size={18} className="text-teal-500" />
                    <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-teal-500" />
                    <span>{new Date(post.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-teal-500" />
                    <span>{post.read_time} قراءة</span>
                </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-blue-900 leading-tight mb-10">
                {post.title}
            </h1>

            {/* Article HTML Content */}
            {/* نحن نستخدم dangerouslySetInnerHTML لأن المحتوى في القاعدة محفوظ بصيغة HTML ليسمح بالعناوين والقوائم */}
            <div 
                className="prose prose-lg prose-teal max-w-none text-gray-600 leading-loose
                prose-headings:text-blue-900 prose-headings:font-bold prose-h3:text-2xl prose-h4:text-xl
                prose-a:text-teal-500 hover:prose-a:text-teal-600
                prose-li:marker:text-teal-500"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Share Section */}
            <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <span className="font-bold text-gray-800 flex items-center gap-2">
                    <Share2 size={20} className="text-teal-500" />
                    شارك المقال:
                </span>
                <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition">
                        <Facebook size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center hover:bg-sky-500 hover:text-white transition">
                        <Twitter size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center hover:bg-blue-700 hover:text-white transition">
                        <Linkedin size={18} />
                    </button>
                </div>
            </div>

        </div>
      </div>

    </div>
  );
}