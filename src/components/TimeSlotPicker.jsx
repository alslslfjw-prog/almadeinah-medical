import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { formatTimeArabic } from '../utils/dateFormatter';

function groupSlotsByHour(slots) {
  const map = new Map();
  slots.forEach(slot => {
    const hour = parseInt(slot.start_time.split(':')[0], 10);
    if (!map.has(hour)) map.set(hour, []);
    map.get(hour).push(slot);
  });
  return map;
}

export function formatSlotRange(slot) {
  return `${formatTimeArabic(slot.start_time)} - ${formatTimeArabic(slot.end_time)}`;
}

export default function TimeSlotPicker({
  value,
  slots = [],
  selectedSlot,
  onSelectSlot,
  resetKey,
  disabledLabel,
  loading,
  loadingLabel = 'جاري تحميل المواعيد المتاحة...',
  emptyLabel = 'لا توجد مواعيد متاحة في هذا التاريخ',
  placeholder = 'اختر الموعد...',
}) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);

  useEffect(() => {
    setOpen(false);
    setSelectedHour(null);
  }, [resetKey]);

  const slotsByHour = useMemo(() => groupSlotsByHour(slots), [slots]);
  const hours = useMemo(() => [...slotsByHour.keys()].sort((a, b) => a - b), [slotsByHour]);
  const slotsForHour = slotsByHour.get(selectedHour) ?? [];

  if (disabledLabel || loading || slots.length === 0) {
    return (
      <div className="w-full bg-gray-100 border border-dashed border-gray-300 text-gray-400 py-3.5 px-4 rounded-xl text-sm font-medium flex items-center gap-2 select-none cursor-not-allowed">
        <Clock size={15} className="shrink-0" />
        <span>{disabledLabel || (loading ? loadingLabel : emptyLabel)}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(current => !current);
          setSelectedHour(null);
        }}
        className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition cursor-pointer font-medium text-xs md:text-sm text-right"
      >
        <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <span className={value ? 'text-gray-700' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
      </button>

      {open && (
        <div className="absolute z-[100] top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden">
          {selectedHour === null ? (
            <div className="time-picker-scroll time-picker-hours-scroll p-3 pb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">اختر الساعة</p>
              <div className="grid grid-cols-3 gap-2">
                {hours.map(hour => {
                  const slotsInHour = slotsByHour.get(hour) ?? [];
                  const allBooked = slotsInHour.every(slot => slot.is_blocked || slot.status !== 'available');
                  return (
                    <button
                      key={hour}
                      type="button"
                      disabled={allBooked}
                      onClick={() => setSelectedHour(hour)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition text-center ${
                        allBooked
                          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-white border-teal-100 text-teal-700 hover:bg-teal-500 hover:text-white hover:border-teal-500 hover:shadow-sm'
                      }`}
                    >
                      {formatTimeArabic(`${String(hour).padStart(2, '0')}:00:00`)}
                      <span className="block text-[9px] font-medium mt-0.5 opacity-60">
                        {slotsInHour.filter(slot => !slot.is_blocked && slot.status === 'available').length} متاح
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedHour(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                  aria-label="رجوع"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="text-xs font-bold text-gray-700">
                  مواعيد الساعة {formatTimeArabic(`${String(selectedHour).padStart(2, '0')}:00:00`)}
                </span>
              </div>

              <div className="time-picker-scroll time-picker-slots-scroll p-3 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {slotsForHour.map(slot => {
                    const unavailable = slot.is_blocked || slot.status !== 'available';
                    const selected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={unavailable}
                        onClick={() => {
                          onSelectSlot(slot, formatSlotRange(slot));
                          setOpen(false);
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
