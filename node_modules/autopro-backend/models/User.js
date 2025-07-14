// backend/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  avatar: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    newsletter: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export default mongoose.model('User', userSchema);