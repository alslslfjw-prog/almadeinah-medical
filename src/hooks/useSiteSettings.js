/**
 * useSiteSettings — fetches site_settings row once and caches it.
 * Reusable across any public component that needs exchange rate, etc.
 */
import { useState, useEffect } from 'react';
import { getSiteSettings } from '../api/settings';

export function useSiteSettings() {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        getSiteSettings()
            .then(({ data }) => { if (data) setSettings(data); })
            .catch(() => {});
    }, []);

    return settings; // { whatsapp_number, is_whatsapp_active, usd_to_yer_rate, ... }
}
