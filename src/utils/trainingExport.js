/**
 * @module utils/trainingExport
 * Client-side CSV export for training applications.
 *
 * Usage:
 *   import { exportApplicationsToCSV } from '../utils/trainingExport';
 *   exportApplicationsToCSV(applications, formSchema, 'دورة التمريض');
 */

/**
 * Escape a CSV cell value.
 * @param {*} val
 * @returns {string}
 */
function csvCell(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Wrap in quotes if contains comma, newline, or double-quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Convert an array of row arrays into a CSV string.
 * @param {string[][]} rows
 * @returns {string}
 */
function toCSV(rows) {
    return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

/**
 * Trigger a browser download of a CSV file.
 * @param {string} csv
 * @param {string} filename
 */
function downloadCSV(csv, filename) {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel Arabic support
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export applications to CSV.
 *
 * Columns:
 *   1. Applicant name
 *   2. Phone
 *   3. Email
 *   4. Submitted date
 *   5. Status
 *   6. WhatsApp sent
 *   7. Admin notes
 *   ...then one column per form_schema field (using field.label as header)
 *
 * @param {Array<object>} applications
 * @param {Array<object>} formSchema
 * @param {string} [courseTitle]
 */
export function exportApplicationsToCSV(applications, formSchema = [], courseTitle = 'training') {
    const STATUS_LABELS = {
        pending:    'قيد المراجعة',
        reviewed:   'تمت المراجعة',
        accepted:   'مقبول',
        rejected:   'مرفوض',
        waitlisted: 'قائمة الانتظار',
    };

    const sortedSchema = [...formSchema].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Header row
    const header = [
        'الاسم الكامل',
        'رقم الجوال',
        'البريد الإلكتروني',
        'تاريخ التقديم',
        'الحالة',
        'رسالة واتساب',
        'ملاحظات الإدارة',
        ...sortedSchema.map(f => f.label || `حقل_${f.id.slice(0, 6)}`),
    ];

    // Data rows
    const rows = applications.map(app => {
        const dynamicAnswers = sortedSchema.map(field => {
            if (field.type === 'file') {
                const att = (app.file_attachments ?? []).find(a => a.fieldId === field.id);
                return att ? att.url ?? 'ملف مرفق' : '';
            }
            return app.answers?.[field.id] ?? '';
        });

        return [
            app.applicant_name,
            app.applicant_phone,
            app.applicant_email ?? '',
            app.submitted_at
                ? new Date(app.submitted_at).toLocaleString('ar-YE')
                : '',
            STATUS_LABELS[app.status] ?? app.status,
            app.wa_notification_sent ? 'نعم' : 'لا',
            app.admin_notes ?? '',
            ...dynamicAnswers,
        ];
    });

    const csv = toCSV([header, ...rows]);
    const safeTitle = courseTitle.replace(/[^a-zA-Z\u0600-\u06FF0-9_-]/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `applications_${safeTitle}_${date}.csv`);
}
