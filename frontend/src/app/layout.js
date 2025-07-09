// frontend/src/app/layout.js
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "AUTO PRO - Trusted Auto Repair & Vehicle Sales in Leesburg, FL",
  description: "Family-owned auto repair shop and used car dealership in Leesburg, FL. ASE certified technicians, 20+ years experience. Affordable, honest, done right the first time.",
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
                  <h1 className="text-2xl font-bold leading-none">AUTO PRO</h1>
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
                <a 
                  href="tel:3523395181" 
                  className="font-semibold hover:text-blue-400 transition-colors"
                >
                  (352) 339-5181
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
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">AUTO PRO</h3>
              <p className="text-gray-400">
                Family-owned auto repair and sales serving Leesburg, FL since 2004.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact Info</h3>
              <p className="text-gray-400">123 Main Street<br />Leesburg, FL 34748</p>
              <p className="text-gray-400 mt-2">
                <a href="tel:3523395181" className="hover:text-white">(352) 339-5181</a>
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Business Hours</h3>
              <p className="text-gray-400">
                Monday - Friday: 8:00 AM - 6:00 PM<br />
                Saturday: 9:00 AM - 3:00 PM<br />
                Sunday: Closed
              </p>
            </div>
          </div>
          <div className="container mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 AUTO PRO REPAIRS SALES & SERVICES LLC. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}