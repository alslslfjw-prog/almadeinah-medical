/**
 * AdminOverview — Admin Dashboard home screen.
 *
 * Sections:
 *  1. Five clickable KPI cards (parallel Supabase count queries via Promise.all)
 *  2. 7-day appointment trend — Recharts AreaChart (dual series: Total / Pending)
 *  3. Recent pending appointments mini-table with one-click Confirm action
 *
 * State: 100% local useState / useEffect — zero Zustand, no infinite-loop risk.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Clock, CalendarCheck, Stethoscope, Building2, BookOpen,
  CheckCircle2, Loader2, User, Phone, Calendar, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { updateAppointmentStatus } from '../../../api/appointments';

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().split('T')[0];

const sevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split('T')[0];
};

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function buildChartData(rawRows) {
  // Build a bucket for each of the last 7 days (today included)
  const buckets = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const dayName = ARABIC_DAYS[d.getDay()];
    buckets[iso] = { day: dayName, total: 0, pending: 0 };
  }
  (rawRows ?? []).forEach(({ appointment_date, status }) => {
    if (buckets[appointment_date]) {
      buckets[appointment_date].total++;
      if (status === 'pending') buckets[appointment_date].pending++;
    }
  });
  return Object.values(buckets);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric' });
}

// ── Custom Tooltip for Recharts ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-xl rounded-xl px-4 py-3 text-sm" dir="rtl">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminOverview() {
  const navigate = useNavigate();

  // KPIs
  const [kpi, setKpi] = useState({ pending: 0, today: 0, doctors: 0, clinics: 0, blogs: 0 });
  // Chart
  const [chartData, setChartData] = useState([]);
  // Recent pending
  const [recent, setRecent] = useState([]);
  // Loading / confirmLoading
  const [loading, setLoading]           = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  // ── Single parallel fetch on mount ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today   = todayISO();
      const since7d = sevenDaysAgo();

      const [
        pendingRes,
        todayRes,
        doctorsRes,
        clinicsRes,
        blogsRes,
        chartRes,
        recentRes,
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today),
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('clinics').select('*', { count: 'exact', head: true }),
        supabase.from('blogs').select('*', { count: 'exact', head: true }),
        supabase.from('appointments')
          .select('appointment_date, status')
          .gte('appointment_date', since7d)
          .lte('appointment_date', today),
        supabase.from('appointments')
          .select('id, patient_name, phone_number, service_name, appointment_date, appointment_time, status, doctors(name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setKpi({
        pending:  pendingRes.count  ?? 0,
        today:    todayRes.count    ?? 0,
        doctors:  doctorsRes.count  ?? 0,
        clinics:  clinicsRes.count  ?? 0,
        blogs:    blogsRes.count    ?? 0,
      });
      setChartData(buildChartData(chartRes.data));
      setRecent(recentRes.data ?? []);
      setLoading(false);
    };

    load();
  }, []); // ← empty deps: runs ONCE, no infinite-loop risk

  // ── Quick Confirm action ──────────────────────────────────────────────────
  const handleConfirm = async (appt) => {
    setConfirmingId(appt.id);
    await updateAppointmentStatus(appt.id, 'confirmed');
    setRecent(prev => prev.filter(a => a.id !== appt.id));
    setKpi(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
    setConfirmingId(null);
  };

  // ── KPI card definitions ──────────────────────────────────────────────────
  const KPI_CARDS = [
    {
      label: 'قيد الانتظار',
      value: kpi.pending,
      icon: Clock,
      color:  'text-amber-500',
      bg:     'bg-amber-50',
      border: 'hover:border-amber-300',
      route:  '/dashboard/admin/appointments',
    },
    {
      label: 'مواعيد اليوم',
      value: kpi.today,
      icon: CalendarCheck,
      color:  'text-blue-500',
      bg:     'bg-blue-50',
      border: 'hover:border-blue-300',
      route:  '/dashboard/admin/appointments',
    },
    {
      label: 'الأطباء',
      value: kpi.doctors,
      icon: Stethoscope,
      color:  'text-teal-500',
      bg:     'bg-teal-50',
      border: 'hover:border-teal-300',
      route:  '/dashboard/admin/doctors',
    },
    {
      label: 'العيادات',
      value: kpi.clinics,
      icon: Building2,
      color:  'text-purple-500',
      bg:     'bg-purple-50',
      border: 'hover:border-purple-300',
      route:  '/dashboard/admin/cms/clinics',
    },
    {
      label: 'المقالات',
      value: kpi.blogs,
      icon: BookOpen,
      color:  'text-rose-500',
      bg:     'bg-rose-50',
      border: 'hover:border-rose-300',
      route:  '/dashboard/admin/cms/blog',
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6" dir="rtl">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">نظرة عامة</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {new Date().toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KPI_CARDS.map(({ label, value, icon: Icon, color, bg, border, route }) => (
          <button
            key={label}
            onClick={() => navigate(route)}
            className={`bg-white border border-slate-100 ${border} rounded-2xl p-5 flex flex-col items-start gap-3 shadow-sm hover:shadow-md transition-all duration-200 text-right w-full cursor-pointer`}
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={20} className={color} />
            </div>
            {loading ? (
              <div className="w-8 h-6 bg-slate-100 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-black text-slate-800">{value}</p>
            )}
            <p className="text-xs font-semibold text-slate-500">{label}</p>
          </button>
        ))}
      </div>

      {/* ── Chart + Recent Appointments ───────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6">

        {/* ── 7-Day Trend Chart ────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-800">المواعيد — آخر 7 أيام</h2>
              <p className="text-xs text-slate-400 mt-0.5">إجمالي الحجوزات وحجوزات قيد الانتظار</p>
            </div>
          </div>

          {loading ? (
            <div className="h-56 flex items-center justify-center text-slate-300">
              <Loader2 size={28} className="animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}     />
                  </linearGradient>
                  <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}     />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(v) => v === 'total' ? 'الإجمالي' : 'قيد الانتظار'}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 12, fontFamily: 'inherit' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="total"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fill="url(#gradTotal)"
                  dot={{ r: 4, fill: '#14b8a6', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  name="pending"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradPending)"
                  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Recent Pending Appointments ─────────────────────────── */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
            <div>
              <h2 className="font-bold text-slate-800">آخر الحجوزات المعلقة</h2>
              <p className="text-xs text-slate-400 mt-0.5">تأكيد سريع بضغطة واحدة</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/admin/appointments')}
              className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 transition"
            >
              عرض الكل
              <ArrowLeft size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full py-10 text-slate-300">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-slate-300">
                <CalendarCheck size={36} />
                <p className="text-sm font-medium text-slate-400">لا توجد مواعيد معلقة 🎉</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {recent.map(appt => {
                  const service = appt.service_name || appt.doctors?.name || '—';
                  return (
                    <li key={appt.id} className="flex items-start justify-between px-5 py-3.5 hover:bg-slate-50/60 transition">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={14} className="text-teal-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{appt.patient_name}</p>
                          <p className="text-xs text-slate-400 truncate">{service}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar size={10} />
                              {fmtDate(appt.appointment_date)}
                            </span>
                            {appt.appointment_time && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={10} />
                                {appt.appointment_time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleConfirm(appt)}
                        disabled={confirmingId === appt.id}
                        title="تأكيد الموعد"
                        className="shrink-0 mr-2 mt-0.5 p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-40"
                      >
                        {confirmingId === appt.id
                          ? <Loader2 size={15} className="animate-spin text-blue-500" />
                          : <CheckCircle2 size={15} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
