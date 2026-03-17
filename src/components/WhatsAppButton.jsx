import React, { useState, useEffect } from 'react';
import { getSiteSettings } from '../api/settings';

export default function WhatsAppButton() {
  const [number, setNumber]   = useState(null);   // null = loading
  const [active, setActive]   = useState(false);

  useEffect(() => {
    getSiteSettings()
      .then(({ data }) => {
        if (data) {
          setNumber(data.whatsapp_number ?? '967777552666');
          setActive(data.is_whatsapp_active ?? true);
        }
      })
      .catch(() => {
        // Fall back to default if Supabase is unreachable
        setNumber('967777552666');
        setActive(true);
      });
  }, []);

  // Don't render until we know the state; hide if admin disabled it
  if (number === null || !active) return null;

  const message     = encodeURIComponent('مرحباً، أود الاستفسار عن خدمات المركز الطبي.');
  const whatsappUrl = `https://wa.me/${number}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-[100] bg-[#25D366] text-white p-3.5 md:p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:bg-[#1EBE57] hover:scale-110 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group animate-bounce-slow"
      aria-label="تواصل معنا عبر الواتساب"
    >
      {/* Tooltip */}
      <span className="absolute left-16 md:left-20 w-max bg-white text-gray-800 text-xs md:text-sm font-bold py-2 px-4 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-gray-100">
        تواصل معنا
        <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 border-8 border-transparent border-r-white" />
      </span>

      {/* WhatsApp SVG */}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.14.561 4.234 1.624 6.076L.046 24l6.04-1.587A11.96 11.96 0 0 0 12.031 24c6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 22.012c-1.815 0-3.583-.487-5.132-1.408l-.368-.218-3.811 1.002 1.02-3.714-.239-.38C2.633 15.82 2.012 13.96 2.012 12.031 2.012 6.505 6.505 1.988 12.031 1.988c5.525 0 10.043 4.517 10.043 10.043 0 5.526-4.518 10.043-10.043 10.043zm5.508-7.53c-.302-.151-1.788-.88-2.065-.98-.277-.101-.479-.151-.68.151-.202.302-.782.98-.958 1.182-.176.202-.353.227-.655.076-1.536-.763-2.616-1.455-3.619-3.195-.202-.302-.021-.466.13-.616.136-.136.302-.352.453-.529.151-.176.202-.302.302-.503.101-.202.05-.378-.025-.529-.076-.151-.68-1.637-.932-2.241-.245-.589-.496-.51-.68-.52-.176-.01-.378-.01-.58-.01-.202 0-.529.076-.806.403-.277.327-1.058 1.032-1.058 2.518 0 1.486 1.083 2.922 1.234 3.123.151.202 2.13 3.253 5.158 4.56.721.312 1.283.498 1.722.638.723.23 1.38.197 1.898.119.584-.088 1.788-.73 2.04-1.436.252-.705.252-1.31.176-1.436-.076-.126-.277-.201-.58-.352z"/>
      </svg>
    </a>
  );
}