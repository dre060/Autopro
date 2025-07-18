// frontend/src/app/contact/page.js
"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [activeInfo, setActiveInfo] = useState("hours");
  const [isVisible, setIsVisible] = useState({});
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Please enter your name");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.subject.trim()) {
      setError("Please enter a subject");
      return false;
    }
    if (!formData.message.trim()) {
      setError("Please enter a message");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowSuccess(true);
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
        
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setError("Failed to send message. Please try again or call us directly.");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setError("Unable to send message. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: "📍",
      title: "Visit Us",
      info: "806 Hood Ave, Leesburg, FL 34748",
      action: "Get Directions",
      link: "https://maps.google.com/?q=806+Hood+Ave+Leesburg+FL+34748",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "📞",
      title: "Call Us",
      info: "(352) 933-5181",
      action: "Call Now",
      link: "tel:3529335181",
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: "📧",
      title: "Email Us",
      info: "service@autoprorepairs.com",
      action: "Send Email",
      link: "mailto:service@autoprorepairs.com",
      color: "from-purple-600 to-pink-600"
    },
  ];

  const businessInfo = {
    hours: {
      title: "Business Hours",
      icon: "🕐",
      content: [
        { day: "Monday - Friday", time: "8:00 AM - 6:00 PM", open: true },
        { day: "Saturday", time: "9:00 AM - 3:00 PM", open: true },
        { day: "Sunday", time: "Closed", open: false },
      ]
    },
    services: {
      title: "Quick Services",
      icon: "⚡",
      content: [
        "Oil Change (30 min)",
        "Tire Rotation (45 min)",
        "Battery Test (15 min)",
        "AC Check (30 min)",
      ]
    },
    emergency: {
      title: "Emergency",
      icon: "🚨",
      content: [
        "24/7 Towing Available",
        "Emergency: (352) 933-5181",
        "Roadside Assistance",
        "After-Hours Drop-Off",
      ]
    },
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[400px] w-full overflow-hidden">
        <Image
          src="/hero.jpg"
          alt="Contact AUTO PRO"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center animate-fadeInDown">Contact Us</h1>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Have questions about our services or need to schedule an appointment? 
              We're here to help! Reach out to us through any of the following methods.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {contactMethods.map((method, index) => (
              <div
                key={index}
                id={`contact-${index}`}
                className={`animate-on-scroll bg-gradient-to-br ${method.color} p-1 rounded-lg ${
                  isVisible[`contact-${index}`] ? 'animate-fadeInUp' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-gray-900 rounded-lg p-8 h-full text-center">
                  <div className="text-5xl mb-4">{method.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{method.title}</h3>
                  <p className="text-gray-300 mb-4">{method.info}</p>
                  <a
                    href={method.link}
                    className="inline-block bg-white/10 hover:bg-white/20 px-6 py-2 rounded transition-colors"
                  >
                    {method.action}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Send Us a Message</h2>
            
            {showSuccess && (
              <div className="bg-green-600 text-white p-4 rounded mb-6 text-center animate-fadeIn">
                Message sent successfully! We'll get back to you soon.
              </div>
            )}
            
            {error && (
              <div className="bg-red-600 text-white p-4 rounded mb-6 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
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
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Message *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
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
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Business Info Tabs */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-center gap-4 mb-8">
            {Object.keys(businessInfo).map((key) => (
              <button
                key={key}
                onClick={() => setActiveInfo(key)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeInfo === key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {businessInfo[key].icon} {businessInfo[key].title}
              </button>
            ))}
          </div>

          <div className="bg-gray-900 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              {businessInfo[activeInfo].icon} {businessInfo[activeInfo].title}
            </h3>
            {activeInfo === 'hours' ? (
              <div className="space-y-3">
                {businessInfo[activeInfo].content.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-300">{item.day}</span>
                    <span className={item.open ? 'text-green-400' : 'text-red-400'}>
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {businessInfo[activeInfo].content.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-300">
                    <span className="text-green-400">✓</span> {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-8">Find Us</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d-81.8776!3d28.6106!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjjCsDM2JzM4LjIiTiA4McKwNTInMzguNiJX!5e0!3m2!1sen!2sus!4v1234567890"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
                title="AUTO PRO Location Map"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience the AUTO PRO Difference?</h2>
          <p className="text-xl mb-8">
            Schedule your appointment today or stop by our shop!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/appointment"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Schedule Service
            </Link>
            <a 
              href="tel:3529335181"
              className="bg-black hover:bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Call (352) 933-5181
            </a>
          </div>
        </div>
      </section>
    </>
  );
}