// frontend/src/app/admin/analytics/page.js
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "../AdminLayout";
import { supabase } from "@/lib/supabase";

// Dynamic imports for charts
const LineChart = dynamic(() => import("recharts").then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(mod => mod.Line), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(mod => mod.Cell), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState({
    appointmentTrends: [],
    serviceTypes: [],
    monthlyRevenue: [],
    customerStats: {},
    vehicleStats: {},
    performanceMetrics: {}
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30days");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case "7days":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(endDate.getDate() - 30);
          break;
        case "90days":
          startDate.setDate(endDate.getDate() - 90);
          break;
        case "1year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Fetch appointments data
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (appointmentsError) throw appointmentsError;

      // Fetch vehicles data
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*');

      if (vehiclesError) throw vehiclesError;

      // Fetch contact messages
      const { data: messages, error: messagesError } = await supabase
        .from('contact_messages')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (messagesError) throw messagesError;

      // Process appointment trends
      const appointmentTrends = processAppointmentTrends(appointments || [], dateRange);
      
      // Process service types
      const serviceTypes = processServiceTypes(appointments || []);
      
      // Process monthly revenue
      const monthlyRevenue = processMonthlyRevenue(appointments || []);
      
      // Calculate customer stats
      const customerStats = calculateCustomerStats(appointments || [], messages || []);
      
      // Calculate vehicle stats
      const vehicleStats = calculateVehicleStats(vehicles || []);
      
      // Calculate performance metrics
      const performanceMetrics = calculatePerformanceMetrics(appointments || []);

      setAnalytics({
        appointmentTrends,
        serviceTypes,
        monthlyRevenue,
        customerStats,
        vehicleStats,
        performanceMetrics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const processAppointmentTrends = (appointments, range) => {
    const trends = [];
    const endDate = new Date();
    let startDate = new Date();
    let groupBy = 'day';
    let intervals = 30;

    switch (range) {
      case "7days":
        startDate.setDate(endDate.getDate() - 7);
        groupBy = 'day';
        intervals = 7;
        break;
      case "30days":
        startDate.setDate(endDate.getDate() - 30);
        groupBy = 'day';
        intervals = 30;
        break;
      case "90days":
        startDate.setDate(endDate.getDate() - 90);
        groupBy = 'week';
        intervals = 13;
        break;
      case "1year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        groupBy = 'month';
        intervals = 12;
        break;
    }

    for (let i = 0; i < intervals; i++) {
      const date = new Date(startDate);
      if (groupBy === 'day') {
        date.setDate(date.getDate() + i);
      } else if (groupBy === 'week') {
        date.setDate(date.getDate() + (i * 7));
      } else if (groupBy === 'month') {
        date.setMonth(date.getMonth() + i);
      }

      const dateStr = date.toISOString().split('T')[0];
      const appointmentsOnDate = appointments.filter(apt => {
        const aptDate = new Date(apt.created_at).toISOString().split('T')[0];
        if (groupBy === 'day') {
          return aptDate === dateStr;
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          const weekEnd = new Date(date);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const aptDateObj = new Date(apt.created_at);
          return aptDateObj >= weekStart && aptDateObj <= weekEnd;
        } else if (groupBy === 'month') {
          return new Date(apt.created_at).getMonth() === date.getMonth() && 
                 new Date(apt.created_at).getFullYear() === date.getFullYear();
        }
        return false;
      });

      trends.push({
        name: groupBy === 'day' ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
              groupBy === 'week' ? `Week ${Math.ceil((date.getDate()) / 7)}` :
              date.toLocaleDateString('en-US', { month: 'short' }),
        appointments: appointmentsOnDate.length,
        completed: appointmentsOnDate.filter(apt => apt.status === 'completed').length,
        revenue: appointmentsOnDate.filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (apt.actual_cost?.total || 0), 0)
      });
    }

    return trends;
  };

  const processServiceTypes = (appointments) => {
    const serviceMap = {};
    appointments.forEach(apt => {
      const service = apt.service || 'Unknown';
      if (serviceMap[service]) {
        serviceMap[service].count++;
        serviceMap[service].revenue += apt.actual_cost?.total || 0;
      } else {
        serviceMap[service] = {
          name: service,
          count: 1,
          revenue: apt.actual_cost?.total || 0
        };
      }
    });

    return Object.values(serviceMap).sort((a, b) => b.count - a.count);
  };

  const processMonthlyRevenue = (appointments) => {
    const revenueMap = {};
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    
    completedAppointments.forEach(apt => {
      const date = new Date(apt.date || apt.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (revenueMap[monthKey]) {
        revenueMap[monthKey].revenue += apt.actual_cost?.total || 0;
        revenueMap[monthKey].appointments++;
      } else {
        revenueMap[monthKey] = {
          month: monthName,
          revenue: apt.actual_cost?.total || 0,
          appointments: 1
        };
      }
    });

    return Object.values(revenueMap).sort((a, b) => 
      new Date(a.month) - new Date(b.month)
    );
  };

  const calculateCustomerStats = (appointments, messages) => {
    const uniqueCustomers = new Set();
    const repeatCustomers = {};
    
    appointments.forEach(apt => {
      const email = apt.email.toLowerCase();
      uniqueCustomers.add(email);
      repeatCustomers[email] = (repeatCustomers[email] || 0) + 1;
    });

    messages.forEach(msg => {
      uniqueCustomers.add(msg.email.toLowerCase());
    });

    const totalCustomers = uniqueCustomers.size;
    const repeatCustomerCount = Object.values(repeatCustomers).filter(count => count > 1).length;
    const repeatRate = totalCustomers > 0 ? (repeatCustomerCount / totalCustomers) * 100 : 0;

    return {
      totalCustomers,
      newCustomers: totalCustomers - repeatCustomerCount,
      repeatCustomers: repeatCustomerCount,
      repeatRate: Math.round(repeatRate),
      averageAppointments: totalCustomers > 0 ? appointments.length / totalCustomers : 0
    };
  };

  const calculateVehicleStats = (vehicles) => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const soldVehicles = vehicles.filter(v => v.status === 'sold').length;
    const featuredVehicles = vehicles.filter(v => v.featured).length;
    
    const totalValue = vehicles.reduce((sum, v) => sum + (v.price || 0), 0);
    const averagePrice = totalVehicles > 0 ? totalValue / totalVehicles : 0;

    const makeStats = {};
    vehicles.forEach(v => {
      const make = v.make || 'Unknown';
      makeStats[make] = (makeStats[make] || 0) + 1;
    });

    const topMakes = Object.entries(makeStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([make, count]) => ({ make, count }));

    return {
      totalVehicles,
      availableVehicles,
      soldVehicles,
      featuredVehicles,
      averagePrice,
      totalValue,
      topMakes
    };
  };

  const calculatePerformanceMetrics = (appointments) => {
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
    const noShowAppointments = appointments.filter(apt => apt.status === 'no-show').length;
    
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;
    const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;

    const totalRevenue = appointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + (apt.actual_cost?.total || 0), 0);

    const averageJobValue = completedAppointments > 0 ? totalRevenue / completedAppointments : 0;

    return {
      totalAppointments,
      completedAppointments,
      completionRate: Math.round(completionRate),
      cancellationRate: Math.round(cancellationRate),
      noShowRate: Math.round(noShowRate),
      totalRevenue,
      averageJobValue
    };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex gap-2">
          {["7days", "30days", "90days", "1year"].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                dateRange === range
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {range === "7days" ? "7 Days" : 
               range === "30days" ? "30 Days" :
               range === "90days" ? "90 Days" : "1 Year"}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${analytics.performanceMetrics.totalRevenue?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {analytics.performanceMetrics.completedAppointments || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Job Value</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ${Math.round(analytics.performanceMetrics.averageJobValue || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {analytics.performanceMetrics.completionRate || 0}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Appointment Trends */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Appointment Trends</h3>
              <div className="h-64">
                {typeof window !== 'undefined' && analytics.appointmentTrends.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.appointmentTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Service Types */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Popular Services</h3>
              <div className="h-64">
                {typeof window !== 'undefined' && analytics.serviceTypes.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.serviceTypes.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Monthly Revenue</h3>
              <div className="h-64">
                {typeof window !== 'undefined' && analytics.monthlyRevenue.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Vehicle Inventory Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Vehicle Inventory</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.vehicleStats.totalVehicles || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Vehicles</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.vehicleStats.availableVehicles || 0}
                  </p>
                  <p className="text-sm text-gray-600">Available</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    ${Math.round(analytics.vehicleStats.averagePrice || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Avg Price</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {analytics.vehicleStats.featuredVehicles || 0}
                  </p>
                  <p className="text-sm text-gray-600">Featured</p>
                </div>
              </div>
              
              {analytics.vehicleStats.topMakes && analytics.vehicleStats.topMakes.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Top Makes</h4>
                  <div className="space-y-1">
                    {analytics.vehicleStats.topMakes.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.make}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Analytics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Customer Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {analytics.customerStats.totalCustomers || 0}
                </p>
                <p className="text-sm text-gray-600">Total Customers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {analytics.customerStats.repeatCustomers || 0}
                </p>
                <p className="text-sm text-gray-600">Repeat Customers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.customerStats.repeatRate || 0}%
                </p>
                <p className="text-sm text-gray-600">Repeat Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {Math.round(analytics.customerStats.averageAppointments || 0)}
                </p>
                <p className="text-sm text-gray-600">Avg Appointments</p>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {analytics.performanceMetrics.completionRate || 0}%
                </p>
                <p className="text-sm text-gray-600">Completion Rate</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {analytics.performanceMetrics.cancellationRate || 0}%
                </p>
                <p className="text-sm text-gray-600">Cancellation Rate</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {analytics.performanceMetrics.noShowRate || 0}%
                </p>
                <p className="text-sm text-gray-600">No-Show Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}