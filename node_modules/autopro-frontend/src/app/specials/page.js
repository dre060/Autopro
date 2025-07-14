// frontend/src/app/specials/page.js
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Specials() {
  const [timeLeft, setTimeLeft] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Calculate time left for July special
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfJuly = new Date(now.getFullYear(), 6, 31, 23, 59, 59); // July is month 6 (0-indexed)
      const difference = endOfJuly - now;

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
        };
      }
      return {};
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentSpecials = [
    {
      id: 1,
      title: "July Labor Special",
      discount: "10% OFF",
      description: "All Labor Costs",
      details: "Save 10% on all labor charges throughout July. Applies to all services!",
      icon: "🔧",
      featured: true,
      validUntil: "July 31, 2025",
      terms: ["Cannot be combined with other offers", "Must mention special when booking"],
    },
    {
      id: 2,
      title: "First-Time Customer",
      discount: "$25 OFF",
      description: "Any Service Over $100",
      details: "Welcome to AUTO PRO! New customers save $25 on their first visit.",
      icon: "🎁",
      featured: false,
      validUntil: "Ongoing",
      terms: ["Valid for new customers only", "One per customer", "Must present ID"],
    },
    {
      id: 3,
      title: "Walk-In Special",
      discount: "FREE",
      description: "Vehicle Inspection",
      details: "Get a complimentary 21-point inspection with any service. No appointment needed!",
      icon: "🔍",
      featured: false,
      validUntil: "Ongoing",
      terms: ["Walk-ins only", "While capacity allows", "With any paid service"],
    },
    {
      id: 4,
      title: "Oil Change Package",
      discount: "$10 OFF",
      description: "Full Synthetic Oil Change",
      details: "Premium full synthetic oil change including filter and fluid top-off.",
      icon: "🛢️",
      featured: false,
      validUntil: "Limited Time",
      terms: ["Up to 5 quarts", "Most vehicles", "Disposal fee extra"],
    },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        <Image
          src="/hero.jpg"
          alt="Special Offers"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 animate-fadeInDown">
              Special Offers
            </h1>
            <p className="text-xl md:text-2xl animate-fadeInUp animation-delay-200">
              Save Big on Auto Services This Month!
            </p>
          </div>
        </div>
      </section>

      {/* Featured July Special */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-900 to-blue-700">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center">
            <div className="inline-block bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-bold mb-6 animate-pulse">
              🌟 FEATURED JULY SPECIAL 🌟
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              10% OFF ALL LABOR
            </h2>
            
            <p className="text-2xl mb-8 text-blue-100">
              Throughout the Entire Month of July!
            </p>

            {/* Countdown Timer */}
            {Object.keys(timeLeft).length > 0 && (
              <div className="flex justify-center gap-4 mb-8">
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-3xl font-bold">{timeLeft.days || 0}</div>
                  <div className="text-sm text-blue-200">Days</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-3xl font-bold">{timeLeft.hours || 0}</div>
                  <div className="text-sm text-blue-200">Hours</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-3xl font-bold">{timeLeft.minutes || 0}</div>
                  <div className="text-sm text-blue-200">Minutes</div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/appointment"
                className="bg-yellow-400 hover:bg-yellow-300 text-black px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 inline-flex items-center justify-center"
              >
                Book Now & Save
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="tel:3523395181"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-bold text-lg transition-all inline-flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call (352) 339-5181
              </a>
            </div>

            <p className="text-sm text-blue-200 mt-6">
              *Must mention special when scheduling. Cannot be combined with other offers.
            </p>
          </div>
        </div>
      </section>

      {/* All Current Specials */}
      <section className="py-16 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            All Current Specials
          </h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Take advantage of these limited-time offers. New specials added regularly for walk-in and first-time customers!
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {currentSpecials.map((special, index) => (
              <div
                key={special.id}
                className={`rounded-lg overflow-hidden transition-all duration-300 hover:transform hover:scale-105 ${
                  special.featured
                    ? "bg-gradient-to-br from-blue-900 to-blue-700 ring-2 ring-yellow-400"
                    : "bg-gray-900"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-5xl">{special.icon}</div>
                    {special.featured && (
                      <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold">
                        FEATURED
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">{special.title}</h3>
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    {special.discount}
                  </div>
                  <p className="text-xl mb-4">{special.description}</p>
                  <p className="text-gray-300 mb-6">{special.details}</p>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-sm text-gray-400">
                      <span className="font-semibold">Valid:</span> {special.validUntil}
                    </p>
                    {special.terms && (
                      <ul className="text-xs text-gray-400 space-y-1">
                        {special.terms.map((term, idx) => (
                          <li key={idx}>• {term}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Link
                    href="/appointment"
                    className={`block text-center py-3 rounded-lg font-semibold transition-all ${
                      special.featured
                        ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    Claim This Offer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Benefits */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            More Ways to Save at AUTO PRO
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Financing Available</h3>
              <p className="text-gray-300">
                Spread the cost of major repairs with our flexible financing options. 
                0% interest for qualified customers.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Email Exclusive Offers</h3>
              <p className="text-gray-300">
                Join our mailing list for exclusive deals and service reminders 
                sent directly to your inbox.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Loyalty Rewards</h3>
              <p className="text-gray-300">
                Regular customers earn points on every service. Redeem points 
                for discounts on future visits!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Walk-In Welcome */}
      <section className="py-12 px-4 bg-blue-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Walk-Ins Always Welcome!</h2>
          <p className="text-xl mb-6">
            No appointment? No problem! We offer special discounts for walk-in customers. 
            Stop by during business hours and ask about our daily specials.
          </p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 inline-block">
            <p className="font-semibold mb-2">Business Hours:</p>
            <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
            <p>Saturday: 9:00 AM - 3:00 PM</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-black text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">
            Don't Miss Out on These Savings!
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Questions about our specials? Need to schedule service? We're here to help!
          </p>
          
          <div className="bg-gray-900 rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Contact Us Today</h3>
            <div className="space-y-3">
              <a
                href="tel:3529335181"
                className="flex items-center justify-center gap-3 text-lg hover:text-blue-400 transition-colors"
              >
                <span className="text-2xl">📞</span>
                (352) 339-5181
              </a>
              <a
                href="mailto:service@autoprorepairs.com"
                className="flex items-center justify-center gap-3 text-lg hover:text-blue-400 transition-colors"
              >
                <span className="text-2xl">✉️</span>
                service@autoprorepairs.com
              </a>
              <p className="flex items-center justify-center gap-3 text-lg">
                <span className="text-2xl">📍</span>
                806 Hood Ave, Leesburg, FL
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}