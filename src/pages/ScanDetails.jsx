import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useScanSlotsForDate } from '../hooks/useScanSchedules';
import TimeSlotPicker from '../components/TimeSlotPicker';
import { toLocalDateKey } from '../utils/doctorScheduleDates';

export default function ScanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const siteSettings = useSiteSettings();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedScanSlot, setSelectedScanSlot] = useState(null);
  const [error, setError] = useState('');
  const { slots: selectedDateSlots, isLoading: selectedDateSlotsLoading } =
    useScanSlotsForDate(id, date);

  // Fetch Scan Data
  useEffect(() => {
    const fetchScan = async () => {
      try {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setScan(data);
      } catch (error) {
        console.error('Error fetching scan:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchScan();
  }, [id]);

  // Helper to split text by new lines (\n) for bullet points
  const formatList = (text) => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim() !== '');
  };

  const handleBookingSubmit = () => {
    setError('');
    if (!date) { setError('يرجى اختيار التاريخ'); return; }
    if (!time || !selectedScanSlot) { setError('يرجى اختيار موعد أشعة متاح'); return; }

    const rate = siteSettings?.usd_to_yer_rate ?? 0;
    const priceUSD = Number(scan?.price) || 0;
    navigate('/checkout', {
      state: {
        type: 'scans',
        primarySelection: scan.name,
        scanId: scan.id,
        scanTimeSlotId: selectedScanSlot.id,
        date,
        time,
        slotStart: selectedScanSlot.start_time,
        slotEnd: selectedScanSlot.end_time,
        priceUSD,
        priceYER: rate && priceUSD ? Math.round(priceUSD * rate) : 0,
        isPackage: false,
      },
    });
    return;
  };


  if (loading) return <div className="text-center py-40 text-teal-600 font-bold">جارٍ تحميل التفاصيل...</div>;
  if (!scan) return <div className="text-center py-40 text-red-500">لم يتم العثور على الفحص المطلوب</div>;

  const benefitsList = formatList(scan.benefits);
  const preparationList = formatList(scan.preparation);

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-right" dir="rtl">
      
      {/* --- 1. HEADER SECTION --- */}
      <div className="bg-gradient-to-r from-blue-900 to-teal-500 relative pb-24 pt-10">
        <div className="container mx-auto px-6">
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-8">
                <Link to="/" className="hover:text-white transition">الرئيسية</Link> 
                <i className="fas fa-chevron-left text-xs"></i>
                <Link to="/scans" className="hover:text-white transition">الفحوصات</Link>
                <i className="fas fa-chevron-left text-xs"></i>
                <span className="text-white font-bold">{scan.name}</span>
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                
                {/* Icon Box */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl">
                    <i className={`${scan.icon_class || 'fa-solid fa-notes-medical'} text-6xl text-white drop-shadow-md`}></i>
                </div>

                {/* Text Info */}
                <div className="text-center md:text-right text-white pt-4 flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">{scan.name}</h1>
                    <p className="text-blue-100 text-lg max-w-2xl leading-relaxed opacity-90">
                        {scan.short_description}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* --- 2. MAIN GRID CONTENT --- */}
      <div className="container mx-auto px-6 py-10 -mt-10 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8">
            
            {/* --- RIGHT COLUMN (Booking Card - Sticky) --- */}
            <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 sticky top-24">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-100 pb-4">
                        حجز هذا الفحص
                    </h3>

                    {/* Price Badge */}
                    {scan.price > 0 && siteSettings?.usd_to_yer_rate > 0 && (
                        <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                            <span className="text-sm font-bold text-teal-700">سعر الفحص</span>
                            <span className="text-sm font-bold text-teal-600 font-mono">
                                {Math.round(scan.price * siteSettings.usd_to_yer_rate).toLocaleString('ar-YE')} ر.ي
                            </span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm mb-2">
                            <i className="fas fa-info-circle ml-2"></i>
                            يرجى التأكد من قراءة تعليمات التحضير جيداً قبل الحجز.
                        </div>

                        {/* --- Date + generated scan slot picker --- */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">اختر التاريخ</label>
                            <input 
                                type="date"
                                min={toLocalDateKey(new Date())}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-teal-500 transition"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setTime('');
                                    setSelectedScanSlot(null);
                                    setError('');
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">اختر الوقت</label>
                            <TimeSlotPicker
                                placeholder="اختر الموعد..."
                                value={time}
                                slots={selectedDateSlots}
                                selectedSlot={selectedScanSlot}
                                resetKey={`scan-details-${id}-${date}`}
                                disabledLabel={!date ? 'اختر التاريخ أولاً' : null}
                                loading={selectedDateSlotsLoading}
                                emptyLabel="لا توجد مواعيد أشعة متاحة في هذا التاريخ"
                                onSelectSlot={(slot, slotRange) => {
                                    setSelectedScanSlot(slot);
                                    setTime(slotRange);
                                    setError('');
                                }}
                            />
                        </div>

                        {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

                        <button 
                            onClick={handleBookingSubmit}
                            className="w-full bg-teal-500 hover:bg-teal-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-500/20 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-check-circle"></i>
                            <span>متابعة تأكيد الحجز</span>
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-gray-400 text-xs mb-2">
                           متاح يومياً من 8 صباحاً حتى 10 مساءً
                        </p>
                        <a href="tel:777552666" className="text-teal-600 font-bold hover:underline dir-ltr block">
                            <i className="fas fa-phone-alt mr-2"></i>
                            777552666
                        </a>
                    </div>
                </div>
            </div>

            {/* --- LEFT COLUMN (Details) --- */}
            <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">

                {/* 0. Full Description */}
                {scan.description && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                            <i className="fas fa-info-circle text-blue-500"></i>
                            عن هذه الأشعة
                        </h2>
                        <p className="text-gray-700 leading-relaxed">{scan.description}</p>
                    </div>
                )}

                {/* 1. Benefits Section */}
                {benefitsList.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                            <i className="fas fa-star text-teal-500"></i>
                            فوائد الفحص واستخداماته
                        </h2>
                        <ul className="space-y-3">
                            {benefitsList.map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <i className="fas fa-check-circle text-teal-500 mt-1.5 text-sm"></i>
                                    <span className="text-gray-700 leading-loose">{item.replace(/•/g, '')}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 2. Preparation Section */}
                {preparationList.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                            <i className="fas fa-clipboard-list text-orange-500"></i>
                            التحضيرات المطلوبة
                        </h2>
                        <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
                            <ul className="space-y-3">
                                {preparationList.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <i className="fas fa-exclamation-circle text-orange-500 mt-1.5 text-sm"></i>
                                        <span className="text-gray-800 font-medium leading-loose">{item.replace(/•/g, '')}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* 3. General Note */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                     <i className="fas fa-user-md text-blue-600 text-2xl mt-1"></i>
                     <div>
                        <h4 className="font-bold text-blue-900 mb-1">استشارة طبية</h4>
                        <p className="text-sm text-blue-800 opacity-80 leading-relaxed">
                            جميع الفحوصات يتم الإشراف عليها من قبل نخبة من استشاريي الأشعة والتشخيص لضمان دقة النتائج وسلامتكم.
                        </p>
                     </div>
                </div>

            </div>
        </div>
      </div>

    </div>
  );
}
