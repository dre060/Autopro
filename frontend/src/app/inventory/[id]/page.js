// frontend/src/app/inventory/[id]/page.js
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function VehicleDetail() {
  const params = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    tradeIn: false,
  });

  useEffect(() => {
    fetchVehicleDetails();
  }, [params.id]);

  const fetchVehicleDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Vehicle not found');
        return;
      }

      setVehicle(data);
      
      // Increment views
      await supabase.rpc('increment_vehicle_views', { vehicle_id: params.id });
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      setError('Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Create contact message
      const { error } = await supabase
        .from('contact_messages')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: `Inquiry about ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          message: `${formData.message}\n\nVehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}\nStock #: ${vehicle.stock_number || 'N/A'}\nVIN: ${vehicle.vin || 'N/A'}\n\nTrade-in: ${formData.tradeIn ? 'Yes' : 'No'}`,
        }]);

      if (error) throw error;

      // Send email notification
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subject: `Vehicle Inquiry - ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          vehicleInfo: vehicle,
        }),
      });

      alert('Thank you for your interest! We\'ll contact you shortly.');
      setShowContactForm(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        tradeIn: false,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to send message. Please call us at (352) 933-5181');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{error || 'Vehicle not found'}</h2>
          <Link href="/inventory" className="text-blue-400 hover:text-blue-300">
            ← Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  const defaultImage = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images[0].url 
    : "/hero.jpg";

  return (
    <>
      {/* Breadcrumb */}
      <section className="bg-gray-900 py-4 px-4 pt-20">
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
                  src={vehicle.images && vehicle.images[activeImage] ? vehicle.images[activeImage].url : defaultImage}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  fill
                  className="object-cover"
                />
                {vehicle.carfax_available && (
                  <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    CARFAX Available
                  </div>
                )}
              </div>
              
              {/* Thumbnail Gallery */}
              {vehicle.images && vehicle.images.length > 1 && (
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
                        src={image.url}
                        alt={`View ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Info */}
            <div className="space-y-6 animate-fadeInRight">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim || ''}
                </h1>
                <p className="text-gray-400 mb-4">
                  Stock #: {vehicle.stock_number || 'N/A'} {vehicle.vin && `| VIN: ${vehicle.vin}`}
                </p>
                <div className="flex items-baseline gap-4 mb-6">
                  <p className="text-4xl font-bold text-blue-400">
                    ${vehicle.price?.toLocaleString()}
                  </p>
                  {vehicle.sale_price && (
                    <p className="text-2xl text-gray-400 line-through">
                      ${vehicle.sale_price.toLocaleString()}
                    </p>
                  )}
                  <p className="text-lg text-gray-400">
                    {vehicle.mileage?.toLocaleString()} miles
                  </p>
                </div>
                {vehicle.monthly_payment && (
                  <p className="text-lg text-green-400 mb-4">
                    As low as ${vehicle.monthly_payment}/month with approved credit*
                  </p>
                )}
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
                  href="tel:3529335181"
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
                      <span>{vehicle.body_type}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Engine:</span>
                      <span>{vehicle.engine || 'N/A'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Transmission:</span>
                      <span>{vehicle.transmission}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Drivetrain:</span>
                      <span>{vehicle.drivetrain || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span className="text-gray-400">Fuel Type:</span>
                      <span>{vehicle.fuel_type}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Exterior:</span>
                      <span>{vehicle.exterior_color}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Interior:</span>
                      <span>{vehicle.interior_color || 'N/A'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Condition:</span>
                      <span>{vehicle.condition}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">{vehicle.accident_history ? '⚠️' : '✅'}</div>
                  <p className="font-semibold">{vehicle.accident_history ? 'Accident History' : 'No Accidents'}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">👥</div>
                  <p className="font-semibold">{vehicle.number_of_owners} Owner{vehicle.number_of_owners > 1 ? 's' : ''}</p>
                </div>
              </div>

              {vehicle.service_records && (
                <div className="bg-green-600/20 border border-green-600 rounded-lg p-4 text-center">
                  <p className="font-semibold text-green-400">✓ Service Records Available</p>
                </div>
              )}
            </div>
          </div>

          {/* Description & Features */}
          <div className="mt-12 grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              {vehicle.description && (
                <div className="animate-fadeInUp">
                  <h2 className="text-2xl font-bold mb-4">Description</h2>
                  <p className="text-gray-300 leading-relaxed">{vehicle.description}</p>
                </div>
              )}

              {/* Features */}
              {vehicle.features && vehicle.features.length > 0 && (
                <div className="animate-fadeInUp animation-delay-200">
                  <h2 className="text-2xl font-bold mb-6">Features & Options</h2>
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      {vehicle.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Key Features */}
              {vehicle.key_features && vehicle.key_features.length > 0 && (
                <div className="animate-fadeInUp animation-delay-300">
                  <h2 className="text-2xl font-bold mb-4">Key Features</h2>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.key_features.map((feature, index) => (
                      <span key={index} className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                      <option selected>60 months</option>
                      <option>72 months</option>
                    </select>
                  </div>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-all duration-300">
                    Calculate
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-900 rounded-lg p-6 animate-fadeInRight animation-delay-200">
                <h3 className="text-xl font-bold mb-4">Contact Us</h3>
                <div className="space-y-3 text-sm">
                  <a href="tel:3529335181" className="flex items-center gap-3 hover:text-blue-400">
                    <span className="text-2xl">📞</span>
                    (352) 933-5181
                  </a>
                  <a href="https://maps.google.com/?q=806+Hood+Ave+Leesburg+FL+34748" target="_blank" className="flex items-center gap-3 hover:text-blue-400">
                    <span className="text-2xl">📍</span>
                    806 Hood Ave, Leesburg, FL
                  </a>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🕐</span>
                    <div>
                      <p>Mon-Fri: 8AM-6PM</p>
                      <p>Sat: 9AM-3PM</p>
                    </div>
                  </div>
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
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
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