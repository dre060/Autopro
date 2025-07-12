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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errors, setErrors] = useState({});

  // Get tomorrow's date as minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Phone number formatting
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;
      if (cleaned.length >= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      } else if (cleaned.length >= 3) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      }
      setFormData({ ...formData, [name]: formatted });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = "Phone number must be 10 digits";
    }
    
    if (!formData.service) {
      newErrors.service = "Please select a service";
    }
    
    if (!formData.date) {
      newErrors.date = "Please select a date";
    }
    
    if (!formData.time) {
      newErrors.time = "Please select a time";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Appointment request submitted successfully! We\'ll confirm within 24 hours.'
        });
        
        // Reset form
        setFormData({
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
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'Something went wrong. Please try again or call us directly.'
        });
      }
    } catch (error) {
      console.error('Appointment submission error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Unable to submit appointment. Please call us at (352) 933-5181.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full pt-20">
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

          {/* Success/Error Message */}
          {submitStatus && (
            <div className={`mb-8 p-4 rounded ${
              submitStatus.type === 'success' 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}>
              <p className="font-semibold">{submitStatus.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded border ${
                    errors.name ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:outline-none transition-colors`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded border ${
                    errors.email ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:outline-none transition-colors`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded border ${
                    errors.phone ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:outline-none transition-colors`}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded border ${
                    errors.service ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:outline-none transition-colors`}
                >
                  <option value="">Select a Service</option>
                  <option value="Oil Change">Oil Change</option>
                  <option value="Brake Service">Brake Service</option>
                  <option value="Engine Repair">Engine Repair</option>
                  <option value="Transmission Service">Transmission Service</option>
                  <option value="AC Service">AC Service</option>
                  <option value="Tire Service">Tire Service</option>
                  <option value="Diagnostic Check">Diagnostic Check</option>
                  <option value="State Inspection">State Inspection</option>
                  <option value="General Maintenance">General Maintenance</option>
                  <option value="Other">Other (Please Specify in Message)</option>
                </select>
                {errors.service && (
                  <p className="text-red-500 text-sm mt-1">{errors.service}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Preferred Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={minDate}
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded border ${
                    errors.date ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:outline-none transition-colors`}
                />
                {errors.date && (
                  <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Preferred Time <span className="text-red-500">*</span>
                </label>
                <select
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded border ${
                    errors.time ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:outline-none transition-colors`}
                >
                  <option value="">Select a Time</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="08:30">8:30 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="09:30">9:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="12:30">12:30 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="13:30">1:30 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="14:30">2:30 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="15:30">3:30 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="16:30">4:30 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="17:30">5:30 PM</option>
                </select>
                {errors.time && (
                  <p className="text-red-500 text-sm mt-1">{errors.time}</p>
                )}
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
                    maxLength="4"
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
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
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
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
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="w-full bg-gray-800 text-white px-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded font-semibold transition-all ${
                isSubmitting 
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Book Appointment'
              )}
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
              <a href="tel:3529335181" className="text-blue-400 hover:text-blue-300 text-lg font-semibold transition-colors">
                (352) 933-5181
              </a>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="text-3xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-2">Visit Our Shop</h3>
              <p className="text-gray-300">
                806 Hood Ave<br />
                Leesburg, FL 34748<br />
                Mon-Fri: 8AM-6PM<br />
                Sat: 9AM-3PM
              </p>
              <a 
                href="https://maps.google.com/?q=806+Hood+Ave+Leesburg+FL+34748" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block transition-colors"
              >
                Get Directions →
              </a>
            </div>
          </div>

          {/* Additional Services */}
          <div className="mt-12 bg-gray-900 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Need Emergency Service?</h3>
            <p className="text-gray-300 mb-6">
              We offer 24/7 towing services throughout the Leesburg area. 
              Don't let a breakdown ruin your day - we're here to help!
            </p>
            <a 
              href="tel:3529335181"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-semibold transition-colors inline-block"
            >
              Call for Emergency Towing
            </a>
          </div>
        </div>
      </section>
    </>
  );
}