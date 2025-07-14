// backend/models/Testimonial.js
import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    maxlength: 100,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  serviceReceived: {
    type: String,
    trim: true
  },
  vehicleInfo: {
    year: Number,
    make: String,
    model: String
  },
  approved: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String
  },
  location: {
    city: String,
    state: String
  }
}, {
  timestamps: true
});

testimonialSchema.index({ approved: 1, featured: 1 });
testimonialSchema.index({ rating: 1 });

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

// backend/models/Service.js
const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Repair', 'Maintenance', 'Diagnostic', 'Emergency', 'Sales', 'Towing']
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  detailedDescription: {
    type: String,
    maxlength: 2000
  },
  features: [String],
  estimatedTime: {
    min: Number,
    max: Number
  },
  pricing: {
    basePrice: Number,
    priceRange: {
      min: Number,
      max: Number
    },
    pricingNote: String
  },
  icon: {
    type: String,
    default: 'wrench'
  },
  image: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  tags: [String],
  requirements: [String],
  warranty: {
    hasWarranty: Boolean,
    period: Number, // in days
    terms: String
  }
}, {
  timestamps: true
});

serviceSchema.index({ category: 1, active: 1 });
serviceSchema.index({ featured: 1 });
serviceSchema.index({ slug: 1 });

const Service = mongoose.model('Service', serviceSchema);

export { Testimonial, Service };