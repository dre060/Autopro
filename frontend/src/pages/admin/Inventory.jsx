// frontend/src/pages/admin/Inventory.jsx
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  CheckSquare,
  Square,
  Star,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Camera,
  DollarSign,
  Calendar,
  Gauge,
  Car,
  Grid3X3,
  List,
  MoreVertical,
  Copy,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

import { vehicleService } from '../../services/vehicleService';
import { formatCurrency, formatMileage, formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { VEHICLE_MAKES, BODY_TYPES, FUEL_TYPES, TRANSMISSION_TYPES, CONDITION_TYPES, VEHICLE_STATUSES } from '../../utils/constants';

const AdminInventory = () => {
  const [view, setView] = useState('grid');
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    make: '',
    bodyType: '',
    condition: '',
    featured: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');

  const queryClient = useQueryClient();

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit: 20,
    ...Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => value !== '')
    )
  };

  // Add sorting
  switch (sortBy) {
    case 'price-low':
      queryParams.sortBy = 'price';
      queryParams.sortOrder = 'asc';
      break;
    case 'price-high':
      queryParams.sortBy = 'price';
      queryParams.sortOrder = 'desc';
      break;
    case 'mileage-low':
      queryParams.sortBy = 'mileage';
      queryParams.sortOrder = 'asc';
      break;
    case 'year-new':
      queryParams.sortBy = 'year';
      queryParams.sortOrder = 'desc';
      break;
    default:
      queryParams.sortBy = 'createdAt';
      queryParams.sortOrder = 'desc';
  }

  // Fetch vehicles
  const { data: vehicleData, isLoading, error } = useQuery(
    ['adminVehicles', queryParams],
    () => vehicleService.getVehicles(queryParams),
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000
    }
  );

  const vehicles = vehicleData?.vehicles || [];
  const totalPages = vehicleData?.totalPages || 1;
  const total = vehicleData?.total || 0;

  // Form for add/edit vehicle
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  // Mutations
  const createVehicleMutation = useMutation(vehicleService.create, {
    onSuccess: () => {
      toast.success('Vehicle added successfully!');
      queryClient.invalidateQueries('adminVehicles');
      setShowAddModal(false);
      reset();
    },
    onError: (error) => {
      toast.error('Failed to add vehicle: ' + error.message);
    }
  });

  const updateVehicleMutation = useMutation(
    ({ id, data }) => vehicleService.update(id, data),
    {
      onSuccess: () => {
        toast.success('Vehicle updated successfully!');
        queryClient.invalidateQueries('adminVehicles');
        setEditingVehicle(null);
        reset();
      },
      onError: (error) => {
        toast.error('Failed to update vehicle: ' + error.message);
      }
    }
  );

  const deleteVehicleMutation = useMutation(vehicleService.delete, {
    onSuccess: () => {
      toast.success('Vehicle deleted successfully!');
      queryClient.invalidateQueries('adminVehicles');
    },
    onError: (error) => {
      toast.error('Failed to delete vehicle: ' + error.message);
    }
  });

  // Handle vehicle selection
  const handleSelectVehicle = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedVehicles.length === vehicles.length) {
      setSelectedVehicles([]);
    } else {
      setSelectedVehicles(vehicles.map(v => v._id));
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedVehicles.length === 0) return;

    try {
      switch (bulkAction) {
        case 'feature':
          await vehicleService.bulkUpdate(
            selectedVehicles.map(id => ({ id, featured: true }))
          );
          toast.success(`${selectedVehicles.length} vehicles featured`);
          break;
        case 'unfeature':
          await vehicleService.bulkUpdate(
            selectedVehicles.map(id => ({ id, featured: false }))
          );
          toast.success(`${selectedVehicles.length} vehicles unfeatured`);
          break;
        case 'available':
          await vehicleService.bulkUpdate(
            selectedVehicles.map(id => ({ id, status: 'available' }))
          );
          toast.success(`${selectedVehicles.length} vehicles marked as available`);
          break;
        case 'sold':
          await vehicleService.bulkUpdate(
            selectedVehicles.map(id => ({ id, status: 'sold' }))
          );
          toast.success(`${selectedVehicles.length} vehicles marked as sold`);
          break;
        default:
          break;
      }
      
      queryClient.invalidateQueries('adminVehicles');
      setSelectedVehicles([]);
      setBulkAction('');
    } catch (error) {
      toast.error('Bulk action failed: ' + error.message);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      if (editingVehicle) {
        updateVehicleMutation.mutate({ id: editingVehicle._id, data });
      } else {
        createVehicleMutation.mutate(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Handle edit
  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    // Populate form with vehicle data
    Object.keys(vehicle).forEach(key => {
      setValue(key, vehicle[key]);
    });
    setShowAddModal(true);
  };

  // Handle delete
  const handleDelete = async (vehicleId) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      deleteVehicleMutation.mutate(vehicleId);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Inventory Management | AUTO PRO Admin</title>
        <meta name="description" content="Manage vehicle inventory, add new vehicles, and update vehicle information." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Inventory Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {total} vehicles • {selectedVehicles.length} selected
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setEditingVehicle(null);
                    reset();
                    setShowAddModal(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vehicle
                </button>
                
                <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </button>
                
                <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Controls */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6 mb-6">
              {/* Search */}
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="mileage-low">Lowest Mileage</option>
                  <option value="year-new">Newest Year</option>
                </select>

                <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-2 rounded ${
                      view === 'grid'
                        ? 'bg-white dark:bg-gray-600 shadow'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-2 rounded ${
                      view === 'list'
                        ? 'bg-white dark:bg-gray-600 shadow'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                {VEHICLE_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select
                value={filters.make}
                onChange={(e) => setFilters(prev => ({ ...prev, make: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Makes</option>
                {VEHICLE_MAKES.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>

              <select
                value={filters.bodyType}
                onChange={(e) => setFilters(prev => ({ ...prev, bodyType: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Body Types</option>
                {BODY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={filters.condition}
                onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Conditions</option>
                {CONDITION_TYPES.map(condition => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>

              <select
                value={filters.featured}
                onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Featured Status</option>
                <option value="true">Featured</option>
                <option value="false">Not Featured</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedVehicles.length > 0 && (
              <div className="flex items-center space-x-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="text-blue-800 dark:text-blue-200 font-medium">
                  {selectedVehicles.length} vehicles selected
                </span>
                
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="border border-blue-300 dark:border-blue-600 rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose action...</option>
                  <option value="feature">Mark as Featured</option>
                  <option value="unfeature">Remove Featured</option>
                  <option value="available">Mark Available</option>
                  <option value="sold">Mark Sold</option>
                </select>
                
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
                
                <button
                  onClick={() => setSelectedVehicles([])}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading vehicles..." />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Failed to load vehicles
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please try refreshing the page.
              </p>
            </div>
          )}

          {/* Vehicles Grid/List */}
          {!isLoading && !error && vehicles.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {view === 'grid' ? (
                // Grid View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {vehicles.map((vehicle) => (
                    <motion.div
                      key={vehicle._id}
                      variants={fadeInUp}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      {/* Selection checkbox */}
                      <div className="absolute top-4 left-4 z-10">
                        <button
                          onClick={() => handleSelectVehicle(vehicle._id)}
                          className={`p-1 rounded ${
                            selectedVehicles.includes(vehicle._id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/80 text-gray-600 hover:bg-white'
                          }`}
                        >
                          {selectedVehicles.includes(vehicle._id) ? 
                            <CheckSquare className="w-4 h-4" /> : 
                            <Square className="w-4 h-4" />
                          }
                        </button>
                      </div>

                      {/* Status badges */}
                      <div className="absolute top-4 right-4 z-10 space-y-2">
                        {vehicle.featured && (
                          <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          vehicle.status === 'available' 
                            ? 'bg-green-500 text-white'
                            : vehicle.status === 'sold'
                            ? 'bg-red-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {vehicle.status}
                        </span>
                      </div>

                      {/* Image */}
                      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
                        <img
                          src={vehicle.images?.[0] || '/images/placeholder-car.jpg'}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {vehicle.images?.length || 0} photos
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 line-clamp-1">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                          {formatCurrency(vehicle.price)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div>{formatMileage(vehicle.mileage)}</div>
                          <div>{vehicle.bodyType}</div>
                          <div>{vehicle.fuelType}</div>
                          <div>{vehicle.transmission}</div>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          Added {formatDate(vehicle.createdAt)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => window.open(`/vehicles/${vehicle._id}`, '_blank')}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                          
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          
                          <button
                            onClick={() => handleDelete(vehicle._id)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <button
                              onClick={handleSelectAll}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                              {selectedVehicles.length === vehicles.length ? 
                                <CheckSquare className="w-4 h-4" /> : 
                                <Square className="w-4 h-4" />
                              }
                            </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Vehicle
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Mileage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Added
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {vehicles.map((vehicle) => (
                          <tr key={vehicle._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleSelectVehicle(vehicle._id)}
                                className={`text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${
                                  selectedVehicles.includes(vehicle._id) ? 'text-blue-600' : ''
                                }`}
                              >
                                {selectedVehicles.includes(vehicle._id) ? 
                                  <CheckSquare className="w-4 h-4" /> : 
                                  <Square className="w-4 h-4" />
                                }
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <img
                                  className="w-12 h-12 rounded-lg object-cover mr-4"
                                  src={vehicle.images?.[0] || '/images/placeholder-car.jpg'}
                                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {vehicle.bodyType} • {vehicle.fuelType}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(vehicle.price)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatMileage(vehicle.mileage)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  vehicle.status === 'available' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : vehicle.status === 'sold'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                  {vehicle.status}
                                </span>
                                {vehicle.featured && (
                                  <Star className="w-4 h-4 text-yellow-500" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(vehicle.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => window.open(`/vehicles/${vehicle._id}`, '_blank')}
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(vehicle)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(vehicle._id)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !error && vehicles.length === 0 && (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No vehicles found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get started by adding your first vehicle to the inventory.
              </p>
              <button
                onClick={() => {
                  setEditingVehicle(null);
                  reset();
                  setShowAddModal(true);
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Vehicle
              </button>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && vehicles.length > 0 && totalPages > 1 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="mt-8 flex justify-center"
            >
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </motion.div>
          )}
        </div>

        {/* Add/Edit Vehicle Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Year *
                        </label>
                        <input
                          {...register('year', { required: 'Year is required' })}
                          type="number"
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.year && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.year.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Make *
                        </label>
                        <select
                          {...register('make', { required: 'Make is required' })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select Make</option>
                          {VEHICLE_MAKES.map(make => (
                            <option key={make} value={make}>{make}</option>
                          ))}
                        </select>
                        {errors.make && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.make.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model *
                        </label>
                        <input
                          {...register('model', { required: 'Model is required' })}
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.model && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.model.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Pricing & Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Price *
                        </label>
                        <input
                          {...register('price', { required: 'Price is required' })}
                          type="number"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.price && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.price.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Status *
                        </label>
                        <select
                          {...register('status', { required: 'Status is required' })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          {VEHICLE_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        {errors.status && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.status.message}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            {...register('featured')}
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Featured Vehicle
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createVehicleMutation.isLoading || updateVehicleMutation.isLoading}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                    >
                      {(createVehicleMutation.isLoading || updateVehicleMutation.isLoading) ? (
                        <LoadingSpinner size="sm" color="white" />
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AdminInventory;