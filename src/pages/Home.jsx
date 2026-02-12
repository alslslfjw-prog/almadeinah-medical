import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; 
import { Link, useNavigate } from 'react-router-dom';
import AppointmentWidget from '../components/AppointmentWidget';
import { 
  Building2, User, Activity, FlaskConical, 
  Clock, Award, UserCheck, Microscope,     
  Twitter, Linkedin                         
} from 'lucide-react';

const Home = () => {
  const [doctors, setDoctors] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .not('home_page_order', 'is', null)
          .order('home_page_order', { ascending: true })
          .limit(6);
        
        if (error) throw error;
        if (data) setDoctors(data);
      } catch (error) {
        console.error('Error fetching doctors:', error.message);
      }
    };
    fetchDoctors();
  }, []);

  const handleCardClick = (id) => {
    navigate(`/doctors/${id}`);
  };

  return (
    <div className="font-sans text-gray-800 bg-white" dir="rtl">
      
      {/* 1. Hero Section - (No Changes) */}
      <header className="relative bg-gradient-to-r from-blue-50 to-white pt-8 pb-20 md:pt-12 md:pb-48 overflow-hidden">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-right z-10 pt-4 md:pt-8 order-2 md:order-1">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-blue-900 leading-tight mb-4 md:mb-6">
              أفضل مركز طبي <br />
              <span className="text-teal-500">لعلاجك</span>
            </h1>
            <p className="text-gray-500 text-base md:text-lg mb-6 md:mb-8 leading-relaxed max-w-lg">
              نقدم خدمات طبية متكاملة بأحدث التقنيات العالمية. فريقنا الطبي جاهز لرعايتك على مدار الساعة.
            </p>
            <button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 md:px-8 md:py-3 rounded-full font-bold shadow-lg transition transform hover:-translate-y-1 text-sm md:text-base">
              تواصل معنا
            </button>
          </div>

          <div className="relative z-10 order-1 md:order-2 mb-8 md:mb-0">
            <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl border-4 border-white transform rotate-2 hover:rotate-0 transition duration-500">
              <img 
                src="https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Main-Page-Images/Home-Main.jpeg" 
                alt="Medical Team" 
                className="w-full h-64 md:h-auto object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-white p-3 md:p-4 rounded-xl shadow-lg flex flex-col items-center animate-bounce">
              <span className="text-teal-500 font-bold text-2xl md:text-3xl">+500</span>
              <span className="text-[10px] md:text-xs text-gray-500">حالة شفاء</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-100/30 rounded-bl-[10rem] z-0"></div>
      </header>

      {/* 2. Booking Widget Container - (No Changes) */}
      <div className="container mx-auto px-4 md:px-6 relative z-30 mt-0 md:-mt-32 mb-12 md:mb-0">
         <div className="bg-white rounded-3xl shadow-xl p-1 md:p-2 border border-gray-100 overflow-hidden">
             <AppointmentWidget />
         </div>
      </div>

      {/* 3. About Us Section - (No Changes) */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="order-2 md:order-1">
            <span className="text-teal-600 font-bold tracking-wider bg-teal-50 px-3 py-1 rounded-full text-xs md:text-sm">عن مركزنا الطبي</span>
            <h2 className="text-2xl md:text-4xl font-bold text-blue-900 mt-4 mb-6">
              نحن نوفر رعاية طبية <span className="text-teal-500">شاملة</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8 text-sm md:text-base">
              نحن في مركز المدينة الطبي نسعى لتقديم أفضل الخدمات الطبية وفق معايير الجودة العالمية.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-2xl text-center hover:bg-blue-100 transition">
                <div className="text-2xl md:text-3xl font-bold text-blue-900">18</div>
                <div className="text-xs md:text-sm text-gray-500">عيادة تخصصية</div>
              </div>
              <div className="bg-teal-50 p-4 rounded-2xl text-center hover:bg-teal-100 transition">
                <div className="text-2xl md:text-3xl font-bold text-teal-600">80</div>
                <div className="text-xs md:text-sm text-gray-500">مريض يومياً</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-2xl text-center hover:bg-purple-100 transition">
                <div className="text-2xl md:text-3xl font-bold text-purple-600">24/7</div>
                <div className="text-xs md:text-sm text-gray-500">خدمة طوارئ</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl text-center hover:bg-orange-100 transition">
                <div className="text-2xl md:text-3xl font-bold text-orange-600">35</div>
                <div className="text-xs md:text-sm text-gray-500">طبيب استشاري</div>
              </div>
            </div>
          </div>

          <div className="relative order-1 md:order-2">
            <div className="absolute inset-0 bg-teal-500 rounded-3xl transform rotate-3"></div>
            <img 
              src="https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Main-Page-Images/Home-Main2.png" 
              alt="Hospital Reception" 
              className="relative rounded-3xl shadow-2xl w-full h-auto object-cover transform -rotate-3 hover:rotate-0 transition duration-500" 
            />
          </div>
        </div>
      </section>

      {/* 4. Our Doctors Section - (UPDATED For Responsiveness) */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2">نخبة من كبار الأطباء الاستشاريين</h2>
          <p className="text-gray-500 mb-10 text-sm md:text-base">فريق من أفضل الأطباء في مختلف التخصصات</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {doctors.map((doctor) => (
              <div 
                key={doctor.id} 
                onClick={() => handleCardClick(doctor.id)}
                className="group bg-white p-4 rounded-2xl shadow-sm hover:shadow-xl transition text-center border border-gray-100 cursor-pointer flex flex-col items-center"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-teal-100 mb-3 group-hover:scale-110 transition duration-300">
                  <img 
                    src={doctor.image_url || "https://via.placeholder.com/150"} 
                    alt={doctor.name} 
                    className="w-full h-full object-cover object-top" 
                  />
                </div>
                {/* Name */}
                <h3 className="text-sm md:text-base font-bold text-gray-800 line-clamp-1">{doctor.name}</h3>
                
                {/* Specialty - FIXED HERE */}
                {/* line-clamp-2 allows 2 lines, h-8 fixes height so cards align, text-[11px] for mobile fit */}
                <p className="text-teal-600 text-[11px] md:text-xs font-medium mb-2 line-clamp-2 h-8 flex items-center justify-center leading-tight">
                    {doctor.title || doctor.specialty}
                </p>
                
                <div className="flex justify-center gap-2 text-gray-400 opacity-0 group-hover:opacity-100 transition mt-auto">
                  <Twitter size={14} className="hover:text-blue-400" />
                  <Linkedin size={14} className="hover:text-blue-700" />
                </div>
              </div>
            ))}
          </div>
          
          <Link to="/doctors" className="inline-block mt-10 border border-teal-500 text-teal-600 px-8 py-3 rounded-full font-bold hover:bg-teal-500 hover:text-white transition shadow-sm hover:shadow-md">
            عرض كل الأطباء
          </Link>
        </div>
      </section>

      {/* 5. Medical Services Section - (No Changes) */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-900 to-teal-500 text-white relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">خدماتنا الطبية</h2>
            <p className="text-blue-100 mb-12 max-w-2xl mx-auto text-sm md:text-base">نقدم مجموعة شاملة من الخدمات الطبية المتخصصة</p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-2xl hover:bg-white/20 transition duration-300 border border-white/10 group">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                        <Building2 size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3">العيادات التخصصية</h3>
                    <p className="text-xs md:text-sm text-blue-100 leading-relaxed">16 عيادة متخصصة لتلبية جميع احتياجاتك الصحية</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-2xl hover:bg-white/20 transition duration-300 border border-white/10 group">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                        <User size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3">أطباء متخصصون</h3>
                    <p className="text-xs md:text-sm text-blue-100 leading-relaxed">نخبة من أفضل الأطباء في جميع التخصصات الطبية</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-2xl hover:bg-white/20 transition duration-300 border border-white/10 group">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                        <Activity size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3">المدينة سكان</h3>
                    <p className="text-xs md:text-sm text-blue-100 leading-relaxed">أحدث أجهزة التصوير والتشخيص الطبي المتقدم</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-2xl hover:bg-white/20 transition duration-300 border border-white/10 group">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                        <FlaskConical size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3">الفحوصات المخبرية</h3>
                    <p className="text-xs md:text-sm text-blue-100 leading-relaxed">فحوصات دقيقة وشاملة باستخدام أحدث المعدات المخبرية</p>
                </div>
            </div>
        </div>
      </section>

      {/* 6. Why Choose Us Section - (No Changes) */}
      <section className="py-16 md:py-24 bg-white text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">لماذا تختار مركزنا؟</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 shadow-sm">
                        <Clock size={32} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-base md:text-lg mb-2">خدمة 24/7</h3>
                    <p className="text-xs md:text-sm text-gray-500">نحن هنا لخدمتكم في أي وقت</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 shadow-sm">
                        <Award size={32} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-base md:text-lg mb-2">جودة عالية</h3>
                    <p className="text-xs md:text-sm text-gray-500">حاصلون على شهادات الجودة</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 shadow-sm">
                        <UserCheck size={32} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-base md:text-lg mb-2">خبراء متخصصون</h3>
                    <p className="text-xs md:text-sm text-gray-500">أفضل الأطباء في المنطقة</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 shadow-sm">
                        <Microscope size={32} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-base md:text-lg mb-2">أحدث الأجهزة</h3>
                    <p className="text-xs md:text-sm text-gray-500">تكنولوجيا طبية متطورة</p>
                </div>
            </div>
        </div>
      </section>

      {/* 7. CTA - (No Changes) */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-teal-500 to-blue-600 text-white text-center relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <h2 className="text-2xl md:text-5xl font-black mb-6">ابدأ رحلتك الصحية الآن</h2>
          <p className="text-white/90 text-sm md:text-lg mb-10 max-w-2xl mx-auto">
            المواعيد متاحة عبر الإنترنت أو الهاتف. تفضل بزيارة مركز المدينة الطبي للتشخيص والعلاج.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <button className="bg-white text-blue-600 px-10 py-4 rounded-full font-bold shadow-xl hover:bg-gray-100 transition transform hover:-translate-y-1">
              حجز موعد جديد
            </button>
            <button className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-full font-bold hover:bg-white/10 transition">
              تواصل معنا
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;