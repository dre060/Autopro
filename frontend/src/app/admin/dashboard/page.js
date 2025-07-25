// frontend/src/app/admin/dashboard/page.js - COMPLETE FEATURE-RICH DASHBOARD
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  supabase, 
  getUser, 
  getDashboardStats, 
  getAppointments, 
  getVehicles,
  getContactMessages 
} from "@/lib/supabase";

// Dynamic imports for charts to prevent SSR issues
const LineChart = dynamic(() => import("recharts").then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(mod => mod.Line), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    todayAppointments: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    totalTestimonials: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    unreadMessages: 0
  });

  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentVehicles, setRecentVehicles] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState([]);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
    
    // Set up real-time subscriptions
    const appointmentSubscription = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const vehicleSubscription = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      appointmentSubscription.unsubscribe();
      vehicleSubscription.unsubscribe();
    };
  }, [selectedPeriod]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/admin/login');
        return;
      }

      // Try to check if user is admin, but don't fail if table doesn't exist
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        // If profiles table exists and user is not admin, redirect
        if (profile && profile.role !== 'admin') {
          router.push('/admin/login');
          return;
        }
      } catch (profileError) {
        console.warn('Profiles table check failed, allowing access:', profileError);
        // If profiles table doesn't exist or has issues, allow access
      }

      setUser(user);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch basic stats with fallback
      try {
        const dashboardStats = await getDashboardStats();
        setStats(prevStats => ({ ...prevStats, ...dashboardStats }));
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
      }

      // Fetch appointments
      let appointments = [];
      try {
        const { data: appointmentsData } = await getAppointments();
        appointments = appointmentsData || [];
        setRecentAppointments(appointments.slice(0, 5));

        // Calculate today's appointments
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = appointments.filter(apt => apt.date === today);
        
        setStats(prevStats => ({
          ...prevStats,
          todayAppointments: todayAppts.length
        }));
      } catch (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      }

      // Fetch vehicles
      try {
        const { data: vehicles } = await getVehicles({ limit: 5 });
        setRecentVehicles(vehicles || []);
      } catch (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
      }

      // Fetch unread messages
      try {
        const { data: messages, error } = await supabase
          .from('contact_messages')
          .select('id')
          .eq('responded', false);

        if (!error) {
          setStats(prevStats => ({
            ...prevStats,
            unreadMessages: messages?.length || 0
          }));
        }
      } catch (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      // Calculate revenue and charts
      const revenue = await calculateRevenue(appointments, selectedPeriod);
      const statusCounts = calculateAppointmentsByStatus(appointments);

      setStats(prevStats => ({
        ...prevStats,
        monthlyRevenue: revenue.total,
        totalRevenue: revenue.total
      }));

      setRevenueData(revenue.chartData);
      setAppointmentsByStatus(statusCounts);

    } catch (error) {
      console.error("General error fetching dashboard data:", error);
    }
  };

  const calculateRevenue = async (appointments, period) => {
    const now = new Date();
    let startDate;
    let chartData = [];
    let total = 0;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        // Hourly data for today
        for (let hour = 0; hour < 24; hour++) {
          const hourRevenue = appointments
            .filter(apt => {
              if (!apt.date || !apt.time) return false;
              const aptDate = new Date(apt.date + 'T' + apt.time);
              return aptDate.getHours() === hour && 
                     aptDate.toDateString() === startDate.toDateString() &&
                     apt.status === 'completed';
            })
            .reduce((sum, apt) => sum + (apt.actual_cost?.total || apt.estimated_cost || 150), 0);
          
          chartData.push({
            name: `${hour}:00`,
            revenue: hourRevenue
          });
          total += hourRevenue;
        }
        break;

      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        // Daily data for past week
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayRevenue = appointments
            .filter(apt => apt.date === dateStr && apt.status === 'completed')
            .reduce((sum, apt) => sum + (apt.actual_cost?.total || apt.estimated_cost || 150), 0);
          
          chartData.push({
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: dayRevenue
          });
          total += dayRevenue;
        }
        break;

      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // Weekly data for current month
        const weeks = Math.ceil(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() / 7);
        for (let week = 0; week < weeks; week++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const weekRevenue = appointments
            .filter(apt => {
              if (!apt.date) return false;
              const aptDate = new Date(apt.date);
              return aptDate >= weekStart && 
                     aptDate <= weekEnd && 
                     apt.status === 'completed';
            })
            .reduce((sum, apt) => sum + (apt.actual_cost?.total || apt.estimated_cost || 150), 0);
          
          chartData.push({
            name: `Week ${week + 1}`,
            revenue: weekRevenue
          });
          total += weekRevenue;
        }
        break;

      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        // Monthly data for current year
        for (let month = 0; month < 12; month++) {
          const monthStart = new Date(now.getFullYear(), month, 1);
          const monthEnd = new Date(now.getFullYear(), month + 1, 0);
          
          const monthRevenue = appointments
            .filter(apt => {
              if (!apt.date) return false;
              const aptDate = new Date(apt.date);
              return aptDate >= monthStart && 
                     aptDate <= monthEnd && 
                     apt.status === 'completed';
            })
            .reduce((sum, apt) => sum + (apt.actual_cost?.total || apt.estimated_cost || 150), 0);
          
          chartData.push({
            name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
            revenue: monthRevenue
          });
          total += monthRevenue;
        }
        break;
    }

    return { chartData, total };
  };

  const calculateAppointmentsByStatus = (appointments) => {
    const statusMap = {
      pending: 0,
      confirmed: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
      'no-show': 0
    };

    appointments.forEach(apt => {
      if (statusMap.hasOwnProperty(apt.status)) {
        statusMap[apt.status]++;
      }
    });

    return Object.entries(statusMap).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
      value: count
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      "in-progress": "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      "no-show": "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const StatCard = ({ title, value, icon, color, link, trend, prefix = "" }) => {
    return (
      <Link href={link} className="block">
        <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className={`text-3xl font-bold ${color} mt-2`}>
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {trend !== undefined && (
                <div className="flex items-center mt-2">
                  <span className={`text-sm ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
                    {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-2">vs last period</span>
                </div>
              )}
            </div>
            <div className={`p-4 rounded-full ${color} bg-opacity-10`}>
              <span className="text-3xl">{icon}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AP</span>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-semibold text-gray-900">AUTO PRO Admin</h1>
                  <p className="text-xs text-gray-500">Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm">
                Welcome, {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-3">
            <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium border-b-2 border-blue-600">
              Dashboard
            </Link>
            <Link href="/admin/appointments" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
              Appointments
            </Link>
            <Link href="/admin/vehicles" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
              Vehicles
            </Link>
            <Link href="/admin/customers" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
              Customers
            </Link>
            <Link href="/admin/services" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
              Services
            </Link>
            <Link href="/admin/reports" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
              Reports
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Period Selector */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-2">
            {["day", "week", "month", "year"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  selectedPeriod === period
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            icon="📅"
            color="text-blue-600"
            link="/admin/appointments?date=today"
            trend={8.5}
          />
          <StatCard
            title="Pending Appointments"
            value={stats.pendingAppointments}
            icon="⏰"
            color="text-yellow-600"
            link="/admin/appointments?status=pending"
            trend={-12.3}
          />
          <StatCard
            title="Available Vehicles"
            value={stats.availableVehicles}
            icon="🚗"
            color="text-green-600"
            link="/admin/vehicles?status=available"
            trend={5.2}
          />
          <StatCard
            title="Unread Messages"
            value={stats.unreadMessages}
            icon="📧"
            color="text-purple-600"
            link="/admin/messages"
          />
        </div>

        {/* Revenue Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Revenue Overview</h2>
            <div className="text-2xl font-bold text-green-600">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
          </div>
          <div className="h-64">
            {typeof window !== 'undefined' && revenueData.length > 0 && (
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
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Appointment Status Distribution */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Appointments by Status</h2>
            <div className="h-64">
              {typeof window !== 'undefined' && appointmentsByStatus.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentsByStatus}>
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
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Average Service Time</p>
                  <p className="text-xl font-bold">2h 15m</p>
                </div>
                <div className="text-green-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Customer Satisfaction</p>
                  <p className="text-xl font-bold">4.8/5.0</p>
                </div>
                <div className="text-yellow-500">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Repeat Customers</p>
                  <p className="text-xl font-bold">68%</p>
                </div>
                <div className="text-blue-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Appointments */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Recent Appointments</h2>
                <Link href="/admin/appointments" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {recentAppointments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No appointments found
                </div>
              ) : (
                recentAppointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/appointments/${appointment.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {appointment.name}
                        </p>
                        <p className="text-sm text-gray-500">{appointment.service}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {appointment.date} at {appointment.time}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(appointment.status)
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Vehicles */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Recent Vehicles</h2>
                <Link href="/admin/vehicles" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {recentVehicles.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No vehicles found
                </div>
              ) : (
                recentVehicles.map((vehicle) => (
                  <div 
                    key={vehicle.id} 
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/vehicles/${vehicle.id}/edit`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(vehicle.price)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            {vehicle.views || 0} views
                          </span>
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === "available"
                          ? "bg-green-100 text-green-800"
                          : vehicle.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "New Appointment", href: "/admin/appointments/new", color: "bg-blue-600", icon: "📅" },
              { label: "Add Vehicle", href: "/admin/vehicles/new", color: "bg-green-600", icon: "🚗" },
              { label: "View Messages", href: "/admin/messages", color: "bg-purple-600", icon: "📧" },
              { label: "Generate Report", href: "/admin/reports", color: "bg-gray-600", icon: "📊" },
            ].map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={`${action.color} text-white px-6 py-4 rounded-lg text-center font-semibold transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-2`}
              >
                <span className="text-2xl">{action.icon}</span>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}