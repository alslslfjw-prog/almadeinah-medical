/**
 * @module lib/roles
 * Single source of truth for role definitions across the app.
 * Import from here — never hardcode role strings in components.
 */

/** All roles that have access to the Admin Dashboard. */
export const STAFF_ROLES = ['admin', 'receptionist', 'accountant', 'editor'];

/** Returns true if the given role belongs to a staff member (not a patient). */
export const isStaff = (role) => STAFF_ROLES.includes(role);

/**
 * Maps each staff role to the sidebar nav item keys it is allowed to see.
 * Keys match the `key` property on NAV_ITEMS and their children in AdminLayout.jsx.
 * `null` = unrestricted (admin sees everything).
 *
 * Permission Matrix:
 * ┌──────────────────────┬───────┬──────────────┬────────────┬────────┐
 * │ Section              │ Admin │ Receptionist │ Accountant │ Editor │
 * ├──────────────────────┼───────┼──────────────┼────────────┼────────┤
 * │ overview             │  ✅  │      ✅      │     ✅     │   ✅   │
 * │ appointments         │  ✅  │      ✅      │     ✅     │   —    │
 * │ finance              │  ✅  │      —       │     ✅     │   —    │
 * │ cms_blog (مقالات)  │  ✅  │      —       │     —      │   ✅   │
 * │ cms_clinics          │  ✅  │      ✅      │     ✅     │   ✅   │
 * │ cms_labs             │  ✅  │      ✅      │     ✅     │   ✅   │
 * │ cms_packages         │  ✅  │      ✅      │     ✅     │   ✅   │
 * │ cms_scans            │  ✅  │      ✅      │     ✅     │   ✅   │
 * │ doctors              │  ✅  │      ✅      │     ✅     │   ✅   │
 * │ users                │  ✅  │      —       │     —      │   —    │
 * │ gateways             │  ✅  │      —       │     ✅     │   —    │
 * │ settings             │  ✅  │      —       │     —      │   —    │
 * └──────────────────────┴───────┴──────────────┴────────────┴────────┘
 */
export const ROLE_NAV_ACCESS = {
    admin:        null,   // null = unrestricted (sees everything)
    receptionist: ['overview', 'appointments', 'cms_clinics', 'cms_labs', 'cms_packages', 'cms_scans', 'doctors'],
    accountant:   ['overview', 'appointments', 'finance', 'cms_clinics', 'cms_labs', 'cms_packages', 'cms_scans', 'doctors', 'gateways'],
    editor:       ['overview', 'cms_blog', 'cms_clinics', 'cms_labs', 'cms_packages', 'cms_scans', 'doctors'],
};
