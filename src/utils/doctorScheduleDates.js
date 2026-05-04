export const SATURDAY_FIRST_WEEK_DAYS = [
    { jsDay: 6, name: 'السبت' },
    { jsDay: 0, name: 'الأحد' },
    { jsDay: 1, name: 'الاثنين' },
    { jsDay: 2, name: 'الثلاثاء' },
    { jsDay: 3, name: 'الأربعاء' },
    { jsDay: 4, name: 'الخميس' },
    { jsDay: 5, name: 'الجمعة' },
];

const ARABIC_DAY_BY_JS_DAY = [
    'الأحد',
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
];

export function toLocalDateKey(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey) {
    if (!dateKey) return null;
    const [year, month, day] = String(dateKey).split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

export function getArabicDayName(dateInput) {
    const date = dateInput instanceof Date ? dateInput : parseLocalDateKey(dateInput);
    if (!date || Number.isNaN(date.getTime())) return '';
    return ARABIC_DAY_BY_JS_DAY[date.getDay()];
}

export function getCurrentWeekRange(base = new Date()) {
    const start = base instanceof Date ? new Date(base) : new Date(base);
    start.setHours(0, 0, 0, 0);

    const daysSinceSaturday = (start.getDay() + 1) % 7;
    start.setDate(start.getDate() - daysSinceSaturday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
        weekStart: toLocalDateKey(start),
        weekEnd: toLocalDateKey(end),
    };
}

export function getCurrentWeekDays(base = new Date()) {
    const { weekStart } = getCurrentWeekRange(base);
    const start = parseLocalDateKey(weekStart);
    if (!start) return [];

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return {
            date,
            dateKey: toLocalDateKey(date),
            dayName: getArabicDayName(date),
        };
    });
}

export function getDatesInRange(startDate, endDate) {
    const start = parseLocalDateKey(startDate);
    const end = parseLocalDateKey(endDate);
    if (!start || !end || start > end) return [];

    const dates = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        dates.push({
            date: new Date(cursor),
            dateKey: toLocalDateKey(cursor),
            dayName: getArabicDayName(cursor),
            jsDay: cursor.getDay(),
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

export function groupSchedulesByDate(schedules = []) {
    return schedules.reduce((acc, schedule) => {
        const key = schedule.specific_date;
        if (!acc[key]) acc[key] = [];
        acc[key].push(schedule);
        acc[key].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
        return acc;
    }, {});
}
