/**
 * PaymentGatewaysCMS — Manage payment methods (manual & API).
 *
 * Features:
 *  - Card grid: shows all payment methods with toggle + edit + delete
 *  - Slide-in panel: Add / Edit form with conditional fields per type
 *    · manual → Arabic instructions + optional account/bank fields
 *    · api    → public_key + webhook_url fields
 *  - Delete guard: seeded providers (cash, bank_transfer) cannot be deleted
 *
 * State: local useState only — zero Zustand.
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Plus, Pencil, Trash2, X, Save, Loader2,
  ToggleLeft, ToggleRight, Building2, Wifi, ShieldCheck, AlertCircle,
} from 'lucide-react';
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  togglePaymentMethod,
  deletePaymentMethod,
} from '../../../api/payments';

// ── Seeded providers that cannot be deleted ───────────────────────────────────
const PROTECTED_PROVIDERS = ['cash', 'bank_transfer'];

// ── Blank form state ──────────────────────────────────────────────────────────
const BLANK = {
  name_ar: '',
  name_en: '',
  provider_id: '',
  type: 'manual',
  sort_order: 10,
  is_active: true,
  // manual config fields
  instructions_ar: '',
  account_number: '',
  bank_name: '',
  // api config fields
  public_key: '',
  webhook_url: '',
};

function formToPayload(form) {
  const config = form.type === 'manual'
    ? {
      instructions_ar: form.instructions_ar || null,
      account_number: form.account_number || null,
      bank_name: form.bank_name || null,
    }
    : {
      public_key: form.public_key || null,
      webhook_url: form.webhook_url || null,
    };

  return {
    name_ar: form.name_ar.trim(),
    name_en: form.name_en.trim() || null,
    provider_id: form.provider_id.trim().toLowerCase().replace(/\s+/g, '_'),
    type: form.type,
    sort_order: Number(form.sort_order) || 0,
    is_active: form.is_active,
    config,
  };
}

function payloadToForm(method) {
  const c = method.config ?? {};
  return {
    name_ar: method.name_ar ?? '',
    name_en: method.name_en ?? '',
    provider_id: method.provider_id ?? '',
    type: method.type ?? 'manual',
    sort_order: method.sort_order ?? 0,
    is_active: method.is_active ?? true,
    instructions_ar: c.instructions_ar ?? '',
    account_number: c.account_number ?? '',
    bank_name: c.bank_name ?? '',
    public_key: c.public_key ?? '',
    webhook_url: c.webhook_url ?? '',
  };
}

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  return type === 'api'
    ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><Wifi size={10} />API</span>
    : <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><Building2 size={10} />يدوي</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PaymentGatewaysCMS() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = new
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getPaymentMethods().then(({ data }) => {
      setMethods(data ?? []);
      setLoading(false);
    });
  }, []);

  // ── Panel helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(BLANK);
    setSaveError('');
    setPanelOpen(true);
  };

  const openEdit = (m) => {
    setEditTarget(m);
    setForm(payloadToForm(m));
    setSaveError('');
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSaveError('');
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Save (create / update) ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name_ar.trim()) { setSaveError('اسم الطريقة (عربي) مطلوب'); return; }
    if (!form.provider_id.trim()) { setSaveError('معرّف المزود مطلوب'); return; }
    setSaving(true);
    setSaveError('');
    const payload = formToPayload(form);

    if (editTarget) {
      const { data, error } = await updatePaymentMethod(editTarget.id, payload);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      setMethods(prev => prev.map(m => m.id === editTarget.id ? data : m));
    } else {
      const { data, error } = await createPaymentMethod(payload);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      setMethods(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    }
    setSaving(false);
    closePanel();
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (m) => {
    setTogglingId(m.id);
    const { data } = await togglePaymentMethod(m.id, !m.is_active);
    if (data) setMethods(prev => prev.map(x => x.id === m.id ? data : x));
    setTogglingId(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    const { error } = await deletePaymentMethod(deleteTarget.id);
    if (!error) setMethods(prev => prev.filter(m => m.id !== deleteTarget.id));
    setDeletingId(null);
    setDeleteTarget(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">بوابات الدفع</h1>
          <p className="text-sm text-slate-400 mt-0.5">إدارة طرق الدفع المتاحة للمرضى</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition text-sm"
        >
          <Plus size={16} />
          إضافة طريقة دفع
        </button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-teal-600 gap-3">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-sm font-medium">جارٍ تحميل طرق الدفع...</span>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {methods.map(m => {
            const isProtected = PROTECTED_PROVIDERS.includes(m.provider_id);
            const config = m.config ?? {};
            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 transition-all duration-200 ${m.is_active ? 'border-slate-100' : 'border-dashed border-slate-200 opacity-60'
                  }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.type === 'api' ? 'bg-blue-50' : 'bg-teal-50'
                      }`}>
                      {m.type === 'api'
                        ? <Wifi size={18} className="text-blue-500" />
                        : <CreditCard size={18} className="text-teal-500" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{m.name_ar}</p>
                      {m.name_en && <p className="text-xs text-slate-400">{m.name_en}</p>}
                    </div>
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggle(m)}
                    disabled={togglingId === m.id}
                    title={m.is_active ? 'إيقاف' : 'تفعيل'}
                    className="shrink-0 transition"
                  >
                    {togglingId === m.id
                      ? <Loader2 size={22} className="animate-spin text-slate-400" />
                      : m.is_active
                        ? <ToggleRight size={26} className="text-teal-500" />
                        : <ToggleLeft size={26} className="text-slate-300" />}
                  </button>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={m.type} />
                  <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded">
                    {m.provider_id}
                  </span>
                  {isProtected && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={10} /> أساسي
                    </span>
                  )}
                </div>

                {/* Config preview */}
                {m.type === 'manual' && config.instructions_ar && (
                  <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-50 pt-3">
                    {config.instructions_ar}
                  </p>
                )}
                {m.type === 'api' && config.public_key && (
                  <p className="text-xs text-slate-400 font-mono truncate border-t border-slate-50 pt-3">
                    🔑 {config.public_key}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-auto">
                  <button
                    onClick={() => openEdit(m)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition"
                  >
                    <Pencil size={13} /> تعديل
                  </button>
                  <button
                    onClick={() => !isProtected && setDeleteTarget(m)}
                    disabled={isProtected}
                    title={isProtected ? 'هذا المزود مدمج في نظام الحجز ولا يمكن حذفه' : 'حذف'}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${isProtected
                        ? 'text-slate-200 cursor-not-allowed'
                        : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                      }`}
                  >
                    <Trash2 size={13} /> حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-in Add/Edit Panel ────────────────────────────────────────── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-lg text-slate-800">
                {editTarget ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع جديدة'}
              </h2>
              <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-5 text-sm">

              {/* Name AR */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الاسم (عربي) *</label>
                <input
                  value={form.name_ar}
                  onChange={e => setField('name_ar', e.target.value)}
                  placeholder="مثال: بنك اليمن الدولي"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-sm"
                />
              </div>

              {/* Name EN */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الاسم (إنجليزي)</label>
                <input
                  value={form.name_en}
                  onChange={e => setField('name_en', e.target.value)}
                  placeholder="e.g. Yemen International Bank"
                  dir="ltr"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-sm"
                />
              </div>

              {/* Provider ID + Sort */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">معرّف المزود (slug) *</label>
                  <input
                    value={form.provider_id}
                    onChange={e => setField('provider_id', e.target.value)}
                    placeholder="bank_yib"
                    dir="ltr"
                    disabled={!!editTarget}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الترتيب</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setField('sort_order', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-sm"
                  />
                </div>
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">النوع</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'manual', icon: Building2, label: 'يدوي', sub: 'كاش / تحويل بنكي' },
                    { val: 'api', icon: Wifi, label: 'API', sub: 'Stripe / بوابة إلكترونية' },
                  ].map(({ val, icon: Icon, label, sub }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setField('type', val)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-center ${form.type === val
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-100 hover:border-slate-200'
                        }`}
                    >
                      <Icon size={20} className={form.type === val ? 'text-teal-600' : 'text-slate-400'} />
                      <span className={`font-bold text-sm ${form.type === val ? 'text-teal-800' : 'text-slate-600'}`}>{label}</span>
                      <span className="text-xs text-slate-400">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Manual config fields ─────────────────────────────────────── */}
              {form.type === 'manual' && (
                <div className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase">تفاصيل الدفع اليدوي</p>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">تعليمات الدفع (عربي)</label>
                    <textarea
                      rows={3}
                      value={form.instructions_ar}
                      onChange={e => setField('instructions_ar', e.target.value)}
                      placeholder="الدفع نقداً عند الحضور / تحويل بنكي..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">رقم الحساب</label>
                      <input
                        value={form.account_number}
                        onChange={e => setField('account_number', e.target.value)}
                        dir="ltr"
                        placeholder="123456"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">اسم البنك</label>
                      <input
                        value={form.bank_name}
                        onChange={e => setField('bank_name', e.target.value)}
                        placeholder="بنك القطيبي"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── API config fields ────────────────────────────────────────── */}
              {form.type === 'api' && (
                <div className="space-y-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-500 uppercase">إعدادات بوابة API</p>
                  <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>احفظ المفاتيح السرية في متغيرات البيئة فقط، وليس هنا.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">المفتاح العام (Public Key)</label>
                    <input
                      value={form.public_key}
                      onChange={e => setField('public_key', e.target.value)}
                      dir="ltr"
                      placeholder="pk_live_..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">رابط Webhook</label>
                    <input
                      value={form.webhook_url}
                      onChange={e => setField('webhook_url', e.target.value)}
                      dir="ltr"
                      placeholder="https://..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Active toggle in form */}
              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-700">نشط فور الحفظ؟</span>
                <button
                  type="button"
                  onClick={() => setField('is_active', !form.is_active)}
                  className="transition"
                >
                  {form.is_active
                    ? <ToggleRight size={28} className="text-teal-500" />
                    : <ToggleLeft size={28} className="text-slate-300" />}
                </button>
              </div>

              {saveError && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle size={13} /> {saveError}
                </p>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={closePanel}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-1">حذف طريقة الدفع</h3>
            <p className="text-slate-500 text-sm mb-5">
              هل أنت متأكد من حذف <span className="font-bold text-slate-700">«{deleteTarget.name_ar}»</span>؟
              <br />
              <span className="text-xs text-red-500">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deletingId !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
              >
                {deletingId !== null && <Loader2 size={15} className="animate-spin" />}
                {deletingId !== null ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 transition text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
