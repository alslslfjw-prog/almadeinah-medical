import { supabase } from '../lib/supabaseClient';

const SCHEDULE_SELECT = 'id, scan_id, specific_date, start_time, end_time, shift_label, notes, slot_duration_minutes, created_at, updated_at';
const SLOT_SELECT = 'id, schedule_id, scan_id, slot_date, start_time, end_time, is_blocked, status, shift_label, notes, slot_duration_minutes, created_at, updated_at';

function cleanSchedulePayload(payload) {
    return {
        scan_id: Number(payload.scan_id),
        specific_date: payload.specific_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        shift_label: payload.shift_label?.trim() || null,
        notes: payload.notes?.trim() || null,
        slot_duration_minutes: Number(payload.slot_duration_minutes ?? 10),
    };
}

export async function getScanSchedules(scanId, fromDate, toDate) {
    try {
        let query = supabase
            .from('scan_date_schedules')
            .select(SCHEDULE_SELECT)
            .eq('scan_id', scanId)
            .order('specific_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (fromDate) query = query.gte('specific_date', fromDate);
        if (toDate) query = query.lte('specific_date', toDate);

        const { data, error } = await query;
        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function getScanSchedulesForDate(scanId, specificDate) {
    try {
        const { data, error } = await supabase
            .from('scan_date_schedules')
            .select(SCHEDULE_SELECT)
            .eq('scan_id', scanId)
            .eq('specific_date', specificDate)
            .order('start_time', { ascending: true });

        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function getScanSlotsForDate(scanId, specificDate) {
    try {
        const { data, error } = await supabase
            .from('scan_time_slots_with_status')
            .select(SLOT_SELECT)
            .eq('scan_id', scanId)
            .eq('slot_date', specificDate)
            .order('start_time', { ascending: true });

        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function createScanSchedules(rows) {
    try {
        const payload = rows.map(cleanSchedulePayload);
        const { data, error } = await supabase
            .from('scan_date_schedules')
            .insert(payload)
            .select(SCHEDULE_SELECT);

        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function updateScanSchedule(id, updates) {
    try {
        const payload = {};
        if (updates.specific_date !== undefined) payload.specific_date = updates.specific_date;
        if (updates.start_time !== undefined) payload.start_time = updates.start_time;
        if (updates.end_time !== undefined) payload.end_time = updates.end_time;
        if (updates.shift_label !== undefined) payload.shift_label = updates.shift_label?.trim() || null;
        if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null;
        if (updates.slot_duration_minutes !== undefined) payload.slot_duration_minutes = Number(updates.slot_duration_minutes);

        const { data, error } = await supabase
            .from('scan_date_schedules')
            .update(payload)
            .eq('id', id)
            .select(SCHEDULE_SELECT)
            .single();

        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function deleteScanSchedule(id) {
    try {
        const { error } = await supabase
            .from('scan_date_schedules')
            .delete()
            .eq('id', id);

        return { error };
    } catch (err) {
        return { error: err };
    }
}
