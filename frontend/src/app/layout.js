// ===== frontend/src/app/layout.js =====
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "AUTO PRO REPAIRS SALES & SERVICES - Trusted Auto Repair & Vehicle Sales in Leesburg, FL",
  description: "Family-owned auto repair shop and used car dealership in Leesburg, FL. ASE certified technicians, 20+ years experience. Affordable, honest, done right the first time.",
  keywords: "auto repair, car repair, oil change, brake service, engine repair, used cars, Leesburg FL, ASE certified, towing service",
  openGraph: {
    title: "AUTO PRO REPAIRS SALES & SERVICES",
    description: "Trusted auto repair and vehicle sales in Leesburg, FL",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-white">
        {/* Navigation Header */}
        <header className="absolute top-0 left-0 w-full z-50 bg-transparent">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center">
                <Image 
                  src="/logo.jpg" 
                  alt="AUTO PRO" 
                  width={150} 
                  height={80} 
                  className="object-contain"
                />
                <div className="ml-2">
                  <h1 className="text-xl font-bold leading-none">AUTO PRO REPAIRS SALES & SERVICES</h1>
                  <p className="text-xs text-gray-300">ASE CERTIFIED TECHNICIANS</p>
                </div>
              </Link>

              {/* Navigation Links */}
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

              {/* Mobile Menu Button */}
              <button className="md:hidden">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12 px-4">
          <div className="container mx-auto">
            {/* Newsletter Signup */}
            <div className="bg-blue-600 rounded-lg p-8 mb-12 text-center">
              <h3 className="text-2xl font-bold mb-4">Get Exclusive Deals & Service Reminders</h3>
              <p className="mb-6">Join our newsletter for special offers and maintenance tips!</p>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded bg-white text-black"
                />
                <button className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded font-semibold transition-colors">
                  Subscribe
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">AUTO PRO REPAIRS SALES & SERVICES</h3>
                <p className="text-gray-400 mb-4">
                  Family-owned auto repair and sales serving Leesburg, FL for 3 years with 20+ years of experience.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                    </svg>
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/services" className="hover:text-white">Our Services</Link></li>
                  <li><Link href="/inventory" className="hover:text-white">Vehicle Inventory</Link></li>
                  <li><Link href="/appointment" className="hover:text-white">Book Appointment</Link></li>
                  <li><Link href="/financing" className="hover:text-white">Financing Options</Link></li>
                  <li><Link href="/warranty" className="hover:text-white">Warranty Info</Link></li>
                  <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-4">Contact Info</h3>
                <div className="space-y-3 text-gray-400">
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
                    <a href="mailto:info@autopro-leesburg.com" className="hover:text-white">info@autopro-leesburg.com</a>
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-4">Business Hours</h3>
                <ul className="space-y-1 text-gray-400">
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
                  <p className="font-semibold">Emergency Towing Available 24/7</p>
                </div>
              </div>
            </div>
            
            <div className="container mx-auto mt-8 pt-8 border-t border-gray-800">
              <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
                <p>&copy; 2025 AUTO PRO REPAIRS SALES & SERVICES LLC. All rights reserved.</p>
                <div className="flex space-x-4 mt-4 md:mt-0">
                  <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-white">Terms of Service</Link>
                  <Link href="/sitemap" className="hover:text-white">Sitemap</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-40">
          <a 
            href="tel:3529335181"
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110"
            aria-label="Call us"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
          <a 
            href="/appointment"
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110"
            aria-label="Book appointment"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </body>
    </html>
  );
}
