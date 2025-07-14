// frontend/src/app/admin/vehicles/[id]/edit/page.js (also use for /new)
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function VehicleForm() {
  const router = useRouter();
  const params = useParams();
  const isEdit = params.id && params.id !== 'new';
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    // Basic Information
    vin: "",
    stockNumber: "",
    year: new Date().getFullYear(),
    make: "",
    model: "",
    trim: "",
    bodyType: "Sedan",
    
    // Pricing
    purchasePrice: "",
    listPrice: "",
    salePrice: "",
    
    // Details
    mileage: "",
    exteriorColor: "",
    interiorColor: "",
    interiorMaterial: "Cloth",
    engine: "",
    transmission: "Automatic",
    drivetrain: "FWD",
    fuelType: "Gasoline",
    mpgCity: "",
    mpgHighway: "",
    
    // Features
    features: [],
    keyFeatures: [],
    
    // Condition
    condition: "Good",
    accidentHistory: false,
    numberOfOwners: 1,
    serviceRecords: false,
    
    // Description
    description: "",
    
    // SEO
    metaTitle: "",
    metaDescription: "",
    
    // Status
    status: "available",
    featured: false,
  });

  const [errors, setErrors] = useState({});
  const [suggestedFeatures, setSuggestedFeatures] = useState([
    "Bluetooth", "Backup Camera", "Cruise Control", "Keyless Entry",
    "Power Windows", "Power Locks", "Air Conditioning", "Heated Seats",
    "Leather Seats", "Sunroof", "Navigation System", "Apple CarPlay",
    "Android Auto", "Lane Departure Warning", "Adaptive Cruise Control",
    "Blind Spot Monitoring", "Remote Start", "Third Row Seating",
  ]);

  const vehicleMakes = [
    "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
    "Dodge", "Ford", "GMC", "Honda", "Hyundai", "Infiniti", "Jeep", "Kia",
    "Lexus", "Lincoln", "Mazda", "Mercedes-Benz", "Nissan", "Ram", "Subaru",
    "Tesla", "Toyota", "Volkswagen", "Volvo"
  ];

  const bodyTypes = [
    "Sedan", "SUV", "Truck", "Coupe", "Convertible", "Wagon", "Van", "Hatchback"
  ];

  const colors = [
    "Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown",
    "Beige", "Gold", "Orange", "Yellow", "Purple"
  ];

  useEffect(() => {
    if (isEdit) {
      fetchVehicleData();
    }
  }, [isEdit, params.id]);

  const fetchVehicleData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setFormData({
          vin: "1HGCV1F31JA123456",
          stockNumber: "A12345",
          year: 2018,
          make: "Honda",
          model: "Accord",
          trim: "Sport",
          bodyType: "Sedan",
          purchasePrice: "15000",
          listPrice: "18995",
          salePrice: "18995",
          mileage: "45000",
          exteriorColor: "Silver",
          interiorColor: "Black",
          interiorMaterial: "Cloth",
          engine: "1.5L Turbo 4-Cylinder",
          transmission: "Automatic",
          drivetrain: "FWD",
          fuelType: "Gasoline",
          mpgCity: "30",
          mpgHighway: "38",
          features: ["Bluetooth", "Backup Camera", "Apple CarPlay"],
          keyFeatures: ["Turbo Engine", "Honda Sensing", "Low Mileage"],
          condition: "Excellent",
          accidentHistory: false,
          numberOfOwners: 1,
          serviceRecords: true,
          description: "This 2018 Honda Accord Sport is in excellent condition...",
          metaTitle: "2018 Honda Accord Sport - Low Mileage",
          metaDescription: "Quality pre-owned 2018 Honda Accord Sport with low mileage...",
          status: "available",
          featured: true,
        });
        setImages([
          { id: 1, url: "/hero.jpg", isPrimary: true },
          { id: 2, url: "/hero.jpg", isPrimary: false },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleFeatureToggle = (feature) => {
    if (formData.features.includes(feature)) {
      setFormData({
        ...formData,
        features: formData.features.filter(f => f !== feature)
      });
    } else {
      setFormData({
        ...formData,
        features: [...formData.features, feature]
      });
    }
  };

  const handleKeyFeatureAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      setFormData({
        ...formData,
        keyFeatures: [...formData.keyFeatures, e.target.value.trim()]
      });
      e.target.value = '';
    }
  };

  const handleKeyFeatureRemove = (index) => {
    setFormData({
      ...formData,
      keyFeatures: formData.keyFeatures.filter((_, i) => i !== index)
    });
  };

  const handleImageUpload = (e) => {
    // Handle image upload logic
    const files = Array.from(e.target.files);
    // In real implementation, upload to server and get URLs
    const newImages = files.map((file, index) => ({
      id: Date.now() + index,
      url: URL.createObjectURL(file),
      file: file,
      isPrimary: images.length === 0 && index === 0
    }));
    setImages([...images, ...newImages]);
  };

  const handleImageDelete = (imageId) => {
    setImages(images.filter(img => img.id !== imageId));
  };

  const handleSetPrimaryImage = (imageId) => {
    setImages(images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    })));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.vin) newErrors.vin = "VIN is required";
    if (!formData.stockNumber) newErrors.stockNumber = "Stock number is required";
    if (!formData.make) newErrors.make = "Make is required";
    if (!formData.model) newErrors.model = "Model is required";
    if (!formData.listPrice) newErrors.listPrice = "List price is required";
    if (!formData.mileage) newErrors.mileage = "Mileage is required";
    if (images.length === 0) newErrors.images = "At least one image is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      // API call to save vehicle
      console.log("Saving vehicle:", formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirect to vehicles list
      router.push('/admin/vehicles');
    } catch (error) {
      console.error("Error saving vehicle:", error);
    } finally {
      setSaving(false);
    }
  };

  const generateMetaData = () => {
    const title = `${formData.year} ${formData.make} ${formData.model} ${formData.trim}`.trim();
    const metaTitle = `${title} - ${formData.mileage ? `${parseInt(formData.mileage).toLocaleString()} miles` : 'For Sale'}`;
    const metaDescription = `Quality pre-owned ${title} with ${formData.mileage ? `${parseInt(formData.mileage).toLocaleString()} miles` : 'low mileage'}. ${formData.features.slice(0, 3).join(', ')}. Call AUTO PRO at (352) 339-5181.`;
    
    setFormData({
      ...formData,
      metaTitle: metaTitle.slice(0, 60),
      metaDescription: metaDescription.slice(0, 160)
    });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'details', label: 'Details', icon: '🔧' },
    { id: 'features', label: 'Features', icon: '✨' },
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'images', label: 'Images', icon: '📸' },
    { id: 'seo', label: 'SEO', icon: '🔍' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h1>
          <nav className="text-sm text-gray-500 mt-1">
            <Link href="/admin" className="hover:text-gray-700">Dashboard</Link>
            <span className="mx-2">/</span>
            <Link href="/admin/vehicles" className="hover:text-gray-700">Vehicles</Link>
            <span className="mx-2">/</span>
            <span>{isEdit ? 'Edit' : 'New'}</span>
          </nav>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/vehicles"
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            {saving ? 'Saving...' : (isEdit ? 'Update Vehicle' : 'Add Vehicle')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {errors[tab.id] && <span className="text-red-500">•</span>}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VIN Number *
                  </label>
                  <input
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.vin ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter VIN"
                  />
                  {errors.vin && <p className="text-red-500 text-xs mt-1">{errors.vin}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Number *
                  </label>
                  <input
                    type="text"
                    name="stockNumber"
                    value={formData.stockNumber}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.stockNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., A12345"
                  />
                  {errors.stockNumber && <p className="text-red-500 text-xs mt-1">{errors.stockNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make *
                  </label>
                  <select
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.make ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Make</option>
                    {vehicleMakes.map(make => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                  </select>
                  {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.model ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Accord"
                  />
                  {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trim
                  </label>
                  <input
                    type="text"
                    name="trim"
                    value={formData.trim}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Sport"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Type *
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {bodyTypes.map(type => (
                    <label
                      key={type}
                      className={`relative cursor-pointer rounded-lg border p-3 text-center transition-all ${
                        formData.bodyType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bodyType"
                        value={type}
                        checked={formData.bodyType === type}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter vehicle description..."
                />
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mileage *
                  </label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.mileage ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 45000"
                  />
                  {errors.mileage && <p className="text-red-500 text-xs mt-1">{errors.mileage}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exterior Color
                  </label>
                  <select
                    name="exteriorColor"
                    value={formData.exteriorColor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Color</option>
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interior Color
                  </label>
                  <select
                    name="interiorColor"
                    value={formData.interiorColor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Color</option>
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Engine
                  </label>
                  <input
                    type="text"
                    name="engine"
                    value={formData.engine}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2.5L 4-Cylinder"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interior Material
                  </label>
                  <select
                    name="interiorMaterial"
                    value={formData.interiorMaterial}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cloth">Cloth</option>
                    <option value="Leather">Leather</option>
                    <option value="Synthetic Leather">Synthetic Leather</option>
                    <option value="Alcantara">Alcantara</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transmission
                  </label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drivetrain
                  </label>
                  <select
                    name="drivetrain"
                    value={formData.drivetrain}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FWD">FWD</option>
                    <option value="RWD">RWD</option>
                    <option value="AWD">AWD</option>
                    <option value="4WD">4WD</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Type
                  </label>
                  <select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Gasoline">Gasoline</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City MPG
                  </label>
                  <input
                    type="number"
                    name="mpgCity"
                    value={formData.mpgCity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highway MPG
                  </label>
                  <input
                    type="number"
                    name="mpgHighway"
                    value={formData.mpgHighway}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 38"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Vehicle Condition
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Overall Condition</label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="accidentHistory"
                        checked={formData.accidentHistory}
                        onChange={handleChange}
                        className="rounded text-blue-600 mr-2"
                      />
                      Accident History
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="serviceRecords"
                        checked={formData.serviceRecords}
                        onChange={handleChange}
                        className="rounded text-blue-600 mr-2"
                      />
                      Service Records Available
                    </label>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Number of Owners</label>
                      <input
                        type="number"
                        name="numberOfOwners"
                        value={formData.numberOfOwners}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Standard Features
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {suggestedFeatures.map(feature => (
                    <label
                      key={feature}
                      className={`relative cursor-pointer rounded-lg border p-3 transition-all ${
                        formData.features.includes(feature)
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature)}
                        onChange={() => handleFeatureToggle(feature)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className={`mr-2 h-5 w-5 rounded border-2 flex items-center justify-center ${
                          formData.features.includes(feature)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.features.includes(feature) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {feature}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Key Selling Features
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Add 3-5 key features that make this vehicle stand out. Press Enter to add.
                </p>
                <input
                  type="text"
                  placeholder="e.g., One Owner, Low Mileage, Warranty Included"
                  onKeyDown={handleKeyFeatureAdd}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                />
                <div className="flex flex-wrap gap-2">
                  {formData.keyFeatures.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {feature}
                      <button
                        type="button"
                        onClick={() => handleKeyFeatureRemove(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">What you paid for the vehicle</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    List Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="listPrice"
                      value={formData.listPrice}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.listPrice ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {errors.listPrice && <p className="text-red-500 text-xs mt-1">{errors.listPrice}</p>}
                  <p className="text-xs text-gray-500 mt-1">Regular asking price</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="salePrice"
                      value={formData.salePrice}
                      onChange={handleChange}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Special price (if on sale)</p>
                </div>
              </div>

              {formData.purchasePrice && formData.listPrice && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Profit Analysis</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Potential Profit</p>
                      <p className={`text-lg font-bold ${
                        (formData.listPrice - formData.purchasePrice) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${(formData.listPrice - formData.purchasePrice).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Margin</p>
                      <p className="text-lg font-bold">
                        {((formData.listPrice - formData.purchasePrice) / formData.listPrice * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">ROI</p>
                      <p className="text-lg font-bold">
                        {((formData.listPrice - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Additional Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={formData.featured}
                      onChange={handleChange}
                      className="rounded text-blue-600 mr-2"
                    />
                    Feature this vehicle on homepage
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              {errors.images && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errors.images}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Vehicle Images
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Images
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Drag and drop images here, or click to select files
                  </p>
                </div>
              </div>

              {images.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Uploaded Images</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={image.url}
                            alt="Vehicle"
                            width={200}
                            height={150}
                            className="object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(image.id)}
                            className={`px-3 py-1 rounded text-sm ${
                              image.isPrimary
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {image.isPrimary ? 'Primary' : 'Set Primary'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImageDelete(image.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Meta Title
                  </label>
                  <button
                    type="button"
                    onClick={generateMetaData}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Generate from vehicle data
                  </button>
                </div>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleChange}
                  maxLength={60}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter meta title..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.metaTitle.length}/60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleChange}
                  maxLength={160}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter meta description..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.metaDescription.length}/160 characters
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Search Preview</h4>
                <div className="bg-white rounded border p-3">
                  <h5 className="text-blue-600 text-lg hover:underline cursor-pointer">
                    {formData.metaTitle || `${formData.year} ${formData.make} ${formData.model} - AUTO PRO`}
                  </h5>
                  <p className="text-green-700 text-sm">www.autopro.com/inventory/{formData.stockNumber}</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {formData.metaDescription || "Quality pre-owned vehicle available at AUTO PRO in Leesburg, FL. Call (352) 339-5181 for details."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}