import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, LogIn } from 'lucide-react';
import useAuthStore from '../store/authStore';
import CheckoutForm from '../components/CheckoutForm';
import { getMyProfile } from '../api/patient';

export default function Checkout() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const bookingData = location.state;
  const { user, isAuthenticated } = useAuthStore();

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookedName,     setBookedName]     = useState('');
  const [patientProfile, setPatientProfile] = useState(null);

  // Fetch the authenticated patient's profile for auto-fill
  useEffect(() => {
    if (isAuthenticated) {
      getMyProfile().then(({ data }) => setPatientProfile(data));
    }
  }, [isAuthenticated]);

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

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم الحجز بنجاح!</h2>
          <p className="text-gray-500 mb-4">
            شكراً لك <strong>{bookedName}</strong>، سيتم التواصل معك قريباً لتأكيد الموعد.
          </p>
          {isAuthenticated && (
            <p className="text-sm text-teal-600 mb-6">
              يمكنك متابعة موعدك من{' '}
              <button onClick={() => navigate('/dashboard/patient')} className="font-bold underline">
                لوحة المريض
              </button>
            </p>
          )}
          <button onClick={() => navigate('/')}
            className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // ── Checkout page ───────────────────────────────────────────────────────────
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

        {/* Auth banners */}
        {isAuthenticated && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-sm text-teal-800">
            <CheckCircle size={18} className="text-teal-500 shrink-0" />
            <span>أنت مسجّل الدخول — سيُربط هذا الحجز تلقائياً بحسابك.</span>
          </div>
        )}
        {!isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-sm text-blue-800">
            <LogIn size={18} className="text-blue-500 shrink-0" />
            <span>
              يمكنك الحجز كزائر، أو{' '}
              <button onClick={() => navigate('/login', { state: { from: location.pathname } })}
                className="font-bold underline hover:text-blue-600">تسجيل الدخول</button>
              {' '}لمتابعة مواعيدك لاحقاً.
            </span>
          </div>
        )}

        {/* All form UI lives in the reusable CheckoutForm */}
        <CheckoutForm
          bookingData={bookingData}
          prefill={{
            name:      patientProfile?.full_name     ?? user?.user_metadata?.full_name ?? '',
            phone:     patientProfile?.phone         ?? '',
            gender:    patientProfile?.gender        ?? '',
            birthDate: patientProfile?.date_of_birth ?? '',
            address:   patientProfile?.address       ?? '',
          }}
          onSuccess={name => { setBookedName(name); setBookingSuccess(true); }}
        />
      </div>
    </div>
  );
}