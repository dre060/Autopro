// frontend/src/pages/VehicleDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useQuery } from 'react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Heart,
  Share2,
  MapPin,
  Gauge,
  Fuel,
  Settings,
  Car,
  CheckCircle,
  AlertCircle,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Shield,
  Award,
  Clock,
  DollarSign,
  Calculator,
  FileText,
  Download,
  Eye,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

import { vehicleService } from '../services/vehicleService';
import { formatCurrency, formatMileage, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import VehicleCard from '../components/inventory/VehicleCard';

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Fetch vehicle details
  const { data: vehicle, isLoading, error } = useQuery(
    ['vehicle', id],
    () => vehicleService.getById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch similar vehicles
  const { data: similarVehicles } = useQuery(
    ['similarVehicles', vehicle?.make, vehicle?.model],
    () => vehicleService.getVehicles({
      make: vehicle?.make,
      model: vehicle?.model,
      limit: 4
    }),
    {
      enabled: !!(vehicle?.make && vehicle?.model),
      staleTime: 10 * 60 * 1000
    }
  );

  useEffect(() => {
    if (vehicle) {
      // Increment view count
      // This would typically be done via an API call
      console.log('Vehicle viewed:', vehicle._id);
    }
  }, [vehicle]);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          text: `Check out this ${vehicle.year} ${vehicle.make} ${vehicle.model} at AUTO PRO`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const calculateMonthlyPayment = (price, downPayment = 0, apr = 6.99, termMonths = 60) => {
    const principal = price - downPayment;
    const monthlyRate = apr / 100 / 12;
    const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
    return payment;
  };

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
    return <LoadingSpinner fullScreen text="Loading vehicle details..." />;
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Vehicle Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The vehicle you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/inventory"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Inventory
          </Link>
        </div>
      </div>
    );
  }

  const images = vehicle.images || ['/images/placeholder-car.jpg'];
  const features = vehicle.features || [];
  const keyFeatures = vehicle.keyFeatures || [];

  const monthlyPayment = calculateMonthlyPayment(vehicle.price);

  return (
    <>
      <Helmet>
        <title>{vehicle.year} {vehicle.make} {vehicle.model} | AUTO PRO</title>
        <meta name="description" content={`${vehicle.year} ${vehicle.make} ${vehicle.model} for sale at AUTO PRO in Leesburg, FL. ${formatMileage(vehicle.mileage)}, ${vehicle.condition} condition. ${formatCurrency(vehicle.price)}`} />
        <meta name="keywords" content={`${vehicle.year} ${vehicle.make} ${vehicle.model}, used car, Leesburg FL, auto sales, ${vehicle.bodyType}`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Breadcrumb */}
        <div className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Home
              </Link>
              <span className="text-gray-400">/</span>
              <Link to="/inventory" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Inventory
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="flex items-start justify-between"
              >
                <div>
                  <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Inventory
                  </button>
                  
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h1>
                  {vehicle.trim && (
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                      {vehicle.trim}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      vehicle.status === 'available' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {vehicle.status?.charAt(0).toUpperCase() + vehicle.status?.slice(1)}
                    </span>
                    
                    {vehicle.featured && (
                      <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                        <Star className="w-4 h-4 mr-1" />
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleFavorite}
                    className={`p-3 rounded-full transition-colors ${
                      isFavorited 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="p-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>

              {/* Image Gallery */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
              >
                {/* Main Image */}
                <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
                  <img
                    src={images[selectedImageIndex]}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setShowImageModal(true)}
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        disabled={selectedImageIndex === 0}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        disabled={selectedImageIndex === images.length - 1}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm flex items-center">
                    <Camera className="w-4 h-4 mr-1" />
                    {selectedImageIndex + 1} / {images.length}
                  </div>
                </div>

                {/* Thumbnail Gallery */}
                {images.length > 1 && (
                  <div className="p-4">
                    <div className="flex space-x-2 overflow-x-auto">
                      {images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                            index === selectedImageIndex 
                              ? 'border-blue-500' 
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`View ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Vehicle Details */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Vehicle Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Year</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.year}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Make</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.make}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Model</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.model}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Mileage</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatMileage(vehicle.mileage)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Body Type</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.bodyType}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Condition</span>
                      <span className={`font-semibold ${
                        vehicle.condition === 'Excellent' ? 'text-green-600 dark:text-green-400' :
                        vehicle.condition === 'Good' ? 'text-blue-600 dark:text-blue-400' :
                        vehicle.condition === 'Fair' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {vehicle.condition}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Fuel Type</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.fuelType}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Transmission</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.transmission}</span>
                    </div>
                    
                    {vehicle.drivetrain && (
                      <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Drivetrain</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{vehicle.drivetrain}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Exterior Color</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.exteriorColor}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Interior Color</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vehicle.interiorColor}</span>
                    </div>
                    
                    {vehicle.numberOfOwners && (
                      <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Previous Owners</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{vehicle.numberOfOwners}</span>
                      </div>
                    )}
                  </div>
                </div>

                {vehicle.vin && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">VIN</span>
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{vehicle.vin}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Features */}
              {keyFeatures.length > 0 && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Key Features
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {keyFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Description */}
              {vehicle.description && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Description
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {vehicle.description}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price & Payment */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-4"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {formatCurrency(vehicle.price)}
                  </div>
                  {vehicle.originalPrice && vehicle.originalPrice > vehicle.price && (
                    <div className="text-lg text-gray-500 line-through">
                      {formatCurrency(vehicle.originalPrice)}
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Est. Monthly Payment:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${Math.round(monthlyPayment)}/mo*
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      *Based on 60 months at 6.99% APR
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <a
                    href="tel:(352) 933-5181"
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Call: (352) 933-5181
                  </a>
                  
                  <Link
                    to={`/appointments?vehicle=${vehicle._id}`}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Schedule Test Drive
                  </Link>
                  
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Email Inquiry
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>Located in Leesburg, FL</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <Eye className="w-4 h-4 mr-2" />
                    <span>Viewed {vehicle.views || 0} times</span>
                  </div>
                </div>
              </motion.div>

              {/* Why Choose AUTO PRO */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Why Choose AUTO PRO?
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Shield className="w-4 h-4 text-blue-500 mr-3" />
                    <span className="text-gray-700 dark:text-gray-300">Quality Inspected</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Award className="w-4 h-4 text-blue-500 mr-3" />
                    <span className="text-gray-700 dark:text-gray-300">25+ Years Experience</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-blue-500 mr-3" />
                    <span className="text-gray-700 dark:text-gray-300">Honest Pricing</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="w-4 h-4 text-blue-500 mr-3" />
                    <span className="text-gray-700 dark:text-gray-300">Family Owned</span>
                  </div>
                </div>
              </motion.div>

              {/* Financing Calculator */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Payment Calculator
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Down Payment
                    </label>
                    <input
                      type="number"
                      placeholder="5000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Loan Term (months)
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                      <option value="36">36 months</option>
                      <option value="48">48 months</option>
                      <option value="60">60 months</option>
                      <option value="72">72 months</option>
                    </select>
                  </div>
                  
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded font-semibold hover:bg-blue-700 transition-colors">
                    Calculate Payment
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Similar Vehicles */}
          {similarVehicles?.vehicles && similarVehicles.vehicles.length > 1 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="mt-16"
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                Similar Vehicles
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {similarVehicles.vehicles
                  .filter(v => v._id !== vehicle._id)
                  .slice(0, 4)
                  .map((similarVehicle) => (
                    <VehicleCard key={similarVehicle._id} vehicle={similarVehicle} />
                  ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Image Modal */}
        <AnimatePresence>
          {showImageModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setShowImageModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-5xl max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={images[selectedImageIndex]}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-contain"
                />
                
                <button
                  onClick={() => setShowImageModal(false)}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                      disabled={selectedImageIndex === 0}
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    
                    <button
                      onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                      disabled={selectedImageIndex === images.length - 1}
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </>
                )}
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                  <p>{selectedImageIndex + 1} of {images.length}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default VehicleDetail;