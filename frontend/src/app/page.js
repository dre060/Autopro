// app/page.js
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://fgzfltveywwzvvhqfuse.supabase.co",
  "your-public-anon-key-here"
);

export default function Home() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    async function fetchVehicles() {
      const { data } = await supabase.from("inventory").select("*");
      setVehicles(data);
    }
    fetchVehicles();
  }, []);

  return (
    <main className="bg-black text-white min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[90vh] w-full">
        <Image
          src="/hero.jpg"
          alt="Mechanic"
          layout="fill"
          objectFit="cover"
          className="brightness-[0.4]"
        />
        <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center px-4 text-center">
          <Image src="/logo.jpg" alt="Auto Pro Logo" width={180} height={100} className="mb-4" />
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            Trusted Auto Repair & Vehicle Sales in Leesburg, FL
          </h1>
          <p className="text-lg sm:text-xl mb-6">
            Affordable. Honest. Done Right the First Time.
          </p>
          <div className="flex gap-4">
            <button className="bg-blue-600 px-6 py-3 rounded text-white font-semibold">Book an Appointment</button>
            <a href="tel:3529335181" className="bg-white text-black px-6 py-3 rounded font-semibold">Call Us</a>
          </div>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-black py-8 px-4 flex flex-wrap justify-center gap-4">
        <select className="bg-white text-black p-2 rounded">
          <option>All Years</option>
        </select>
        <select className="bg-white text-black p-2 rounded">
          <option>All Makes</option>
        </select>
        <select className="bg-white text-black p-2 rounded">
          <option>All Models</option>
        </select>
        <button className="bg-blue-600 px-4 py-2 rounded text-white font-medium">Search</button>
      </div>

      {/* Why Choose Us */}
      <section className="py-12 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Why Choose Us</h2>
        <p className="mb-6 max-w-xl">
          We’re a family-owned business proudly serving the Leesburg community.
          Whether you need repairs, an oil change, or a quality used vehicle,
          we’ve got you covered.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl">🔧</div>
            <p className="font-semibold mt-2">ASE Certified Technicians</p>
          </div>
          <div>
            <div className="text-2xl">📅</div>
            <p className="font-semibold mt-2">20+ Years of Experience</p>
          </div>
          <div>
            <div className="text-2xl">🚗</div>
            <p className="font-semibold mt-2">Quality Vehicles for Sale</p>
          </div>
          <div>
            <div className="text-2xl">🚚</div>
            <p className="font-semibold mt-2">Towing Services</p>
          </div>
        </div>
      </section>

      {/* Featured Inventory */}
      <section className="py-12 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Featured Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white text-black rounded shadow p-4">
                <img src={vehicle.image_url} alt={vehicle.make_model} className="rounded mb-4" />
                <h3 className="text-xl font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                <p className="text-gray-600">${vehicle.price}</p>
              </div>
            ))}
          </div>
          <div className="text-right mt-4">
            <a href="#" className="text-blue-400">View All Inventory &rarr;</a>
          </div>
        </div>
      </section>

      {/* Review */}
      <section className="py-10 px-6 text-center text-white bg-black">
        <p className="text-xl mb-2">⭐⭐⭐⭐⭐</p>
        <p className="text-lg">Fast, reliable, and great pricing. AUTO PRO is only place I’ll go.</p>
        <p className="text-sm mt-1 text-gray-400">- Jessica R., Leesburg, FL</p>
      </section>
    </main>
  );
}
