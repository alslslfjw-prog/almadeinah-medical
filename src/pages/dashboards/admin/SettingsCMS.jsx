/**
 * SettingsCMS — Admin page for general site settings.
 * Each card saves independently to avoid accidental overwrites.
 * Single-row pattern: always reads/writes id = 1.
 *
 * Note: Exchange rate (usd_to_yer_rate) has been moved to the Finance dashboard.
 */

import React, { useState, useEffect } from 'react';
import {
  Settings, Save, Loader2, ToggleLeft, ToggleRight,
  Phone, CheckCircle, AlertCircle,
} from 'lucide-react';
import { getSiteSettings, updateSiteSettings } from '../../../api/settings';

export default function SettingsCMS() {
  const [loading, setLoading] = useState(true);

  // ── WhatsApp state ──────────────────────────────────────────────────────────
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isWhatsappActive, setIsWhatsappActive] = useState(true);
  const [savingWa, setSavingWa] = useState(false);
  const [savedWa, setSavedWa] = useState(false);
  const [errorWa, setErrorWa] = useState('');

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    getSiteSettings().then(({ data }) => {
      if (data) {
        setWhatsappNumber(data.whatsapp_number ?? '');
        setIsWhatsappActive(data.is_whatsapp_active ?? true);
      }
      setLoading(false);
    });
  }, []);

  // ── WhatsApp save ───────────────────────────────────────────────────────────
  const handleSaveWhatsApp = async () => {
    if (!whatsappNumber.trim()) { setErrorWa('رقم الواتساب مطلوب'); return; }
    setSavingWa(true); setErrorWa(''); setSavedWa(false);

    const { error: err } = await updateSiteSettings({
      whatsapp_number: whatsappNumber.trim().replace(/\D/g, ''),
      is_whatsapp_active: isWhatsappActive,
    });

    setSavingWa(false);
    if (err) { setErrorWa(err.message); return; }
    setSavedWa(true);
    setTimeout(() => setSavedWa(false), 3000);
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-teal-600 gap-3">
        <Loader2 className="animate-spin" size={24} />
        <span className="text-sm font-medium">جارٍ تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl" dir="rtl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">الإعدادات العامة</h1>
        <p className="text-sm text-slate-400 mt-0.5">إعدادات التواصل والقنوات العامة للموقع</p>
      </div>

      {/* ── WhatsApp Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">

        {/* Card header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Phone size={18} className="text-green-500" />
          </div>
          <div>
            <p className="font-bold text-slate-800">زر الواتساب العائم</p>
            <p className="text-xs text-slate-400">يظهر على جميع صفحات الموقع العام</p>
          </div>
          {/* Active toggle */}
          <button
            type="button"
            onClick={() => setIsWhatsappActive(v => !v)}
            className="mr-auto transition"
            title={isWhatsappActive ? 'إيقاف الزر' : 'تفعيل الزر'}
          >
            {isWhatsappActive
              ? <ToggleRight size={30} className="text-teal-500" />
              : <ToggleLeft size={30} className="text-slate-300" />}
          </button>
        </div>

        {/* Status pill */}
        <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${isWhatsappActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          <span className={`w-2 h-2 rounded-full ${isWhatsappActive ? 'bg-green-500' : 'bg-slate-400'}`} />
          {isWhatsappActive ? 'الزر مفعّل — يظهر للزوار' : 'الزر معطّل — مخفي عن الزوار'}
        </div>

        {/* Phone number input */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">
            رقم الواتساب <span className="text-slate-400 font-normal text-xs">(بدون + أو صفر بادئ، مثال: 967777552666)</span>
          </label>
          <div className="relative">
            <Phone size={16} className="absolute top-3.5 right-3 text-slate-400" />
            <input
              type="tel"
              inputMode="numeric"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="967777552666"
              dir="ltr"
              className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
            />
          </div>
          {whatsappNumber && (
            <p className="text-xs text-slate-400 mt-2">
              رابط الزر:{'  '}
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer"
                className="text-teal-600 hover:underline font-mono">
                https://wa.me/{whatsappNumber}
              </a>
            </p>
          )}
        </div>

        {/* WhatsApp feedback */}
        {errorWa && (
          <p className="flex items-center gap-2 text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> {errorWa}
          </p>
        )}
        {savedWa && (
          <p className="flex items-center gap-2 text-green-600 text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            <CheckCircle size={13} /> تم حفظ إعدادات الواتساب بنجاح!
          </p>
        )}

        {/* WhatsApp save button */}
        <button
          onClick={handleSaveWhatsApp}
          disabled={savingWa}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm shadow-sm"
        >
          {savingWa ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {savingWa ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      <p className="text-xs text-slate-300 text-center mt-8 flex items-center justify-center gap-2">
        <Settings size={12} /> سيتم إضافة إعدادات إضافية هنا مستقبلاً
      </p>
    </div>
  );
}
