// frontend/src/app/layout.js - FIXED WITH FAVICONS
"use client";

import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function RootLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
      document.body.style.top = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
      document.body.style.top = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <html lang="en">
      <head>
        {/* Primary Meta Tags */}
        <title>AUTO PRO Repairs & Sales | Leesburg, FL</title>
        <meta name="title" content="AUTO PRO Repairs & Sales | Leesburg, FL" />
        <meta name="description" content="Professional auto repair and quality used cars in Leesburg, FL. Expert service, honest pricing, and reliable vehicles." />
        <meta name="keywords" content="auto repair, used cars, Leesburg FL, car service, vehicle sales" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="author" content="AUTO PRO Repairs & Sales" />

        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Favicon Package */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Theme Colors */}
        <meta name="theme-color" content="#1f2937" />
        <meta name="msapplication-TileColor" content="#1f2937" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.autoprorepairs.com/" />
        <meta property="og:title" content="AUTO PRO Repairs & Sales | Leesburg, FL" />
        <meta property="og:description" content="Professional auto repair and quality used cars in Leesburg, FL. Expert service, honest pricing, and reliable vehicles." />
        <meta property="og:image" content="https://www.autoprorepairs.com/logo.jpg" />
        <meta property="og:site_name" content="AUTO PRO Repairs & Sales" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.autoprorepairs.com/" />
        <meta property="twitter:title" content="AUTO PRO Repairs & Sales | Leesburg, FL" />
        <meta property="twitter:description" content="Professional auto repair and quality used cars in Leesburg, FL. Expert service, honest pricing, and reliable vehicles." />
        <meta property="twitter:image" content="https://www.autoprorepairs.com/logo.jpg" />

        {/* Additional SEO */}
        <meta name="geo.region" content="US-FL" />
        <meta name="geo.placename" content="Leesburg" />
        <meta name="geo.position" content="28.8108;-81.8773" />
        <meta name="ICBM" content="28.8108, -81.8773" />

        {/* Business Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AutoRepair",
            "name": "AUTO PRO Repairs & Sales",
            "image": "https://www.autoprorepairs.com/logo.jpg",
            "telephone": "(352) 933-5181",
            "email": "service@autoprorepairs.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "806 Hood Ave",
              "addressLocality": "Leesburg",
              "addressRegion": "FL",
              "postalCode": "34748",
              "addressCountry": "US"
            },
            "url": "https://www.autoprorepairs.com",
            "openingHours": [
              "Mo-Fr 08:00-18:00",
              "Sa 09:00-15:00"
            ],
            "priceRange": "$",
            "paymentAccepted": "Cash, Credit Card, Financing",
            "currenciesAccepted": "USD"
          })}
        </script>
      </head>
      <body className="antialiased bg-black text-white">
        {/* Navigation Header - FIXED Z-INDEX */}
        <header className="absolute top-0 left-0 w-full z-[100] bg-black/90 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 md:py-4">
            <nav className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center" onClick={closeMobileMenu}>
                <Image 
                  src="/logo.jpg" 
                  alt="AUTO PRO" 
                  width={120} 
                  height={60} 
                  className="object-contain md:w-[150px] md:h-[80px]"
                />
                <div className="ml-2 hidden sm:block">
                  <h1 className="text-lg md:text-xl font-bold leading-none">AUTO PRO REPAIRS SALES & SERVICES</h1>
                  <p className="text-xs text-gray-300">ASE CERTIFIED TECHNICIANS</p>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/" className="hover:text-blue-400 transition-colors">
                  Home
                </Link>
                <Link href="/about" className="hover:text-blue-400 transition-colors">
                  About
                </Link>
                <Link href="/services" className="hover:text-blue-400 transition-colors">
                  Services
                </Link>
                <Link href="/inventory" className="hover:text-blue-400 transition-colors">
                  Inventory
                </Link>
                <Link href="/specials" className="hover:text-blue-400 transition-colors text-yellow-400 font-semibold">
                  Specials
                </Link>
                <a 
                  href="tel:3529335181" 
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition-all transform hover:scale-105"
                >
                  (352) 933-5181
                </a>
              </div>

              {/* Mobile Menu Button - FIXED Z-INDEX */}
              <button 
                className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors relative z-[102]"
                aria-label="Toggle mobile menu"
                onClick={toggleMobileMenu}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </nav>
          </div>
        </header>

        {/* FIXED: Mobile Menu Overlay and Panel */}
        {mobileMenuOpen && (
          <>
            {/* Full Screen Overlay - FIXED POSITIONING AND Z-INDEX */}
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99] md:hidden"
              onClick={closeMobileMenu}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99
              }}
            />
            
            {/* Mobile Menu Panel - FIXED POSITIONING AND Z-INDEX */}
            <div 
              className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-black/95 backdrop-blur-md text-white z-[101] md:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto"
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                height: '100vh',
                zIndex: 101,
                transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)'
              }}
            >
              <div className="p-6">
                {/* Close Button */}
                <div className="flex justify-end mb-6">
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    aria-label="Close menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Menu Items */}
                <div className="flex flex-col space-y-1">
                  <Link 
                    href="/" 
                    className="text-lg py-4 px-4 hover:bg-gray-800 rounded-lg transition-colors border-b border-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Home
                  </Link>
                  <Link 
                    href="/about" 
                    className="text-lg py-4 px-4 hover:bg-gray-800 rounded-lg transition-colors border-b border-gray-800"
                    onClick={closeMobileMenu}
                  >
                    About
                  </Link>
                  <Link 
                    href="/services" 
                    className="text-lg py-4 px-4 hover:bg-gray-800 rounded-lg transition-colors border-b border-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Services
                  </Link>
                  <Link 
                    href="/inventory" 
                    className="text-lg py-4 px-4 hover:bg-gray-800 rounded-lg transition-colors border-b border-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Inventory
                  </Link>
                  <Link 
                    href="/specials" 
                    className="text-lg py-4 px-4 hover:bg-gray-800 rounded-lg transition-colors text-yellow-400 font-semibold border-b border-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Specials
                  </Link>
                  <Link 
                    href="/appointment" 
                    className="text-lg py-4 px-4 hover:bg-gray-800 rounded-lg transition-colors border-b border-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Book Appointment
                  </Link>
                  <Link 
                    href="/contact" 
                    className="text-lg py-4 px-4 hover:bg-gray-800 rounded-lg transition-colors border-b border-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Contact
                  </Link>
                  
                  {/* Call Button */}
                  <div className="pt-4">
                    <a 
                      href="tel:3529335181" 
                      className="bg-blue-600 hover:bg-blue-700 py-4 px-4 rounded-lg font-semibold text-center transition-all block"
                      onClick={closeMobileMenu}
                    >
                      <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call: (352) 933-5181
                    </a>
                  </div>

                  {/* Business Hours */}
                  <div className="border-t border-gray-800 pt-6 mt-6">
                    <p className="text-sm text-gray-400 px-4 mb-2">Hours:</p>
                    <p className="text-sm px-4">Mon-Fri: 8AM-6PM</p>
                    <p className="text-sm px-4">Saturday: 9AM-3PM</p>
                    <p className="text-sm px-4">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main Content - FIXED Z-INDEX */}
        <main className={`relative z-[1] ${mobileMenuOpen ? "pointer-events-none" : ""}`}>
          {children}
        </main>

        {/* Footer - Simplified for Mobile */}
        <footer className="bg-gray-900 text-white py-8 md:py-12 px-4 relative z-[1]">
          <div className="container mx-auto">
            {/* Newsletter Signup - Responsive */}
            <div className="bg-blue-600 rounded-lg p-6 md:p-8 mb-8 md:mb-12 text-center">
              <h3 className="text-xl md:text-2xl font-bold mb-4">Get Exclusive Deals & Service Reminders</h3>
              <p className="mb-6 text-sm md:text-base">Join our newsletter for special offers and maintenance tips!</p>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded bg-white text-black"
                  aria-label="Email for newsletter"
                />
                <button 
                  type="submit"
                  className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded font-semibold transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>

            {/* Footer Grid - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-4">AUTO PRO REPAIRS SALES & SERVICES</h3>
                <p className="text-gray-400 mb-4 text-sm">
                  Family-owned auto repair and sales serving Leesburg, FL for 3 years with 20+ years of experience.
                </p>
                <div className="flex space-x-4">
                  <a href="https://www.facebook.com/autoprorepairs" className="text-gray-400 hover:text-white" aria-label="Facebook">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/autoprorepairs" className="text-gray-400 hover:text-white" aria-label="Instagram">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                    </svg>
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><Link href="/services" className="hover:text-white">Our Services</Link></li>
                  <li><Link href="/inventory" className="hover:text-white">Vehicle Inventory</Link></li>
                  <li><Link href="/appointment" className="hover:text-white">Book Appointment</Link></li>
                  <li><Link href="/specials" className="hover:text-white">Current Specials</Link></li>
                  <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                  <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-4">Contact Info</h3>
                <div className="space-y-3 text-gray-400 text-sm">
                  <p className="flex items-start">
                    <span className="mr-2">📍</span>
                    806 Hood Ave<br />Leesburg, FL 34748
                  </p>
                  <p className="flex items-center">
                    <span className="mr-2">📞</span>
                    <a href="tel:3529335181" className="hover:text-white">(352) 933-5181</a>
                  </p>
                  <p className="flex items-center">
                    <span className="mr-2">✉️</span>
                    <a href="mailto:service@autoprorepairs.com" className="hover:text-white break-all">service@autoprorepairs.com</a>
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-4">Business Hours</h3>
                <ul className="space-y-1 text-gray-400 text-sm">
                  <li className="flex justify-between">
                    <span>Monday - Friday:</span>
                    <span>8:00 AM - 6:00 PM</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Saturday:</span>
                    <span>9:00 AM - 3:00 PM</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Sunday:</span>
                    <span>Closed</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-green-600 rounded text-center">
                  <p className="font-semibold text-sm">Emergency Towing Available 24/7</p>
                </div>
              </div>
            </div>
            
            <div className="container mx-auto mt-8 pt-8 border-t border-gray-800">
              <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-xs md:text-sm">
                <p>&copy; 2025 AUTO PRO REPAIRS SALES & SERVICES LLC. All rights reserved.</p>
                <div className="flex space-x-4 mt-4 md:mt-0">
                  <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-white">Terms of Service</Link>
                  <Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating Action Buttons - FIXED Z-INDEX */}
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col space-y-3 z-[40]">
          <a 
            href="tel:3529335181"
            className="bg-green-600 hover:bg-green-700 text-white p-3 md:p-4 rounded-full shadow-lg transition-all transform hover:scale-110"
            aria-label="Call us"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
          <Link 
            href="/appointment"
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 md:p-4 rounded-full shadow-lg transition-all transform hover:scale-110"
            aria-label="Book appointment"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Link>
        </div>
      </body>
    </html>
  );
}