// frontend/src/app/services/page.js
"use client";

import Image from "next/image";
import { useState } from "react";

export default function Services() {
  const [activeCategory, setActiveCategory] = useState("all");

  const services = {
    repair: [
      { name: "Engine Repair", icon: "🔧", description: "Complete engine diagnostics and repair" },
      { name: "Transmission Service", icon: "⚙️", description: "Automatic and manual transmission repair" },
      { name: "Brake Service", icon: "🛑", description: "Brake pads, rotors, and complete brake systems" },
      { name: "Suspension & Steering", icon: "🚗", description: "Shocks, struts, and alignment services" },
    ],
    maintenance: [
      { name: "Oil Change", icon: "🛢️", description: "Quick and affordable oil changes" },
      { name: "Tire Services", icon: "🔄", description: "Rotation, balancing, and new tires" },
      { name: "Battery Service", icon: "🔋", description: "Testing, charging, and replacement" },
      { name: "AC Service", icon: "❄️", description: "AC repair and recharge" },
    ],
    diagnostic: [
      { name: "Check Engine Light", icon: "⚠️", description: "Complete diagnostic scanning" },
      { name: "Pre-Purchase Inspection", icon: "🔍", description: "Thorough vehicle inspection" },
      { name: "Emissions Testing", icon: "💨", description: "State-certified emissions testing" },
      { name: "Electrical Diagnosis", icon: "⚡", description: "Electrical system troubleshooting" },
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
          <h1 className="text-4xl md:text-6xl font-bold text-center">Our Services</h1>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Complete Auto Care Under One Roof</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              From routine maintenance to major repairs, our ASE-certified technicians have the expertise 
              to keep your vehicle running smoothly.
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-6 py-2 rounded font-semibold transition-colors ${
                activeCategory === "all" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              All Services
            </button>
            <button
              onClick={() => setActiveCategory("repair")}
              className={`px-6 py-2 rounded font-semibold transition-colors ${
                activeCategory === "repair" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Repairs
            </button>
            <button
              onClick={() => setActiveCategory("maintenance")}
              className={`px-6 py-2 rounded font-semibold transition-colors ${
                activeCategory === "maintenance" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Maintenance
            </button>
            <button
              onClick={() => setActiveCategory("diagnostic")}
              className={`px-6 py-2 rounded font-semibold transition-colors ${
                activeCategory === "diagnostic" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Diagnostics
            </button>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayServices.map((service, index) => (
              <div key={index} className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                <p className="text-gray-300">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Special Services */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Additional Services</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-8">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-2xl font-bold mb-4">24/7 Towing Service</h3>
              <p className="text-gray-300 mb-4">
                Stuck on the road? We offer reliable towing services throughout the Leesburg area. 
                Our fleet is ready to help you 24 hours a day, 7 days a week.
              </p>
              <a href="tel:3523395181" className="text-blue-400 hover:text-blue-300 font-semibold">
                Call for Towing: (352) 339-5181
              </a>
            </div>
            <div className="bg-gray-800 rounded-lg p-8">
              <div className="text-4xl mb-4">🚗</div>
              <h3 className="text-2xl font-bold mb-4">Quality Used Vehicles</h3>
              <p className="text-gray-300 mb-4">
                Looking for a reliable used car? Browse our hand-picked inventory of quality 
                pre-owned vehicles. Each car is thoroughly inspected and comes with our guarantee.
              </p>
              <a href="/inventory" className="text-blue-400 hover:text-blue-300 font-semibold">
                View Our Inventory →
              </a>
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-semibold transition-colors"
            >
              Book an Appointment
            </a>
            <a 
              href="tel:3523395181"
              className="bg-white hover:bg-gray-100 text-black px-8 py-3 rounded font-semibold transition-colors"
            >
              Call (352) 339-5181
            </a>
          </div>
        </div>
      </section>
    </>
  );
}