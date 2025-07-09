// frontend/src/app/inventory/page.js
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Inventory() {
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({
    make: "",
    model: "",
    year: "",
    minPrice: "",
    maxPrice: "",
    bodyType: "",
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    setVehicles([
      {
        id: 1,
        year: 2018,
        make: "Honda",
        model: "Accord",
        price: 18995,
        mileage: 45000,
        bodyType: "Sedan",
        fuelType: "Gasoline",
        transmission: "Automatic",
        exteriorColor: "Silver",
        image: "/hero.jpg",
      },
      {
        id: 2,
        year: 2020,
        make: "Toyota",
        model: "Camry",
        price: 22995,
        mileage: 32000,
        bodyType: "Sedan",
        fuelType: "Gasoline",
        transmission: "Automatic",
        exteriorColor: "White",
        image: "/hero.jpg",
      },
      {
        id: 3,
        year: 2019,
        make: "Ford",
        model: "F-150",
        price: 28995,
        mileage: 38000,
        bodyType: "Truck",
        fuelType: "Gasoline",
        transmission: "Automatic",
        exteriorColor: "Blue",
        image: "/hero.jpg",
      },
    ]);
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full">
        <Image
          src="/hero.jpg"
          alt="Vehicle Inventory"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center">Vehicle Inventory</h1>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <select
              name="make"
              value={filters.make}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500"
            >
              <option value="">All Makes</option>
              <option value="Toyota">Toyota</option>
              <option value="Honda">Honda</option>
              <option value="Ford">Ford</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="Nissan">Nissan</option>
            </select>

            <select
              name="model"
              value={filters.model}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500"
            >
              <option value="">All Models</option>
            </select>

            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500"
            >
              <option value="">All Years</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
            </select>

            <input
              type="number"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="Min Price"
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500"
            />

            <input
              type="number"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="Max Price"
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500"
            />

            <select
              name="bodyType"
              value={filters.bodyType}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="Truck">Truck</option>
              <option value="Coupe">Coupe</option>
              <option value="Van">Van</option>
            </select>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <p className="text-gray-400">Showing {vehicles.length} vehicles</p>
            <button className="text-blue-400 hover:text-blue-300">
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {/* Inventory Grid */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-gray-900 rounded-lg overflow-hidden hover:shadow-2xl transition-shadow"
              >
                <div className="relative h-56">
                  <Image
                    src={vehicle.image}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded">
                    ${vehicle.price.toLocaleString()}
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-4">
                    <div>
                      <span className="text-gray-500">Mileage:</span> {vehicle.mileage.toLocaleString()} mi
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span> {vehicle.bodyType}
                    </div>
                    <div>
                      <span className="text-gray-500">Fuel:</span> {vehicle.fuelType}
                    </div>
                    <div>
                      <span className="text-gray-500">Trans:</span> {vehicle.transmission}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={`/inventory/${vehicle.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded font-semibold transition-colors"
                    >
                      View Details
                    </a>
                    <a
                      href="tel:3523395181"
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-center py-2 rounded font-semibold transition-colors"
                    >
                      Call
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-12 gap-2">
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
              Previous
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded">1</button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">2</button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">3</button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
              Next
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gray-900 text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Can't Find What You're Looking For?</h2>
          <p className="text-gray-300 mb-8">
            Let us know what you need and we'll help you find the perfect vehicle.
          </p>
          <a 
            href="tel:3523395181"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
          >
            Call Us: (352) 339-5181
          </a>
        </div>
      </section>
    </>
  );
}