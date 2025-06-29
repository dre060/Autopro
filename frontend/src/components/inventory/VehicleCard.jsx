// frontend/src/components/inventory/VehicleCard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import {
  Heart,
  Eye,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  MapPin,
  Phone,
  Star,
  CheckCircle,
  AlertCircle,
  Camera
} from 'lucide-react';
import { formatCurrency, formatMileage } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const VehicleCard = ({ vehicle, className = '', showActions = true, featured = false }) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const handleFavorite = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to save favorites');
      return;
    }
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleContact = (e) => {
    e.preventDefault();
    // Open contact modal or navigate to contact page with vehicle info
    window.location.href = `tel:(352) 933-5181`;
  };

  const getConditionColor = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'sold': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'reserved': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const primaryImage = vehicle.images?.[0] || '/images/placeholder-car.jpg';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${className}`}
    >
      {/* Featured Badge */}
      {featured && (
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg flex items-center">
            <Star className="w-4 h-4 mr-1" />
            Featured
          </span>
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(vehicle.status)}`}>
          {vehicle.status?.charAt(0).toUpperCase() + vehicle.status?.slice(1)}
        </span>
      </div>

      {/* Image Container */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <Link to={`/vehicles/${vehicle._id}`}>
          <LazyLoadImage
            src={primaryImage}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
            placeholder={
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            }
          />
        </Link>

        {/* Image Count Overlay */}
        {vehicle.images?.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center">
            <Camera className="w-3 h-3 mr-1" />
            {vehicle.images.length}
          </div>
        )}

        {/* Quick Actions Overlay */}
        {showActions && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-4">
            <button
              onClick={handleFavorite}
              className={`p-3 rounded-full transition-all duration-200 ${
                isFavorited 
                  ? 'bg-red-500 text-white scale-110' 
                  : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
            
            <Link
              to={`/vehicles/${vehicle._id}`}
              className="p-3 bg-white/90 text-gray-700 rounded-full hover:bg-blue-500 hover:text-white transition-all duration-200"
            >
              <Eye className="w-5 h-5" />
            </Link>
            
            <button
              onClick={handleContact}
              className="p-3 bg-white/90 text-gray-700 rounded-full hover:bg-green-500 hover:text-white transition-all duration-200"
            >
              <Phone className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <Link to={`/vehicles/${vehicle._id}`}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
          </Link>
          {vehicle.trim && (
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              {vehicle.trim}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(vehicle.price)}
            </span>
            {vehicle.originalPrice && vehicle.originalPrice > vehicle.price && (
              <span className="text-lg text-gray-500 line-through">
                {formatCurrency(vehicle.originalPrice)}
              </span>
            )}
          </div>
          {vehicle.originalPrice && vehicle.originalPrice > vehicle.price && (
            <p className="text-sm text-green-600 font-medium">
              Save {formatCurrency(vehicle.originalPrice - vehicle.price)}!
            </p>
          )}
        </div>

        {/* Key Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span>{vehicle.year}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Gauge className="w-4 h-4 mr-2 text-gray-400" />
            <span>{formatMileage(vehicle.mileage)}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Fuel className="w-4 h-4 mr-2 text-gray-400" />
            <span>{vehicle.fuelType}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Settings className="w-4 h-4 mr-2 text-gray-400" />
            <span>{vehicle.transmission}</span>
          </div>
        </div>

        {/* Condition & Features */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Condition:</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getConditionColor(vehicle.condition)}`}>
              {vehicle.condition}
            </span>
          </div>

          {vehicle.accidentHistory !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Accident History:</span>
              <div className="flex items-center">
                {vehicle.accidentHistory ? (
                  <AlertCircle className="w-4 h-4 text-yellow-500 mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                )}
                <span className={`text-xs font-semibold ${
                  vehicle.accidentHistory ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {vehicle.accidentHistory ? 'Yes' : 'Clean'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Key Features */}
        {vehicle.keyFeatures && vehicle.keyFeatures.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {vehicle.keyFeatures.slice(0, 3).map((feature, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                >
                  {feature}
                </span>
              ))}
              {vehicle.keyFeatures.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                  +{vehicle.keyFeatures.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="space-y-2">
            <Link
              to={`/vehicles/${vehicle._id}`}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center block"
            >
              View Details
            </Link>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleContact}
                className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm flex items-center justify-center"
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </button>
              
              <Link
                to={`/appointments?vehicle=${vehicle._id}`}
                className="bg-gray-600 dark:bg-gray-700 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm text-center flex items-center justify-center"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Test Drive
              </Link>
            </div>
          </div>
        )}

        {/* Financing Info */}
        {vehicle.price && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Est. Payment: <span className="font-semibold">${Math.round(vehicle.price * 0.02)}/mo*</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default VehicleCard;