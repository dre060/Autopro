// frontend/src/pages/Services.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { Helmet } from 'react-helmet-async';
import {
  Wrench,
  Car,
  Shield,
  Clock,
  CheckCircle,
  Star,
  Award,
  Phone,
  Calendar,
  ArrowRight,
  Search,
  Filter,
  Zap,
  Heart,
  Settings,
  Truck,
  AlertTriangle,
  DollarSign
} from 'lucide-react';

import { serviceService } from '../services/serviceService';
import ServiceCard from '../components/services/ServiceCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { SERVICE_CATEGORIES } from '../utils/constants';

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch services
  const { data: services, isLoading, error } = useQuery(
    'services',
    serviceService.getAll,
    {
      staleTime: 10 * 60 * 1000 // Cache for 10 minutes
    }
  );

  // Filter services
  const filteredServices = services?.filter(service => {
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

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

  const serviceHighlights = [
    {
      icon: Shield,
      title: 'ASE Certified Technicians',
      description: 'Our mechanics are certified by the National Institute for Automotive Service Excellence',
      color: 'blue'
    },
    {
      icon: Clock,
      title: 'Fast Turnaround',
      description: 'Most services completed same day with our efficient workflow and experienced team',
      color: 'green'
    },
    {
      icon: Award,
      title: 'Warranty Guaranteed',
      description: 'All work backed by comprehensive warranties for your peace of mind',
      color: 'purple'
    },
    {
      icon: DollarSign,
      title: 'Honest Pricing',
      description: 'Transparent, upfront pricing with no hidden fees or surprise charges',
      color: 'yellow'
    }
  ];

  const emergencyServices = [
    {
      title: '24/7 Towing',
      description: 'Emergency roadside assistance and towing services',
      icon: Truck,
      available: true
    },
    {
      title: 'Jump Start',
      description: 'Dead battery? We\'ll get you running again',
      icon: Zap,
      available: true
    },
    {
      title: 'Lockout Service',
      description: 'Locked out of your vehicle? We can help',
      icon: Settings,
      available: true
    },
    {
      title: 'Flat Tire Change',
      description: 'Quick roadside tire replacement service',
      icon: AlertTriangle,
      available: true
    }
  ];

  return (
    <>
      <Helmet>
        <title>Auto Repair Services | AUTO PRO Repairs & Sales</title>
        <meta name="description" content="Professional auto repair services in Leesburg, FL. From routine maintenance to complex repairs, our ASE certified technicians have you covered." />
        <meta name="keywords" content="auto repair, car service, brake repair, oil change, engine repair, Leesburg FL, automotive service" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                Professional Auto Services
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                From routine maintenance to complex repairs, our ASE-certified technicians 
                provide honest, reliable service you can trust.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/appointments"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Service
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                
                <a
                  href="tel:(352) 933-5181"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors flex items-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Emergency: (352) 933-5181
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Service Highlights */}
        <div className="py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose AUTO PRO?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                We're not just another repair shop. We're your trusted automotive partner, 
                committed to keeping you safe on the road.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {serviceHighlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="text-center group"
                >
                  <div className={`bg-gradient-to-br from-${highlight.color}-500 to-${highlight.color}-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl`}>
                    <highlight.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {highlight.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {highlight.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Emergency Services */}
        <div className="py-16 bg-red-600 text-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Emergency Roadside Services
              </h2>
              <p className="text-xl text-red-100 max-w-3xl mx-auto">
                Car trouble doesn't wait for business hours. Our emergency services 
                are available 24/7 to get you back on the road safely.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {emergencyServices.map((service, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center hover:bg-white/20 transition-colors"
                >
                  <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <service.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                  <p className="text-red-100 text-sm">{service.description}</p>
                  {service.available && (
                    <div className="mt-3 flex items-center justify-center text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Available 24/7
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mt-12"
            >
              <a
                href="tel:(352) 933-5181"
                className="bg-white text-red-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors inline-flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now: (352) 933-5181
              </a>
            </motion.div>
          </div>
        </div>

        {/* Services Listing */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Our Complete Service Menu
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Comprehensive automotive services from preventive maintenance to major repairs. 
                All work performed by certified technicians.
              </p>
            </motion.div>

            {/* Search and Filter */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
                {/* Search */}
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    {SERVICE_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" text="Loading services..." />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Failed to load services
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please try again later or contact us directly.
                </p>
              </div>
            )}

            {/* Services Grid */}
            {!isLoading && !error && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                {filteredServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredServices.map((service) => (
                      <motion.div key={service._id} variants={fadeInUp}>
                        <ServiceCard service={service} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No services found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try adjusting your search or category filter.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Process Section */}
        <div className="py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Our Service Process
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                We believe in transparency every step of the way. Here's how we ensure 
                you get the best service experience possible.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {[
                {
                  step: '1',
                  title: 'Schedule Appointment',
                  description: 'Book online or call us to schedule your service at a convenient time',
                  icon: Calendar
                },
                {
                  step: '2',
                  title: 'Free Inspection',
                  description: 'Our technicians perform a comprehensive diagnostic inspection',
                  icon: Search
                },
                {
                  step: '3',
                  title: 'Transparent Estimate',
                  description: 'We provide detailed, upfront pricing before any work begins',
                  icon: DollarSign
                },
                {
                  step: '4',
                  title: 'Quality Service',
                  description: 'Expert repairs using quality parts, backed by our guarantee',
                  icon: CheckCircle
                }
              ].map((step, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="text-center relative"
                >
                  {/* Step number */}
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                    {step.step}
                  </div>
                  
                  {/* Icon */}
                  <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                  
                  {/* Arrow */}
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Ready to Experience the Difference?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of satisfied customers who trust AUTO PRO for their automotive needs. 
                Book your service today and see why we're Leesburg's preferred auto repair shop.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/appointments"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Service Now
                </Link>
                
                <Link
                  to="/contact"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
                >
                  Get Free Estimate
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span>4.9/5 Customer Rating</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>ASE Certified Technicians</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <span>Family Owned & Operated</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Services;