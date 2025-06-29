// frontend/src/components/services/ServiceCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench,
  Car,
  Shield,
  Clock,
  DollarSign,
  ArrowRight,
  Star,
  CheckCircle,
  Calendar,
  Phone
} from 'lucide-react';

const ServiceCard = ({ service, className = '', variant = 'default' }) => {
  const getServiceIcon = (iconName) => {
    const icons = {
      wrench: Wrench,
      car: Car,
      shield: Shield,
      clock: Clock,
      dollar: DollarSign,
      star: Star,
      check: CheckCircle
    };
    
    const IconComponent = icons[iconName] || Wrench;
    return IconComponent;
  };

  const ServiceIcon = getServiceIcon(service.icon);

  const getCategoryColor = (category) => {
    const colors = {
      'Repair': 'from-red-500 to-red-600',
      'Maintenance': 'from-blue-500 to-blue-600',
      'Diagnostic': 'from-purple-500 to-purple-600',
      'Emergency': 'from-orange-500 to-orange-600',
      'Sales': 'from-green-500 to-green-600',
      'Towing': 'from-yellow-500 to-yellow-600'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const formatPrice = (pricing) => {
    if (!pricing) return 'Contact for pricing';
    
    if (pricing.basePrice) {
      return `Starting at $${pricing.basePrice}`;
    }
    
    if (pricing.priceRange) {
      return `$${pricing.priceRange.min} - $${pricing.priceRange.max}`;
    }
    
    return 'Contact for pricing';
  };

  const formatEstimatedTime = (estimatedTime) => {
    if (!estimatedTime) return null;
    
    if (estimatedTime.min === estimatedTime.max) {
      return `${estimatedTime.min} minutes`;
    }
    
    return `${estimatedTime.min}-${estimatedTime.max} minutes`;
  };

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className={`bg-gradient-to-br ${getCategoryColor(service.category)} p-2 rounded-lg`}>
            <ServiceIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {service.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {service.category}
            </p>
          </div>
          <Link
            to={`/services/${service.slug}`}
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${className}`}
    >
      {/* Header */}
      <div className="relative p-6 pb-4">
        {/* Category Badge */}
        <div className="absolute top-4 right-4">
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
            {service.category}
          </span>
        </div>

        {/* Icon */}
        <div className={`bg-gradient-to-br ${getCategoryColor(service.category)} w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <ServiceIcon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {service.name}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
          {service.description}
        </p>
      </div>

      {/* Content */}
      <div className="px-6 pb-2">
        {/* Features */}
        {service.features && service.features.length > 0 && (
          <div className="mb-4">
            <ul className="space-y-2">
              {service.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {service.features.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                +{service.features.length - 3} more features
              </p>
            )}
          </div>
        )}

        {/* Pricing and Time */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4 mr-2 text-green-500" />
              <span>Pricing:</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatPrice(service.pricing)}
            </span>
          </div>

          {/* Estimated Time */}
          {service.estimatedTime && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-2 text-blue-500" />
                <span>Duration:</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatEstimatedTime(service.estimatedTime)}
              </span>
            </div>
          )}

          {/* Warranty */}
          {service.warranty?.hasWarranty && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Shield className="w-4 h-4 mr-2 text-purple-500" />
                <span>Warranty:</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {service.warranty.period} days
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {service.tags.slice(0, 4).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 pt-2 space-y-3">
        <Link
          to={`/services/${service.slug}`}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center block group"
        >
          <span className="flex items-center justify-center">
            Learn More
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/appointments?service=${service.slug}`}
            className="bg-green-600 text-white py-2 px-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm text-center flex items-center justify-center"
          >
            <Calendar className="w-4 h-4 mr-1" />
            Book Now
          </Link>
          
          <a
            href="tel:(352) 933-5181"
            className="bg-gray-600 dark:bg-gray-700 text-white py-2 px-3 rounded-lg font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm text-center flex items-center justify-center"
          >
            <Phone className="w-4 h-4 mr-1" />
            Call
          </a>
        </div>

        {/* Pricing Note */}
        {service.pricing?.pricingNote && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {service.pricing.pricingNote}
          </p>
        )}
      </div>

      {/* Featured Badge */}
      {service.featured && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-bl-lg text-xs font-bold">
            <Star className="w-3 h-3 inline mr-1" />
            Popular
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ServiceCard;