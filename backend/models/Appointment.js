// backend/models/Appointment.js
import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  // Customer Information
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
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Appointment Details
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true,
    trim: true
  },
  serviceType: {
    type: String,
    enum: ['repair', 'maintenance', 'inspection', 'consultation', 'estimate'],
    default: 'repair'
  },
  
  // Vehicle Information
  vehicleInfo: {
    year: Number,
    make: String,
    model: String,
    vin: String,
    mileage: Number,
    color: String,
    licensePlate: String
  },
  
  // Additional Details
  message: {
    type: String,
    maxlength: 1000
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  
  // Status & Workflow
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  
  // Assignment
  assignedTechnician: {
    type: String,
    trim: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  
  // Pricing & Estimates
  estimatedCost: {
    labor: { type: Number, default: 0 },
    parts: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  actualCost: {
    labor: { type: Number, default: 0 },
    parts: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // Service Details
  workPerformed: [{
    service: String,
    description: String,
    cost: Number,
    technician: String,
    duration: Number, // in minutes
    completedAt: Date
  }],
  
  partsUsed: [{
    partNumber: String,
    description: String,
    quantity: Number,
    unitCost: Number,
    totalCost: Number
  }],
  
  // Communication
  notes: [{
    author: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
    isCustomerVisible: { type: Boolean, default: false }
  }],
  
  // Follow-up
  followUpDate: Date,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  customerSatisfaction: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    wouldRecommend: Boolean
  },
  
  // Reminders
  reminderSent: {
    type: Boolean,
    default: false
  },
  confirmationSent: {
    type: Boolean,
    default: false
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'check', 'financing']
  },
  
  // Warranty
  warrantyInfo: {
    hasWarranty: { type: Boolean, default: false },
    warrantyPeriod: Number, // in days
    warrantyExpires: Date,
    warrantyTerms: String
  }
}, {
  timestamps: true
});

// Indexes
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ email: 1 });
appointmentSchema.index({ assignedTechnician: 1 });
appointmentSchema.index({ serviceType: 1 });

export default mongoose.model('Appointment', appointmentSchema);