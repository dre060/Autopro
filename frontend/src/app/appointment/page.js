// frontend/src/app/appointment/page.js
"use client";

import Image from "next/image";
import { useState } from "react";

export default function Appointment() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    date: "",
    time: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
    // Add API call here
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full">
        <Image
          src="/hero.jpg"
          alt="Book an Appointment"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center">Book an Appointment</h1>
        </div>
      </section>

      {/* Appointment Form Section */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Schedule Your Service</h2>
            <p className="text-gray-300">
              Fill out the form below and we'll confirm your appointment within 24 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Service Type *</label>
                <select
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a Service</option>
                  <option value="oil-change">Oil Change</option>
                  <option value="brake-service">Brake Service</option>
                  <option value="engine-repair">Engine Repair</option>
                  <option value="transmission">Transmission Service</option>
                  <option value="ac-service">AC Service</option>
                  <option value="tire-service">Tire Service</option>
                  <option value="diagnostic">Diagnostic Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Preferred Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Preferred Time *</label>
                <select
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a Time</option>
                  <option value="8:00 AM">8:00 AM</option>
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="1:00 PM">1:00 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                  <option value="5:00 PM">5:00 PM</option>
                </select>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="mt-8 mb-6">
              <h3 className="text-xl font-bold mb-4">Vehicle Information</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Year</label>
                  <input
                    type="text"
                    name="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={handleChange}
                    placeholder="e.g., 2020"
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Make</label>
                  <input
                    type="text"
                    name="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={handleChange}
                    placeholder="e.g., Toyota"
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Model</label>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleChange}
                    placeholder="e.g., Camry"
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Additional Message */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Additional Information</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                placeholder="Please describe the issue or service you need..."
                className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold transition-colors"
            >
              Book Appointment
            </button>
          </form>

          {/* Contact Information */}
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="text-3xl mb-4">📞</div>
              <h3 className="text-xl font-bold mb-2">Call Us Directly</h3>
              <p className="text-gray-300 mb-4">
                Need immediate assistance? Give us a call!
              </p>
              <a href="tel:3523395181" className="text-blue-400 hover:text-blue-300 text-lg font-semibold">
                (352) 339-5181
              </a>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="text-3xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-2">Visit Our Shop</h3>
              <p className="text-gray-300">
                123 Main Street<br />
                Leesburg, FL 34748<br />
                Mon-Fri: 8AM-6PM<br />
                Sat: 9AM-3PM
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}