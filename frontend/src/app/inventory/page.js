// frontend/src/app/inventory/page.js - FIXED SALE PRICING DISPLAY
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

  // HARDCODED IMAGE AND PRICE FIX - Replace fallback images with real Supabase URLs
  const getFixedVehicleData = (vehicle) => {
    const vehicleKey = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase();
    const stockNumber = vehicle.stock_number || '';
    
    console.log(`🔍 Checking vehicle: ${vehicleKey} (Stock: ${stockNumber})`);
    
    let fixedVehicle = { ...vehicle };
    
    // 2025 Toyota Camry (Stock: AP433889)  
    if (vehicleKey.includes('2025') && vehicleKey.includes('toyota') && vehicleKey.includes('camry')) {
      console.log('✅ Matched: 2025 Toyota Camry - fixing images and price');
      
      // Fix pricing: $39k regular (crossed out), $27.5k sale price (main)
      fixedVehicle.price = 39000;  // This becomes the crossed-out price
      fixedVehicle.sale_price = 27500;  // This becomes the main price
      fixedVehicle.images = [
        {
          url: 'https://fgzfltveywwzvvhqfuse.supabase.co/storage/v1/object/public/vehicle-images/Toyotacam1.jpeg',
          alt: '2025 Toyota Camry',
          isPrimary: true
        },
        {
          url: 'https://fgzfltveywwzvvhqfuse.supabase.co/storage/v1/object/public/vehicle-images/auto-1753052236947-fmqxec.jpg',
          alt: '2025 Toyota Camry Interior',
          isPrimary: false
        },
        {
          url: 'https://fgzfltveywwzvvhqfuse.supabase.co/storage/v1/object/public/vehicle-images/auto-1753052202134-zbgall.jpg',
          alt: '2025 Toyota Camry Side View',
          isPrimary: false
        }
      ];
    }
    
    // 2022 Toyota Tundra (Stock: AP677595)
    else if (vehicleKey.includes('2022') && vehicleKey.includes('toyota') && vehicleKey.includes('tundra')) {
      console.log('✅ Matched: 2022 Toyota Tundra');
      fixedVehicle.images = [
        {
          url: 'https://fgzfltveywwzvvhqfuse.supabase.co/storage/v1/object/public/vehicle-images/auto-1753052647603-vssyt7.jpg',
          alt: '2022 Toyota Tundra',
          isPrimary: true
        },
        {
          url: 'https://fgzfltveywwzvvhqfuse.supabase.co/storage/v1/object/public/vehicle-images/auto-1753052659134-tkfil0.jpg',
          alt: '2022 Toyota Tundra Interior',
          isPrimary: false
        }
      ];
    }
    
    // 2015 Kensworth T700 (Stock: AP824028)
    else if (vehicleKey.includes('2015') && vehicleKey.includes('kensworth')) {
      console.log('✅ Matched: 2015 Kensworth T700');
      fixedVehicle.images = [
        {
          url: 'https://fgzfltveywwzvvhqfuse.supabase.co/storage/v1/object/public/vehicle-images/auto-1753052819637-l1j3u0.jpg',
          alt: '2015 Kensworth T700',
          isPrimary: true
        },
        {
          url: 'https://fgzfltveywwzvvhqfuse.supabase.co/storage/v1/object/public/vehicle-images/auto-1753052223641-w8ajg2.jpg',
          alt: '2015 Kensworth T700 Detail',
          isPrimary: false
        }
      ];
    }
    
    else {
      console.log('⚠️ No match found, using original images');
      // Return original images if no match (with fallback)
      if (vehicle.images && vehicle.images.length > 0) {
        fixedVehicle.images = vehicle.images;
      } else {
        // Ultimate fallback
        fixedVehicle.images = [{
          url: '/hero.jpg',
          alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          isPrimary: true,
          isFallback: true
        }];
      }
    }
    
    return fixedVehicle;
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/vehicles?status=available', {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch vehicles`);
      }
      
      const data = await response.json();
      console.log('🚗 Fetched vehicles:', data);
      
      // Apply fixes to each vehicle (images and prices)
      const processedVehicles = (data.vehicles || []).map(vehicle => {
        const fixedVehicle = getFixedVehicleData(vehicle);
        console.log(`🔧 Fixed vehicle data for ${vehicle.year} ${vehicle.make} ${vehicle.model}:`, {
          images: fixedVehicle.images.length,
          salePrice: fixedVehicle.sale_price
        });
        
        return fixedVehicle;
      });
      
      setVehicles(processedVehicles);
      console.log('✅ Processed vehicles with fixed images:', processedVehicles);
    } catch (err) {
      console.error('❌ Error fetching vehicles:', err);
      setError('Unable to load vehicles at this time. Please try again.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Get primary image URL with fallback
  const getPrimaryImageUrl = (vehicle) => {
    if (!vehicle.images || vehicle.images.length === 0) {
      return "/hero.jpg";
    }
    
    const primaryImage = vehicle.images.find(img => img.isPrimary) || vehicle.images[0];
    return primaryImage?.url || "/hero.jpg";
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

  // Filter vehicles
  const filteredVehicles = vehicles.filter((vehicle) => {
    return (
      (!filters.make || vehicle.make === filters.make) &&
      (!filters.year || vehicle.year.toString() === filters.year) &&
      (!filters.bodyType || vehicle.body_type === filters.bodyType) &&
      (!filters.minPrice || vehicle.price >= parseInt(filters.minPrice)) &&
      (!filters.maxPrice || vehicle.price <= parseInt(filters.maxPrice))
    );
  });

  // Get unique values for filters
  const uniqueMakes = [...new Set(vehicles.map(v => v.make))].filter(Boolean).sort();
  const uniqueYears = [...new Set(vehicles.map(v => v.year))].filter(Boolean).sort((a, b) => b - a);
  const uniqueBodyTypes = [...new Set(vehicles.map(v => v.body_type))].filter(Boolean).sort();

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
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md mx-auto">
                <div className="text-red-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-400 mb-2">Error Loading Vehicles</h3>
                <p className="text-red-300 text-sm mb-4">{error}</p>
                <button 
                  onClick={fetchVehicles}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-900 rounded-lg p-12 max-w-2xl mx-auto">
                <div className="text-gray-400 mb-6">
                  <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4">No Vehicles Found</h2>
                {vehicles.length === 0 ? (
                  <>
                    <p className="text-gray-400 mb-6">
                      We're currently updating our inventory. Please check back soon or contact us for availability.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <a
                        href="tel:3529335181"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold transition-colors"
                      >
                        Call Us: (352) 933-5181
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
                {filteredVehicles.map((vehicle, index) => {
                  const primaryImageUrl = getPrimaryImageUrl(vehicle);
                  
                  return (
                    <div
                      key={vehicle.id}
                      className="bg-gray-900 rounded-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105 group animate-fadeInUp"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="relative h-56 overflow-hidden">
                        <Image
                          src={primaryImageUrl}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            console.error('Image load error for vehicle:', vehicle.id, primaryImageUrl);
                            e.target.src = '/hero.jpg';
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded successfully for vehicle:', vehicle.id, primaryImageUrl);
                          }}
                        />
                        
                        {/* FIXED: Sale Badge with Sale Price */}
                        {vehicle.sale_price ? (
                          <div className="absolute top-4 left-4">
                            {/* Sale Badge */}
                            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold mb-1">
                              SALE
                            </div>
                            {/* Sale Price under the badge */}
                            <div className="bg-green-600 text-white px-3 py-1 rounded font-bold text-sm">
                              ${vehicle.sale_price?.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          /* Regular Price Badge (when no sale) */
                          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded font-bold">
                            ${vehicle.price?.toLocaleString() || 'N/A'}
                          </div>
                        )}
                        
                        {/* FIXED: Crossed out regular price (when on sale) */}
                        {vehicle.sale_price && (
                          <div className="absolute top-4 right-4 bg-gray-800/80 text-gray-300 px-2 py-1 rounded text-sm">
                            <span className="line-through">${vehicle.price?.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {/* Featured Badge */}
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
                            <span className="text-gray-500">Mileage:</span> {vehicle.mileage?.toLocaleString() || 'N/A'} mi
                          </div>
                          <div>
                            <span className="text-gray-500">Type:</span> {vehicle.body_type || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500">Fuel:</span> {vehicle.fuel_type || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500">Trans:</span> {vehicle.transmission || 'N/A'}
                          </div>
                        </div>

                        {/* FIXED: Show sale pricing in card body */}
                        {vehicle.sale_price && (
                          <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-green-400 font-bold text-lg">
                                  ${vehicle.sale_price?.toLocaleString()}
                                </p>
                                <p className="text-gray-400 text-sm line-through">
                                  Was ${vehicle.price?.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-green-400 font-bold">
                                SAVE ${((vehicle.price || 0) - (vehicle.sale_price || 0)).toLocaleString()}!
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Financing Info */}
                        {vehicle.financing_available && (
                          <div className="mb-4 space-y-2">
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded inline-block">
                              ✓ Financing Available
                            </span>
                            {vehicle.monthly_payment && (
                              <p className="text-sm text-gray-300">
                                As low as <span className="font-bold text-green-400">${vehicle.monthly_payment}/mo</span>*
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Link
                            href={`/inventory/${vehicle.id}`}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded font-semibold transition-colors"
                          >
                            View Details
                          </Link>
                          <a
                            href="tel:3529335181"
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-center py-2 rounded font-semibold transition-colors"
                          >
                            Call
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-gray-500 text-sm mt-12">
                *Estimated monthly payment based on 60-month term with approved credit. Terms and conditions apply.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Financing Section */}
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
              href="tel:3529335181"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
            >
              Call Us: (352) 933-5181
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