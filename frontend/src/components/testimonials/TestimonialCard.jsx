// frontend/src/components/testimonials/TestimonialCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, User, MapPin, Car, Calendar } from 'lucide-react';

const TestimonialCard = ({ testimonial, className = '', variant = 'default', showService = true }) => {
  if (!testimonial) return null;

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-5 h-5 ${
          index < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {testimonial.avatar ? (
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {getInitials(testimonial.name)}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {testimonial.name}
              </h4>
              <div className="flex">
                {renderStars(testimonial.rating)}
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
              "{testimonial.message}"
            </p>
            
            {showService && testimonial.serviceReceived && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Service: {testimonial.serviceReceived}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 shadow-xl border border-blue-100 dark:border-gray-700 ${className}`}
      >
        {/* Quote Icon */}
        <div className="absolute top-6 right-6 opacity-10">
          <Quote className="w-16 h-16 text-blue-600" />
        </div>

        {/* Rating */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-1">
            {renderStars(testimonial.rating)}
          </div>
        </div>

        {/* Message */}
        <blockquote className="text-center">
          <p className="text-lg md:text-xl text-gray-900 dark:text-white leading-relaxed mb-6 italic">
            "{testimonial.message}"
          </p>
        </blockquote>

        {/* Author Info */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {testimonial.avatar ? (
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-16 h-16 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {getInitials(testimonial.name)}
                </span>
              </div>
            )}
          </div>
          
          <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
            {testimonial.name}
          </h4>
          
          {testimonial.location && (
            <div className="flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{testimonial.location.city}, {testimonial.location.state}</span>
            </div>
          )}

          {testimonial.vehicleInfo && (
            <div className="flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm mb-2">
              <Car className="w-4 h-4 mr-1" />
              <span>
                {testimonial.vehicleInfo.year} {testimonial.vehicleInfo.make} {testimonial.vehicleInfo.model}
              </span>
            </div>
          )}

          {showService && testimonial.serviceReceived && (
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium inline-block mb-2">
              {testimonial.serviceReceived}
            </div>
          )}

          <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDate(testimonial.createdAt)}</span>
          </div>
        </div>

        {/* Featured Badge */}
        {testimonial.featured && (
          <div className="absolute top-0 left-6">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-b-lg text-xs font-bold shadow-lg">
              ⭐ Featured Review
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${className}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            {testimonial.avatar ? (
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {getInitials(testimonial.name)}
                </span>
              </div>
            )}

            {/* Name and Info */}
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 dark:text-white">
                {testimonial.name}
              </h4>
              
              {testimonial.location && (
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{testimonial.location.city}, {testimonial.location.state}</span>
                </div>
              )}
              
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-1">
                <Calendar className="w-3 h-3 mr-1" />
                <span>{formatDate(testimonial.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex space-x-1">
            {renderStars(testimonial.rating)}
          </div>
        </div>

        {/* Title */}
        {testimonial.title && (
          <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
            {testimonial.title}
          </h5>
        )}

        {/* Message */}
        <blockquote className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          "{testimonial.message}"
        </blockquote>

        {/* Service and Vehicle Info */}
        <div className="space-y-2">
          {showService && testimonial.serviceReceived && (
            <div className="flex items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400 mr-2">Service:</span>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium">
                {testimonial.serviceReceived}
              </span>
            </div>
          )}

          {testimonial.vehicleInfo && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Car className="w-4 h-4 mr-2" />
              <span>
                {testimonial.vehicleInfo.year} {testimonial.vehicleInfo.make} {testimonial.vehicleInfo.model}
              </span>
            </div>
          )}
        </div>

        {/* Featured Badge */}
        {testimonial.featured && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                ⭐ Featured Review
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TestimonialCard;