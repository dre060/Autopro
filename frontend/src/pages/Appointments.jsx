// frontend/src/pages/Appointments.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Car,
  Wrench,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Info,
  MapPin,
  Star,
  Shield,
  Award,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

import { appointmentService } from '../services/appointmentService';
import { serviceService } from '../services/serviceService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useQuery } from 'react-query';

import 'react-datepicker/dist/react-datepicker.css';

const Appointments = () => {
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Get service from URL params
  const preselectedService = searchParams.get('service');
  const preselectedVehicle = searchParams.get('vehicle');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  // Watch form values for dynamic updates
  const watchedService = watch('service');

  // Fetch services for dropdown
  const { data: services } = useQuery('services', serviceService.getAll);

  // Set preselected values
  useEffect(() => {
    if (preselectedService) {
      setValue('service', preselectedService);
    }
  }, [preselectedService, setValue]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const appointmentData = {
        ...data,
        date: selectedDate,
        time: selectedTime,
      };

      await appointmentService.book(appointmentData);
      setSubmitSuccess(true);
      reset();
      setSelectedDate(null);
      setSelectedTime('');
      toast.success('Appointment booked successfully! We\'ll contact you to confirm.');
      
      // Reset success state after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 8000);
    } catch (error) {
      toast.error('Failed to book appointment. Please try again or call us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate available time slots
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8; // 8 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

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

  const benefits = [
    {
      icon: Shield,
      title: 'Experienced Technicians',
      description: 'ASE certified mechanics with 25+ years experience'
    },
    {
      icon: Award,
      title: 'Quality Guarantee',
      description: 'All work backed by comprehensive warranties'
    },
    {
      icon: DollarSign,
      title: 'Honest Pricing',
      description: 'Transparent, upfront pricing with no surprises'
    },
    {
      icon: Star,
      title: '4.9 Star Rating',
      description: 'Trusted by thousands of satisfied customers'
    }
  ];

  const emergencyServices = [
    '24/7 Emergency Towing',
    'Jump Start Service',
    'Flat Tire Assistance',
    'Lockout Service',
    'Emergency Brake Repair',
    'Overheating Solutions'
  ];

  // Filter out weekends and past dates
  const isWeekday = (date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
  };

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2); // 2 months ahead

  return (
    <>
      <Helmet>
        <title>Schedule Service Appointment | AUTO PRO Repairs & Sales</title>
        <meta name="description" content="Schedule your auto repair appointment online with AUTO PRO in Leesburg, FL. Quick, easy booking for all automotive services." />
        <meta name="keywords" content="schedule appointment, auto repair, Leesburg FL, car service, booking, automotive appointment" />
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
                Schedule Your Service
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Book your automotive service appointment online. Quick, easy, and convenient. 
                We'll get your vehicle running like new!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                  <Calendar className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-lg font-semibold">Easy Booking</div>
                  <div className="text-sm text-blue-100">Schedule online 24/7</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                  <Clock className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-lg font-semibold">Same Day Service</div>
                  <div className="text-sm text-blue-100">Often available</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-lg font-semibold">Guaranteed Work</div>
                  <div className="text-sm text-blue-100">All repairs warranted</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Appointment Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Book Your Appointment
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Fill out the form below and we'll contact you to confirm your appointment. 
                    For urgent matters, please call us at{' '}
                    <a href="tel:(352) 933-5181" className="text-blue-600 font-semibold">
                      (352) 933-5181
                    </a>
                  </p>
                </div>

                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex items-start">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                          Appointment Request Received!
                        </h3>
                        <p className="text-green-700 dark:text-green-300 mb-3">
                          Thank you for choosing AUTO PRO! We've received your appointment request and will contact you within 24 hours to confirm your appointment time.
                        </p>
                        <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>What's next?</strong> Our team will review your request and call you to confirm the details and provide any additional information you might need.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Name *
                        </label>
                        <input
                          {...register('name', { required: 'Name is required' })}
                          type="text"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            errors.name ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Your full name"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone Number *
                        </label>
                        <input
                          {...register('phone', { required: 'Phone number is required' })}
                          type="tel"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            errors.phone ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="(352) 555-0123"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.phone.message}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Address *
                        </label>
                        <input
                          {...register('email', {
                            required: 'Email is required',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'Please enter a valid email address'
                            }
                          })}
                          type="email"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            errors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="your.email@example.com"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Car className="w-5 h-5 mr-2" />
                      Vehicle Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Year
                        </label>
                        <input
                          {...register('vehicleInfo.year')}
                          type="number"
                          min="1990"
                          max={new Date().getFullYear() + 1}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="2020"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Make
                        </label>
                        <input
                          {...register('vehicleInfo.make')}
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Honda"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model
                        </label>
                        <input
                          {...register('vehicleInfo.model')}
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Civic"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Mileage
                        </label>
                        <input
                          {...register('vehicleInfo.mileage')}
                          type="number"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="50000"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          VIN (optional)
                        </label>
                        <input
                          {...register('vehicleInfo.vin')}
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="1HGBH41JXMN109186"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Wrench className="w-5 h-5 mr-2" />
                      Service Details
                    </h3>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Service Needed *
                        </label>
                        <select
                          {...register('service', { required: 'Please select a service' })}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            errors.service ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select a service</option>
                          <option value="oil-change">Oil Change</option>
                          <option value="brake-service">Brake Service</option>
                          <option value="engine-repair">Engine Repair</option>
                          <option value="transmission">Transmission Service</option>
                          <option value="diagnostics">Diagnostics</option>
                          <option value="tune-up">Tune-Up</option>
                          <option value="tires">Tire Service</option>
                          <option value="battery">Battery Service</option>
                          <option value="ac-service">A/C Service</option>
                          <option value="inspection">State Inspection</option>
                          <option value="other">Other (describe below)</option>
                        </select>
                        {errors.service && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.service.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Preferred Date *
                        </label>
                        <DatePicker
                          selected={selectedDate}
                          onChange={setSelectedDate}
                          filterDate={isWeekday}
                          minDate={minDate}
                          maxDate={maxDate}
                          placeholderText="Select a date"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            !selectedDate && errors.date ? 'border-red-300' : 'border-gray-300'
                          }`}
                          dateFormat="MMMM d, yyyy"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Available Monday through Friday
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Preferred Time *
                        </label>
                        <select
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            !selectedTime && errors.time ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select a time</option>
                          {timeSlots.map(slot => (
                            <option key={slot} value={slot}>
                              {new Date(`2000-01-01T${slot}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Additional Details
                        </label>
                        <textarea
                          {...register('message')}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                          placeholder="Please describe the issue or any specific concerns you have with your vehicle..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <LoadingSpinner size="sm" color="white" />
                      ) : (
                        <>
                          <Calendar className="w-5 h-5 mr-2" />
                          Schedule Appointment
                        </>
                      )}
                    </button>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
                      By submitting this form, you agree to be contacted by AUTO PRO regarding your appointment.
                    </p>
                  </div>
                </form>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Contact Info */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Need Immediate Help?
                </h3>
                
                <div className="space-y-4">
                  <a
                    href="tel:(352) 933-5181"
                    className="flex items-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors group"
                  >
                    <Phone className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
                    <div>
                      <div className="font-semibold text-red-800 dark:text-red-200">
                        Emergency Service
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-400">
                        (352) 933-5181
                      </div>
                    </div>
                  </a>

                  <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <MapPin className="w-6 h-6 text-gray-600 dark:text-gray-400 mr-3" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Visit Our Shop
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        806 Hood Ave, Leesburg, FL
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400 mr-3" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Business Hours
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Mon-Fri: 8AM-6PM<br />
                        Sat: 9AM-4PM
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Why Choose Us */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Why Choose AUTO PRO?
                </h3>
                
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <benefit.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {benefit.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Emergency Services */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg p-6"
              >
                <h3 className="text-xl font-bold mb-4">
                  24/7 Emergency Services
                </h3>
                
                <ul className="space-y-2 text-sm">
                  {emergencyServices.map((service, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-red-200" />
                      {service}
                    </li>
                  ))}
                </ul>
                
                <a
                  href="tel:(352) 933-5181"
                  className="mt-4 block bg-white text-red-600 text-center py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Call Emergency Line
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Appointments;