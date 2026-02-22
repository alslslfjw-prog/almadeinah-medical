import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Phone, Clock, Mail, 
  Facebook, Instagram, Twitter, ChevronLeft 
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0f172a] text-gray-300 pt-16 pb-8 font-sans border-t-4 border-teal-500" dir="rtl">
      <div className="container mx-auto px-6">
        
        {/* الأعمدة الأربعة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* 1. قسم النبذة والشعار */}
          <div className="space-y-6">
            
            {/* الشعار الجديد المضاف */}
            <Link to="/" className="inline-block mb-2">
                <img 
                    src="https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png" 
                    alt="شعار مركز المدينة الطبي" 
                    className="h-16 md:h-20 w-auto object-contain hover:opacity-90 transition-opacity"
                />
            </Link>
            
            <p className="text-gray-400 text-sm leading-relaxed text-justify">
              صرح طبي رائد يهدف إلى تقديم رعاية صحية متكاملة بأحدث التقنيات العالمية وبإشراف نخبة من الكوادر الطبية المتخصصة لضمان سلامتك وسلامة عائلتك.
            </p>

            {/* أيقونات التواصل الاجتماعي */}
            <div className="flex items-center gap-3 pt-2">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300 transform hover:-translate-y-1">
                <Facebook size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all duration-300 transform hover:-translate-y-1">
                <Instagram size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all duration-300 transform hover:-translate-y-1">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* 2. روابط سريعة */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6 border-r-4 border-teal-500 pr-3">روابط سريعة</h3>
            <ul className="space-y-3">
              {[
                { name: 'الرئيسية', path: '/' },
                { name: 'عن المركز', path: '/about' },
                { name: 'الأطباء الاستشاريين', path: '/doctors' },
                { name: 'باقات الفحوصات', path: '/examinations/packages' },
                { name: 'المدونة الطبية', path: '/blog' },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="group flex items-center text-sm hover:text-teal-400 transition-colors">
                    <ChevronLeft size={16} className="text-gray-600 group-hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 ml-1" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. خدماتنا الطبية */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6 border-r-4 border-teal-500 pr-3">خدماتنا الطبية</h3>
            <ul className="space-y-3">
              {[
                { name: 'العيادات التخصصية', path: '/clinics' },
                { name: 'الأشعة التشخيصية', path: '/scans' },
                { name: 'المختبر والتحاليل', path: '/examinations' },
                { name: 'مناظير الجهاز الهضمي', path: '/scans' },
                { name: 'حجز موعد جديد', path: '/' }, 
              ].map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="group flex items-center text-sm hover:text-teal-400 transition-colors">
                    <ChevronLeft size={16} className="text-gray-600 group-hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 ml-1" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. معلومات التواصل */}
          <div>
            <h3 className="text-white text-lg font-bold mb-6 border-r-4 border-teal-500 pr-3">تواصل معنا</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="text-teal-500 mt-1 shrink-0" size={18} />
                <span className="leading-relaxed">
                  اليمن - عدن - المنصورة - السكنية <br /> بجانب مستشفى 22 مايو
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone className="text-teal-500 shrink-0" size={18} />
                <div className="flex flex-col" dir="ltr">
                    <span className="font-mono">777 552 666</span>
                    <span className="font-mono">+967 2 357015 / 358444</span>
                </div>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail className="text-teal-500 shrink-0" size={18} />
                <span className="font-mono">info@almadinamed.com</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Clock className="text-teal-500 shrink-0" size={18} />
                <span>متاحون 24/7 للحالات الطارئة</span>
              </li>
            </ul>
          </div>

        </div>

        {/* الشريط السفلي (حقوق النشر) */}
        <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} مركز المدينة الطبي التخصصي. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition">سياسة الخصوصية</Link>
            <Link to="/terms" className="hover:text-white transition">الشروط والأحكام</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}