// frontend/src/app/not-found.js
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate random particles for background animation
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        {/* Floating particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute bg-blue-500 rounded-full opacity-20 animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl opacity-10 animate-float animation-delay-400" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl">
        {/* 404 Animation */}
        <div className="mb-8 relative">
          <h1 className="text-[150px] md:text-[200px] font-bold leading-none">
            <span className="inline-block animate-bounceIn text-blue-400">4</span>
            <span className="inline-block animate-bounceIn animation-delay-200 text-gray-600">0</span>
            <span className="inline-block animate-bounceIn animation-delay-400 text-blue-400">4</span>
          </h1>
          
          {/* Car driving animation */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 animate-slideInRight" style={{ width: "20%" }}>
              <span className="block text-right pr-1 -mt-6 text-2xl animate-pulse">🚗</span>
            </div>
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fadeInUp animation-delay-500">
          Oops! Page Not Found
        </h2>
        
        <p className="text-gray-400 text-lg mb-8 animate-fadeInUp animation-delay-700">
          Looks like this page took a wrong turn. Let's get you back on track!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp animation-delay-1000">
          <Link 
            href="/"
            className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover-scale flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          
          <Link 
            href="/inventory"
            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover-scale"
          >
            Browse Inventory
          </Link>
        </div>

        {/* Fun message */}
        <div className="mt-16 animate-fadeIn animation-delay-1500">
          <p className="text-gray-500 text-sm">
            While you're here, did you know we offer 24/7 towing service? 
            <br />
            <a href="tel:3523395181" className="text-blue-400 hover:text-blue-300 transition-colors">
              Call us if you need help: (352) 339-5181
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        
        @keyframes slideInRight {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(400%); }
          50.01% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        
        .animate-slideInRight {
          animation: slideInRight 8s ease-in-out infinite;
        }
        
        .animation-delay-500 { animation-delay: 500ms; }
        .animation-delay-700 { animation-delay: 700ms; }
        .animation-delay-1000 { animation-delay: 1000ms; }
        .animation-delay-1500 { animation-delay: 1500ms; }
      `}</style>
    </div>
  );
}