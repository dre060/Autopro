// frontend/src/app/error.js
"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-red-600 mb-4">500</h1>
          <div className="w-full h-1 bg-red-600 rounded-full mx-auto animate-pulse" style={{ maxWidth: "200px" }}></div>
        </div>
        
        <h2 className="text-3xl font-bold mb-4">Oops! Something went wrong</h2>
        
        <p className="text-gray-400 text-lg mb-8">
          We're experiencing technical difficulties. Our team has been notified and is working on a fix.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
          >
            Try Again
          </button>
          
          <Link 
            href="/"
            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-12 p-6 bg-gray-900 rounded-lg">
          <p className="text-gray-300 mb-2">Need immediate assistance?</p>
          <a href="tel:3523395181" className="text-blue-400 hover:text-blue-300 text-lg font-semibold">
            Call us: (352) 339-5181
          </a>
        </div>
      </div>
    </div>
  );
}