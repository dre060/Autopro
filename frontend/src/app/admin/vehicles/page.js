// frontend/src/app/admin/vehicles/page.js - COMPLETE WITH ENHANCED DEBUGGING
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "../AdminLayout";
import { 
  getVehicles, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle
} from "@/lib/supabase";

export default function AdminVehicles() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  
  const getInitialFormData = () => ({
    year: new Date().getFullYear(),
    make: "",
    model: "",
    trim: "",
    vin: "",
    price: "",
    sale_price: "",
    mileage: "",
    body_type: "",
    exterior_color: "",
    interior_color: "",
    fuel_type: "",
    transmission: "",
    drivetrain: "",
    engine: "",
    features: [],
    key_features: [],
    financing_available: true,
    monthly_payment: "",
    stock_number: "",
    status: "available",
    condition: "Good",
    description: "",
    carfax_available: false,
    carfax_url: "",
    featured: false,
    accident_history: false,
    number_of_owners: 1,
    service_records: false
  });

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching vehicles...');
      const { data, error } = await getVehicles();
      if (error) throw error;
      console.log('✅ Fetched vehicles:', data?.length || 0);
      setVehicles(data || []);
    } catch (error) {
      console.error('❌ Error fetching vehicles:', error);
      setError("Failed to load vehicles");
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'features' || name === 'key_features') {
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setFormData(prev => ({ ...prev, [name]: arrayValue }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    if (error) setError("");
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    console.log('📷 Image files selected:', files.length);
    
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} - ${file.type} - ${Math.round(file.size / 1024)}KB`);
    });
    
    setImageFiles(files);

    // Clean up previous previews
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));

    // Create new preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const validateForm = () => {
    const requiredFields = ['year', 'make', 'model', 'price', 'mileage', 'body_type', 'exterior_color', 'fuel_type', 'transmission'];
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in the ${field.replace('_', ' ')} field`);
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
    
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      console.log('🚀 FORM SUBMIT: Starting vehicle save...');
      console.log('📝 Form data:', formData);
      console.log('📷 Image files:', imageFiles.length, 'files');
      
      if (imageFiles.length > 0) {
        console.log('📷 Image details:');
        imageFiles.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} - ${file.type} - ${Math.round(file.size / 1024)}KB`);
        });
      }

      // Prepare vehicle data with type conversion
      const vehicleData = {
        ...formData,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        mileage: parseInt(formData.mileage),
        monthly_payment: formData.monthly_payment ? parseFloat(formData.monthly_payment) : null,
        year: parseInt(formData.year),
        number_of_owners: parseInt(formData.number_of_owners)
      };

      console.log('📊 Processed vehicle data:', vehicleData);

      let result;
      if (editingVehicle) {
        console.log('🔄 Updating existing vehicle:', editingVehicle.id);
        result = await updateVehicle(editingVehicle.id, vehicleData, imageFiles);
      } else {
        console.log('🆕 Creating new vehicle...');
        result = await createVehicle(vehicleData, imageFiles);
      }

      console.log('📋 Operation result:', result);

      if (result.error) {
        console.error('❌ Operation failed:', result.error);
        throw result.error;
      }

      console.log('✅ Vehicle saved successfully:', result.data?.id);
      console.log('📷 Final vehicle images:', result.data?.images?.length || 0);
      
      if (result.data?.images) {
        console.log('🔗 Image URLs:');
        result.data.images.forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.url} (Primary: ${img.isPrimary})`);
        });
      }

      setSuccess(editingVehicle ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');
      resetForm();
      fetchVehicles();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error('❌ Form submission error:', error);
      const errorMessage = error.message || 'Failed to save vehicle. Please try again.';
      setError(errorMessage);
      
      // Add debugging info for network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError(errorMessage + ' (Network error - check console for details)');
      }
    } finally {
      setSaving(false);
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
    console.log('✏️ Editing vehicle:', vehicle.id);
    setFormData({
      ...vehicle,
      sale_price: vehicle.sale_price || "",
      monthly_payment: vehicle.monthly_payment || "",
      carfax_url: vehicle.carfax_url || "",
      description: vehicle.description || "",
      trim: vehicle.trim || "",
      vin: vehicle.vin || "",
      interior_color: vehicle.interior_color || "",
      drivetrain: vehicle.drivetrain || "",
      engine: vehicle.engine || "",
      features: vehicle.features || [],
      key_features: vehicle.key_features || []
    });
    setEditingVehicle(vehicle);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      console.log('🗑️ Deleting vehicle:', id);
      const { error } = await deleteVehicle(id);
      if (error) throw error;
      
      setSuccess('Vehicle deleted successfully!');
      fetchVehicles();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error('❌ Error deleting vehicle:', error);
      setError('Error deleting vehicle. Please try again.');
    }
  };

  const toggleFeatured = async (vehicle) => {
    try {
      console.log('⭐ Toggling featured status for:', vehicle.id);
      const { error } = await updateVehicle(vehicle.id, { featured: !vehicle.featured });
      if (error) throw error;
      fetchVehicles();
    } catch (error) {
      console.error('❌ Error toggling featured status:', error);
    }
  };

  // Get image URL with fallback
  const getImageUrl = (vehicle) => {
    if (!vehicle.images || vehicle.images.length === 0) {
      return '/hero.jpg';
    }
    
    const primaryImage = vehicle.images.find(img => img.isPrimary) || vehicle.images[0];
    return primaryImage?.url || '/hero.jpg';
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Vehicle Inventory</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add New Vehicle'}
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trim</label>
                  <input
                    type="text"
                    name="trim"
                    value={formData.trim}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                  <input
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Number</label>
                  <input
                    type="text"
                    name="stock_number"
                    value={formData.stock_number}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if empty"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price</label>
                  <input
                    type="number"
                    name="sale_price"
                    value={formData.sale_price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
                  <input
                    type="number"
                    name="monthly_payment"
                    value={formData.monthly_payment}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Estimated monthly"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage *</label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body Type *</label>
                  <select
                    name="body_type"
                    value={formData.body_type}
                    onChange={handleInputChange}
                    required
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
                    <option value="Crossover">Crossover</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exterior Color *</label>
                  <input
                    type="text"
                    name="exterior_color"
                    value={formData.exterior_color}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interior Color</label>
                  <input
                    type="text"
                    name="interior_color"
                    value={formData.interior_color}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type *</label>
                  <select
                    name="fuel_type"
                    value={formData.fuel_type}
                    onChange={handleInputChange}
                    required
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transmission *</label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma separated)</label>
              <textarea
                name="features"
                value={formData.features.join(', ')}
                onChange={handleInputChange}
                rows={3}
                placeholder="Leather Seats, Backup Camera, Bluetooth, Navigation, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Key Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Features (comma separated)</label>
              <input
                type="text"
                name="key_features"
                value={formData.key_features.join(', ')}
                onChange={handleInputChange}
                placeholder="One Owner, Low Mileage, Clean Carfax, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Images {!editingVehicle && '*'}
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
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
              {editingVehicle && editingVehicle.images && editingVehicle.images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Current Images:</p>
                  <div className="grid grid-cols-4 gap-4">
                    {editingVehicle.images.map((image, index) => (
                      <div key={index} className="relative h-24">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            e.target.src = '/hero.jpg';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="financing_available"
                  checked={formData.financing_available}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Financing Available</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="carfax_available"
                  checked={formData.carfax_available}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">CARFAX Report Available</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Feature this vehicle</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="accident_history"
                  checked={formData.accident_history}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Accident History</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="service_records"
                  checked={formData.service_records}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Service Records Available</span>
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
                disabled={saving}
                className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicle List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading vehicles...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new vehicle.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Vehicle
              </button>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 mr-3">
                        <img
                          src={getImageUrl(vehicle)}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="h-10 w-10 rounded object-cover"
                          onError={(e) => {
                            e.target.src = '/hero.jpg';
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div className="text-sm text-gray-500">
                          Stock: {vehicle.stock_number || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${vehicle.price?.toLocaleString() || '0'}
                    </div>
                    {vehicle.sale_price && (
                      <div className="text-sm text-green-600">
                        Sale: ${vehicle.sale_price.toLocaleString()}
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
                      onClick={() => toggleFeatured(vehicle)}
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
                      onClick={() => handleEdit(vehicle)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}