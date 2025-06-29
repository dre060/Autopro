// backend/models/Vehicle.js
import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  // Basic Information
  vin: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  trim: {
    type: String,
    trim: true
  },
  
  // Pricing & Status
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'pending', 'maintenance', 'reserved'],
    default: 'available'
  },
  
  // Vehicle Details
  mileage: {
    type: Number,
    required: true,
    min: 0
  },
  bodyType: {
    type: String,
    enum: ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Wagon', 'Hatchback', 'Van', 'Crossover'],
    required: true
  },
  fuelType: {
    type: String,
    enum: ['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'],
    required: true
  },
  transmission: {
    type: String,
    enum: ['Manual', 'Automatic', 'CVT'],
    required: true
  },
  drivetrain: {
    type: String,
    enum: ['FWD', 'RWD', 'AWD', '4WD']
  },
  engine: {
    size: String,
    cylinders: Number,
    horsepower: Number,
    torque: Number
  },
  
  // Exterior & Interior
  exteriorColor: {
    type: String,
    required: true
  },
  interiorColor: {
    type: String,
    required: true
  },
  interiorMaterial: {
    type: String,
    enum: ['Cloth', 'Leather', 'Leatherette', 'Vinyl']
  },
  
  // Features & Options
  features: [{
    category: {
      type: String,
      enum: ['Safety', 'Technology', 'Comfort', 'Performance', 'Exterior', 'Interior']
    },
    name: String,
    description: String
  }],
  
  // Condition & History
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor'],
    required: true
  },
  accidentHistory: {
    type: Boolean,
    default: false
  },
  numberOfOwners: {
    type: Number,
    min: 1,
    default: 1
  },
  serviceHistory: [{
    date: Date,
    mileage: Number,
    service: String,
    cost: Number,
    shop: String
  }],
  
  // Media
  images: [{
    type: String
  }],
  videos: [{
    type: String
  }],
  
  // Description & Notes
  description: {
    type: String,
    maxlength: 2000
  },
  keyFeatures: [String],
  notes: {
    type: String,
    maxlength: 1000
  },
  
  // Purchase Information
  purchaseDate: Date,
  purchasePrice: Number,
  source: {
    type: String,
    enum: ['Trade-in', 'Auction', 'Private Party', 'Dealer', 'Lease Return']
  },
  
  // Sale Information
  soldDate: Date,
  soldPrice: Number,
  soldTo: {
    name: String,
    email: String,
    phone: String
  },
  
  // SEO & Marketing
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  metaTitle: String,
  metaDescription: String,
  tags: [String],
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },
  
  // Admin Fields
  featured: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
vehicleSchema.index({ make: 1, model: 1, year: 1 });
vehicleSchema.index({ price: 1 });
vehicleSchema.index({ mileage: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ bodyType: 1 });
vehicleSchema.index({ fuelType: 1 });
vehicleSchema.index({ featured: 1 });
vehicleSchema.index({ slug: 1 });

// Pre-save middleware to generate slug
vehicleSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = `${this.year}-${this.make}-${this.model}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

export default mongoose.model('Vehicle', vehicleSchema);