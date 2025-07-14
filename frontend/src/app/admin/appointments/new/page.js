// frontend/src/app/admin/appointments/new/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminLayout from "../../AdminLayout";
import { createAppointment, getProfile, supabase } from "@/lib/supabase";

export default function NewAppointment() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    date: "",
    time: "",
    end_time: "",
    message: "",
    vehicle_info: {
      year: "",
      make: "",
      model: "",
      vin: "",
      mileage: "",
    },
    status: "pending",
    urgency: "medium",
    technician_id: "",
    bay: "",
    estimated_cost: {
      labor: "",
      parts: "",
      total: "",
    },
    notes: [],
  });
  
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get tomorrow's date as minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('role', ['admin', 'technician']);
      
      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('vehicle_')) {
      const field = name.replace('vehicle_', '');
      setFormData(prev => ({
        ...prev,
        vehicle_info: {
          ...prev.vehicle_info,
          [field]: value
        }
      }));
    } else if (name.startsWith('cost_')) {
      const field = name.replace('cost_', '');
      const newCost = {
        ...formData.estimated_cost,
        [field]: value
      };
      
      // Auto-calculate total
      if (field === 'labor' || field === 'parts') {
        const labor = parseFloat(newCost.labor) || 0;
        const parts = parseFloat(newCost.parts) || 0;
        newCost.total = (labor + parts).toString();
      }
      
      setFormData(prev => ({
        ...prev,
        estimated_cost: newCost
      }));
    } else {
      // Phone number formatting
      if (name === 'phone') {
        const cleaned = value.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length >= 6) {
          formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
        } else if (cleaned.length >= 3) {
          formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        }
        setFormData(prev => ({ ...prev, [name]: formatted }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
    
    if (error) setError("");
  };

  const validateForm = () => {
    const required = ['name', 'email', 'phone', 'service', 'date', 'time'];
    for (const field of required) {
      if (!formData[field]) {
        setError(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        return false;
      }
    }
    
    // Email validation
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    // Phone validation
    if (formData.phone.replace(/\D/g, '').length < 10) {
      setError("Please enter a valid phone number");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Find selected technician name
      const selectedTech = technicians.find(t => t.id === formData.technician_id);
      const assigned_technician = selectedTech ? `${selectedTech.first_name} ${selectedTech.last_name}` : '';
      
      const appointmentData = {
        ...formData,
        assigned_technician,
        estimated_cost: formData.estimated_cost.total ? {
          labor: parseFloat(formData.estimated_cost.labor) || 0,
          parts: parseFloat(formData.estimated_cost.parts) || 0,
          total: parseFloat(formData.estimated_cost.total) || 0,
        } : null,
        vehicle_info: Object.values(formData.vehicle_info).some(v => v) ? formData.vehicle_info : null,
        notes: formData.notes.length > 0 ? formData.notes : [],
        confirmation_sent: false,
        reminder_sent: false,
      };

      const { data, error } = await createAppointment(appointmentData);
      if (error) throw error;

      setSuccess("Appointment created successfully!");
      setTimeout(() => {
        router.push('/admin/appointments');
      }, 1500);
    } catch (error) {
      console.error("Error creating appointment:", error);
      setError(error.message || "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Appointment</h1>
            <nav className="text-sm text-gray-500 mt-1">
              <Link href="/admin" className="hover:text-gray-700">Dashboard</Link>
              <span className="mx-2">/</span>
              <Link href="/admin/appointments" className="hover:text-gray-700">Appointments</Link>
              <span className="mx-2">/</span>
              <span>New</span>
            </nav>
          </div>
          <Link
            href="/admin/appointments"
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            ← Back to Appointments
          </Link>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="(123) 456-7890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type *
                  </label>
                  <select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a Service</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Engine Repair">Engine Repair</option>
                    <option value="Transmission Service">Transmission Service</option>
                    <option value="AC Service">AC Service</option>
                    <option value="Tire Service">Tire Service</option>
                    <option value="Diagnostic Check">Diagnostic Check</option>
                    <option value="State Inspection">State Inspection</option>
                    <option value="General Maintenance">General Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Appointment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    min={minDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgency
                  </label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Technician
                  </label>
                  <select
                    name="technician_id"
                    value={formData.technician_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.first_name} {tech.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bay Assignment
                  </label>
                  <select
                    name="bay"
                    value={formData.bay}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Bay Assigned</option>
                    <option value="Bay 1">Bay 1</option>
                    <option value="Bay 2">Bay 2</option>
                    <option value="Bay 3">Bay 3</option>
                    <option value="Bay 4">Bay 4</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Vehicle Information (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="text"
                    name="vehicle_year"
                    value={formData.vehicle_info.year}
                    onChange={handleChange}
                    placeholder="e.g., 2020"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input
                    type="text"
                    name="vehicle_make"
                    value={formData.vehicle_info.make}
                    onChange={handleChange}
                    placeholder="e.g., Toyota"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    name="vehicle_model"
                    value={formData.vehicle_info.model}
                    onChange={handleChange}
                    placeholder="e.g., Camry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                  <input
                    type="text"
                    name="vehicle_vin"
                    value={formData.vehicle_info.vin}
                    onChange={handleChange}
                    placeholder="Vehicle VIN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                  <input
                    type="number"
                    name="vehicle_mileage"
                    value={formData.vehicle_info.mileage}
                    onChange={handleChange}
                    placeholder="e.g., 45000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Cost Estimate */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Cost Estimate (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="cost_labor"
                      value={formData.estimated_cost.labor}
                      onChange={handleChange}
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="cost_parts"
                      value={formData.estimated_cost.parts}
                      onChange={handleChange}
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="cost_total"
                      value={formData.estimated_cost.total}
                      onChange={handleChange}
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Message/Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Message / Service Notes
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                placeholder="Customer's message or service details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/admin/appointments"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}