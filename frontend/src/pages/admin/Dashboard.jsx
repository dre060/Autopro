// frontend/src/pages/admin/Dashboard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { Helmet } from 'react-helmet-async';
import {
  Car,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Eye,
  Plus,
  Settings,
  Bell,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Activity,
  MessageSquare
} from 'lucide-react';

import { analyticsService } from '../../services/analyticsService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch dashboard data
  const { data: analytics, isLoading, error } = useQuery(
    ['dashboardAnalytics', timeRange],
    () => analyticsService.getDashboardStats(),
    {
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    }
  );

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Vehicles',
      value: analytics?.stats?.totalVehicles || 0,
      change: '+12%',
      changeType: 'positive',
      icon: Car,
      color: 'blue',
      link: '/admin/inventory'
    },
    {
      title: 'Pending Appointments',
      value: analytics?.stats?.pendingAppointments || 0,
      change: '+5%',
      changeType: 'positive',
      icon: Calendar,
      color: 'green',
      link: '/admin/appointments'
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(85000),
      change: '+18%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'purple',
      link: '/admin/analytics'
    },
    {
      title: 'Customer Reviews',
      value: analytics?.stats?.totalTestimonials || 0,
      change: '+3%',
      changeType: 'positive',
      icon: Star,
      color: 'yellow',
      link: '/admin/testimonials'
    }
  ];

  const quickActions = [
    {
      title: 'Add New Vehicle',
      description: 'List a new vehicle for sale',
      icon: Plus,
      color: 'blue',
      link: '/admin/inventory/new'
    },
    {
      title: 'View Appointments',
      description: 'Manage customer appointments',
      icon: Calendar,
      color: 'green',
      link: '/admin/appointments'
    },
    {
      title: 'Analytics',
      description: 'View detailed reports',
      icon: BarChart3,
      color: 'purple',
      link: '/admin/analytics'
    },
    {
      title: 'Settings',
      description: 'Configure system settings',
      icon: Settings,
      color: 'gray',
      link: '/admin/settings'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | AUTO PRO</title>
        <meta name="description" content="AUTO PRO admin dashboard for managing inventory, appointments, and analytics." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Welcome back! Here's what's happening with your business.
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
                
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8"
          >
            {/* Stats Grid */}
            <motion.div variants={fadeInUp}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.title}
                    variants={fadeInUp}
                    whileHover={{ y: -2 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stat.value}
                        </p>
                        <div className="flex items-center mt-2">
                          {stat.changeType === 'positive' ? (
                            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                          )}
                          <span className={`text-sm ${
                            stat.changeType === 'positive' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {stat.change}
                          </span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                      </div>
                    </div>
                    
                    <Link
                      to={stat.link}
                      className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
                    >
                      View details
                      <Eye className="w-4 h-4 ml-1" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={fadeInUp}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.title}
                    variants={fadeInUp}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to={action.link}
                      className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group"
                    >
                      <div className={`p-3 rounded-full bg-${action.color}-100 dark:bg-${action.color}-900/30 w-fit mb-4 group-hover:scale-110 transition-transform`}>
                        <action.icon className={`w-6 h-6 text-${action.color}-600 dark:text-${action.color}-400`} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {action.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {action.description}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Appointments */}
              <motion.div variants={fadeInUp} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Recent Appointments
                    </h3>
                    <Link
                      to="/admin/appointments"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                    >
                      View all
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {analytics?.recentAppointments?.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.recentAppointments.slice(0, 5).map((appointment) => (
                        <div key={appointment._id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className={`p-2 rounded-full ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-yellow-100 dark:bg-yellow-900/30'
                          }`}>
                            {appointment.status === 'confirmed' ? (
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {appointment.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {appointment.service} • {formatDate(appointment.date)}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No recent appointments</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Recent Vehicles */}
              <motion.div variants={fadeInUp} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Car className="w-5 h-5 mr-2" />
                      Recent Vehicles
                    </h3>
                    <Link
                      to="/admin/inventory"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                    >
                      View all
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {analytics?.recentVehicles?.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.recentVehicles.slice(0, 5).map((vehicle) => (
                        <div key={vehicle._id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Car className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {formatCurrency(vehicle.price)} • Added {formatDate(vehicle.createdAt)}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            vehicle.status === 'available' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {vehicle.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No recent vehicles</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Activity Feed */}
            <motion.div variants={fadeInUp} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        New vehicle added: <span className="font-medium">2020 Honda Civic</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Appointment confirmed for <span className="font-medium">John Smith</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">4 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                      <MessageSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        New testimonial received from <span className="font-medium">Sarah Johnson</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;