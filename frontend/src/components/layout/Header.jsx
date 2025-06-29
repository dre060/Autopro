// frontend/src/components/layout/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Menu,
  X,
  Phone,
  MapPin,
  Clock,
  User,
  LogOut,
  Settings,
  Car,
  Wrench,
  Calendar,
  Star,
  Mail,
  ChevronDown,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const { theme, setTheme, isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsServicesOpen(false);
  }, [location]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu') && !event.target.closest('.user-menu-button')) {
        setIsUserMenuOpen(false);
      }
      if (!event.target.closest('.services-menu') && !event.target.closest('.services-menu-button')) {
        setIsServicesOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    auto: Monitor
  };

  const ThemeIcon = themeIcons[theme];

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { 
      to: '/services', 
      label: 'Services',
      hasDropdown: true,
      dropdownItems: [
        { to: '/services/engine-repair', label: 'Engine Repair', icon: Wrench },
        { to: '/services/brake-service', label: 'Brake Service', icon: Wrench },
        { to: '/services/oil-change', label: 'Oil Change', icon: Wrench },
        { to: '/services/diagnostics', label: 'Diagnostics', icon: Wrench },
        { to: '/services/towing', label: 'Towing', icon: Car },
      ]
    },
    { to: '/inventory', label: 'Inventory' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/testimonials', label: 'Testimonials' },
    { to: '/contact', label: 'Contact' }
  ];

  const isActivePath = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gray-900 text-white py-2 text-sm hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>(352) 933-5181</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>806 Hood Ave, Leesburg, FL</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Mon-Fri: 8AM-6PM, Sat: 9AM-4PM</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Theme Switcher */}
            <button
              onClick={() => {
                const themes = ['light', 'dark', 'auto'];
                const currentIndex = themes.indexOf(theme);
                const nextTheme = themes[(currentIndex + 1) % themes.length];
                setTheme(nextTheme);
              }}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
              title={`Current theme: ${theme}`}
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
            
            {!isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="hover:text-blue-400 transition-colors">
                  Login
                </Link>
                <span>|</span>
                <Link to="/register" className="hover:text-blue-400 transition-colors">
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Welcome, {user?.firstName}!</span>
                {isAdmin() && (
                  <Link to="/admin" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg' 
          : 'bg-white'
      } ${isDarkMode() ? 'dark:bg-gray-900/95' : ''}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-2 rounded-lg group-hover:scale-105 transition-transform">
                <Car className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  AUTO PRO
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 hidden lg:block">
                  Repairs & Sales
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navLinks.map((link) => (
                <div key={link.to} className="relative">
                  {link.hasDropdown ? (
                    <div className="services-menu">
                      <button
                        className={`services-menu-button flex items-center space-x-1 py-2 px-3 rounded-md transition-all duration-200 ${
                          isActivePath(link.to)
                            ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onMouseEnter={() => setIsServicesOpen(true)}
                        onMouseLeave={() => setIsServicesOpen(false)}
                      >
                        <span>{link.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Services Dropdown */}
                      <AnimatePresence>
                        {isServicesOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2"
                            onMouseEnter={() => setIsServicesOpen(true)}
                            onMouseLeave={() => setIsServicesOpen(false)}
                          >
                            <Link
                              to="/services"
                              className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Wrench className="w-4 h-4 mr-3" />
                              All Services
                            </Link>
                            <hr className="my-2 border-gray-200 dark:border-gray-700" />
                            {link.dropdownItems?.map((item) => (
                              <Link
                                key={item.to}
                                to={item.to}
                                className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <item.icon className="w-4 h-4 mr-3" />
                                {item.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      to={link.to}
                      className={`py-2 px-3 rounded-md transition-all duration-200 ${
                        isActivePath(link.to)
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* User Menu & Mobile Menu Button */}
            <div className="flex items-center space-x-4">
              {/* User Menu */}
              {isAuthenticated && (
                <div className="relative user-menu hidden lg:block">
                  <button
                    className="user-menu-button flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{user?.firstName}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown */}
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2"
                      >
                        <Link
                          to={isAdmin() ? "/admin" : "/customer"}
                          className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Dashboard
                        </Link>
                        <Link
                          to="/customer/profile"
                          className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <User className="w-4 h-4 mr-3" />
                          Profile
                        </Link>
                        <Link
                          to="/customer/appointments"
                          className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Calendar className="w-4 h-4 mr-3" />
                          My Appointments
                        </Link>
                        <hr className="my-2 border-gray-200 dark:border-gray-700" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Emergency Button */}
              <Link
                to="/appointments"
                className="hidden lg:flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                Emergency
              </Link>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
            >
              <nav className="px-4 py-4 space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      isActivePath(link.to)
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Mobile User Menu */}
                {isAuthenticated ? (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="flex items-center space-x-3 px-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">
                        {user?.firstName} {user?.lastName}
                      </span>
                    </div>
                    <Link
                      to={isAdmin() ? "/admin" : "/customer"}
                      className="block py-2 px-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/customer/profile"
                      className="block py-2 px-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left py-2 px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <Link
                      to="/login"
                      className="block py-2 px-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="block py-2 px-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                    >
                      Register
                    </Link>
                  </div>
                )}
                
                {/* Emergency Button Mobile */}
                <Link
                  to="/appointments"
                  className="block w-full py-3 px-4 bg-red-600 text-white text-center rounded-md hover:bg-red-700 transition-colors"
                >
                  Emergency Service
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Header;