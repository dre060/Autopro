// frontend/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Helmet } from 'react-helmet-async';
import { 
  Phone, 
  MapPin, 
  Clock, 
  Star, 
  CheckCircle, 
  Wrench, 
  Car, 
  Shield, 
  Award, 
  Users, 
  ArrowRight,
  Calendar,
  DollarSign,
  Zap,
  Heart,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';

// Components
import VehicleCard from '../components/inventory/VehicleCard';
import ServiceCard from '../components/services/ServiceCard';
import TestimonialCard from '../components/testimonials/TestimonialCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Hooks
import { useQuery } from 'react-query';
import { vehicleService } from '../services/vehicleService';
import { serviceService } from '../services/serviceService';
import { testimonialService } from '../services/testimonialService';

const Home = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Queries
  const { data: featuredVehicles, isLoading: vehiclesLoading } = useQuery(
    'featuredVehicles',
    () => vehicleService.getFeatured(6),
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: services, isLoading: servicesLoading } = useQuery(
    'featuredServices',
    () => serviceService.getFeatured(),
    { staleTime: 10 * 60 * 1000 }
  );

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery(
    'testimonials',
    () => testimonialService.getApproved(),
    { staleTime: 10 * 60 * 1000 }
  );

  // Intersection Observer refs
  const [heroRef, heroInView] = useInView({ threshold: 0.2, triggerOnce: true });
  const [statsRef, statsInView] = useInView({ threshold: 0.3, triggerOnce: true });
  const [servicesRef, servicesInView] = useInView({ threshold: 0.2, triggerOnce: true });
  const [inventoryRef, inventoryInView] = useInView({ threshold: 0.2, triggerOnce: true });
  const [testimonialsRef, testimonialsInView] = useInView({ threshold: 0.2, triggerOnce: true });

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials && testimonials.length > 1) {
      const interval = setInterval(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [testimonials]);

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
  };

  const stats = [
    { label: "Years of Experience", value: "25+", icon: Award },
    { label: "Vehicles Sold", value: "5,000+", icon: Car },
    { label: "Happy Customers", value: "10,000+", icon: Users },
    { label: "Average Rating", value: "4.9", icon: Star }
  ];

  const whyChooseUs = [
    {
      icon: Shield,
      title: "Honest & Transparent",
      description: "No hidden fees or surprise charges. We believe in upfront, honest pricing.",
      color: "blue"
    },
    {
      icon: Award,
      title: "Certified Technicians",
      description: "ASE-certified mechanics with decades of combined experience.",
      color: "green"
    },
    {
      icon: Zap,
      title: "Fast Service",
      description: "Quick turnaround times without compromising on quality.",
      color: "yellow"
    },
    {
      icon: DollarSign,
      title: "Competitive Pricing",
      description: "Fair prices that won't break the bank. Quality service at affordable rates.",
      color: "purple"
    },
    {
      icon: Heart,
      title: "Family Owned",
      description: "Local, family-owned business that cares about our community.",
      color: "red"
    },
    {
      icon: ThumbsUp,
      title: "Satisfaction Guaranteed",
      description: "We stand behind our work with comprehensive warranties.",
      color: "indigo"
    }
  ];

  return (
    <>
      <Helmet>
        <title>AUTO PRO Repairs & Sales | Trusted Auto Service in Leesburg, FL</title>
        <meta name="description" content="AUTO PRO is Leesburg's premier auto repair shop and used car dealership. Honest service, certified technicians, and quality vehicles since 1999." />
        <meta name="keywords" content="auto repair, car repair, used cars, Leesburg FL, brake service, oil change, engine repair, vehicle sales" />
        <link rel="canonical" href="https://autopro-leesburg.com" />
      </Helmet>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white overflow-hidden"
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: `url('/images/hero-background.jpg')`,
          }}
        />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-30"
              animate={{
                x: [0, 100, 0],
                y: [0, -100, 0],
              }}
              transition={{
                duration: 10 + i,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent"
            >
              Your Trusted Auto Partner
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              Professional auto repairs, quality used vehicles, and honest service in the heart of Leesburg, FL. 
              <span className="text-blue-400 font-semibold"> Honesty is our Policy.</span>
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            >
              <Link
                to="/appointments"
                className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book Service
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                to="/inventory"
                className="group border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center"
              >
                <Car className="w-5 h-5 mr-2" />
                View Inventory
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Contact Info Cards */}
            <motion.div 
              variants={fadeInUp}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <Phone className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="font-semibold">(352) 933-5181</p>
                <p className="text-sm text-gray-300">24/7 Emergency</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <MapPin className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="font-semibold">806 Hood Ave</p>
                <p className="text-sm text-gray-300">Leesburg, FL</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="font-semibold">Mon-Fri: 8AM-6PM</p>
                <p className="text-sm text-gray-300">Sat: 9AM-4PM</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate={statsInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className="text-center group"
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate={statsInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Why Choose AUTO PRO?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              We're not just another repair shop. We're your trusted automotive partner, 
              committed to keeping you and your family safe on the road.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={statsInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {whyChooseUs.map((item, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-2"
              >
                <div className={`bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section ref={servicesRef} className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate={servicesInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              From routine maintenance to complex repairs, we've got you covered with comprehensive automotive services.
            </p>
            <Link
              to="/services"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg group"
            >
              View All Services
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {servicesLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate={servicesInView ? "visible" : "hidden"}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {services?.slice(0, 6).map((service, index) => (
                <motion.div key={service.id} variants={scaleIn}>
                  <ServiceCard service={service} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Featured Inventory Section */}
      <section ref={inventoryRef} className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate={inventoryInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Quality Vehicles for Sale
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              Discover our hand-picked selection of reliable, inspected used vehicles. Each car comes with our integrity guarantee.
            </p>
            <Link
              to="/inventory"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg group"
            >
              Browse All Vehicles
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {vehiclesLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate={inventoryInView ? "visible" : "hidden"}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {featuredVehicles?.vehicles?.slice(0, 6).map((vehicle, index) => (
                <motion.div key={vehicle._id} variants={scaleIn}>
                  <VehicleCard vehicle={vehicle} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate={testimonialsInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Don't just take our word for it. Here's what our satisfied customers have to say about their experience with AUTO PRO.
            </p>
          </motion.div>

          {testimonialsLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : testimonials && testimonials.length > 0 ? (
            <motion.div
              initial="hidden"
              animate={testimonialsInView ? "visible" : "hidden"}
              variants={fadeInUp}
              className="max-w-4xl mx-auto"
            >
              <TestimonialCard 
                testimonial={testimonials[currentTestimonial]} 
                className="mb-8"
              />
              
              {/* Testimonial Navigation */}
              <div className="flex justify-center space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentTestimonial 
                        ? 'bg-blue-600 scale-125' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              {/* View All Testimonials Link */}
              <div className="text-center mt-8">
                <Link
                  to="/testimonials"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg group"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Read All Reviews
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No testimonials available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            animate={testimonialsInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Ready to Experience the AUTO PRO Difference?
            </h2>
            <p className="text-xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Join thousands of satisfied customers who trust AUTO PRO for their automotive needs. 
              Schedule your service today or browse our quality vehicle inventory.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/appointments"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Schedule Service
              </Link>
              
              <Link
                to="/contact"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 flex items-center"
              >
                <Phone className="w-5 h-5 mr-2" />
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Home;