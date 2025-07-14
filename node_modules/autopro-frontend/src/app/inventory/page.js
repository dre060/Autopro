// frontend/src/app/inventory/page.js
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";

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
      setError(null);
      const response = await fetch('/api/vehicles?status=available');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Unable to load vehicles at this time.');
      setVehicles([]);
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

  // Get unique values for filter options
  const uniqueMakes = [...new Set(vehicles.map(v => v.make))].sort();
  const uniqueYears = [...new Set(vehicles.map(v => v.year))].sort((a, b) => b - a);
  const uniqueBodyTypes = [...new Set(vehicles.map(v => v.bodyType))].sort();

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
            <h1 className="text-4xl md:text-6xl font-bold animate-fadeInDown">Vehicle Inventory</h1>
            <p className="text-lg md:text-xl mt-4 font-light animate-fadeInUp animation-delay-200">
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
              {uniqueMakes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>

            <select
              name="model"
              value={filters.model}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              disabled={!filters.make}
            >
              <option value="">All Models</option>
              {filters.make && vehicles
                .filter(v => v.make === filters.make)
                .map(v => v.model)
                .filter((value, index, self) => self.indexOf(value) === index)
                .sort()
                .map(model => (
                  <option key={model} value={model}>{model}</option>
                ))
              }
            </select>

            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Years</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
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
              {uniqueBodyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <p className="text-gray-400">
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </p>
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
              <p className="text-red-400 text-lg mb-4">{error}</p>
              <button 
                onClick={fetchVehicles}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-900 rounded-lg p-12 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">No Vehicles Found</h2>
                {vehicles.length === 0 ? (
                  <>
                    <p className="text-gray-400 mb-6">
                      We're currently updating our inventory. Please check back soon or contact us for availability.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <a
                        href="tel:3523395181"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold transition-colors"
                      >
                        Call Us: (352) 339-5181
                      </a>
                      <Link
                        href="/contact"
                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded font-semibold transition-colors"
                      >
                        Contact Us
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 mb-6">
                      No vehicles match your search criteria. Try adjusting your filters.
                    </p>
                    <button 
                      onClick={clearFilters}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredVehicles.map((vehicle, index) => (
                  <div
                    key={vehicle._id || vehicle.id}
                    className="bg-gray-900 rounded-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 group animate-fadeInUp"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <Image
                        src={vehicle.images?.[0]?.url || "/hero.jpg"}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded font-bold">
                        ${vehicle.price.toLocaleString()}
                      </div>
                      {vehicle.salePrice && (
                        <div className="absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                          SALE
                        </div>
                      )}
                      {vehicle.featured && (
                        <div className="absolute bottom-4 left-4 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold">
                          FEATURED
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      {vehicle.trim && (
                        <p className="text-sm text-gray-400 mb-2">{vehicle.trim}</p>
                      )}
                      
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
                        <Link
                          href={`/inventory/${vehicle._id || vehicle.id}`}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded font-semibold transition-colors"
                        >
                          View Details
                        </Link>
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

              <p className="text-center text-gray-500 text-sm mt-12">
                *Estimated monthly payment based on 60-month term with approved credit. Terms and conditions apply.
              </p>
            </>
          )}
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
            <Link 
              href="/contact"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
            >
              Apply for Financing Today
            </Link>
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
            <Link 
              href="/contact"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
            >
              Send us a Message
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}