// frontend/src/app/page.js - FIXED PHONE NUMBER
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedMake, setSelectedMake] = useState("All Makes");
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get phone number from environment - FIXED
  const phoneNumber = process.env.NEXT_PUBLIC_PHONE || "352-933-5181";
  const phoneNumberClean = phoneNumber.replace(/[^0-9]/g, ''); // Remove formatting for tel: links

  useEffect(() => {
    fetchFeaturedVehicles();
  }, []);

  const fetchFeaturedVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles?featured=true&status=available&limit=3');
      if (response.ok) {
        const data = await response.json();
        setFeaturedVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Error fetching featured vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedYear !== "All Years") params.append("year", selectedYear);
    if (selectedMake !== "All Makes") params.append("make", selectedMake);
    if (selectedModel !== "All Models") params.append("model", selectedModel);
    
    window.location.href = `/inventory?${params.toString()}`;
  };

  return (
    <>
      {/* Hero Section - Mobile Optimized */}
      <section className="relative min-h-screen w-full flex items-center">
        <Image
          src="/hero.jpg"
          alt="Auto Repair Shop"
          fill
          className="object-cover brightness-50"
          priority
        />
        
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 pt-20 pb-40 md:pt-0 md:pb-32">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 max-w-4xl animate-fadeInDown">
            Trusted Auto Repair &<br />
            Vehicle Sales in Leesburg, FL
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-8 font-light animate-fadeInUp animation-delay-200">
            Affordable. Honest. Done Right the First Time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp animation-delay-400 w-full max-w-sm">
            <Link 
              href="/appointment"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold transition-all transform hover:scale-105 text-center"
            >
              Book an Appointment
            </Link>
            <a 
              href={`tel:${phoneNumberClean}`}
              className="bg-white hover:bg-gray-100 text-black px-6 py-3 rounded font-semibold transition-all transform hover:scale-105 text-center"
            >
              Call: {phoneNumber}
            </a>
          </div>

          {/* July Special Banner */}
          <Link 
            href="/specials"
            className="mt-8 bg-yellow-400 text-black px-4 py-2 sm:px-6 sm:py-3 rounded-full font-bold animate-pulse hover:bg-yellow-300 transition-colors text-sm sm:text-base"
          >
            🌟 July Special: 10% OFF All Labor! 🌟
          </Link>
        </div>

        {/* Vehicle Search Bar - Mobile Responsive */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm py-4 md:py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row flex-wrap justify-center items-center gap-3 md:gap-4">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white text-black px-4 py-2 rounded w-full md:w-auto md:min-w-[150px] text-sm md:text-base"
              >
                <option>All Years</option>
                {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <select 
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="bg-white text-black px-4 py-2 rounded w-full md:w-auto md:min-w-[150px] text-sm md:text-base"
              >
                <option>All Makes</option>
                <option>Toyota</option>
                <option>Honda</option>
                <option>Ford</option>
                <option>Chevrolet</option>
                <option>Nissan</option>
                <option>Jeep</option>
                <option>Hyundai</option>
                <option>Kia</option>
                <option>Mazda</option>
                <option>Subaru</option>
              </select>
              
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white text-black px-4 py-2 rounded w-full md:w-auto md:min-w-[150px] text-sm md:text-base"
              >
                <option>All Models</option>
              </select>
              
              <button 
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors w-full md:w-auto text-sm md:text-base"
              >
                Search Inventory
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section - Mobile Optimized */}
      <section className="py-12 md:py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 animate-fadeInUp text-center">Why Choose Us</h2>
          <p className="text-gray-300 mb-8 md:mb-12 max-w-3xl mx-auto animate-fadeInUp animation-delay-200 text-center text-sm md:text-base">
            We're a family-owned business proudly serving the Leesburg community. 
            Whether you need repairs, an oil change, or a quality used vehicle, we've got you covered.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { icon: "🔧", title: "ASE Certified\nTechnicians" },
              { icon: "20+", title: "20+ Years of\nExperience" },
              { icon: "🚗", title: "Quality Vehicles\nfor Sale" },
              { icon: "🚚", title: "24/7 Towing\nServices" }
            ].map((item, index) => (
              <div key={index} className="text-center animate-fadeInUp" style={{animationDelay: `${300 + index * 100}ms`}}>
                <div className="bg-blue-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 hover:scale-110 transition-transform">
                  <span className="text-lg sm:text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-semibold mb-2 whitespace-pre-line text-sm sm:text-base">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Inventory Section - Mobile Optimized */}
      <section className="py-12 md:py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Featured Inventory</h2>
            <Link href="/inventory" className="text-blue-400 hover:text-blue-300 font-semibold text-sm md:text-base">
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="mt-4 text-gray-400">Loading vehicles...</p>
            </div>
          ) : featuredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVehicles.map((vehicle) => (
                <div key={vehicle._id} className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl transition-all hover:transform hover:scale-105">
                  <div className="relative h-48">
                    <Image
                      src={vehicle.images?.[0]?.url || "/hero.jpg"}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm">
                      ${vehicle.price?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg md:text-xl font-bold mb-2">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                    <p className="text-gray-400 mb-1 text-sm">{vehicle.mileage?.toLocaleString()} miles</p>
                    {vehicle.financingAvailable && (
                      <p className="text-xs md:text-sm text-green-400 mt-2">✓ Financing Available</p>
                    )}
                    <Link 
                      href={`/inventory/${vehicle._id}`}
                      className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <p className="text-gray-400 mb-4">Check back soon for our featured vehicles!</p>
              <Link 
                href="/inventory"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold transition-colors"
              >
                Browse All Inventory
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Financing Banner - Mobile Optimized */}
      <section className="py-8 md:py-12 px-4 bg-green-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Easy Financing Available</h2>
          <p className="text-lg md:text-xl mb-6">
            Get approved in minutes! Low down payments and flexible terms for all credit types.
          </p>
          <Link 
            href="/inventory"
            className="bg-white hover:bg-gray-100 text-green-600 px-6 py-3 rounded font-semibold transition-all transform hover:scale-105 inline-block text-sm md:text-base"
          >
            Browse Inventory with Financing
          </Link>
        </div>
      </section>

      {/* Testimonial Section - Mobile Optimized */}
      <section className="py-12 md:py-16 px-4 bg-black">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="text-3xl mb-4">⭐⭐⭐⭐⭐</div>
          <p className="text-lg md:text-2xl mb-4 font-light italic">
            "Fast, reliable, and great pricing. AUTO PRO is the only place I'll go."
          </p>
          <p className="text-gray-400 text-sm md:text-base">Jessica R., Leesburg, FL</p>
        </div>
      </section>

      {/* Services Preview - Mobile Optimized */}
      <section className="py-12 md:py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Our Services</h2>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition-colors">
              <div className="text-4xl md:text-5xl mb-4">🔧</div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Auto Repair</h3>
              <p className="text-gray-300 mb-4 text-sm md:text-base">
                From engine repair to brake service, our ASE-certified technicians handle it all.
              </p>
              <Link href="/services" className="text-blue-400 hover:text-blue-300 text-sm">
                Learn More →
              </Link>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition-colors">
              <div className="text-4xl md:text-5xl mb-4">🛢️</div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Maintenance</h3>
              <p className="text-gray-300 mb-4 text-sm md:text-base">
                Keep your vehicle running smoothly with regular oil changes and preventive care.
              </p>
              <Link href="/services" className="text-blue-400 hover:text-blue-300 text-sm">
                Learn More →
              </Link>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition-colors">
              <div className="text-4xl md:text-5xl mb-4">🚚</div>
              <h3 className="text-lg md:text-xl font-bold mb-2">24/7 Towing</h3>
              <p className="text-gray-300 mb-4 text-sm md:text-base">
                Stuck on the road? We offer reliable towing services throughout Leesburg.
              </p>
              <a href={`tel:${phoneNumberClean}`} className="text-blue-400 hover:text-blue-300 text-sm">
                Call Now →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile Optimized */}
      <section className="py-12 md:py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Experience the AUTO PRO Difference?</h2>
          <p className="text-lg md:text-xl mb-8">
            Schedule your service appointment or browse our quality used vehicles today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/appointment"
              className="bg-white hover:bg-gray-100 text-blue-600 px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold transition-all transform hover:scale-105"
            >
              Schedule Service
            </Link>
            <Link 
              href="/inventory"
              className="bg-black hover:bg-gray-900 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold transition-all transform hover:scale-105"
            >
              Browse Vehicles
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}