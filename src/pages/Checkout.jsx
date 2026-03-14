import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, User, Phone, CheckCircle, ArrowRight, MapPin,
  CreditCard, Building2, UserCircle, LogIn
} from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import useAuthStore from '../store/authStore';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;

  // ✅ Pull authenticated user from Zustand — no inline supabase calls
  const { user, isAuthenticated } = useAuthStore();
  const { createAppointment, isLoading: loading } = useAppointments();

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    gender: '',
    phone: '',
    address: '',
    paymentMethod: 'center'
  });

  // Redirect if accessed directly without booking data
  useEffect(() => {
    if (!bookingData) {
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [bookingData, navigate]);

  if (!bookingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">لا توجد تفاصيل للحجز</h2>
        <p className="text-gray-500">سيتم إعادة توجيهك للصفحة الرئيسية...</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Resolve doctor_id and service_name from booking context
    const doctorId = bookingData.doctor?.id ?? null;
    const scanId = bookingData.type === 'scans' ? (bookingData.scanId ?? null) : null;
    const serviceName = bookingData.doctor?.name ?? bookingData.primarySelection ?? null;

    // ✅ Only insert columns that exist in the appointments table (verified from DB schema)
    // appointment_time is now TEXT — accepts any string (Arabic shift labels or HH:MM)
    const { success: ok, error } = await createAppointment({
      patient_name: formData.name,
      phone_number: formData.phone,
      appointment_date: bookingData.date || null,
      appointment_time: bookingData.time || null,
      doctor_id: doctorId,
      scan_id: scanId,
      status: 'pending',
      patient_user_id: user?.id ?? null,
      service_name: serviceName,
      type: bookingData.type ?? null,
    });

    if (ok) {
      setBookingSuccess(true);
    } else if (error) {
      alert('حدث خطأ أثناء الحجز: ' + (error.message ?? JSON.stringify(error)));
    }
  };

  // ── Success Screen ───────────────────────────────────────────────────────────
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم الحجز بنجاح!</h2>
          <p className="text-gray-500 mb-4">
            شكراً لك <strong>{formData.name}</strong>، سيتم التواصل معك قريباً لتأكيد الموعد.
          </p>
          {isAuthenticated && (
            <p className="text-sm text-teal-600 mb-6">
              يمكنك متابعة موعدك من{' '}
              <button onClick={() => navigate('/dashboard/patient')} className="font-bold underline">
                لوحة المريض
              </button>
            </p>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // ── Checkout Form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans" dir="rtl">
      <div className="container mx-auto max-w-5xl">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100 transition">
            <ArrowRight size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">تأكيد الحجز</h1>
        </div>

        {/* Logged-in banner */}
        {isAuthenticated && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-sm text-teal-800">
            <CheckCircle size={18} className="text-teal-500 shrink-0" />
            <span>أنت مسجّل الدخول — سيُربط هذا الحجز تلقائياً بحسابك.</span>
          </div>
        )}

        {/* Not logged-in note */}
        {!isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-sm text-blue-800">
            <LogIn size={18} className="text-blue-500 shrink-0" />
            <span>
              يمكنك الحجز كزائر، أو{' '}
              <button onClick={() => navigate('/login', { state: { from: location.pathname } })} className="font-bold underline hover:text-blue-600">
                تسجيل الدخول
              </button>
              {' '}لمتابعة مواعيدك لاحقاً.
            </span>
          </div>
        )}

        <div className="grid md:grid-cols-12 gap-8">

          {/* ── Booking Summary Card ───────────────────────────────────── */}
          <div className="md:col-span-4 order-1 md:order-2">
            <div className="bg-white rounded-[2rem] shadow-lg p-6 border border-gray-100 sticky top-24">
              <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">تفاصيل الموعد</h3>

              <div className="space-y-6">
                {/* Service / Doctor */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {bookingData.type === 'doctors' || bookingData.type === 'clinics' ? 'الطبيب / العيادة' : 'الخدمة'}
                    </p>
                    <p className="font-bold text-gray-800 text-lg">
                      {bookingData.doctor ? bookingData.doctor.name : bookingData.primarySelection}
                    </p>
                    {bookingData.doctor && (
                      <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-md mt-1 inline-block">
                        {bookingData.doctor.category || bookingData.primarySelection}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                {(bookingData.date || bookingData.time) && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">الموعد والتوقيت</p>
                      {bookingData.date && <p className="font-bold text-gray-800">{bookingData.date}</p>}
                      {bookingData.time && (
                        <p className="text-teal-600 font-bold text-sm mt-1 flex items-center gap-1">
                          <Clock size={14} /> {bookingData.time}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">الموقع</p>
                    <p className="font-bold text-gray-800 text-sm">مركز المدينة الطبي</p>
                    <p className="text-xs text-gray-400">عدن، المنصورة - بجانب مستشفى 22 مايو</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">رسوم الحجز المبدئي</span>
                  <span className="font-bold text-gray-800">مجاناً</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Patient Form ───────────────────────────────────────────── */}
          <div className="md:col-span-8 order-2 md:order-1">
            <div className="bg-white rounded-[2rem] shadow-lg p-6 md:p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-2">بيانات المريض</h3>
              <p className="text-gray-500 mb-8 text-sm">يرجى ملء البيانات لتأكيد الحجز.</p>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Full Name */}
                <div>
                  <label className="block text-gray-700 font-bold mb-2 text-sm">الاسم الثلاثي</label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      placeholder="أدخل الاسم بالكامل"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                    />
                    <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Gender & Date of Birth */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">الجنس</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none transition cursor-pointer"
                      >
                        <option value="">اختر الجنس...</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                      <UserCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">تاريخ الميلاد</label>
                    <input
                      required
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>

                {/* Phone & Address */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">رقم الهاتف (واتساب)</label>
                    <div className="relative">
                      <input
                        required
                        type="tel"
                        placeholder="77xxxxxxx"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                      />
                      <Phone className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">عنوان السكن</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        placeholder="المدينة - الحي"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                      />
                      <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-gray-700 font-bold mb-3 text-sm">طريقة الدفع</label>
                  <div className="grid md:grid-cols-2 gap-4">

                    <div
                      onClick={() => setFormData({ ...formData, paymentMethod: 'center' })}
                      className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-4 transition-all duration-300 ${formData.paymentMethod === 'center' ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-teal-200'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.paymentMethod === 'center' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <p className={`font-bold ${formData.paymentMethod === 'center' ? 'text-teal-900' : 'text-gray-700'}`}>الدفع في المركز</p>
                        <p className="text-xs text-gray-500">الدفع نقداً عند الحضور للموعد</p>
                      </div>
                      {formData.paymentMethod === 'center' && <CheckCircle size={20} className="mr-auto text-teal-500" />}
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, paymentMethod: 'alqutaibi' })}
                      className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-4 transition-all duration-300 ${formData.paymentMethod === 'alqutaibi' ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-teal-200'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.paymentMethod === 'alqutaibi' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className={`font-bold ${formData.paymentMethod === 'alqutaibi' ? 'text-teal-900' : 'text-gray-700'}`}>بنك القطيبي</p>
                        <p className="text-xs text-gray-500">تحويل بنكي مباشر</p>
                      </div>
                      {formData.paymentMethod === 'alqutaibi' && <CheckCircle size={20} className="mr-auto text-teal-500" />}
                    </div>
                  </div>

                  {formData.paymentMethod === 'alqutaibi' && (
                    <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                      يرجى إرسال إشعار التحويل عبر الواتساب لتأكيد الحجز. رقم الحساب: <strong>123456</strong>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transform hover:-translate-y-1 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ التأكيد...</>
                  ) : 'تأكيد الحجز نهائياً'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}