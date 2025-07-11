// frontend/src/app/admin/vehicles/page.js
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminVehicles() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Style fix for input visibility
  const inputStyle = {
    color: '#000000',
    backgroundColor: '#ffffff',
    WebkitTextFillColor: '#000000'
  };

  const textareaStyle = {
    color: '#000000',
    backgroundColor: '#ffffff',
    WebkitTextFillColor: '#000000',
    resize: 'none'
  };

  const selectStyle = {
    color: '#000000',
    backgroundColor: '#ffffff',
    WebkitTextFillColor: '#000000',
    cursor: 'pointer'
  };

  // Initialize form with empty strings
  const getInitialFormData = () => ({
    year: "",
    make: "",
    model: "",
    trim: "",
    vin: "",
    price: "",
    salePrice: "",
    mileage: "",
    bodyType: "",
    exteriorColor: "",
    interiorColor: "",
    fuelType: "",
    transmission: "",
    drivetrain: "",
    engine: "",
    features: "",
    financingAvailable: true,
    monthlyPayment: "",
    stockNumber: "",
    status: "available",
    condition: "Used",
    description: "",
    carfaxAvailable: false,
    carfaxUrl: "",
    featured: false
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // Check authentication and mount status
  useEffect(() => {
    setMounted(true);
    
    const authStatus = localStorage.getItem("adminAuthenticated");
    const authTime = localStorage.getItem("adminAuthTime");
    
    if (!authStatus || !authTime || Date.now() - parseInt(authTime) > 24 * 60 * 60 * 1000) {
      router.push("/admin/login");
    } else {
      fetchVehicles();
    }
  }, [router]);

  // Add global style fix on mount
  useEffect(() => {
    if (mounted) {
      const style = document.createElement('style');
      style.textContent = `
        input, textarea, select {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        input::placeholder, textarea::placeholder {
          color: #999999 !important;
          -webkit-text-fill-color: #999999 !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [mounted]);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      } else {
        setError("Failed to fetch vehicles");
        setVehicles([]);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError("Error loading vehicles");
      setVehicles([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear any errors when user starts typing
    if (error) setError("");
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);

    // Clean up previous previews
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));

    // Create new preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const validateForm = () => {
    const requiredFields = ['year', 'make', 'model', 'price', 'mileage', 'bodyType', 'exteriorColor', 'fuelType', 'transmission'];
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in the ${field.charAt(0).toUpperCase() + field.slice(1)} field`);
        return false;
      }
    }
    
    if (!editingVehicle && imageFiles.length === 0) {
      setError("Please upload at least one vehicle image");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== "" && formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key].toString());
        }
      });

      // Append images
      imageFiles.forEach(file => {
        formDataToSend.append('images', file);
      });

      const url = editingVehicle 
        ? `/api/vehicles/${editingVehicle._id}`
        : '/api/vehicles';
      
      const method = editingVehicle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      if (response.ok) {
        setSuccess(editingVehicle ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');
        resetForm();
        fetchVehicles();
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save vehicle. Please try again.');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setError('Error saving vehicle. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setImageFiles([]);
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    setImagePreviews([]);
    setEditingVehicle(null);
    setShowForm(false);
    setError("");
  };

  const handleEdit = (vehicle) => {
    const features = Array.isArray(vehicle.features) ? vehicle.features.join(', ') : '';
    setFormData({
      ...vehicle,
      features,
      salePrice: vehicle.salePrice || "",
      monthlyPayment: vehicle.monthlyPayment || "",
      carfaxUrl: vehicle.carfaxUrl || "",
      description: vehicle.description || "",
      trim: vehicle.trim || "",
      vin: vehicle.vin || "",
      interiorColor: vehicle.interiorColor || "",
      drivetrain: vehicle.drivetrain || "",
      engine: vehicle.engine || "",
    });
    setEditingVehicle(vehicle);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Vehicle deleted successfully!');
        fetchVehicles();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError('Error deleting vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError('Error deleting vehicle. Please try again.');
    }
  };

  const toggleFeatured = async (id) => {
    try {
      const response = await fetch(`/api/vehicles/${id}/featured`, {
        method: 'PATCH'
      });

      if (response.ok) {
        fetchVehicles();
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("adminAuthTime");
    router.push("/admin/login");
  };

  // Don't render until mounted to prevent hydration errors
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Vehicle Management</h1>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                {showForm ? 'Cancel' : 'Add New Vehicle'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Success/Error Messages */}
      {success && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        </div>
      )}
      
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                      Year *
                    </label>
                    <input
                      id="year"
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      required
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
                      Make *
                    </label>
                    <input
                      id="make"
                      type="text"
                      name="make"
                      value={formData.make}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                      Model *
                    </label>
                    <input
                      id="model"
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="trim" className="block text-sm font-medium text-gray-700 mb-1">
                      Trim
                    </label>
                    <input
                      id="trim"
                      type="text"
                      name="trim"
                      value={formData.trim}
                      onChange={handleInputChange}
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-1">
                      VIN
                    </label>
                    <input
                      id="vin"
                      type="text"
                      name="vin"
                      value={formData.vin}
                      onChange={handleInputChange}
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="stockNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Number
                    </label>
                    <input
                      id="stockNumber"
                      type="text"
                      name="stockNumber"
                      value={formData.stockNumber}
                      onChange={handleInputChange}
                      placeholder="Auto-generated if empty"
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      id="price"
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Price
                    </label>
                    <input
                      id="salePrice"
                      type="number"
                      name="salePrice"
                      value={formData.salePrice}
                      onChange={handleInputChange}
                      min="0"
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="monthlyPayment" className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Payment
                    </label>
                    <input
                      id="monthlyPayment"
                      type="number"
                      name="monthlyPayment"
                      value={formData.monthlyPayment}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Estimated monthly"
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Vehicle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage *
                    </label>
                    <input
                      id="mileage"
                      type="number"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleInputChange}
                      required
                      min="0"
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="bodyType" className="block text-sm font-medium text-gray-700 mb-1">
                      Body Type *
                    </label>
                    <select
                      id="bodyType"
                      name="bodyType"
                      value={formData.bodyType}
                      onChange={handleInputChange}
                      required
                      style={selectStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Type</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Truck">Truck</option>
                      <option value="Coupe">Coupe</option>
                      <option value="Van">Van</option>
                      <option value="Wagon">Wagon</option>
                      <option value="Convertible">Convertible</option>
                      <option value="Hatchback">Hatchback</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="exteriorColor" className="block text-sm font-medium text-gray-700 mb-1">
                      Exterior Color *
                    </label>
                    <input
                      id="exteriorColor"
                      type="text"
                      name="exteriorColor"
                      value={formData.exteriorColor}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="interiorColor" className="block text-sm font-medium text-gray-700 mb-1">
                      Interior Color
                    </label>
                    <input
                      id="interiorColor"
                      type="text"
                      name="interiorColor"
                      value={formData.interiorColor}
                      onChange={handleInputChange}
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 mb-1">
                      Fuel Type *
                    </label>
                    <select
                      id="fuelType"
                      name="fuelType"
                      value={formData.fuelType}
                      onChange={handleInputChange}
                      required
                      style={selectStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Type</option>
                      <option value="Gasoline">Gasoline</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="transmission" className="block text-sm font-medium text-gray-700 mb-1">
                      Transmission *
                    </label>
                    <select
                      id="transmission"
                      name="transmission"
                      value={formData.transmission}
                      onChange={handleInputChange}
                      required
                      style={selectStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Type</option>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                      <option value="CVT">CVT</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="drivetrain" className="block text-sm font-medium text-gray-700 mb-1">
                      Drivetrain
                    </label>
                    <select
                      id="drivetrain"
                      name="drivetrain"
                      value={formData.drivetrain}
                      onChange={handleInputChange}
                      style={selectStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Type</option>
                      <option value="FWD">FWD</option>
                      <option value="RWD">RWD</option>
                      <option value="AWD">AWD</option>
                      <option value="4WD">4WD</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="engine" className="block text-sm font-medium text-gray-700 mb-1">
                      Engine
                    </label>
                    <input
                      id="engine"
                      type="text"
                      name="engine"
                      value={formData.engine}
                      onChange={handleInputChange}
                      placeholder="e.g., 2.5L 4-Cylinder"
                      style={inputStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      style={selectStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                      <option value="hold">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <label htmlFor="features" className="block text-sm font-medium text-gray-700 mb-1">
                  Features (comma separated)
                </label>
                <textarea
                  id="features"
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Leather Seats, Backup Camera, Bluetooth, Navigation, etc."
                  style={textareaStyle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  style={textareaStyle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Images */}
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Images {!editingVehicle && '*'}
                </label>
                <input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ color: '#374151' }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative h-24">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="financingAvailable"
                    checked={formData.financingAvailable}
                    onChange={handleInputChange}
                    className="mr-2 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Financing Available
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="carfaxAvailable"
                    checked={formData.carfaxAvailable}
                    onChange={handleInputChange}
                    className="mr-2 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    CARFAX Report Available
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                    className="mr-2 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Feature this vehicle
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {vehicles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Featured
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {vehicle.images && vehicle.images.length > 0 && (
                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                              <img
                                src={vehicle.images[0].url}
                                alt={vehicle.images[0].alt}
                                className="h-10 w-10 rounded object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            <div className="text-sm text-gray-500">
                              Stock: {vehicle.stockNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${vehicle.price?.toLocaleString() || '0'}
                        </div>
                        {vehicle.salePrice && (
                          <div className="text-sm text-green-600">
                            Sale: ${vehicle.salePrice.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          vehicle.status === 'available' 
                            ? 'bg-green-100 text-green-800'
                            : vehicle.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : vehicle.status === 'sold'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle.views || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleFeatured(vehicle._id)}
                          className={`text-sm ${
                            vehicle.featured 
                              ? 'text-yellow-600 hover:text-yellow-700' 
                              : 'text-gray-400 hover:text-gray-500'
                          }`}
                        >
                          {vehicle.featured ? '⭐ Featured' : '☆ Not Featured'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleEdit(vehicle)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(vehicle._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new vehicle.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Vehicle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}