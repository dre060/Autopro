// frontend/src/app/admin/dashboard/page.js - REDIRECT TO MAIN ADMIN
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main admin page
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}