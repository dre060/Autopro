// frontend/src/app/admin/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamic imports for charts (if using recharts)
const LineChart = dynamic(() => import("recharts").then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  });

  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentVehicles, setRecentVehicles] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  useEffect(() => {
    // Simulate data loading with animations
    setTimeout(() => {
      setStats({
        totalAppointments: 156,
        pendingAppointments: 12,
        totalVehicles: 48,
        availableVehicles: 23,
        totalCustomers: 342,
        totalRevenue: 127540,
      });

      setRecentAppointments([
        { id: 1, customer: "John Doe", service: "Oil Change", date: "2025-01-08", time: "10:00 AM", status: "pending" },
        { id: 2, customer: "Jane Smith", service: "Brake Service", date: "2025-01-08", time: "2:00 PM", status: "confirmed" },
        { id: 3, customer: "Bob Johnson", service: "Engine Repair", date: "2025-01-09", time: "9:00 AM", status: "pending" },
      ]);

      setRecentVehicles([
        { id: 1, make: "Honda", model: "Accord", year: 2018, price: 18995, status: "available", views: 145 },
        { id: 2, make: "Toyota", model: "Camry", year: 2020, price: 22995, status: "available", views: 98 },
        { id: 3, make: "Ford", model: "F-150", year: 2019, price: 28995, status: "sold", views: 234 },
      ]);

      setRevenueData([
        { name: "Jan", revenue: 85000 },
        { name: "Feb", revenue: 92000 },
        { name: "Mar", revenue: 88000 },
        { name: "Apr", revenue: 95000 },
        { name: "May", revenue: 110000 },
        { name: "Jun", revenue: 127540 },
      ]);

      setIsLoading(false);
    }, 1000);
  }, []);

  const StatCard = ({ title, value, icon, color, link, trend, delay }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      if (!isLoading) {
        const timer = setTimeout(() => {
          const duration = 1000;
          const steps = 50;
          const increment = value / steps;
          let current = 0;
          
          const counter = setInterval(() => {
            current += increment;
            if (current >= value) {
              setDisplayValue(value);
              clearInterval(counter);
            } else {
              setDisplayValue(Math.floor(current));
            }
          }, duration / steps);

          return () => clearInterval(counter);
        }, delay);

        return () => clearTimeout(timer);
      }
    }, [value, isLoading, delay]);

    return (
      <Link href={link} className="block">
        <div className={`bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover-lift ${
          !isLoading ? "animate-scaleIn" : ""
        }`} style={{ animationDelay: `${delay}ms` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className={`text-3xl font-bold ${color} mt-2`}>
                {title.includes("Revenue") ? `${displayValue.toLocaleString()}` : displayValue}
              </p>
              {trend && (
                <div className="flex items-center mt-2">
                  <span className={`text-sm ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
                    {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-2">vs last period</span>
                </div>
              )}
            </div>
            <div className={`p-4 rounded-full ${color} bg-opacity-10 animate-float`} style={{ animationDelay: `${delay}ms` }}>
              <span className="text-3xl">{icon}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div>
      {/* Header with Period Selector */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 animate-fadeInLeft">Dashboard</h1>
        <div className="flex gap-2 animate-fadeInRight">
          {["day", "week", "month", "year"].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                selectedPeriod === period
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Appointments"
          value={stats.totalAppointments}
          icon="📅"
          color="text-blue-600"
          link="/admin/appointments"
          trend={8.5}
          delay={0}
        />
        <StatCard
          title="Pending Appointments"
          value={stats.pendingAppointments}
          icon="⏰"
          color="text-yellow-600"
          link="/admin/appointments?status=pending"
          trend={-12.3}
          delay={100}
        />
        <StatCard
          title="Available Vehicles"
          value={stats.availableVehicles}
          icon="🚗"
          color="text-green-600"
          link="/admin/vehicles"
          trend={5.2}
          delay={200}
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon="👥"
          color="text-purple-600"
          link="/admin/customers"
          trend={15.8}
          delay={300}
        />
        <StatCard
          title="Monthly Revenue"
          value={stats.totalRevenue}
          icon="💰"
          color="text-green-600"
          link="/admin/reports"
          trend={22.4}
          delay={400}
        />
        <StatCard
          title="Active Services"
          value={12}
          icon="🔧"
          color="text-indigo-600"
          link="/admin/services"
          trend={0}
          delay={500}
        />
      </div>

      {/* Revenue Chart */}
      <div className={`bg-white rounded-lg shadow-lg p-6 mb-8 ${!isLoading ? "animate-fadeInUp" : ""}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Overview</h2>
        <div className="h-64">
          {!isLoading && typeof window !== 'undefined' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Appointments */}
        <div className={`bg-white rounded-lg shadow-lg ${!isLoading ? "animate-fadeInLeft" : ""}`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Recent Appointments</h2>
              <Link href="/admin/appointments" className="text-sm text-blue-600 hover:text-blue-700 font-medium group">
                View all 
                <span className="inline-block ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              // Loading skeleton
              [...Array(3)].map((_, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : (
              recentAppointments.map((appointment, index) => (
                <div 
                  key={appointment.id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  style={{ animationDelay: `${600 + index * 100}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {appointment.customer}
                      </p>
                      <p className="text-sm text-gray-500">{appointment.service}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {appointment.date} at {appointment.time}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                        appointment.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200"
                          : "bg-green-100 text-green-800 group-hover:bg-green-200"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Vehicles */}
        <div className={`bg-white rounded-lg shadow-lg ${!isLoading ? "animate-fadeInRight" : ""}`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Recent Vehicles</h2>
              <Link href="/admin/vehicles" className="text-sm text-blue-600 hover:text-blue-700 font-medium group">
                View all 
                <span className="inline-block ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              // Loading skeleton
              [...Array(3)].map((_, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : (
              recentVehicles.map((vehicle, index) => (
                <div 
                  key={vehicle.id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  style={{ animationDelay: `${600 + index * 100}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        ${vehicle.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {vehicle.views} views
                        </span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                        vehicle.status === "available"
                          ? "bg-green-100 text-green-800 group-hover:bg-green-200"
                          : "bg-gray-100 text-gray-800 group-hover:bg-gray-200"
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`mt-8 bg-white rounded-lg shadow-lg p-6 ${!isLoading ? "animate-fadeInUp animation-delay-400" : ""}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "+ New Appointment", href: "/admin/appointments/new", color: "bg-blue-600", icon: "📅" },
            { label: "+ Add Vehicle", href: "/admin/vehicles/new", color: "bg-green-600", icon: "🚗" },
            { label: "+ New Customer", href: "/admin/customers/new", color: "bg-purple-600", icon: "👤" },
            { label: "Generate Report", href: "/admin/reports", color: "bg-gray-600", icon: "📊" },
          ].map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`${action.color} text-white px-6 py-4 rounded-lg text-center font-semibold transition-all duration-300 hover-scale hover-glow flex flex-col items-center gap-2 group`}
              style={{ animationDelay: `${800 + index * 100}ms` }}
            >
              <span className="text-2xl group-hover:animate-bounce">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}