// frontend/src/app/admin/page.js - SIMPLE REDIRECT HANDLER
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/admin/login');
        return;
      }

      // Try to check if user is admin, but don't fail if profiles table doesn't exist
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        // If profiles table exists and user is not admin, redirect to login
        if (profile && profile.role !== 'admin') {
          router.push('/admin/login');
          return;
        }
      } catch (profileError) {
        console.warn('Profiles table check failed, allowing access:', profileError);
        // If profiles table doesn't exist or has issues, allow access
        // This handles cases where the admin system is not fully set up
      }

      // Handle demo credentials for development
      if (process.env.NODE_ENV === 'development') {
        // Allow access for development
        router.push('/admin/dashboard');
        return;
      }

      // User is authenticated, redirect to dashboard
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}