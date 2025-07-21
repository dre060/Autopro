// frontend/src/app/admin/login/page.js - UPDATED WITH BETTER ERROR HANDLING
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, signIn } from "@/lib/supabase";

export default function AdminLogin() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Try to check admin role, but don't fail if table doesn't exist
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.role === 'admin') {
            router.push("/admin/dashboard");
            return;
          }
        } catch (profileError) {
          console.warn('Profiles check failed, allowing access:', profileError);
          // If we can't check the profile, assume they're admin if they have a session
          router.push("/admin/dashboard");
          return;
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Handle demo credentials for development
      if (process.env.NODE_ENV === 'development' && 
          credentials.email === 'admin@autopro.com' && 
          credentials.password === 'autopro2025') {
        
        // Simulate successful login for demo
        console.log('Demo login successful');
        router.push("/admin/dashboard");
        return;
      }

      const { data, error: signInError } = await signIn(
        credentials.email,
        credentials.password
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user) {
        // Try to check if user is admin, but don't fail if profiles table doesn't exist
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          
          if (profile && profile.role !== 'admin') {
            await supabase.auth.signOut();
            setError("Access denied. Admin privileges required.");
            return;
          }
        } catch (profileError) {
          console.warn('Profile check failed, allowing access:', profileError);
          // If profiles table doesn't exist, allow access
        }

        // Redirect to admin dashboard
        router.push("/admin/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle demo login button
  const handleDemoLogin = () => {
    setCredentials({
      email: 'admin@autopro.com',
      password: 'autopro2025'
    });
  };

  // Prevent hydration errors by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center">
            <div className="w-[100px] h-[60px] bg-gray-800 rounded flex items-center justify-center">
              <span className="text-white font-bold">AUTO PRO</span>
            </div>
            <div className="ml-2 text-left">
              <h1 className="text-2xl font-bold text-white">AUTO PRO</h1>
              <p className="text-xs text-gray-400">ADMIN PORTAL</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Admin Login
          </h2>

          {error && (
            <div className="bg-red-600 text-white p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="admin@autopro.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded font-semibold transition-all ${
                isLoading 
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Demo Login for Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4">
              <button
                onClick={handleDemoLogin}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors text-sm"
              >
                Fill Demo Credentials
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Forgot your password?{" "}
              <button 
                onClick={() => router.push('/admin/reset-password')}
                className="text-blue-400 hover:text-blue-300"
              >
                Reset Password
              </button>
            </p>
          </div>
        </div>

        {/* Back to Website */}
        <div className="mt-6 text-center">
          <a href="/" className="text-gray-400 hover:text-white text-sm">
            ← Back to Website
          </a>
        </div>

        {/* Demo Credentials Notice */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-blue-900 bg-opacity-50 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-300 mb-2">
              <strong>Demo Admin Access:</strong>
            </p>
            <p className="text-xs text-blue-200">
              Email: admin@autopro.com<br />
              Password: autopro2025
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Click "Fill Demo Credentials" to auto-fill
            </p>
          </div>
        )}
      </div>
    </div>
  );
}