import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useDoctorById } from '../hooks/useDoctors';
import { useDoctorSchedules, useDoctorSlotsForDate } from '../hooks/useDoctorSchedules';
import { useSiteSettings } from '../hooks/useSiteSettings';
import {
    getCurrentWeekDays,
    getCurrentWeekRange,
    groupSchedulesByDate,
    toLocalDateKey,
} from '../utils/doctorScheduleDates';
import { formatDateShortArabic, formatTimeArabic } from '../utils/dateFormatter';

export default function DoctorDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { doctor, isLoading: loading } = useDoctorById(id);
    const siteSettings = useSiteSettings();

    const weekRange = useMemo(() => getCurrentWeekRange(), []);
    const currentWeekDays = useMemo(() => getCurrentWeekDays(), []);
    const { schedules: currentWeekSchedules, isLoading: schedulesLoading } =
        useDoctorSchedules(id, weekRange.weekStart, weekRange.weekEnd);

    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [selectedDoctorSlot, setSelectedDoctorSlot] = useState(null);
    const [timePopoverOpen, setTimePopoverOpen] = useState(false);
    const [error, setError] = useState('');

    const { slots: selectedDateSlots, isLoading: selectedDateSlotsLoading } =
        useDoctorSlotsForDate(id, date);

    const schedulesByDate = groupSchedulesByDate(currentWeekSchedules);
    const formatScheduleRange = (schedule) =>
        `${formatTimeArabic(schedule.start_time)} - ${formatTimeArabic(schedule.end_time)}`;
    const formatSlotRange = (slot) =>
        `${formatTimeArabic(slot.start_time)} - ${formatTimeArabic(slot.end_time)}`;

    const groupedSelectedSlots = useMemo(() => {
        const groups = [];
        const groupIndexBySchedule = new Map();

        selectedDateSlots.forEach(slot => {
            const key = slot.schedule_id ?? `slot-${slot.id}`;
            if (!groupIndexBySchedule.has(key)) {
                groupIndexBySchedule.set(key, groups.length);
                groups.push({ key, label: slot.shift_label || null, slots: [] });
            }
            groups[groupIndexBySchedule.get(key)].slots.push(slot);
        });

        return groups;
    }, [selectedDateSlots]);

    const handleBookNow = () => {
        if (!date) { setError('يرجى اختيار التاريخ'); return; }
        if (!time) { setError('يرجى اختيار الوقت'); return; }
        if (!selectedDoctorSlot) { setError('يرجى اختيار موعد متاح'); return; }

        navigate('/checkout', {
            state: {
                type: 'doctors',
                primarySelection: doctor.name,
                doctor,
                date,
                time,
                doctorTimeSlotId: selectedDoctorSlot.id,
                slotStart: selectedDoctorSlot.start_time,
                slotEnd: selectedDoctorSlot.end_time,
                isPackage: false,
            },
        });
    };

    if (loading) return <div className="text-center py-40 text-teal-600 font-bold">جاري تحميل البيانات...</div>;
    if (!doctor) return <div className="text-center py-40 text-red-500">لم يتم العثور على الطبيب</div>;

    const qualificationsList = doctor.qualifications
        ? doctor.qualifications.split(/،|,/).map(q => q.trim()).filter(q => q)
        : [];

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-right" dir="rtl">
            <div className="bg-gradient-to-r from-blue-900 to-teal-500 relative pb-24 pt-10">
                <div className="container mx-auto px-6">
                    <div className="flex items-center gap-2 text-blue-200 text-sm mb-8">
                        <Link to="/" className="hover:text-white transition">الرئيسية</Link>
                        <i className="fas fa-chevron-left text-xs"></i>
                        <Link to="/doctors" className="hover:text-white transition">الأطباء</Link>
                        <i className="fas fa-chevron-left text-xs"></i>
                        <span className="text-white font-bold">{doctor.name}</span>
                    </div>

                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-white/20 bg-white p-1 shadow-2xl">
                            <img
                                src={doctor.image_url}
                                alt={doctor.name}
                                className="w-full h-full object-cover object-top rounded-full"
                            />
                        </div>

                        <div className="text-center md:text-right text-white pt-4">
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">{doctor.name}</h1>
                            <p className="text-blue-100 text-lg mb-4">{doctor.title}</p>
                            <span className="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-sm">
                                <i className="fas fa-stethoscope ml-2"></i>
                                {doctor.category}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-10 -mt-10 relative z-20">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 order-2 lg:order-1">
                        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 sticky top-24">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-100 pb-4">
                                احجز موعدك
                            </h3>

                            {doctor.price > 0 && siteSettings?.usd_to_yer_rate > 0 && (
                                <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                                    <span className="text-sm font-bold text-teal-700">سعر الكشف</span>
                                    <span className="text-sm font-bold text-teal-600 font-mono">
                                        {Math.round(doctor.price * siteSettings.usd_to_yer_rate).toLocaleString('ar-YE')} ر.ي
                                    </span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">اختر التاريخ</label>
                                    <input
                                        type="date"
                                        min={toLocalDateKey(new Date())}
                                        value={date}
                                        onChange={(e) => {
                                            setDate(e.target.value);
                                            setTime('');
                                            setSelectedDoctorSlot(null);
                                            setTimePopoverOpen(false);
                                            setError('');
                                        }}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">اختر الوقت</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            disabled={!date || selectedDateSlotsLoading || selectedDateSlots.length === 0}
                                            onClick={() => setTimePopoverOpen(open => !open)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:border-teal-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-right"
                                        >
                                            <span className="opacity-0">
                                                {!date
                                                    ? 'اختر التاريخ أولاً...'
                                                    : selectedDateSlotsLoading
                                                        ? 'جاري تحميل الورديات...'
                                                        : selectedDateSlots.length === 0
                                                            ? 'لا توجد ورديات في هذا التاريخ'
                                                            : 'اختر الفترة...'}
                                            </span>
                                            {!time && (
                                                <span className="absolute inset-y-0 right-3 left-10 flex items-center text-gray-400 pointer-events-none">
                                                    {!date
                                                        ? 'اختر التاريخ أولاً...'
                                                        : selectedDateSlotsLoading
                                                            ? 'جاري تحميل المواعيد...'
                                                            : selectedDateSlots.length === 0
                                                                ? 'لا توجد مواعيد في هذا التاريخ'
                                                                : 'اختر الموعد...'}
                                                </span>
                                            )}
                                            {time && (
                                                <span className="absolute inset-y-0 right-3 left-10 flex items-center text-gray-700 font-bold pointer-events-none">
                                                    {time}
                                                </span>
                                            )}
                                        </button>
                                        <i className="fas fa-chevron-down absolute left-3 top-4 text-gray-400 text-xs pointer-events-none"></i>
                                        {timePopoverOpen && selectedDateSlots.length > 0 && (
                                            <div className="time-picker-scroll absolute z-30 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-3 max-h-[min(18rem,45dvh)]">
                                                <div className="space-y-3">
                                                    {groupedSelectedSlots.map((group, groupIndex) => (
                                                        <div key={group.key} className="space-y-2">
                                                            {groupedSelectedSlots.length > 1 && (
                                                                <div className="text-[11px] font-bold text-gray-400 px-1">
                                                                    {group.label || `الفترة ${groupIndex + 1}`}
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {group.slots.map(slot => {
                                                                    const unavailable = slot.is_blocked || slot.status !== 'available';
                                                                    const selected = selectedDoctorSlot?.id === slot.id;
                                                                    return (
                                                                        <button
                                                                            key={slot.id}
                                                                            type="button"
                                                                            disabled={unavailable}
                                                                            onClick={() => {
                                                                                setSelectedDoctorSlot(slot);
                                                                                setTime(formatSlotRange(slot));
                                                                                setTimePopoverOpen(false);
                                                                                setError('');
                                                                            }}
                                                                            className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                                                                                selected
                                                                                    ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-100'
                                                                                    : unavailable
                                                                                        ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                                                                        : 'bg-white border-teal-100 text-teal-700 hover:bg-teal-50 hover:border-teal-200'
                                                                            }`}
                                                                        >
                                                                            <span className="block">{formatTimeArabic(slot.start_time)}</span>
                                                                            {unavailable && (
                                                                                <span className="block text-[10px] font-medium mt-0.5">
                                                                                    {slot.status === 'booked' ? 'محجوز' : 'غير متاح'}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <button
                                    onClick={handleBookNow}
                                    className="w-full bg-teal-500 hover:bg-teal-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-500/20 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <i className="far fa-calendar-check"></i>
                                    <span>تأكيد الحجز</span>
                                </button>

                                {error && (
                                    <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg font-bold flex items-center justify-center gap-2 animate-bounce">
                                        <CheckCircle size={14} className="rotate-45" />
                                        {error}
                                    </div>
                                )}

                                <p className="text-center text-xs text-gray-400 mt-4">
                                    سيتم تأكيد الحجز خلال 24 ساعة عبر الهاتف
                                </p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-teal-600 font-bold">
                                <i className="fas fa-phone-alt"></i>
                                <span dir="ltr">777552666</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                                نبذة عن الطبيب
                            </h2>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                {doctor.bio && doctor.bio.trim()
                                    ? doctor.bio
                                    : `${doctor.title}. يتميز بخبرة واسعة في مجال ${doctor.category}، ويسعى دائماً لتقديم أفضل رعاية طبية للمرضى باستخدام أحدث التقنيات العلاجية.`
                                }
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                                <i className="far fa-clock text-teal-500"></i>
                                مواعيد العمل
                            </h2>

                            {schedulesLoading ? (
                                <div className="text-gray-500 text-sm bg-gray-50 rounded-xl px-5 py-4">
                                    جاري تحميل مواعيد هذا الأسبوع...
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {currentWeekDays.map(day => {
                                        const shifts = schedulesByDate[day.dateKey] ?? [];
                                        return (
                                            <div
                                                key={day.dateKey}
                                                className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 hover:border-teal-200 transition"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${shifts.length ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
                                                    <div>
                                                        <span className="font-bold text-gray-700 text-sm">{day.dayName}</span>
                                                        <span className="text-gray-400 text-xs mr-2">{formatDateShortArabic(day.dateKey)}</span>
                                                    </div>
                                                </div>
                                                {shifts.length ? (
                                                    <div className="flex flex-wrap gap-2 justify-end">
                                                        {shifts.map(shift => (
                                                            <bdi key={shift.id} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-mono font-bold">
                                                                {formatScheduleRange(shift)}
                                                            </bdi>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-400">إجازة</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                                <i className="fas fa-graduation-cap text-teal-500"></i>
                                المؤهلات العلمية
                            </h2>
                            <ul className="space-y-4">
                                {qualificationsList.length > 0 ? qualificationsList.map((qual, index) => (
                                    <li key={index} className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 transition hover:border-teal-200">
                                        <i className="fas fa-certificate text-teal-500 mt-1"></i>
                                        <span className="text-gray-700 font-medium">{qual}</span>
                                    </li>
                                )) : (
                                    <li className="text-gray-500">لا توجد تفاصيل إضافية</li>
                                )}
                            </ul>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                                <i className="fas fa-stethoscope text-teal-500"></i>
                                التخصصات الدقيقة
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
                                    <i className="fas fa-check-circle"></i>
                                    {doctor.category}
                                </div>
                                <div className="bg-gray-50 text-gray-600 px-6 py-3 rounded-xl font-medium text-sm">
                                    تشخيص وعلاج الحالات المتقدمة
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
