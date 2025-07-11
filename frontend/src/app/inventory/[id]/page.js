// frontend/src/app/inventory/[id]/page.js
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function VehicleDetail() {
  const params = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    tradeIn: false,
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setVehicle({
        id: params.id,
        year: 2018,
        make: "Honda",
        model: "Accord",
        trim: "Sport",
        price: 18995,
        mileage: 45000,
        bodyType: "Sedan",
        fuelType: "Gasoline",
        transmission: "Automatic",
        drivetrain: "FWD",
        exteriorColor: "Silver",
        interiorColor: "Black",
        engine: "1.5L Turbo 4-Cylinder",
        mpg: "30/38",
        vin: "1HGCV1F31JA123456",
        stockNumber: "A12345",
        images: ["/hero.jpg", "/hero.jpg", "/hero.jpg", "/hero.jpg"],
        features: {
          safety: ["Backup Camera", "Lane Departure Warning", "Collision Mitigation Braking", "Road Departure Mitigation"],
          comfort: ["Heated Seats", "Dual-Zone Climate Control", "Power Driver Seat", "Remote Start"],
          technology: ["Apple CarPlay", "Android Auto", "Bluetooth", "USB Ports"],
          convenience: ["Keyless Entry", "Push Button Start", "Power Windows", "Cruise Control"],
        },
        description: "This 2018 Honda Accord Sport is in excellent condition with low mileage. It features Honda's efficient turbocharged engine, providing excellent fuel economy without sacrificing performance. The spacious interior and advanced safety features make it perfect for daily commuting or long road trips.",
        carfaxAvailable: true,
        certified: true,
        warranty: "90-day/3,000-mile warranty included",
      });
    }, 500);
  }, [params.id]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
    setShowContactForm(false);
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <section className="bg-gray-900 py-4 px-4">
        <div className="container mx-auto max-w-6xl">
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/inventory" className="hover:text-white transition-colors">Inventory</Link>
            <span>/</span>
            <span className="text-white">{vehicle.year} {vehicle.make} {vehicle.model}</span>
          </nav>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative h-96 overflow-hidden rounded-lg animate-fadeIn">
                <Image
                  src={vehicle.images[activeImage]}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  fill
                  className="object-cover"
                />
                {vehicle.certified && (
                  <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Certified
                  </div>
                )}
              </div>
              
              {/* Thumbnail Gallery */}
              <div className="grid grid-cols-4 gap-2">
                {vehicle.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`relative h-24 overflow-hidden rounded-lg transition-all duration-300 ${
                      activeImage === index 
                        ? "ring-2 ring-blue-600 scale-105" 
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`View ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="space-y-6 animate-fadeInRight">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                </h1>
                <p className="text-gray-400 mb-4">
                  Stock #: {vehicle.stockNumber} | VIN: {vehicle.vin}
                </p>
                <div className="flex items-baseline gap-4 mb-6">
                  <p className="text-4xl font-bold text-blue-400">
                    ${vehicle.price.toLocaleString()}
                  </p>
                  <p className="text-lg text-gray-400">
                    {vehicle.mileage.toLocaleString()} miles
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowContactForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 hover-scale flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Contact Us
                </button>
                <a
                  href="tel:3523395181"
                  className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  Call Now
                </a>
              </div>

              {/* Vehicle Details */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Vehicle Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span className="text-gray-400">Body Type:</span>
                      <span>{vehicle.bodyType}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Engine:</span>
                      <span>{vehicle.engine}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Transmission:</span>
                      <span>{vehicle.transmission}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Drivetrain:</span>
                      <span>{vehicle.drivetrain}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span className="text-gray-400">Fuel Type:</span>
                      <span>{vehicle.fuelType}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">MPG:</span>
                      <span>{vehicle.mpg}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Exterior:</span>
                      <span>{vehicle.exteriorColor}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Interior:</span>
                      <span>{vehicle.interiorColor}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Warranty & Reports */}
              <div className="flex gap-4">
                {vehicle.carfaxAvailable && (
                  <div className="flex-1 bg-gray-900 rounded-lg p-4 text-center hover-lift">
                    <div className="text-2xl mb-2">📋</div>
                    <p className="font-semibold">CARFAX Available</p>
                    <p className="text-sm text-gray-400">View Vehicle History</p>
                  </div>
                )}
                {vehicle.warranty && (
                  <div className="flex-1 bg-gray-900 rounded-lg p-4 text-center hover-lift">
                    <div className="text-2xl mb-2">🛡️</div>
                    <p className="font-semibold">Warranty Included</p>
                    <p className="text-sm text-gray-400">{vehicle.warranty}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description & Features */}
          <div className="mt-12 grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="animate-fadeInUp">
                <h2 className="text-2xl font-bold mb-4">Description</h2>
                <p className="text-gray-300 leading-relaxed">{vehicle.description}</p>
              </div>

              {/* Features */}
              <div className="animate-fadeInUp animation-delay-200">
                <h2 className="text-2xl font-bold mb-6">Features & Options</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(vehicle.features).map(([category, features]) => (
                    <div key={category} className="bg-gray-900 rounded-lg p-6">
                      <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">
                        {category === "safety" && "🛡️"}
                        {category === "comfort" && "🛋️"}
                        {category === "technology" && "📱"}
                        {category === "convenience" && "✨"}
                        {category}
                      </h3>
                      <ul className="space-y-2">
                        {features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Calculate Payment */}
              <div className="bg-gray-900 rounded-lg p-6 animate-fadeInRight">
                <h3 className="text-xl font-bold mb-4">Calculate Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Down Payment</label>
                    <input
                      type="number"
                      placeholder="$0"
                      className="w-full mt-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Loan Term</label>
                    <select className="w-full mt-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500">
                      <option>36 months</option>
                      <option>48 months</option>
                      <option>60 months</option>
                      <option>72 months</option>
                    </select>
                  </div>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-all duration-300">
                    Calculate
                  </button>
                </div>
              </div>

              {/* Share */}
              <div className="bg-gray-900 rounded-lg p-6 animate-fadeInRight animation-delay-200">
                <h3 className="text-xl font-bold mb-4">Share This Vehicle</h3>
                <div className="flex gap-4">
                  <button className="flex-1 bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-colors">
                    <span className="text-xl">📧</span>
                  </button>
                  <button className="flex-1 bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-colors">
                    <span className="text-xl">📱</span>
                  </button>
                  <button className="flex-1 bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-colors">
                    <span className="text-xl">🖨️</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactForm(false)}
        >
          <div 
            className="bg-gray-900 rounded-lg max-w-md w-full p-8 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">Contact Us About This Vehicle</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  rows={4}
                  placeholder="I'm interested in this vehicle..."
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="tradeIn"
                    checked={formData.tradeIn}
                    onChange={handleFormChange}
                    className="rounded"
                  />
                  <span className="text-sm">I have a trade-in</span>
                </label>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Send Message
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}