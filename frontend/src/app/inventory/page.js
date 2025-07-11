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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch vehicles from API
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/vehicles?status=available');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      
      const data = await response.json();
      setVehicles(data.vehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err.message);
      // Fallback to demo data if API fails
      setVehicles([
        {
          _id: '1',
          year: 2018,
          make: "Honda",
          model: "Accord",
          price: 18995,
          mileage: 45000,
          bodyType: "Sedan",
          fuelType: "Gasoline",
          transmission: "Automatic",
          exteriorColor: "Silver",
          images: [{ url: "/hero.jpg", alt: "Honda Accord" }],
          financingAvailable: true,
          monthlyPayment: 299,
        },
        {
          _id: '2',
          year: 2020,
          make: "Toyota",
          model: "Camry",
          price: 22995,
          mileage: 32000,
          bodyType: "Sedan",
          fuelType: "Gasoline",
          transmission: "Automatic",
          exteriorColor: "White",
          images: [{ url: "/hero.jpg", alt: "Toyota Camry" }],
          financingAvailable: true,
          monthlyPayment: 359,
        },
        {
          _id: '3',
          year: 2019,
          make: "Ford",
          model: "F-150",
          price: 28995,
          mileage: 38000,
          bodyType: "Truck",
          fuelType: "Gasoline",
          transmission: "Automatic",
          exteriorColor: "Blue",
          images: [{ url: "/hero.jpg", alt: "Ford F-150" }],
          financingAvailable: true,
          monthlyPayment: 449,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const clearFilters = () => {
    setFilters({
      make: "",
      model: "",
      year: "",
      minPrice: "",
      maxPrice: "",
      bodyType: "",
    });
  };

  // Filter vehicles based on current filters
  const filteredVehicles = vehicles.filter((vehicle) => {
    return (
      (!filters.make || vehicle.make === filters.make) &&
      (!filters.year || vehicle.year.toString() === filters.year) &&
      (!filters.bodyType || vehicle.bodyType === filters.bodyType) &&
      (!filters.minPrice || vehicle.price >= parseInt(filters.minPrice)) &&
      (!filters.maxPrice || vehicle.price <= parseInt(filters.maxPrice))
    );
  });

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
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold">Vehicle Inventory</h1>
            <p className="text-lg md:text-xl mt-4 font-light">
              <span className="bg-green-600 text-white px-3 py-1 rounded inline-block">
                💳 Financing Available
              </span>
            </p>
          </div>
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
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Makes</option>
              <option value="Toyota">Toyota</option>
              <option value="Honda">Honda</option>
              <option value="Ford">Ford</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="Nissan">Nissan</option>
              <option value="Jeep">Jeep</option>
            </select>

            <select
              name="model"
              value={filters.model}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Models</option>
            </select>

            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Years</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
              <option value="2019">2019</option>
              <option value="2018">2018</option>
              <option value="2017">2017</option>
            </select>

            <input
              type="number"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="Min Price"
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />

            <input
              type="number"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="Max Price"
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />

            <select
              name="bodyType"
              value={filters.bodyType}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
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
            <p className="text-gray-400">Showing {filteredVehicles.length} vehicles</p>
            <button 
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {/* Inventory Grid */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="mt-4 text-gray-400">Loading vehicles...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 text-lg mb-4">Error loading vehicles: {error}</p>
              <p className="text-gray-400">Showing demo vehicles instead.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredVehicles.map((vehicle) => (
                  <div
                    key={vehicle._id || vehicle.id}
                    className="bg-gray-900 rounded-lg overflow-hidden hover:shadow-2xl transition-shadow group"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <Image
                        src={vehicle.images?.[0]?.url || vehicle.image || "/hero.jpg"}
                        alt={vehicle.images?.[0]?.alt || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded">
                        ${vehicle.price.toLocaleString()}
                      </div>
                      {vehicle.financingAvailable && (
                        <div className="absolute top-4 left-4 bg-green-600 text-white px-2 py-1 rounded text-xs">
                          Financing Available
                        </div>
                      )}
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

                      {/* Financing Badge and Monthly Payment */}
                      {vehicle.financingAvailable && (
                        <div className="mb-4 space-y-2">
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded inline-block">
                            ✓ Financing Available
                          </span>
                          {vehicle.monthlyPayment && (
                            <p className="text-sm text-gray-300">
                              As low as <span className="font-bold text-green-400">${vehicle.monthlyPayment}/mo</span>*
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <a
                          href={`/inventory/${vehicle._id || vehicle.id}`}
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

              {/* Empty State */}
              {filteredVehicles.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No vehicles match your search criteria.</p>
                  <button 
                    onClick={clearFilters}
                    className="mt-4 text-blue-400 hover:text-blue-300"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          <div className="flex justify-center mt-12 gap-2">
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">
              Previous
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded">1</button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">2</button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">3</button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">
              Next
            </button>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            *Estimated monthly payment based on 60-month term with approved credit. Terms and conditions apply.
          </p>
        </div>
      </section>

      {/* Financing Information Section */}
      <section className="py-16 px-4 bg-gray-800 text-center">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">Easy Financing Options</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">Quick Application</h3>
              <p className="text-gray-300">
                Apply online or in-person. Get approved in minutes, not hours.
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">Flexible Terms</h3>
              <p className="text-gray-300">
                Low down payments and competitive rates to fit your budget.
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-bold mb-2">All Credit Welcome</h3>
              <p className="text-gray-300">
                Bad credit, no credit? We work with all credit situations.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <a 
              href="/financing"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
            >
              Apply for Financing Today
            </a>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="tel:3523395181"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
            >
              Call Us: (352) 339-5181
            </a>
            <a 
              href="/contact"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
            >
              Send us a Message
            </a>
          </div>
        </div>
      </section>
    </>
  );
}