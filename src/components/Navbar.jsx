import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, User, Menu, X } from 'lucide-react'; // Added Menu & X icons

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  // Your Logo URL
  const logoUrl = "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png";

  // Helper to check active link
  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'الرئيسية', path: '/' },
    { name: 'عن المركز', path: '/about' },
    { name: 'الأطباء', path: '/doctors' },
    { name: 'الأشعة التشخيصية', path: '/scans' },
    { name: 'العيادات', path: '/clinics' },
    { name: 'الفحوصات', path: '/examinations' },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 font-sans" dir="rtl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          
          {/* 1. Mobile Menu Button (Visible on Small Screens) */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="lg:hidden text-gray-600 focus:outline-none p-2"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* 2. Logo Section */}
          <Link to="/" className="flex items-center hover:opacity-90 transition">
            <img 
              src={logoUrl} 
              alt="مركز المدينة الطبي" 
              className="h-12 md:h-16 w-auto object-contain" 
            />
          </Link>

          {/* 3. Desktop Navigation (Hidden on Mobile) */}
          <div className="hidden lg:flex gap-6 font-bold text-gray-600 text-sm">
            {navLinks.map((link) => (
              <Link 
                key={link.name}
                to={link.path} 
                className={`transition ${isActive(link.path) ? 'text-teal-600' : 'hover:text-teal-600'}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* 4. Action Buttons (Hidden on very small screens) */}
          <div className="hidden md:flex gap-4 items-center">
            <a href="tel:777552666" className="hidden xl:flex items-center gap-2 text-blue-900 font-bold hover:text-teal-600 transition" dir="ltr">
              <Phone size={18} className="text-teal-500" />
              <span>777 552 666</span>
            </a>
            
            <button className="bg-teal-500 text-white px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-teal-600 transition shadow-lg shadow-teal-500/20 font-bold text-sm">
              <User size={18} />
              <span>تسجيل الدخول</span>
            </button>
          </div>
          
          {/* Mobile User Icon (Visible only on mobile to save space) */}
          <button className="md:hidden text-teal-600 p-2">
             <User size={24} />
          </button>

        </div>

        {/* 5. Mobile Menu Dropdown */}
        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-100 pt-4 animate-fadeIn">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-bold ${
                    isActive(link.path) ? 'bg-teal-50 text-teal-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-100 mt-2">
                 <a href="tel:777552666" className="flex items-center justify-center gap-2 text-blue-900 font-bold py-2 mb-2" dir="ltr">
                    <Phone size={18} /> 777 552 666
                 </a>
                 <button className="w-full bg-teal-500 text-white py-3 rounded-xl font-bold">
                    حجز موعد
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}