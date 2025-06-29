// frontend/src/components/layout/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Car,
  Phone,
  Mail,
  MapPin,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Star,
  Shield,
  Award,
  Heart,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

const Footer = () => {
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

  const quickLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About Us' },
    { to: '/services', label: 'Services' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/testimonials', label: 'Reviews' },
    { to: '/contact', label: 'Contact' }
  ];

  const services = [
    { to: '/services/engine-repair', label: 'Engine Repair' },
    { to: '/services/brake-service', label: 'Brake Service' },
    { to: '/services/oil-change', label: 'Oil Changes' },
    { to: '/services/diagnostics', label: 'Diagnostics' },
    { to: '/services/towing', label: 'Towing' },
    { to: '/services/maintenance', label: 'Maintenance' }
  ];

  const vehicleTypes = [
    { to: '/inventory?bodyType=Sedan', label: 'Sedans' },
    { to: '/inventory?bodyType=SUV', label: 'SUVs' },
    { to: '/inventory?bodyType=Truck', label: 'Trucks' },
    { to: '/inventory?bodyType=Coupe', label: 'Coupes' },
    { to: '/inventory?bodyType=Hatchback', label: 'Hatchbacks' },
    { to: '/inventory?condition=Excellent', label: 'Premium Cars' }
  ];

  const socialLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: 'https://facebook.com/autoproleesburg',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Instagram',
      icon: Instagram,
      url: 'https://instagram.com/autoproleesburg',
      color: 'bg-pink-600 hover:bg-pink-700'
    },
    {
      name: 'Twitter',
      icon: Twitter,
      url: 'https://twitter.com/autoproleesburg',
      color: 'bg-blue-400 hover:bg-blue-500'
    },
    {
      name: 'YouTube',
      icon: Youtube,
      url: 'https://youtube.com/autoproleesburg',
      color: 'bg-red-600 hover:bg-red-700'
    }
  ];

  const certifications = [
    { name: 'ASE Certified', icon: Award },
    { name: 'BBB Accredited', icon: Shield },
    { name: '25+ Years Experience', icon: Star },
    { name: 'Family Owned', icon: Heart }
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center max-w-4xl mx-auto"
          >
            <h3 className="text-3xl font-bold mb-4">
              Stay Updated with AUTO PRO
            </h3>
            <p className="text-xl text-blue-100 mb-8">
              Get the latest news, service tips, and exclusive offers delivered to your inbox.
            </p>
            
            <div className="flex flex-col sm:flex-row max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 rounded-l-lg sm:rounded-r-none text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button className="bg-white text-blue-600 px-6 py-3 rounded-r-lg sm:rounded-l-none font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center">
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
            
            <p className="text-sm text-blue-200 mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {/* Company Info */}
            <motion.div variants={fadeInUp} className="lg:col-span-1">
              <div className="mb-6">
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-lg group-hover:scale-105 transition-transform">
                    <Car className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">AUTO PRO</h3>
                    <p className="text-gray-400 text-sm">Repairs & Sales</p>
                  </div>
                </Link>
              </div>
              
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your trusted automotive partner in Leesburg, FL. We provide honest, 
                reliable service for all your car repair and vehicle purchase needs.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center text-gray-400">
                  <Phone className="w-5 h-5 mr-3 text-blue-400" />
                  <a href="tel:(352) 933-5181" className="hover:text-white transition-colors">
                    (352) 933-5181
                  </a>
                </div>
                
                <div className="flex items-center text-gray-400">
                  <Mail className="w-5 h-5 mr-3 text-blue-400" />
                  <a href="mailto:info@autopro-leesburg.com" className="hover:text-white transition-colors">
                    info@autopro-leesburg.com
                  </a>
                </div>
                
                <div className="flex items-start text-gray-400">
                  <MapPin className="w-5 h-5 mr-3 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p>806 Hood Ave</p>
                    <p>Leesburg, FL 34748</p>
                  </div>
                </div>
                
                <div className="flex items-start text-gray-400">
                  <Clock className="w-5 h-5 mr-3 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p>Mon-Fri: 8AM-6PM</p>
                    <p>Sat: 9AM-4PM</p>
                    <p>Sun: Closed</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div variants={fadeInUp}>
              <h4 className="text-xl font-bold mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.to}
                      className="text-gray-400 hover:text-white transition-colors flex items-center group"
                    >
                      <ArrowRight className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Services */}
            <motion.div variants={fadeInUp}>
              <h4 className="text-xl font-bold mb-6">Our Services</h4>
              <ul className="space-y-3">
                {services.map((service, index) => (
                  <li key={index}>
                    <Link
                      to={service.to}
                      className="text-gray-400 hover:text-white transition-colors flex items-center group"
                    >
                      <ArrowRight className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {service.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Vehicle Types */}
            <motion.div variants={fadeInUp}>
              <h4 className="text-xl font-bold mb-6">Vehicle Types</h4>
              <ul className="space-y-3">
                {vehicleTypes.map((type, index) => (
                  <li key={index}>
                    <Link
                      to={type.to}
                      className="text-gray-400 hover:text-white transition-colors flex items-center group"
                    >
                      <ArrowRight className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {type.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Certifications */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="mt-12 pt-8 border-t border-gray-800"
          >
            <h4 className="text-xl font-bold mb-6 text-center">
              Trusted & Certified
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {certifications.map((cert, index) => (
                <div key={index} className="text-center group">
                  <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-600 transition-colors">
                    <cert.icon className="w-8 h-8 text-blue-400 group-hover:text-white" />
                  </div>
                  <p className="text-gray-400 text-sm group-hover:text-white transition-colors">
                    {cert.name}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Social Media */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="mt-12 pt-8 border-t border-gray-800"
          >
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <h4 className="text-xl font-bold mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${social.color} p-3 rounded-lg transition-colors transform hover:scale-105 duration-200`}
                      title={social.name}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="text-center md:text-right">
                <p className="text-gray-400 mb-2">Need Emergency Service?</p>
                <a
                  href="tel:(352) 933-5181"
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors inline-flex items-center"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now: (352) 933-5181
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 py-6">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm"
          >
            <div className="mb-4 md:mb-0">
              <p>
                &copy; {currentYear} AUTO PRO REPAIRS SALES & SERVICES LLC. All rights reserved.
              </p>
              <p className="mt-1">
                <span className="text-blue-400 font-semibold">Honesty is our Policy.</span>
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-end space-x-6">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/warranty" className="hover:text-white transition-colors">
                Warranty Info
              </Link>
              <Link to="/sitemap" className="hover:text-white transition-colors">
                Sitemap
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="tel:(352) 933-5181"
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-110 flex items-center justify-center group"
          title="Call for Emergency Service"
        >
          <Phone className="w-6 h-6" />
          <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Emergency Service
          </span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;