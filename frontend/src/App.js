// frontend/src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import LoadingSpinner from './components/common/LoadingSpinner';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Inventory from './pages/Inventory';
import VehicleDetail from './pages/VehicleDetail';
import Contact from './pages/Contact';
import Appointments from './pages/Appointments';
import Testimonials from './pages/Testimonials';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Protected Customer Pages
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerAppointments from './pages/customer/Appointments';
import CustomerProfile from './pages/customer/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminInventory from './pages/admin/Inventory';
import AdminAppointments from './pages/admin/Appointments';
import AdminTestimonials from './pages/admin/Testimonials';
import AdminServices from './pages/admin/Services';
import AdminUsers from './pages/admin/Users';
import AdminAnalytics from './pages/admin/Analytics';

// Utility Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import NotFound from './pages/NotFound';

// Styles
import './styles/global.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <div className="flex flex-col min-h-screen bg-gray-50">
                <ScrollToTop />
                <Header />
                
                <main className="flex-grow">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/services/:slug" element={<ServiceDetail />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/vehicles/:id" element={<VehicleDetail />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/testimonials" element={<Testimonials />} />
                    
                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    
                    {/* Customer Protected Routes */}
                    <Route path="/customer" element={
                      <ProtectedRoute>
                        <CustomerDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/customer/appointments" element={
                      <ProtectedRoute>
                        <CustomerAppointments />
                      </ProtectedRoute>
                    } />
                    <Route path="/customer/profile" element={
                      <ProtectedRoute>
                        <CustomerProfile />
                      </ProtectedRoute>
                    } />
                    
                    {/* Admin Protected Routes */}
                    <Route path="/admin" element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    } />
                    <Route path="/admin/inventory" element={
                      <AdminRoute>
                        <AdminInventory />
                      </AdminRoute>
                    } />
                    <Route path="/admin/appointments" element={
                      <AdminRoute>
                        <AdminAppointments />
                      </AdminRoute>
                    } />
                    <Route path="/admin/testimonials" element={
                      <AdminRoute>
                        <AdminTestimonials />
                      </AdminRoute>
                    } />
                    <Route path="/admin/services" element={
                      <AdminRoute>
                        <AdminServices />
                      </AdminRoute>
                    } />
                    <Route path="/admin/users" element={
                      <AdminRoute>
                        <AdminUsers />
                      </AdminRoute>
                    } />
                    <Route path="/admin/analytics" element={
                      <AdminRoute>
                        <AdminAnalytics />
                      </AdminRoute>
                    } />
                    
                    {/* Redirects */}
                    <Route path="/dashboard" element={<Navigate to="/customer" replace />} />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                
                <Footer />
                
                {/* Global Components */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#1f2937',
                      color: '#ffffff',
                    },
                  }}
                />
              </div>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;