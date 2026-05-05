import React from 'react';

// ─── Static partners array ────────────────────────────────────────────────────
// Swap the filename at the end of each URL once real logos are uploaded.
const BASE = 'https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/insurance-logos';

const PARTNERS = [
  { id: 1, name: 'الهلال الأحمر اليمني', url: `${BASE}/ALAMALQA-MILITARY.jpeg` },
  { id: 2, name: 'MedNet Arabia', url: `${BASE}/ALHADADD.jpeg` },
  { id: 3, name: 'MetLife Insurance', url: `${BASE}/ALNAQEEB.jpeg` },
  { id: 4, name: 'AXA Gulf', url: `${BASE}/ALTHWAB-INSTITUTE.jpeg` },
  { id: 5, name: 'Allianz Care', url: `${BASE}/BABOR.jpeg` },
  { id: 6, name: 'BUPA Arabia', url: `${BASE}/BINALAWI.jpeg` },
  { id: 7, name: 'GlobeMed', url: `${BASE}/BINSHAHION.jpeg` },
  { id: 8, name: 'تأمين السعادة', url: `${BASE}/CANADIAN-SCHOOL.jpeg` },
  { id: 9, name: 'National Insurance', url: `${BASE}/CANCER-INSTITUTE.jpeg` },
  { id: 10, name: 'Yemen Insurance', url: `${BASE}/CARE-ORG.jpeg` },
  { id: 11, name: 'Arab Insurance Group', url: `${BASE}/CENTRAL-BANK.jpeg` },
  { id: 12, name: 'Wataniya Insurance', url: `${BASE}/DOCTORRUM.jpeg` },
  { id: 13, name: 'الهلال الأحمر اليمني', url: `${BASE}/ELECTRCITY-INSTITUTE.jpeg` },
  { id: 14, name: 'MedNet Arabia', url: `${BASE}/GG.jpeg` },
  { id: 15, name: 'MetLife Insurance', url: `${BASE}/INSURANCE-MILITARY.jpeg` },
  { id: 16, name: 'AXA Gulf', url: `${BASE}/IOM-ORG.jpeg` },
  { id: 17, name: 'Allianz Care', url: `${BASE}/LIFE-INSURANCE.jpeg` },
  { id: 18, name: 'BUPA Arabia', url: `${BASE}/MAARB-INSURANCE.jpeg` },
  { id: 19, name: 'GlobeMed', url: `${BASE}/MEDICAL-INSURANCE.jpeg` },
  { id: 20, name: 'تأمين السعادة', url: `${BASE}/REHABLITATION.jpeg` },
  { id: 21, name: 'National Insurance', url: `${BASE}/TAXAUTHARITY.jpeg` },
  { id: 22, name: 'Yemen Insurance', url: `${BASE}/THIRDZOON-ELECTRCITY.jpeg` },
  { id: 23, name: 'Arab Insurance Group', url: `${BASE}/UNITED-INSURANCE.jpeg` },
  { id: 24, name: 'Wataniya Insurance', url: `${BASE}/YEMENIA.jpeg` },
  { id: 25, name: 'Wataniya Insurance', url: `${BASE}/YGI-INSURANCE.jpeg` },
];

// Duplicate for seamless infinite loop
const TRACK = [...PARTNERS, ...PARTNERS];

export default function PartnersMarquee() {
  return (
    <section className="py-12 md:py-16 bg-gray-50 overflow-hidden" dir="rtl">

      {/* ── Keyframe injected directly — guarantees animation works ─────────── */}
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll 40s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Section header */}
      <div className="container mx-auto px-6 mb-10 text-center">
        <span className="inline-block text-teal-600 font-bold tracking-wider bg-teal-50 px-3 py-1 rounded-full text-xs mb-3">
          شركاؤنا
        </span>
        <h2 className="text-xl md:text-2xl font-bold text-blue-900">
          شركاء النجاح وشركات التأمين
        </h2>
        <p className="text-gray-400 text-sm mt-2">
          نتعاون مع كبرى شركات التأمين لتسهيل حصولك على الرعاية الصحية
        </p>
      </div>

      {/* Marquee */}
      <div className="relative" dir="ltr">

        {/* Left edge fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-28 z-10
                        bg-gradient-to-r from-gray-50 to-transparent" />
        {/* Right edge fade */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 z-10
                        bg-gradient-to-l from-gray-50 to-transparent" />

        {/* Scrolling track */}
        <div
          className="marquee-track flex items-center"
          style={{ width: 'max-content' }}
        >
          {TRACK.map((partner, index) => (
            <div
              key={`${partner.id}-${index}`}
              className="flex-shrink-0 mx-8 md:mx-12"
            >
              <img
                src={partner.url}
                alt={partner.name}
                className="h-20 md:h-28 w-auto object-contain
                           grayscale opacity-60
                           hover:grayscale-0 hover:opacity-100
                           transition-all duration-300"
                loading="lazy"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
