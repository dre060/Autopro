// ===== frontend/src/app/services/page.js =====
"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

export default function Services() {
  const [activeCategory, setActiveCategory] = useState("all");

  const services = {
    repair: [
      { 
        name: "Engine Repair", 
        icon: "🔧", 
        description: "Complete engine diagnostics and repair",
        price: "Starting at $150",
        features: ["Computer Diagnostics", "Engine Rebuilds", "Performance Tuning"]
      },
      { 
        name: "Transmission Service", 
        icon: "⚙️", 
        description: "Automatic and manual transmission repair",
        price: "Starting at $200",
        features: ["Fluid Change", "Clutch Repair", "Complete Rebuilds"]
      },
      { 
        name: "Brake Service", 
        icon: "🛑", 
        description: "Brake pads, rotors, and complete brake systems",
        price: "Starting at $99",
        features: ["Pad Replacement", "Rotor Resurfacing", "Brake Fluid Flush"]
      },
      { 
        name: "Suspension & Steering", 
        icon: "🚗", 
        description: "Shocks, struts, and alignment services",
        price: "Starting at $75",
        features: ["Wheel Alignment", "Shock Replacement", "Steering Repair"]
      },
    ],
    maintenance: [
      { 
        name: "Oil Change", 
        icon: "🛢️", 
        description: "Quick and affordable oil changes",
        price: "$29.99",
        features: ["Synthetic Options", "Filter Replacement", "Fluid Top-off"]
      },
      { 
        name: "Tire Services", 
        icon: "🔄", 
        description: "Rotation, balancing, and new tires",
        price: "Starting at $25",
        features: ["Tire Rotation", "Wheel Balancing", "New Tire Sales"]
      },
      { 
        name: "Battery Service", 
        icon: "🔋", 
        description: "Testing, charging, and replacement",
        price: "Free Testing",
        features: ["Battery Testing", "Terminal Cleaning", "Battery Replacement"]
      },
      { 
        name: "AC Service", 
        icon: "❄️", 
        description: "AC repair and recharge",
        price: "Starting at $89",
        features: ["AC Inspection", "Refrigerant Recharge", "Component Repair"]
      },
    ],
    diagnostic: [
      { 
        name: "Check Engine Light", 
        icon: "⚠️", 
        description: "Complete diagnostic scanning",
        price: "$49.99",
        features: ["Code Reading", "System Analysis", "Repair Recommendations"]
      },
      { 
        name: "Pre-Purchase Inspection", 
        icon: "🔍", 
        description: "Thorough vehicle inspection",
        price: "$99.99",
        features: ["150-Point Inspection", "Written Report", "Test Drive"]
      },
      { 
        name: "Emissions Testing", 
        icon: "💨", 
        description: "State-certified emissions testing",
        price: "$25",
        features: ["State Compliance", "Quick Results", "Repair Services"]
      },
      { 
        name: "Electrical Diagnosis", 
        icon: "⚡", 
        description: "Electrical system troubleshooting",
        price: "Starting at $75",
        features: ["Circuit Testing", "Component Testing", "Wiring Repair"]
      },
    ],
  };

  const allServices = [...services.repair, ...services.maintenance, ...services.diagnostic];
  const displayServices = activeCategory === "all" ? allServices : services[activeCategory];

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full">
        <Image
          src="/hero.jpg"
          alt="Our Services"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center animate-fade-in-up">Our Services</h1>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="bg-blue-600 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="/appointment" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition-colors">
              📅 Book Service
            </a>
            <a href="/specials" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition-colors">
              💰 View Specials
            </a>
            <a href="tel:3529335181" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition-colors">
              📞 Call Now
            </a>
            <a href="/warranty" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition-colors">
              🛡️ Warranty Info
            </a>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Complete Auto Care Under One Roof</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              From routine maintenance to major repairs, our ASE-certified technicians have the expertise 
              to keep your vehicle running smoothly. All services backed by our 12-month/12,000-mile warranty.
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                activeCategory === "all" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              All Services
            </button>
            <button
              onClick={() => setActiveCategory("repair")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                activeCategory === "repair" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Repairs
            </button>
            <button
              onClick={() => setActiveCategory("maintenance")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                activeCategory === "maintenance" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Maintenance
            </button>
            <button
              onClick={() => setActiveCategory("diagnostic")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                activeCategory === "diagnostic" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Diagnostics
            </button>
          </div>

          {/* Services Grid - Enhanced */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayServices.map((service, index) => (
              <div key={index} className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-all hover:transform hover:scale-105 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-5xl">{service.icon}</div>
                  <span className="text-blue-400 font-semibold">{service.price}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
                  {service.name}
                </h3>
                <p className="text-gray-300 mb-4">{service.description}</p>
                {service.features && (
                  <ul className="text-sm text-gray-400 space-y-1">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <Link 
                  href="/appointment"
                  className="mt-4 inline-block text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Book This Service →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Process */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Our Service Process</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Schedule</h3>
              <p className="text-gray-400 text-sm">Book online or call us to schedule your service</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Diagnose</h3>
              <p className="text-gray-400 text-sm">We inspect your vehicle and provide a detailed estimate</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Repair</h3>
              <p className="text-gray-400 text-sm">Expert technicians complete the work with quality parts</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">Warranty</h3>
              <p className="text-gray-400 text-sm">Drive away with confidence backed by our warranty</p>
            </div>
          </div>
        </div>
      </section>

      {/* Special Services */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Additional Services</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 text-[150px] opacity-10">🚚</div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4">24/7 Towing Service</h3>
                <p className="text-gray-300 mb-4">
                  Stuck on the road? We offer reliable towing services throughout the Leesburg area. 
                  Our fleet is ready to help you 24 hours a day, 7 days a week.
                </p>
                <ul className="text-gray-300 space-y-2 mb-6">
                  <li>✓ Fast response time</li>
                  <li>✓ Flatbed and wheel-lift towing</li>
                  <li>✓ Competitive rates</li>
                  <li>✓ Direct to our shop or your location</li>
                </ul>
                <a href="tel:3529335181" className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call for Towing: (352) 933-5181
                </a>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 text-[150px] opacity-10">🚗</div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4">Quality Used Vehicles</h3>
                <p className="text-gray-300 mb-4">
                  Looking for a reliable used car? Browse our hand-picked inventory of quality 
                  pre-owned vehicles. Each car is thoroughly inspected and comes with our guarantee.
                </p>
                <ul className="text-gray-300 space-y-2 mb-6">
                  <li>✓ 150-point inspection</li>
                  <li>✓ Carfax reports available</li>
                  <li>✓ Financing options</li>
                  <li>✓ Extended warranties available</li>
                </ul>
                <Link href="/inventory" className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105">
                  View Our Inventory
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Guarantee */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-8">Our Service Guarantee</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-5xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold mb-2">12/12 Warranty</h3>
              <p>12 months or 12,000 miles on parts and labor</p>
            </div>
            <div>
              <div className="text-5xl mb-4">💯</div>
              <h3 className="text-xl font-bold mb-2">Satisfaction Guaranteed</h3>
              <p>We're not happy until you're happy</p>
            </div>
            <div>
              <div className="text-5xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">Fair Pricing</h3>
              <p>Competitive rates with no hidden fees</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-black text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Need Service?</h2>
          <p className="text-gray-300 mb-8">
            Schedule your appointment today and experience the AUTO PRO difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/appointment"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book an Appointment
            </a>
            <a 
              href="tel:3529335181"
              className="bg-white hover:bg-gray-100 text-black px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call (352) 933-5181
            </a>
          </div>
        </div>
      </section>
    </>
  );
}