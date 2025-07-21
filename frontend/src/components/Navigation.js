// frontend/src/components/Navigation.js - FIXED MOBILE MENU OVERLAY
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll on component unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Services", href: "/services" },
    { name: "Inventory", href: "/inventory" },
    { name: "Specials", href: "/specials" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* Desktop/Mobile Header */}
      <header className="bg-black text-white relative z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img 
                src="/logo.png" 
                alt="AUTO PRO" 
                className="h-10 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span 
                className="text-xl font-bold hidden"
                style={{ display: 'none' }}
              >
                AUTO PRO
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-white hover:text-blue-400 transition-colors ${
                    pathname === item.href ? 'text-blue-400' : ''
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <a
                href="tel:3529335181"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                (352) 933-5181
              </a>
            </nav>

            {/* Mobile Hamburger Button */}
            <button
              className="lg:hidden relative z-50 w-10 h-10 flex flex-col justify-center items-center focus:outline-none"
              onClick={toggleMenu}
              aria-label="Toggle mobile menu"
            >
              <span
                className={`block w-6 h-0.5 bg-white transform transition-all duration-300 ${
                  isMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-white transform transition-all duration-300 ${
                  isMenuOpen ? 'opacity-0' : 'my-1'
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-white transform transition-all duration-300 ${
                  isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 lg:hidden z-40 ${
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={closeMenu}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-full bg-black text-white transform transition-transform duration-300 ease-in-out lg:hidden z-40 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <span className="text-xl font-bold">AUTO PRO</span>
          <button
            onClick={closeMenu}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white focus:outline-none"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col py-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeMenu}
              className={`px-6 py-4 text-lg hover:bg-gray-800 transition-colors border-b border-gray-800 ${
                pathname === item.href ? 'text-blue-400 bg-gray-800' : 'text-white'
              }`}
            >
              {item.name}
            </Link>
          ))}
          
          {/* Call Button */}
          <div className="px-6 py-6">
            <a
              href="tel:3529335181"
              onClick={closeMenu}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              📞 Call: (352) 933-5181
            </a>
          </div>

          {/* Business Hours */}
          <div className="px-6 py-4 border-t border-gray-700 mt-4">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Business Hours</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Mon-Fri: 8:00 AM - 6:00 PM</div>
              <div>Saturday: 9:00 AM - 5:00 PM</div>
              <div>Sunday: Closed</div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="px-6 py-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">24/7 Emergency Towing</h4>
            <a
              href="tel:3529335181"
              onClick={closeMenu}
              className="text-yellow-400 hover:text-yellow-300 font-semibold"
            >
              📞 (352) 933-5181
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}