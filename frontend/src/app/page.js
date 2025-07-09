// frontend/src/app/page.js
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedMake, setSelectedMake] = useState("All Makes");
  const [selectedModel, setSelectedModel] = useState("All Models");

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-screen w-full">
        <Image
          src="/hero.jpg"
          alt="Auto Repair Shop"
          fill
          className="object-cover brightness-50"
          priority
        />
        
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 max-w-4xl">
            Trusted Auto Repair &<br />
            Vehicle Sales in Leesburg, FL
          </h1>
          <p className="text-xl md:text-2xl mb-8 font-light">
            Affordable. Honest. Done Right the First Time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/appointment"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-semibold transition-colors"
            >
              Book an Appointment
            </Link>
            <a 
              href="tel:3523395181"
              className="bg-white hover:bg-gray-100 text-black px-8 py-3 rounded font-semibold transition-colors"
            >
              Call Us
            </a>
          </div>
        </div>

        {/* Vehicle Search Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-4">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white text-black px-4 py-2 rounded min-w-[150px]"
              >
                <option>All Years</option>
                <option>2025</option>
                <option>2024</option>
                <option>2023</option>
                <option>2022</option>
                <option>2021</option>
                <option>2020</option>
              </select>
              
              <select 
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="bg-white text-black px-4 py-2 rounded min-w-[150px]"
              >
                <option>All Makes</option>
                <option>Toyota</option>
                <option>Honda</option>
                <option>Ford</option>
                <option>Chevrolet</option>
                <option>Nissan</option>
              </select>
              
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white text-black px-4 py-2 rounded min-w-[150px]"
              >
                <option>All Models</option>
              </select>
              
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Us</h2>
          <p className="text-gray-300 mb-12 max-w-3xl">
            We're a family-owned business proudly serving the Leesburg community. 
            Whether you need repairs, an oil change, or a quality used vehicle, we've got you covered.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="font-semibold mb-2">ASE Certified<br />Technicians</h3>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">20+</span>
              </div>
              <h3 className="font-semibold mb-2">20+ Years of<br />Experience</h3>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚗</span>
              </div>
              <h3 className="font-semibold mb-2">Quality Vehicles<br />for Sale</h3>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="font-semibold mb-2">Towing<br />Services</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Inventory Section */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">Featured Inventory</h2>
            <Link href="/inventory" className="text-blue-400 hover:text-blue-300 font-semibold">
              View All Inventory →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Example Vehicle Card */}
            <div className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-48">
                <Image
                  src="/hero.jpg" // Replace with actual vehicle image
                  alt="2018 Honda Accord"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-bold mb-2">2018 Honda Accord</h3>
                <p className="text-gray-400 mb-1">45,000 miles</p>
                <p className="text-2xl font-bold text-blue-400">$18,995</p>
              </div>
            </div>
            
            {/* Add more vehicle cards as needed */}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="text-3xl mb-4">⭐⭐⭐⭐⭐</div>
          <p className="text-xl md:text-2xl mb-4 font-light italic">
            "Fast, reliable, and great pricing. AUTO PRO is only place I'll go."
          </p>
          <p className="text-gray-400">Jessica R., Leesburg, FL</p>
        </div>
      </section>
    </>
  );
}