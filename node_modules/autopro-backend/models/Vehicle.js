// backend/models/Vehicle.js
import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  // Basic Information
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
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
  trim: {
    type: String,
    trim: true
  },
  vin: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  salePrice: {
    type: Number,
    min: 0
  },
  
  // Vehicle Details
  mileage: {
    type: Number,
    required: true,
    min: 0
  },
  bodyType: {
    type: String,
    required: true,
    enum: ['Sedan', 'SUV', 'Truck', 'Coupe', 'Van', 'Wagon', 'Convertible', 'Hatchback']
  },
  exteriorColor: {
    type: String,
    required: true
  },
  interiorColor: {
    type: String
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid']
  },
  transmission: {
    type: String,
    required: true,
    enum: ['Automatic', 'Manual', 'CVT']
  },
  drivetrain: {
    type: String,
    enum: ['FWD', 'RWD', 'AWD', '4WD']
  },
  engine: {
    type: String,
    trim: true
  },
  
  // Features
  features: [{
    type: String,
    trim: true
  }],
  
  // Images
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Financing
  financingAvailable: {
    type: Boolean,
    default: true
  },
  monthlyPayment: {
    type: Number,
    min: 0
  },
  
  // Inventory Management
  stockNumber: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'pending', 'sold', 'hold'],
    default: 'available'
  },
  condition: {
    type: String,
    enum: ['New', 'Used', 'Certified Pre-Owned'],
    default: 'Used'
  },
  
  // Additional Information
  description: {
    type: String,
    maxlength: 2000
  },
  carfaxAvailable: {
    type: Boolean,
    default: false
  },
  carfaxUrl: String,
  
  // Metadata
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // SEO
  slug: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate slug before saving
vehicleSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('year') || this.isModified('make') || this.isModified('model')) {
    this.slug = `${this.year}-${this.make}-${this.model}-${this.stockNumber}`
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  }
  next();
});

// Index for search
vehicleSchema.index({ make: 1, model: 1, year: 1 });
vehicleSchema.index({ price: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ featured: -1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;